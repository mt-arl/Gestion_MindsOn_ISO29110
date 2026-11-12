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
import { issueMonthlyTuitions, syncMonthlyTuitions, withTuitionTransaction } from '@/lib/tuition-billing';
import { tuitionDay, tuitionPeriodKey, upcomingTuitionDate, type TuitionPeriod } from '@/lib/tuition-dates';

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
      classroom: fee.class.classroom?.name || 'Aula BRAZIL',
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

    const receiptYear = new Date(payment.paymentDate).getFullYear();
    const receiptNumber = `REC-${receiptYear}-${payment.id.slice(-6).toUpperCase()}`;

    // Extraer método de pago si viene en formato [Método] en notas
    let paymentMethod = 'Transferencia Bancaria / Depósito';
    const matchMethod = payment.notes?.match(/^\[(.*?)\]/);
    if (matchMethod && matchMethod[1]) {
      paymentMethod = matchMethod[1];
    }

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
          classroom: cls.classroom?.name || 'Aula BRAZIL',
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
        classroom: fee.class.classroom?.name || 'Aula BRAZIL',
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
                classroom: student.currentClass.classroom?.name || 'Aula BRAZIL',
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

export type StudentBreakdownInCourse = {
  id: string;
  ci: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  guardianPhone1: string | null;
  guardianPhone2: string | null;
  hasDisability: boolean;
  notes: string | null;
  monthlyFee: number;
  nextPaymentDate: string | null;
  outstandingBalance: number;
  unpaidFeesCount: number;
  contextualStatus: 'PAUSED' | 'OVERDUE' | 'PENDING' | 'PAID' | 'FUTURE_ENROLLMENT' | 'UNISSUED';
  statusLabel: string;
  feeStatus: TuitionFeeStatus | 'UNISSUED';
  feeId: string | null;
  feeMonth: number | null;
  feeYear: number | null;
  dueDate: string | null;
  feeAmount: number;
  amountPaid: number;
  rawFee?: SerializedTuitionFee;
};

export type CourseFinanceBreakdownItem = {
  id: string;
  code: string;
  name: string;
  level: CourseLevel;
  book: CourseBook;
  modality: ClassModality;
  classroom: string;
  status: ClassStatus;
  recessStartedAt: string | null;
  recessReason: string | null;
  unitTeacher: {
    id: string;
    name: string;
    phone: string;
  };
  speakingTeacher: {
    id: string;
    name: string;
    phone: string;
  } | null;
  students: StudentBreakdownInCourse[];
  totals: {
    activeStudentsCount: number;
    totalProjected: number;
    totalCollected: number;
    totalPendingOrOverdue: number;
    collectionRate: number;
    paidCount: number;
    pendingCount: number;
    overdueCount: number;
    unissuedCount: number;
  };
};

export type CourseFinanceBreakdownResponse = {
  month: number;
  year: number;
  courses: CourseFinanceBreakdownItem[];
  globalTotals: {
    totalProjected: number;
    totalCollected: number;
    totalPendingOrOverdue: number;
    totalStudents: number;
    globalCollectionRate: number;
  };
};

/**
 * 6. Obtiene la recaudación y desglose de aranceles individuales por curso con lógica contextual
 */
export async function getCourseFinanceBreakdownAction(
  month?: number,
  year?: number
): Promise<CourseFinanceBreakdownResponse> {
  try {
    await requireAuth();
    await syncMonthlyTuitions();

    const now = new Date();
    const today = tuitionDay(now);
    const targetMonth = month || today.getUTCMonth() + 1;
    const targetYear = year || today.getUTCFullYear();

    const classes = await prisma.class.findMany({
      include: {
        classroom: true,
        unitTeacher: true,
        speakingTeacher: true,
        students: {
          where: { status: 'ACTIVE' },
          include: {
            tuitionFees: {
              include: {
                payments: true,
                class: { include: { classroom: true } },
              },
              orderBy: [
                { year: 'desc' },
                { month: 'desc' },
              ],
            },
          },
          orderBy: { lastName: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    let globalProjected = 0;
    let globalCollected = 0;
    let globalPendingOrOverdue = 0;
    let globalStudents = 0;

    const courseBreakdowns: CourseFinanceBreakdownItem[] = classes.map((cls) => {
      let courseProjected = 0;
      let courseCollected = 0;
      let coursePendingOrOverdue = 0;
      let paidCount = 0;
      let pendingCount = 0;
      let overdueCount = 0;
      let unissuedCount = 0;

      const isClassInRecess = cls.status === ClassStatus.IN_RECESS;

      const studentList: StudentBreakdownInCourse[] = cls.students.map((student) => {
        const monthlyFeeNum = Number(student.monthlyFee);
        courseProjected += monthlyFeeNum;

        const unpaidFees = student.tuitionFees
          .filter((fee) => fee.status !== TuitionFeeStatus.PAID)
          .sort((a, b) => tuitionPeriodKey(a) - tuitionPeriodKey(b) || a.dueDate.getTime() - b.dueDate.getTime());
        const overdueFees = unpaidFees.filter((fee) => fee.status === TuitionFeeStatus.OVERDUE);
        const pendingFees = unpaidFees.filter((fee) => fee.status === TuitionFeeStatus.PENDING);
        const paidFees = student.tuitionFees
          .filter((fee) => fee.status === TuitionFeeStatus.PAID)
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

        const selectedFee = unpaidFees[0] || paidFees[0] || null;
        const outstandingBalance = unpaidFees.reduce((sum, fee) => sum + Number(fee.amount), 0);
        const nextPaymentDate = cls.status === ClassStatus.ACTIVE
          ? upcomingTuitionDate(student.enrollmentDate, now, student.tuitionFees)
          : null;
        coursePendingOrOverdue += outstandingBalance;
        courseCollected += paidFees
          .filter((fee) => fee.classId === cls.id && fee.month === targetMonth && fee.year === targetYear)
          .reduce((sum, fee) => sum + Number(fee.amount), 0);

        let contextualStatus: StudentBreakdownInCourse['contextualStatus'] = 'UNISSUED';
        let statusLabel = 'Sin emitir';

        if (isClassInRecess) {
          contextualStatus = 'PAUSED';
          statusLabel = '⏸️ Curso en Receso';
          unissuedCount++;
        } else if (overdueFees.length > 0) {
          contextualStatus = 'OVERDUE';
          statusLabel = `⚠️ En Mora (${getMonthName(overdueFees[0].month)})`;
          overdueCount++;
        } else if (pendingFees.length > 0) {
          contextualStatus = 'PENDING';
          statusLabel = `⏳ Vence el ${formatTuitionDate(pendingFees[0].dueDate)}`;
          pendingCount++;
        } else if (paidFees.length > 0) {
          contextualStatus = 'PAID';
          statusLabel = '✓ Al Día';
          paidCount++;
        } else if (nextPaymentDate) {
          contextualStatus = 'FUTURE_ENROLLMENT';
          statusLabel = `🗓️ Próx. Cobro: ${formatTuitionDate(nextPaymentDate)}`;
          unissuedCount++;
        } else {
          unissuedCount++;
        }

        // 3. Serializar cuota activa para permitir pago directo si aplica
        let rawFee: SerializedTuitionFee | undefined = undefined;
        if (selectedFee) {
          rawFee = {
            id: selectedFee.id,
            studentId: student.id,
            classId: selectedFee.classId,
            month: selectedFee.month,
            year: selectedFee.year,
            dueDate: selectedFee.dueDate.toISOString(),
            amount: Number(selectedFee.amount),
            status: selectedFee.status,
            blockedByPeriod: null,
            createdAt: selectedFee.createdAt.toISOString(),
            updatedAt: selectedFee.updatedAt.toISOString(),
            student: {
              id: student.id,
              ci: student.ci,
              firstName: student.firstName,
              lastName: student.lastName,
              email: student.email,
              phone: student.phone,
              guardianPhone1: student.guardianPhone1,
              guardianPhone2: student.guardianPhone2,
              address: student.address,
              status: student.status,
              monthlyFee: Number(student.monthlyFee),
            },
            class: {
              id: selectedFee.class.id,
              code: selectedFee.class.code,
              name: selectedFee.class.name,
              level: selectedFee.class.level,
              book: selectedFee.class.book,
              modality: selectedFee.class.modality,
              classroom: selectedFee.class.classroom?.name || 'Aula BRAZIL',
              unitSchedule: selectedFee.class.unitSchedule,
              speakingSchedule: selectedFee.class.speakingSchedule,
            },
            payments: selectedFee.payments.map((p) => ({
              id: p.id,
              amountPaid: Number(p.amountPaid),
              paymentDate: p.paymentDate.toISOString(),
              registeredBy: p.registeredBy,
              notes: p.notes,
            })),
          };
        }

        const amountPaid = selectedFee
          ? selectedFee.payments.reduce((sum, p) => sum + Number(p.amountPaid), 0)
          : 0;

        return {
          id: student.id,
          ci: student.ci,
          firstName: student.firstName,
          lastName: student.lastName,
          email: student.email,
          phone: student.phone,
          guardianPhone1: student.guardianPhone1,
          guardianPhone2: student.guardianPhone2,
          hasDisability: student.hasDisability,
          notes: student.notes,
          monthlyFee: monthlyFeeNum,
          nextPaymentDate: nextPaymentDate?.toISOString() ?? null,
          outstandingBalance,
          unpaidFeesCount: unpaidFees.length,
          contextualStatus,
          statusLabel,
          feeStatus: selectedFee ? selectedFee.status : 'UNISSUED',
          feeId: selectedFee ? selectedFee.id : null,
          feeMonth: selectedFee ? selectedFee.month : null,
          feeYear: selectedFee ? selectedFee.year : null,
          dueDate: selectedFee ? selectedFee.dueDate.toISOString() : null,
          feeAmount: selectedFee ? Number(selectedFee.amount) : monthlyFeeNum,
          amountPaid,
          rawFee,
        };
      });

      const collectionRate = courseProjected > 0 ? (courseCollected / courseProjected) * 100 : 0;

      globalProjected += courseProjected;
      globalCollected += courseCollected;
      globalPendingOrOverdue += coursePendingOrOverdue;
      globalStudents += cls.students.length;

      return {
        id: cls.id,
        code: cls.code,
        name: cls.name,
        level: cls.level,
        book: cls.book,
        modality: cls.modality,
        classroom: cls.classroom?.name || 'Aula BRAZIL',
        status: cls.status,
        recessStartedAt: cls.recessStartedAt ? cls.recessStartedAt.toISOString() : null,
        recessReason: cls.recessReason,
        unitTeacher: {
          id: cls.unitTeacher.id,
          name: `${cls.unitTeacher.firstName} ${cls.unitTeacher.lastName}`,
          phone: cls.unitTeacher.phone,
        },
        speakingTeacher: cls.speakingTeacher ? {
          id: cls.speakingTeacher.id,
          name: `${cls.speakingTeacher.firstName} ${cls.speakingTeacher.lastName}`,
          phone: cls.speakingTeacher.phone,
        } : null,
        students: studentList,
        totals: {
          activeStudentsCount: cls.students.length,
          totalProjected: courseProjected,
          totalCollected: courseCollected,
          totalPendingOrOverdue: coursePendingOrOverdue,
          collectionRate: Math.round(collectionRate * 10) / 10,
          paidCount,
          pendingCount,
          overdueCount,
          unissuedCount,
        },
      };
    });

    const globalCollectionRate =
      globalProjected > 0 ? Math.round(((globalCollected / globalProjected) * 100) * 10) / 10 : 0;

    return {
      month: targetMonth,
      year: targetYear,
      courses: courseBreakdowns,
      globalTotals: {
        totalProjected: globalProjected,
        totalCollected: globalCollected,
        totalPendingOrOverdue: globalPendingOrOverdue,
        totalStudents: globalStudents,
        globalCollectionRate,
      },
    };
  } catch (error) {
    console.error('Error al obtener desglose financiero por curso:', error);
    return {
      month: month || new Date().getMonth() + 1,
      year: year || new Date().getFullYear(),
      courses: [],
      globalTotals: {
        totalProjected: 0,
        totalCollected: 0,
        totalPendingOrOverdue: 0,
        totalStudents: 0,
        globalCollectionRate: 0,
      },
    };
  }
}

export type MonthlyPaymentTransaction = {
  id: string;
  paymentId: string;
  receiptNumber: string;
  paymentDate: string;
  amountPaid: number;
  registeredBy: string;
  notes: string | null;
  paymentMethod: string;
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
    projectedMonth: number;
    overdueMonth: number;
    recoveryRate: number;
  };
  transactions: MonthlyPaymentTransaction[];
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
    const targetYear = typeof year === 'number' && year >= 2020 && year <= 2100 ? year : now.getFullYear();
    const targetMonth = typeof month === 'number' && month >= 1 && month <= 12 ? month : now.getMonth() + 1;

    const startOfMonth = new Date(targetYear, targetMonth - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(targetYear, targetMonth, 0, 23, 59, 59, 999);

    // 1. Obtener pagos del mes (por fecha de pago o cuota del periodo)
    const payments = await prisma.payment.findMany({
      where: {
        OR: [
          {
            paymentDate: {
              gte: startOfMonth,
              lte: endOfMonth,
            },
          },
          {
            tuitionFee: {
              month: targetMonth,
              year: targetYear,
            },
          },
        ],
      },
      include: {
        tuitionFee: {
          include: {
            student: true,
            class: {
              include: {
                classroom: true,
              },
            },
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    // 2. Obtener todas las cuotas emitidas para el mes seleccionado
    const targetMonthFees = await prisma.tuitionFee.findMany({
      where: {
        month: targetMonth,
        year: targetYear,
      },
    });

    let projectedMonth = 0;
    let overdueMonth = 0;

    for (const fee of targetMonthFees) {
      const feeAmt = Number(fee.amount);
      projectedMonth += feeAmt;
      if (fee.status === TuitionFeeStatus.OVERDUE || fee.status === TuitionFeeStatus.PENDING) {
        overdueMonth += feeAmt;
      }
    }

    // 3. Procesar transacciones y desglose por método de pago
    let totalCollected = 0;
    let transferTotal = 0;
    let cashTotal = 0;
    let cardOrDepositTotal = 0;
    let otherTotal = 0;

    const transactions: MonthlyPaymentTransaction[] = payments.map((p) => {
      const amt = Number(p.amountPaid);
      totalCollected += amt;

      const notesStr = p.notes || '';
      let paymentMethod = 'Transferencia Bancaria';
      let referenceNumber: string | null = null;

      const methodMatch = notesStr.match(/\[(.*?)\]/);
      if (methodMatch) {
        paymentMethod = methodMatch[1];
      } else if (/efectivo/i.test(notesStr)) {
        paymentMethod = 'Efectivo';
      } else if (/tarjeta|deposito|depósito/i.test(notesStr)) {
        paymentMethod = 'Tarjeta / Depósito';
      }

      const refMatch = notesStr.match(/ref(?:erencia)?[:\s#]*([a-zA-Z0-9_-]+)/i);
      if (refMatch) {
        referenceNumber = refMatch[1];
      }

      // Clasificación para métricas
      const lowerMethod = paymentMethod.toLowerCase();
      if (lowerMethod.includes('efectivo') || lowerMethod.includes('cash')) {
        cashTotal += amt;
      } else if (
        lowerMethod.includes('transferencia') || 
        lowerMethod.includes('banco') || 
        lowerMethod.includes('qr') || 
        lowerMethod.includes('pichincha') || 
        lowerMethod.includes('guayaquil') || 
        lowerMethod.includes('produbanco')
      ) {
        transferTotal += amt;
      } else if (lowerMethod.includes('tarjeta') || lowerMethod.includes('depósito') || lowerMethod.includes('deposito')) {
        cardOrDepositTotal += amt;
      } else {
        otherTotal += amt;
      }

      const receiptYear = new Date(p.paymentDate).getFullYear();
      const receiptNumber = `REC-${receiptYear}-${p.id.slice(-6).toUpperCase()}`;

      return {
        id: p.id,
        paymentId: p.id,
        receiptNumber,
        paymentDate: p.paymentDate.toISOString(),
        amountPaid: amt,
        registeredBy: p.registeredBy,
        notes: p.notes,
        paymentMethod,
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
          classroom: p.tuitionFee.class.classroom?.name || 'Aula BRAZIL',
        },
      };
    });

    const recoveryRate = projectedMonth > 0 ? Math.round(((totalCollected / projectedMonth) * 100) * 10) / 10 : 0;

    return {
      month: targetMonth,
      year: targetYear,
      monthName: getMonthName(targetMonth),
      metrics: {
        totalCollected,
        paymentCount: transactions.length,
        byMethod: {
          transfer: transferTotal,
          cash: cashTotal,
          cardOrDeposit: cardOrDepositTotal,
          other: otherTotal,
        },
        projectedMonth,
        overdueMonth,
        recoveryRate,
      },
      transactions,
    };
  } catch (error) {
    console.error('Error al obtener historial mensual de recaudación:', error);
    const now = new Date();
    const fallbackMonth = typeof month === 'number' && month >= 1 && month <= 12 ? month : now.getMonth() + 1;
    const fallbackYear = typeof year === 'number' && year >= 2020 ? year : now.getFullYear();
    return {
      month: fallbackMonth,
      year: fallbackYear,
      monthName: getMonthName(fallbackMonth),
      metrics: {
        totalCollected: 0,
        paymentCount: 0,
        byMethod: { transfer: 0, cash: 0, cardOrDeposit: 0, other: 0 },
        projectedMonth: 0,
        overdueMonth: 0,
        recoveryRate: 0,
      },
      transactions: [],
    };
  }
}

/**
 * 7. Obtiene el Resumen Anual de Flujo de Caja y Cierres (Enero - Diciembre)
 */
export async function getAnnualCashflowSummaryAction(
  year?: number
): Promise<AnnualCashflowSummaryResponse> {
  try {
    await requireAuth();
    const targetYear = typeof year === 'number' && year >= 2020 && year <= 2100 ? year : new Date().getFullYear();

    const startOfYear = new Date(targetYear, 0, 1, 0, 0, 0, 0);
    const endOfYear = new Date(targetYear, 11, 31, 23, 59, 59, 999);

    const [annualPayments, annualFees] = await Promise.all([
      prisma.payment.findMany({
        where: {
          paymentDate: {
            gte: startOfYear,
            lte: endOfYear,
          },
        },
      }),
      prisma.tuitionFee.findMany({
        where: {
          year: targetYear,
        },
      }),
    ]);

    let annualTotalCollected = 0;
    let annualTotalProjected = 0;

    const monthsData: MonthCashflowSummary[] = [];

    for (let m = 1; m <= 12; m++) {
      const monthPayments = annualPayments.filter((p) => {
        const pMonth = new Date(p.paymentDate).getMonth() + 1;
        return pMonth === m;
      });

      const monthFees = annualFees.filter((f) => f.month === m);

      let monthCollected = 0;
      for (const p of monthPayments) {
        monthCollected += Number(p.amountPaid);
      }

      let monthProjected = 0;
      let monthOverdue = 0;
      for (const f of monthFees) {
        const fAmt = Number(f.amount);
        monthProjected += fAmt;
        if (f.status === TuitionFeeStatus.OVERDUE || f.status === TuitionFeeStatus.PENDING) {
          monthOverdue += fAmt;
        }
      }

      const collectionRate = monthProjected > 0 ? Math.round(((monthCollected / monthProjected) * 100) * 10) / 10 : 0;

      annualTotalCollected += monthCollected;
      annualTotalProjected += monthProjected;

      monthsData.push({
        month: m,
        monthName: getMonthName(m),
        totalCollected: monthCollected,
        totalProjected: monthProjected,
        totalOverdue: monthOverdue,
        paymentCount: monthPayments.length,
        collectionRate,
      });
    }

    const averageCollectionRate =
      annualTotalProjected > 0
        ? Math.round(((annualTotalCollected / annualTotalProjected) * 100) * 10) / 10
        : 0;

    return {
      year: targetYear,
      annualTotalCollected,
      annualTotalProjected,
      annualTotalPayments: annualPayments.length,
      averageCollectionRate,
      months: monthsData,
    };
  } catch (error) {
    console.error('Error al obtener resumen anual de flujo de caja:', error);
    const fallbackYear = typeof year === 'number' && year >= 2020 ? year : new Date().getFullYear();
    return {
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
