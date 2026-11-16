import { ClassStatus, Prisma, StudentStatus, TuitionFeeStatus } from '@prisma/client';
import { cache } from 'react';
import prisma from '@/lib/prisma';
import { firstTuitionPeriod, tuitionDay, tuitionDayStart, tuitionDueDate, tuitionPeriod, tuitionPeriodKey, type TuitionPeriod } from '@/lib/tuition-dates';

export function withTuitionTransaction<T>(work: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    // Serializar la emisión con los cambios de curso, estado y arancel.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(74621301)`;
    return work(tx);
  }, { maxWait: 5_000, timeout: 15_000 });
}

export async function removeUnpaidCurrentTuition(
  tx: Prisma.TransactionClient, studentId: string, now: Date,
) {
  const today = tuitionDay(now);
  await tx.tuitionFee.deleteMany({
    where: {
      studentId,
      year: today.getUTCFullYear(),
      month: today.getUTCMonth() + 1,
      status: { in: [TuitionFeeStatus.PENDING, TuitionFeeStatus.OVERDUE] },
      payments: { none: {} },
    },
  });
}

export async function issueMonthlyTuitions(
  tx: Prisma.TransactionClient,
  now: Date,
  scope: Prisma.StudentWhereInput = {},
  { activeSince, throughPreviousMonth = false }: { activeSince?: Date; throughPreviousMonth?: boolean } = {},
) {
  const currentPeriod = tuitionPeriod(tuitionDay(now));
  const throughPeriod = throughPreviousMonth ? tuitionPeriod(currentPeriod, -1) : currentPeriod;
  const currentYear = currentPeriod.getUTCFullYear();
  const currentMonth = currentPeriod.getUTCMonth() + 1;
  const needsSync: Prisma.StudentWhereInput[] = [{ tuitionSyncedThrough: { lt: throughPeriod } }];
  if (!throughPreviousMonth) {
    needsSync.push(
      { tuitionSyncedThrough: null },
      {
        // Revisar el mes si se omitió por una matrícula registrada después del historial.
        tuitionSyncedThrough: currentPeriod,
        enrollmentDate: { gte: tuitionDayStart(currentPeriod) },
        tuitionFees: {
          some: { OR: [{ year: { lt: currentYear } }, { year: currentYear, month: { lt: currentMonth } }] },
          none: { year: currentYear, month: currentMonth },
        },
      },
    );
  }
  const students = await tx.student.findMany({
    where: {
      AND: [
        scope,
        {
          status: StudentStatus.ACTIVE,
          archivedAt: null,
          billingPausedAt: null,
          currentClass: { status: ClassStatus.ACTIVE },
          OR: needsSync,
        },
      ],
    },
    select: {
      id: true,
      currentClassId: true,
      enrollmentDate: true,
      monthlyFee: true,
      tuitionSyncedThrough: true,
      billingResumedAt: true,
      tuitionFees: { select: { id: true, month: true, year: true, dueDate: true, status: true } },
    },
  });
  const newFees: Prisma.TuitionFeeCreateManyInput[] = [];
  const corrections: TuitionDeadline[] = [];

  for (const student of students) {
    if (!student.currentClassId) continue;
    const enrollmentDay = tuitionDay(student.enrollmentDate);
    const firstPeriod = firstTuitionPeriod(enrollmentDay, student.tuitionFees);
    const start = student.tuitionSyncedThrough && student.tuitionSyncedThrough < currentPeriod
      ? tuitionPeriod(student.tuitionSyncedThrough, 1)
      : currentPeriod;
    const issuedPeriods = new Set(student.tuitionFees.map(tuitionPeriodKey));

    if (!student.tuitionSyncedThrough) {
      // Adoptar el ciclo desde el mes actual y conservar el historial anterior.
      for (const fee of student.tuitionFees) {
        if (fee.status === TuitionFeeStatus.PAID) continue;
        const period = feePeriod(fee);
        if (period < currentPeriod || period < firstPeriod) continue;
        const correction = tuitionDeadlineCorrection(fee, enrollmentDay, now);
        if (correction) corrections.push(correction);
      }
    }

    for (let period = start < firstPeriod ? firstPeriod : start;
      period <= throughPeriod;
      period = tuitionPeriod(period, 1)) {
      const year = period.getUTCFullYear();
      const month = period.getUTCMonth() + 1;
      if (issuedPeriods.has(tuitionPeriodKey({ year, month }))) continue;
      const dueDate = tuitionDueDate(enrollmentDay, period);
      if ((activeSince && dueDate < activeSince) ||
          (student.billingResumedAt && dueDate < student.billingResumedAt)) continue;
      newFees.push({
        studentId: student.id,
        classId: student.currentClassId,
        year,
        month,
        dueDate,
        amount: student.monthlyFee,
        status: dueDate < now ? TuitionFeeStatus.OVERDUE : TuitionFeeStatus.PENDING,
      });
    }
  }

  await updateTuitionDeadlines(tx, corrections, now);
  if (newFees.length > 0) {
    await tx.tuitionFee.createMany({ data: newFees, skipDuplicates: true });
  }
  if (students.length > 0) {
    await tx.student.updateMany({
      where: { id: { in: students.map((student) => student.id) } },
      data: { tuitionSyncedThrough: throughPeriod },
    });
  }
}

type TuitionDeadline = { id: string; dueDate: Date; status: TuitionFeeStatus };

function feePeriod(fee: TuitionPeriod) {
  return new Date(Date.UTC(fee.year, fee.month - 1, 1));
}

function tuitionDeadlineCorrection(
  fee: TuitionDeadline & TuitionPeriod, enrollmentDay: Date, now: Date, inRecess = false,
): TuitionDeadline | null {
  const dueDate = tuitionDueDate(enrollmentDay, feePeriod(fee));
  const overdue = dueDate < now && (!inRecess || fee.status === TuitionFeeStatus.OVERDUE);
  const status = overdue ? TuitionFeeStatus.OVERDUE : TuitionFeeStatus.PENDING;
  return fee.dueDate.getTime() === dueDate.getTime() && fee.status === status
    ? null
    : { id: fee.id, dueDate, status };
}

async function updateTuitionDeadlines(tx: Prisma.TransactionClient, corrections: TuitionDeadline[], now: Date) {
  if (corrections.length === 0) return;
  await tx.$executeRaw`
    UPDATE public.tuition_fees AS fee
    SET "dueDate" = correction."dueDate", status = correction.status, "updatedAt" = ${now}
    FROM jsonb_to_recordset(${JSON.stringify(corrections)}::jsonb)
      AS correction(id text, "dueDate" timestamp, status public."TuitionFeeStatus")
    WHERE fee.id = correction.id AND fee.status <> 'PAID'
  `;
}

export async function updateStudentTuitionDeadlines(
  tx: Prisma.TransactionClient, studentId: string, enrollmentDate: Date, now: Date,
) {
  const today = tuitionDay(now);
  const year = today.getUTCFullYear();
  const month = today.getUTCMonth() + 1;
  const fees = await tx.tuitionFee.findMany({
    where: {
      studentId,
      status: { not: TuitionFeeStatus.PAID },
      OR: [{ year: { gt: year } }, { year, month: { gte: month } }],
    },
    select: { id: true, year: true, month: true, dueDate: true, status: true, class: { select: { status: true } } },
  });
  const enrollmentDay = tuitionDay(enrollmentDate);
  const corrections = fees.flatMap((fee) => {
    const correction = tuitionDeadlineCorrection(fee, enrollmentDay, now, fee.class.status === ClassStatus.IN_RECESS);
    return correction ? [correction] : [];
  });
  await updateTuitionDeadlines(tx, corrections, now);
}

export const syncMonthlyTuitions = cache(async () => {
  await withTuitionTransaction(async (tx) => {
    const now = new Date();
    await issueMonthlyTuitions(tx, now);
    await tx.tuitionFee.updateMany({
      where: {
        status: TuitionFeeStatus.PENDING,
        dueDate: { lt: now },
        class: { status: { not: ClassStatus.IN_RECESS } },
      },
      data: { status: TuitionFeeStatus.OVERDUE },
    });
  });
});
