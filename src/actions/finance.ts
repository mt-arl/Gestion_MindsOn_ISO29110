'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { TuitionFeeStatus } from '@prisma/client';

export type SerializedTuitionFee = {
  id: string;
  studentId: string;
  classId: string;
  month: number;
  year: number;
  dueDate: string;
  amount: number;
  status: TuitionFeeStatus;
  createdAt: string;
  updatedAt: string;
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
    status: string;
  };
  class: {
    id: string;
    code: string;
    name: string;
    modality: string;
    schedule: string;
    monthlyPrice: number;
  };
  payments: Array<{
    id: string;
    amountPaid: number;
    paymentDate: string;
    registeredBy: string;
    notes: string | null;
  }>;
};

export type FinancialMetrics = {
  totalPaid: number;
  paidCount: number;
  totalPending: number;
  pendingCount: number;
  totalOverdue: number;
  overdueCount: number;
  activeStudentsCount: number;
  overdueStudentsCount: number;
  upToDateStudentsCount: number;
  collectionRate: number; // Porcentaje de efectividad de cobranza
};

export type FinancialDashboardData = {
  metrics: FinancialMetrics;
  fees: SerializedTuitionFee[];
};

export type StudentFinancialHistory = {
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
    status: string;
    currentClass: {
      id: string;
      code: string;
      name: string;
      modality: string;
      schedule: string;
      monthlyPrice: number;
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

/**
 * 1. Sincroniza automáticamente a estado OVERDUE todas las mensualidades
 * que estén PENDING y cuya fecha límite (dueDate) ya haya pasado.
 */
export async function checkAndSyncOverdueFees(): Promise<{ updatedCount: number }> {
  try {
    const now = new Date();
    const result = await prisma.tuitionFee.updateMany({
      where: {
        status: TuitionFeeStatus.PENDING,
        dueDate: {
          lt: now,
        },
      },
      data: {
        status: TuitionFeeStatus.OVERDUE,
      },
    });

    return { updatedCount: result.count };
  } catch (error) {
    console.error('Error sincronizando mensualidades vencidas:', error);
    return { updatedCount: 0 };
  }
}

/**
 * 2. Obtiene los datos consolidados del Dashboard Financiero y Métricas del Mes
 */
export async function getFinancialDashboardData(): Promise<FinancialDashboardData> {
  // Sincronizar vencimientos antes de calcular
  await checkAndSyncOverdueFees();

  // Consultar todas las mensualidades con relaciones completas
  const tuitionFees = await prisma.tuitionFee.findMany({
    include: {
      student: true,
      class: true,
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

  // Consultar conteo de estudiantes activos
  const activeStudents = await prisma.student.findMany({
    where: { status: 'ACTIVE' },
    select: { id: true },
  });

  // Cálculos de métricas
  let totalPaid = 0;
  let paidCount = 0;
  let totalPending = 0;
  let pendingCount = 0;
  let totalOverdue = 0;
  let overdueCount = 0;

  const overdueStudentIdSet = new Set<string>();

  for (const fee of tuitionFees) {
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
      overdueStudentIdSet.add(fee.studentId);
    }
  }

  const activeStudentsCount = activeStudents.length;
  const overdueStudentsCount = overdueStudentIdSet.size;
  const upToDateStudentsCount = Math.max(0, activeStudentsCount - overdueStudentsCount);

  const totalBilled = totalPaid + totalPending + totalOverdue;
  const collectionRate = totalBilled > 0 ? (totalPaid / totalBilled) * 100 : 0;

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
    createdAt: fee.createdAt.toISOString(),
    updatedAt: fee.updatedAt.toISOString(),
    student: {
      id: fee.student.id,
      ci: fee.student.ci,
      firstName: fee.student.firstName,
      lastName: fee.student.lastName,
      email: fee.student.email,
      phone: fee.student.phone,
      guardianPhone1: fee.student.guardianPhone1,
      guardianPhone2: fee.student.guardianPhone2,
      address: fee.student.address,
      status: fee.student.status,
    },
    class: {
      id: fee.class.id,
      code: fee.class.code,
      name: fee.class.name,
      modality: fee.class.modality,
      schedule: fee.class.schedule,
      monthlyPrice: Number(fee.class.monthlyPrice),
    },
    payments: fee.payments.map((p) => ({
      id: p.id,
      amountPaid: Number(p.amountPaid),
      paymentDate: p.paymentDate.toISOString(),
      registeredBy: p.registeredBy,
      notes: p.notes,
    })),
  }));

  return {
    metrics: {
      totalPaid,
      paidCount,
      totalPending,
      pendingCount,
      totalOverdue,
      overdueCount,
      activeStudentsCount,
      overdueStudentsCount,
      upToDateStudentsCount,
      collectionRate: Math.round(collectionRate * 10) / 10,
    },
    fees: serializedFees,
  };
}

/**
 * 3. Registra el pago de una mensualidad en una transacción atómica
 */
export async function registerPaymentAction(
  tuitionFeeId: string,
  notes?: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!tuitionFeeId) {
      return { success: false, message: 'Identificador de mensualidad no proporcionado.' };
    }

    const fee = await prisma.tuitionFee.findUnique({
      where: { id: tuitionFeeId },
      include: { student: true },
    });

    if (!fee) {
      return { success: false, message: 'La mensualidad seleccionada no existe en el sistema.' };
    }

    if (fee.status === TuitionFeeStatus.PAID) {
      return { success: false, message: 'Esta mensualidad ya figura como pagada.' };
    }

    // Transacción atómica
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar estado de TuitionFee a PAID
      await tx.tuitionFee.update({
        where: { id: tuitionFeeId },
        data: {
          status: TuitionFeeStatus.PAID,
        },
      });

      // 2. Crear registro de pago
      await tx.payment.create({
        data: {
          tuitionFeeId: fee.id,
          amountPaid: fee.amount,
          paymentDate: new Date(),
          registeredBy: 'Administración MindsOn',
          notes: notes?.trim() || 'Pago regular registrado desde el panel de cobranza',
        },
      });
    });

    revalidatePath('/');
    revalidatePath('/students');
    return {
      success: true,
      message: `Pago de $${Number(fee.amount).toFixed(2)} para ${fee.student.firstName} ${fee.student.lastName} registrado exitosamente.`,
    };
  } catch (error) {
    console.error('Error al registrar pago:', error);
    return {
      success: false,
      message: 'Ocurrió un error interno al registrar el pago. Por favor intente nuevamente.',
    };
  }
}

/**
 * 4. Obtiene el historial financiero / Kardex completo de un estudiante
 */
export async function getStudentFinancialHistory(
  studentId: string
): Promise<{ success: boolean; data?: StudentFinancialHistory; message?: string }> {
  try {
    if (!studentId) {
      return { success: false, message: 'ID de estudiante no proporcionado.' };
    }

    // Sincronizar vencimientos
    await checkAndSyncOverdueFees();

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        currentClass: true,
        tuitionFees: {
          include: {
            class: true,
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

    const serializedFees: SerializedTuitionFee[] = student.tuitionFees.map((fee) => ({
      id: fee.id,
      studentId: fee.studentId,
      classId: fee.classId,
      month: fee.month,
      year: fee.year,
      dueDate: fee.dueDate.toISOString(),
      amount: Number(fee.amount),
      status: fee.status,
      createdAt: fee.createdAt.toISOString(),
      updatedAt: fee.updatedAt.toISOString(),
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
      },
      class: {
        id: fee.class.id,
        code: fee.class.code,
        name: fee.class.name,
        modality: fee.class.modality,
        schedule: fee.class.schedule,
        monthlyPrice: Number(fee.class.monthlyPrice),
      },
      payments: fee.payments.map((p) => ({
        id: p.id,
        amountPaid: Number(p.amountPaid),
        paymentDate: p.paymentDate.toISOString(),
        registeredBy: p.registeredBy,
        notes: p.notes,
      })),
    }));

    return {
      success: true,
      data: {
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
          currentClass: student.currentClass
            ? {
                id: student.currentClass.id,
                code: student.currentClass.code,
                name: student.currentClass.name,
                modality: student.currentClass.modality,
                schedule: student.currentClass.schedule,
                monthlyPrice: Number(student.currentClass.monthlyPrice),
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
