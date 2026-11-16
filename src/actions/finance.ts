'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { 
  TuitionFeeStatus, 
  CourseLevel, 
  CourseBook, 
  ClassModality,
  ClassStatus 
} from '@prisma/client';
import { getMonthName, formatTuitionDate } from '@/lib/utils';
import { requireAuth } from '@/lib/require-auth';
import { summarizeTuitionFees } from '@/lib/tuition-metrics';
import { priorTuitionPaymentsWhere } from '@/lib/tuition-payments';
import { issueMonthlyTuitions, syncMonthlyTuitions, withTuitionTransaction } from '@/lib/tuition-billing';
import { tuitionDay, tuitionPeriodKey, type TuitionPeriod } from '@/lib/tuition-dates';

export type SerializedTuitionFee = {
  id: string;
  studentId: string;
  classId: string;
  month: number;
  year: number;
  dueDate: string;
  amount: number;
  status: TuitionFeeStatus;
  blockedByPeriod: TuitionPeriod | null;
  createdAt: string;
  updatedAt: string;
  student: {
    id: string;
    ci: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    guardianPhone1: string | null;
    guardianPhone2: string | null;
    address: string | null;
    status: string;
    monthlyFee?: number;
    invoiceIdType?: string | null;
    invoiceIdNumber?: string | null;
    invoiceName?: string | null;
    invoiceEmail?: string | null;
    invoiceAddress?: string | null;
    invoicePhone?: string | null;
  };
  class: {
    id: string;
    code: string;
    name: string;
    level: CourseLevel;
    book: CourseBook;
    modality: ClassModality;
    classroom: string;
    unitSchedule: string;
    speakingSchedule: string | null;
  };
  payments: Array<{
    id: string;
    amountPaid: number;
    paymentDate: string;
    registeredBy: string;
    notes: string | null;
    invoiceNumber?: string | null;
  }>;
};

export type FinancialDashboardData = {
  fees: SerializedTuitionFee[];
};

export type StudentFinancialHistory = {
  student: {
    id: string;
    ci: string | null;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    guardianPhone1: string | null;
    guardianPhone2: string | null;
    address: string | null;
    status: string;
    monthlyFee: number;
    hasDisability: boolean;
    disabilityDescription: string | null;
    notes: string | null;
    invoiceIdType?: string | null;
    invoiceIdNumber?: string | null;
    invoiceName?: string | null;
    invoiceEmail?: string | null;
    invoiceAddress?: string | null;
    invoicePhone?: string | null;
    currentClass: {
      id: string;
      code: string;
      name: string;
      level: CourseLevel;
      book: CourseBook;
      modality: ClassModality;
      classroom: string;
      unitSchedule: string;
      speakingSchedule: string | null;
    } | null;
  };
  metrics: {
    totalPaid: number;
    totalPending: number;
    totalOverdue: number;
    totalDebt: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
    isUpToDate: boolean;
  };
  fees: SerializedTuitionFee[];
};

function oldestUnpaidByStudent(fees: readonly (TuitionPeriod & { studentId: string; status: TuitionFeeStatus })[]) {
  const oldest = new Map<string, TuitionPeriod>();
  for (const fee of fees) {
    if (fee.status === TuitionFeeStatus.PAID) continue;
    const previous = oldest.get(fee.studentId);
    if (!previous || tuitionPeriodKey(fee) < tuitionPeriodKey(previous)) {
      oldest.set(fee.studentId, { month: fee.month, year: fee.year });
    }
  }
  return oldest;
}

function blockingPeriod(fee: TuitionPeriod & { status: TuitionFeeStatus }, oldest?: TuitionPeriod) {
  return fee.status !== TuitionFeeStatus.PAID && oldest && tuitionPeriodKey(oldest) < tuitionPeriodKey(fee)
    ? oldest
    : null;
}

/**
 * 2. Obtiene las cuotas del panel financiero
 */
export async function getFinancialDashboardData(
  month?: number,
  year?: number
): Promise<FinancialDashboardData> {
  await requireAuth();
  // Emitir las cuotas del periodo y actualizar vencimientos antes de calcular
  await syncMonthlyTuitions();

  const period = typeof month === 'number' && month >= 1 && month <= 12 && typeof year === 'number' && year >= 2020
    ? { month, year }
    : undefined;

  // Consultar mensualidades con relaciones completas
  const tuitionFees = await prisma.tuitionFee.findMany({
    where: period,
    include: {
      student: true,
      class: {
        include: { classroom: true },
      },
      payments: {
        orderBy: { paymentDate: 'desc' },
      },
    },
    orderBy: [
      // Priorizar en mora, luego pendientes y luego pagadas
      { status: 'desc' },
      { dueDate: 'asc' },
    ],
  });

  const earlierUnpaid = period && tuitionFees.length > 0
    ? await prisma.tuitionFee.findMany({
        where: {
          studentId: { in: [...new Set(tuitionFees.map((fee) => fee.studentId))] },
          status: { not: TuitionFeeStatus.PAID },
          OR: [{ year: { lt: period.year } }, { year: period.year, month: { lt: period.month } }],
        },
        select: { studentId: true, year: true, month: true, status: true },
      })
    : [];
  const oldestUnpaid = oldestUnpaidByStudent([...tuitionFees, ...earlierUnpaid]);

  // Serializar datos para evitar errores de Client Components con objetos Prisma Decimal / Date
  const serializedFees: SerializedTuitionFee[] = tuitionFees.map((fee) => ({
    id: fee.id,
    studentId: fee.studentId,
    classId: fee.classId,
    month: fee.month,
    year: fee.year,
    dueDate: fee.dueDate.toISOString(),
    amount: Number(fee.amount),
    status: fee.status,
    blockedByPeriod: blockingPeriod(fee, oldestUnpaid.get(fee.studentId)),
    createdAt: fee.createdAt.toISOString(),
    updatedAt: fee.updatedAt.toISOString(),
    student: {
      id: fee.student.id,
      ci: fee.student.ci || '',
      firstName: fee.student.firstName,
      lastName: fee.student.lastName,
      email: fee.student.email,
      phone: fee.student.phone,
      guardianPhone1: fee.student.guardianPhone1,
      guardianPhone2: fee.student.guardianPhone2,
      address: fee.student.address,
      status: fee.student.status,
      monthlyFee: Number(fee.student.monthlyFee),
      invoiceIdType: fee.student.invoiceIdType,
      invoiceIdNumber: fee.student.invoiceIdNumber,
      invoiceName: fee.student.invoiceName,
      invoiceEmail: fee.student.invoiceEmail,
      invoiceAddress: fee.student.invoiceAddress,
      invoicePhone: fee.student.invoicePhone,
    },
    class: {
      id: fee.class.id,
      code: fee.class.code,
      name: fee.class.name,
      level: fee.class.level,
      book: fee.class.book,
      modality: fee.class.modality,
      classroom: fee.class.classroom?.name || 'Sin aula asignada',
      unitSchedule: fee.class.unitSchedule,
      speakingSchedule: fee.class.speakingSchedule,
    },
    payments: fee.payments.map((p) => ({
      id: p.id,
      amountPaid: Number(p.amountPaid),
      paymentDate: p.paymentDate.toISOString(),
      registeredBy: p.registeredBy,
      notes: p.notes,
      invoiceNumber: p.invoiceNumber,
    })),
  }));

  return { fees: serializedFees };
}

export type PaymentReceiptData = {
  paymentId: string;
  receiptNumber: string;
  paymentDate: string;
  registeredBy: string;
  notes: string | null;
  amountPaid: number;
  paymentMethod: string;
  invoiceNumber?: string | null;
  tuitionFee: {
    id: string;
    month: number;
    year: number;
    monthName: string;
    dueDate: string;
    amount: number;
  };
  student: {
    id: string;
    ci: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    guardianPhone1: string | null;
    guardianPhone2: string | null;
    address: string | null;
    invoiceIdType?: string | null;
    invoiceIdNumber?: string | null;
    invoiceName?: string | null;
    invoiceEmail?: string | null;
    invoiceAddress?: string | null;
    invoicePhone?: string | null;
  };
  class: {
    id: string;
    code: string;
    name: string;
    level: CourseLevel;
    book: CourseBook;
    classroom: string;
    modality: ClassModality;
    unitSchedule: string;
    speakingSchedule: string | null;
    unitTeacherName: string;
    speakingTeacherName: string | null;
  };
};

/**
 * 3. Registra el pago de una mensualidad en una transacción atómica
 */
export async function registerPaymentAction(
  tuitionFeeId: string,
  notes?: string,
  invoiceNumber?: string | null
): Promise<{ success: boolean; message: string; paymentId?: string }> {
  try {
    await requireAuth();
    if (!tuitionFeeId) {
      return { success: false, message: 'Identificador de mensualidad no proporcionado.' };
    }

    const result = await withTuitionTransaction(async (tx) => {
      const fee = await tx.tuitionFee.findUnique({
        where: { id: tuitionFeeId },
        include: { student: true },
      });
      if (!fee) {
        return { success: false, message: 'La mensualidad seleccionada no existe en el sistema.' };
      }
      if (fee.status === TuitionFeeStatus.PAID) {
        return { success: false, message: 'Esta mensualidad ya figura como pagada.' };
      }

      const now = new Date();
      await issueMonthlyTuitions(tx, now, { id: fee.studentId });
      const earlierFee = await tx.tuitionFee.findFirst({
        where: {
          studentId: fee.studentId,
          status: { not: TuitionFeeStatus.PAID },
          OR: [{ year: { lt: fee.year } }, { year: fee.year, month: { lt: fee.month } }],
        },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
        select: { year: true, month: true },
      });
      if (earlierFee) {
        return {
          success: false,
          message: `Primero registra el pago de ${getMonthName(earlierFee.month)} ${earlierFee.year}.`,
        };
      }

      await tx.tuitionFee.update({
        where: { id: tuitionFeeId },
        data: { status: TuitionFeeStatus.PAID },
      });
      const payment = await tx.payment.create({
        data: {
          tuitionFeeId: fee.id,
          amountPaid: fee.amount,
          paymentDate: now,
          registeredBy: 'Administración MindsOn',
          notes: notes?.trim() || 'Pago regular registrado desde el panel de cobranza',
          invoiceNumber: invoiceNumber?.trim() || null,
        },
      });

      return {
        success: true,
        message: `Pago de $${Number(fee.amount).toFixed(2)} para ${fee.student.firstName} ${fee.student.lastName} registrado exitosamente.`,
        paymentId: payment.id,
      };
    });

    if (result.success) {
      revalidatePath('/');
      revalidatePath('/students');
    }
    return result;
  } catch (error) {
    console.error('Error al registrar pago:', error);
    return {
      success: false,
      message: 'Ocurrió un error interno al registrar el pago. Por favor intente nuevamente.',
    };
  }
}

function getPaymentMethod(notes: string | null): string {
  const recordedMethod = notes?.match(/^\[(.*?)\]/)?.[1]?.trim();
  if (recordedMethod) return recordedMethod;
  const description = notes ?? '';
  if (/efectivo/i.test(description)) return 'Efectivo';
  if (/tarjeta|dep[oó]sito/i.test(description)) return 'Tarjeta / Depósito';
  if (/transferencia|banco|qr/i.test(description)) return 'Transferencia Bancaria';
  return 'Sin especificar';
}

/**
 * 3.1. Obtiene los datos oficiales para emitir el Comprobante de Pago Digital (Recibo / Voucher)
 */
export async function getPaymentReceiptDataAction(
  identifier: string
): Promise<{ success: boolean; data?: PaymentReceiptData; message?: string }> {
  try {
    await requireAuth();
    if (!identifier) {
      return { success: false, message: 'Identificador de pago no proporcionado.' };
    }

    // Buscar por ID de pago o por ID de cuota
    let payment = await prisma.payment.findUnique({
      where: { id: identifier },
      include: {
        tuitionFee: {
          include: {
            student: true,
            class: {
              include: {
                unitTeacher: true,
                speakingTeacher: true,
                classroom: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      payment = await prisma.payment.findFirst({
        where: { tuitionFeeId: identifier },
        orderBy: { paymentDate: 'desc' },
        include: {
          tuitionFee: {
            include: {
              student: true,
              class: {
                include: {
                  unitTeacher: true,
                  speakingTeacher: true,
                  classroom: true,
                },
              },
            },
          },
        },
      });
    }

    if (!payment) {
      return { success: false, message: 'No se encontró el registro de pago para generar el comprobante.' };
    }

    const fee = payment.tuitionFee;
    const student = fee.student;
    const cls = fee.class;

    const receiptYear = payment.paymentDate.getUTCFullYear();
    const receiptNumber = `REC-${receiptYear}-${payment.id.slice(-6).toUpperCase()}`;

    const paymentMethod = getPaymentMethod(payment.notes);

    return {
      success: true,
      data: {
        paymentId: payment.id,
        receiptNumber,
        paymentDate: payment.paymentDate.toISOString(),
        registeredBy: payment.registeredBy,
        notes: payment.notes,
        amountPaid: Number(payment.amountPaid),
        paymentMethod,
        invoiceNumber: payment.invoiceNumber,
        tuitionFee: {
          id: fee.id,
          month: fee.month,
          year: fee.year,
          monthName: getMonthName(fee.month),
          dueDate: fee.dueDate.toISOString(),
          amount: Number(fee.amount),
        },
        student: {
          id: student.id,
          ci: student.ci || '',
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          phone: student.phone,
          guardianPhone1: student.guardianPhone1,
          guardianPhone2: student.guardianPhone2,
          address: student.address,
          invoiceIdType: student.invoiceIdType,
          invoiceIdNumber: student.invoiceIdNumber,
          invoiceName: student.invoiceName,
          invoiceEmail: student.invoiceEmail,
          invoiceAddress: student.invoiceAddress,
          invoicePhone: student.invoicePhone,
        },
        class: {
          id: cls.id,
          code: cls.code,
          name: cls.name,
          level: cls.level,
          book: cls.book,
          classroom: cls.classroom?.name || 'Sin aula asignada',
          modality: cls.modality,
          unitSchedule: cls.unitSchedule,
          speakingSchedule: cls.speakingSchedule || null,
          unitTeacherName: `${cls.unitTeacher.firstName} ${cls.unitTeacher.lastName}`,
          speakingTeacherName: cls.speakingTeacher ? `${cls.speakingTeacher.firstName} ${cls.speakingTeacher.lastName}` : null,
        },
      },
    };
  } catch (error) {
    console.error('Error al obtener datos del recibo:', error);
    return { success: false, message: 'Error interno al consultar el comprobante de pago.' };
  }
}

/**
 * 4. Obtiene el historial financiero / Kardex completo de un estudiante
 */
export async function getStudentFinancialHistory(
  studentId: string
): Promise<{ success: boolean; data?: StudentFinancialHistory; message?: string }> {
  try {
    await requireAuth();
    if (!studentId) {
      return { success: false, message: 'ID de estudiante no proporcionado.' };
    }

    // Emitir las cuotas del periodo y actualizar vencimientos
    await syncMonthlyTuitions();

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        currentClass: {
          include: { classroom: true },
        },
        tuitionFees: {
          include: {
            class: {
              include: { classroom: true },
            },
            student: true,
            payments: {
              orderBy: { paymentDate: 'desc' },
            },
          },
          orderBy: [
            { year: 'desc' },
            { month: 'desc' },
            { dueDate: 'desc' },
          ],
        },
      },
    });

    if (!student) {
      return { success: false, message: 'Estudiante no encontrado.' };
    }

    let totalPaid = 0;
    let totalPending = 0;
    let totalOverdue = 0;
    let paidCount = 0;
    let pendingCount = 0;
    let overdueCount = 0;

    for (const fee of student.tuitionFees) {
      const amountNum = Number(fee.amount);
      if (fee.status === TuitionFeeStatus.PAID) {
        totalPaid += amountNum;
        paidCount++;
      } else if (fee.status === TuitionFeeStatus.PENDING) {
        totalPending += amountNum;
        pendingCount++;
      } else if (fee.status === TuitionFeeStatus.OVERDUE) {
        totalOverdue += amountNum;
        overdueCount++;
      }
    }

    const oldestUnpaid = oldestUnpaidByStudent(student.tuitionFees);
    const serializedFees: SerializedTuitionFee[] = student.tuitionFees.map((fee) => ({
      id: fee.id,
      studentId: fee.studentId,
      classId: fee.classId,
      month: fee.month,
      year: fee.year,
      dueDate: fee.dueDate.toISOString(),
      amount: Number(fee.amount),
      status: fee.status,
      blockedByPeriod: blockingPeriod(fee, oldestUnpaid.get(fee.studentId)),
      createdAt: fee.createdAt.toISOString(),
      updatedAt: fee.updatedAt.toISOString(),
      student: {
        id: student.id,
        ci: student.ci || '',
        firstName: student.firstName,
        lastName: student.lastName,
        email: student.email,
        phone: student.phone,
        guardianPhone1: student.guardianPhone1,
        guardianPhone2: student.guardianPhone2,
        address: student.address,
        status: student.status,
        monthlyFee: Number(student.monthlyFee),
        invoiceIdType: student.invoiceIdType,
        invoiceIdNumber: student.invoiceIdNumber,
        invoiceName: student.invoiceName,
        invoiceEmail: student.invoiceEmail,
        invoiceAddress: student.invoiceAddress,
        invoicePhone: student.invoicePhone,
      },
      class: {
        id: fee.class.id,
        code: fee.class.code,
        name: fee.class.name,
        level: fee.class.level,
        book: fee.class.book,
        modality: fee.class.modality,
        classroom: fee.class.classroom?.name || 'Sin aula asignada',
        unitSchedule: fee.class.unitSchedule,
        speakingSchedule: fee.class.speakingSchedule,
      },
      payments: fee.payments.map((p) => ({
        id: p.id,
        amountPaid: Number(p.amountPaid),
        paymentDate: p.paymentDate.toISOString(),
        registeredBy: p.registeredBy,
        notes: p.notes,
        invoiceNumber: p.invoiceNumber,
      })),
    }));

    return {
      success: true,
      data: {
        student: {
          id: student.id,
          ci: student.ci || '',
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          phone: student.phone,
          guardianPhone1: student.guardianPhone1,
          guardianPhone2: student.guardianPhone2,
          address: student.address,
          status: student.status,
          monthlyFee: Number(student.monthlyFee),
          hasDisability: student.hasDisability,
          disabilityDescription: student.disabilityDescription,
          notes: student.notes,
          invoiceIdType: student.invoiceIdType,
          invoiceIdNumber: student.invoiceIdNumber,
          invoiceName: student.invoiceName,
          invoiceEmail: student.invoiceEmail,
          invoiceAddress: student.invoiceAddress,
          invoicePhone: student.invoicePhone,
          currentClass: student.currentClass
            ? {
                id: student.currentClass.id,
                code: student.currentClass.code,
                name: student.currentClass.name,
                level: student.currentClass.level,
                book: student.currentClass.book,
                modality: student.currentClass.modality,
                classroom: student.currentClass.classroom?.name || 'Sin aula asignada',
                unitSchedule: student.currentClass.unitSchedule,
                speakingSchedule: student.currentClass.speakingSchedule,
              }
            : null,
        },
        metrics: {
          totalPaid,
          totalPending,
          totalOverdue,
          totalDebt: totalPending + totalOverdue,
          paidCount,
          pendingCount,
          overdueCount,
          isUpToDate: overdueCount === 0,
        },
        fees: serializedFees,
      },
    };
  } catch (error) {
    console.error('Error al obtener kardex financiero del estudiante:', error);
    return { success: false, message: 'Error interno al consultar el historial financiero.' };
  }
}

export async function getCourseFinanceGroups() {
  await requireAuth();
  return prisma.class.findMany({
    select: {
      id: true,
      status: true,
      unitTeacher: { select: { firstName: true, lastName: true } },
      speakingTeacher: { select: { firstName: true, lastName: true } },
    },
  });
}

export type CourseFinanceGroup = Awaited<ReturnType<typeof getCourseFinanceGroups>>[number];

export type MonthlyPaymentTransaction = {
  id: string;
  paymentId: string;
  receiptNumber: string;
  paymentDate: string;
  amountPaid: number;
  registeredBy: string;
  notes: string | null;
  paymentMethod: string;
  methodGroup: 'transfer' | 'cash' | 'cardOrDeposit' | 'other';
  referenceNumber: string | null;
  invoiceNumber?: string | null;
  feeId: string;
  feeMonth: number;
  feeYear: number;
  feeMonthName: string;
  feeAmount: number;
  student: {
    id: string;
    ci: string | null;
    firstName: string;
    lastName: string;
    phone: string;
    guardianPhone1: string | null;
  };
  class: {
    id: string;
    code: string;
    name: string;
    level: CourseLevel;
    book: CourseBook;
    classroom: string;
  };
};

export type MonthlyCollectionHistoryResponse = {
  error?: true;
  month: number;
  year: number;
  monthName: string;
  metrics: {
    totalCollected: number;
    paymentCount: number;
    byMethod: {
      transfer: number;
      cash: number;
      cardOrDeposit: number;
      other: number;
    };
    paidMonth: number;
    projectedMonth: number;
    overdueMonth: number;
    recoveryRate: number;
  };
  transactions: MonthlyPaymentTransaction[];
  priorPeriodTransactions: MonthlyPaymentTransaction[];
};

export type MonthCashflowSummary = {
  month: number;
  monthName: string;
  totalCollected: number;
  totalProjected: number;
  totalOverdue: number;
  paymentCount: number;
  collectionRate: number;
};

export type AnnualCashflowSummaryResponse = {
  error?: true;
  year: number;
  annualTotalCollected: number;
  annualTotalProjected: number;
  annualTotalPayments: number;
  averageCollectionRate: number;
  months: MonthCashflowSummary[];
};

/**
 * 6. Obtiene el Historial de Recaudación y Cuadre de Caja del Mes
 */
export async function getMonthlyCollectionHistoryAction(
  year?: number,
  month?: number
): Promise<MonthlyCollectionHistoryResponse> {
  try {
    await requireAuth();
    const now = new Date();
    const today = tuitionDay(now);
    const targetYear = typeof year === 'number' && Number.isInteger(year) && year >= 2020 && year <= 2100 ? year : today.getUTCFullYear();
    const targetMonth = typeof month === 'number' && Number.isInteger(month) && month >= 1 && month <= 12 ? month : today.getUTCMonth() + 1;
    await syncMonthlyTuitions();

    const period = { year: targetYear, month: targetMonth };
    const [payments, fees] = await Promise.all([
      prisma.payment.findMany({
        where: {
          OR: [
            { tuitionFee: period, paymentDate: { lte: now } },
            priorTuitionPaymentsWhere(period, now),
          ],
        },
        include: {
          tuitionFee: {
            include: { student: true, class: { include: { classroom: true } } },
          },
        },
        orderBy: { paymentDate: 'desc' },
      }),
      prisma.tuitionFee.findMany({
        where: { month: targetMonth, year: targetYear },
        select: { amount: true, status: true, studentId: true },
      }),
    ]);

    const tuition = summarizeTuitionFees(fees.map((fee) => ({ ...fee, amount: Number(fee.amount) })));
    const methodCents = { transfer: 0, cash: 0, cardOrDeposit: 0, other: 0 };
    let collectedCents = 0;

    const transactions: MonthlyPaymentTransaction[] = [];
    const priorPeriodTransactions: MonthlyPaymentTransaction[] = [];
    for (const p of payments) {
      const isSelectedFee = p.tuitionFee.year === targetYear && p.tuitionFee.month === targetMonth;
      const amt = Number(p.amountPaid);
      const cents = Math.round(amt * 100);
      if (isSelectedFee) collectedCents += cents;

      const notesStr = p.notes || '';
      const paymentMethod = getPaymentMethod(p.notes);
      let referenceNumber: string | null = null;

      const refMatch = notesStr.match(/ref(?:erencia)?[:\s#]*([a-zA-Z0-9_-]+)/i);
      if (refMatch) {
        referenceNumber = refMatch[1];
      }

      const method = paymentMethod.toLowerCase();
      let methodGroup: MonthlyPaymentTransaction['methodGroup'] = 'other';
      if (/efectivo|cash/.test(method)) methodGroup = 'cash';
      else if (/tarjeta|depósito|deposito/.test(method)) methodGroup = 'cardOrDeposit';
      else if (/transferencia|banco|qr|pichincha|guayaquil/.test(method)) methodGroup = 'transfer';
      if (isSelectedFee) methodCents[methodGroup] += cents;

      const receiptYear = p.paymentDate.getUTCFullYear();
      const receiptNumber = `REC-${receiptYear}-${p.id.slice(-6).toUpperCase()}`;

      const transaction: MonthlyPaymentTransaction = {
        id: p.id,
        paymentId: p.id,
        receiptNumber,
        paymentDate: p.paymentDate.toISOString(),
        amountPaid: amt,
        registeredBy: p.registeredBy,
        notes: p.notes,
        paymentMethod,
        methodGroup,
        referenceNumber,
        invoiceNumber: p.invoiceNumber,
        feeId: p.tuitionFee.id,
        feeMonth: p.tuitionFee.month,
        feeYear: p.tuitionFee.year,
        feeMonthName: getMonthName(p.tuitionFee.month),
        feeAmount: Number(p.tuitionFee.amount),
        student: {
          id: p.tuitionFee.student.id,
          ci: p.tuitionFee.student.ci,
          firstName: p.tuitionFee.student.firstName,
          lastName: p.tuitionFee.student.lastName,
          phone: p.tuitionFee.student.phone,
          guardianPhone1: p.tuitionFee.student.guardianPhone1,
        },
        class: {
          id: p.tuitionFee.class.id,
          code: p.tuitionFee.class.code,
          name: p.tuitionFee.class.name,
          level: p.tuitionFee.class.level,
          book: p.tuitionFee.class.book,
          classroom: p.tuitionFee.class.classroom?.name || 'Sin aula asignada',
        },
      };
      if (isSelectedFee) transactions.push(transaction);
      else priorPeriodTransactions.push(transaction);
    }

    return {
      month: targetMonth,
      year: targetYear,
      monthName: getMonthName(targetMonth),
      metrics: {
        totalCollected: collectedCents / 100,
        paymentCount: transactions.length,
        byMethod: {
          transfer: methodCents.transfer / 100,
          cash: methodCents.cash / 100,
          cardOrDeposit: methodCents.cardOrDeposit / 100,
          other: methodCents.other / 100,
        },
        paidMonth: tuition.totalPaid,
        projectedMonth: tuition.issuedAmount,
        overdueMonth: tuition.outstandingAmount,
        recoveryRate: tuition.collectionRate,
      },
      transactions,
      priorPeriodTransactions,
    };
  } catch (error) {
    console.error('Error al obtener historial mensual de recaudación:', error);
    const now = tuitionDay(new Date());
    const fallbackMonth = typeof month === 'number' && month >= 1 && month <= 12 ? month : now.getUTCMonth() + 1;
    const fallbackYear = typeof year === 'number' && year >= 2020 ? year : now.getUTCFullYear();
    return {
      error: true,
      month: fallbackMonth,
      year: fallbackYear,
      monthName: getMonthName(fallbackMonth),
      metrics: {
        totalCollected: 0,
        paymentCount: 0,
        byMethod: { transfer: 0, cash: 0, cardOrDeposit: 0, other: 0 },
        paidMonth: 0,
        projectedMonth: 0,
        overdueMonth: 0,
        recoveryRate: 0,
      },
      transactions: [],
      priorPeriodTransactions: [],
    };
  }
}

/**
 * 7. Obtiene el Resumen anual de cobros por periodo de cuota (Enero - Diciembre)
 */
export async function getAnnualCashflowSummaryAction(
  year?: number
): Promise<AnnualCashflowSummaryResponse> {
  try {
    await requireAuth();
    const targetYear = typeof year === 'number' && year >= 2020 && year <= 2100 ? year : tuitionDay(new Date()).getUTCFullYear();

    await syncMonthlyTuitions();

    const [annualPayments, annualFees] = await Promise.all([
      prisma.payment.findMany({
        where: {
          tuitionFee: { year: targetYear },
          paymentDate: { lte: new Date() },
        },
        select: {
          amountPaid: true,
          tuitionFee: { select: { month: true } },
        },
      }),
      prisma.tuitionFee.findMany({
        where: {
          year: targetYear,
        },
      }),
    ]);



    const monthsData: MonthCashflowSummary[] = [];

    for (let m = 1; m <= 12; m++) {
      const monthPayments = annualPayments.filter((payment) => payment.tuitionFee.month === m);

      const monthFees = annualFees.filter((f) => f.month === m);

      const monthCollected = monthPayments.reduce((cents, p) => cents + Math.round(Number(p.amountPaid) * 100), 0) / 100;

      const tuition = summarizeTuitionFees(monthFees.map((fee) => ({ ...fee, amount: Number(fee.amount) })));

      monthsData.push({
        month: m,
        monthName: getMonthName(m),
        totalCollected: monthCollected,
        totalProjected: tuition.issuedAmount,
        totalOverdue: tuition.outstandingAmount,
        paymentCount: monthPayments.length,
        collectionRate: tuition.collectionRate,
      });
    }

    const annualTuition = summarizeTuitionFees(annualFees.map((fee) => ({ ...fee, amount: Number(fee.amount) })));

    return {
      year: targetYear,
      annualTotalCollected: annualPayments.reduce((cents, p) => cents + Math.round(Number(p.amountPaid) * 100), 0) / 100,
      annualTotalProjected: annualTuition.issuedAmount,
      annualTotalPayments: annualPayments.length,
      averageCollectionRate: annualTuition.collectionRate,
      months: monthsData,
    };
  } catch (error) {
    console.error('Error al obtener resumen anual de cobros:', error);
    const fallbackYear = typeof year === 'number' && year >= 2020 ? year : tuitionDay(new Date()).getUTCFullYear();
    return {
      error: true,
      year: fallbackYear,
      annualTotalCollected: 0,
      annualTotalProjected: 0,
      annualTotalPayments: 0,
      averageCollectionRate: 0,
      months: Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        monthName: getMonthName(i + 1),
        totalCollected: 0,
        totalProjected: 0,
        totalOverdue: 0,
        paymentCount: 0,
        collectionRate: 0,
      })),
    };
  }
}
