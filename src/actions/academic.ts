'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { ClassModality, StudentStatus, TuitionFeeStatus } from '@prisma/client';

export type SerializedTeacher = {
  id: string;
  ci: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
};

export type SerializedClass = {
  id: string;
  code: string;
  name: string;
  modality: ClassModality;
  schedule: string;
  monthlyPrice: number;
  primaryTeacherId: string;
  primaryTeacher: SerializedTeacher;
  assistantTeacherId: string | null;
  assistantTeacher: SerializedTeacher | null;
  studentsCount: number;
  createdAt: string;
};

export type SerializedStudent = {
  id: string;
  ci: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  guardianPhone1: string | null;
  guardianPhone2: string | null;
  enrollmentDate: string;
  age: number;
  gender: string;
  address: string | null;
  status: StudentStatus;
  currentClassId: string | null;
  currentClass: {
    id: string;
    code: string;
    name: string;
    modality: ClassModality;
    monthlyPrice: number;
  } | null;
  tuitionFeesCount: number;
  pendingOrOverdueCount: number;
  createdAt: string;
};

/**
 * Obtiene la lista de profesores registrados
 */
export async function getTeachersList(): Promise<SerializedTeacher[]> {
  try {
    const teachers = await prisma.teacher.findMany({
      orderBy: { lastName: 'asc' },
    });
    return teachers.map((t) => ({
      id: t.id,
      ci: t.ci,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: t.phone,
    }));
  } catch (error) {
    console.error('Error al obtener lista de profesores:', error);
    return [];
  }
}

/**
 * 1. Obtiene la lista de clases con profesores y conteo de alumnos
 */
export async function getClassesList(): Promise<SerializedClass[]> {
  try {
    const classes = await prisma.class.findMany({
      include: {
        primaryTeacher: true,
        assistantTeacher: true,
        _count: {
          select: { students: true },
        },
      },
      orderBy: { code: 'asc' },
    });

    return classes.map((c) => ({
      id: c.id,
      code: c.code,
      name: c.name,
      modality: c.modality,
      schedule: c.schedule,
      monthlyPrice: Number(c.monthlyPrice),
      primaryTeacherId: c.primaryTeacherId,
      primaryTeacher: {
        id: c.primaryTeacher.id,
        ci: c.primaryTeacher.ci,
        firstName: c.primaryTeacher.firstName,
        lastName: c.primaryTeacher.lastName,
        email: c.primaryTeacher.email,
        phone: c.primaryTeacher.phone,
      },
      assistantTeacherId: c.assistantTeacherId,
      assistantTeacher: c.assistantTeacher
        ? {
            id: c.assistantTeacher.id,
            ci: c.assistantTeacher.ci,
            firstName: c.assistantTeacher.firstName,
            lastName: c.assistantTeacher.lastName,
            email: c.assistantTeacher.email,
            phone: c.assistantTeacher.phone,
          }
        : null,
      studentsCount: c._count.students,
      createdAt: c.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error al obtener clases:', error);
    return [];
  }
}

/**
 * 2. Crea una nueva clase
 */
export async function createClassAction(data: {
  code: string;
  name: string;
  modality: ClassModality;
  schedule: string;
  monthlyPrice: number;
  primaryTeacherId: string;
  assistantTeacherId?: string | null;
}): Promise<{ success: boolean; message: string; classId?: string }> {
  try {
    if (!data.code?.trim() || !data.name?.trim() || !data.primaryTeacherId) {
      return { success: false, message: 'El código, nombre y profesor titular son obligatorios.' };
    }

    if (isNaN(data.monthlyPrice) || data.monthlyPrice <= 0) {
      return { success: false, message: 'El precio mensual debe ser un valor numérico mayor a 0.' };
    }

    const normalizedCode = data.code.trim().toUpperCase();

    // Validar código único
    const existing = await prisma.class.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      return { success: false, message: `Ya existe una clase con el código "${normalizedCode}".` };
    }

    const newClass = await prisma.class.create({
      data: {
        code: normalizedCode,
        name: data.name.trim(),
        modality: data.modality,
        schedule: data.schedule.trim(),
        monthlyPrice: data.monthlyPrice,
        primaryTeacherId: data.primaryTeacherId,
        assistantTeacherId: data.assistantTeacherId?.trim() || null,
      },
    });

    revalidatePath('/classes');
    revalidatePath('/students');
    revalidatePath('/');

    return {
      success: true,
      message: `Clase "${newClass.name}" (${newClass.code}) creada exitosamente.`,
      classId: newClass.id,
    };
  } catch (error) {
    console.error('Error al crear clase:', error);
    return { success: false, message: 'Error interno al crear la clase. Intente nuevamente.' };
  }
}

/**
 * 3. Obtiene la lista de estudiantes con su clase y estado de cuentas
 */
export async function getStudentsList(
  search?: string,
  filterClassId?: string
): Promise<SerializedStudent[]> {
  try {
    const whereCondition: Record<string, unknown> = {};

    if (filterClassId && filterClassId !== 'ALL') {
      whereCondition.currentClassId = filterClassId;
    }

    if (search?.trim()) {
      const query = search.trim();
      whereCondition.OR = [
        { firstName: { contains: query, mode: 'insensitive' } },
        { lastName: { contains: query, mode: 'insensitive' } },
        { ci: { contains: query, mode: 'insensitive' } },
        { email: { contains: query, mode: 'insensitive' } },
        { phone: { contains: query, mode: 'insensitive' } },
      ];
    }

    const students = await prisma.student.findMany({
      where: whereCondition,
      include: {
        currentClass: true,
        tuitionFees: {
          select: { status: true },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    return students.map((s) => {
      const pendingOrOverdueCount = s.tuitionFees.filter(
        (f) => f.status === TuitionFeeStatus.PENDING || f.status === TuitionFeeStatus.OVERDUE
      ).length;

      return {
        id: s.id,
        ci: s.ci,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone,
        guardianPhone1: s.guardianPhone1,
        guardianPhone2: s.guardianPhone2,
        enrollmentDate: s.enrollmentDate.toISOString(),
        age: s.age,
        gender: s.gender,
        address: s.address,
        status: s.status,
        currentClassId: s.currentClassId,
        currentClass: s.currentClass
          ? {
              id: s.currentClass.id,
              code: s.currentClass.code,
              name: s.currentClass.name,
              modality: s.currentClass.modality,
              monthlyPrice: Number(s.currentClass.monthlyPrice),
            }
          : null,
        tuitionFeesCount: s.tuitionFees.length,
        pendingOrOverdueCount,
        createdAt: s.createdAt.toISOString(),
      };
    });
  } catch (error) {
    console.error('Error al obtener lista de estudiantes:', error);
    return [];
  }
}

/**
 * 4. Registra un nuevo estudiante y genera su cuota inicial si tiene clase asignada
 */
export async function createStudentAction(data: {
  ci: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  guardianPhone1?: string | null;
  guardianPhone2?: string | null;
  age: number;
  gender: string;
  address?: string | null;
  currentClassId?: string | null;
}): Promise<{ success: boolean; message: string; studentId?: string }> {
  try {
    const ciClean = data.ci?.trim();
    const emailClean = data.email?.trim().toLowerCase();

    if (!ciClean || !data.firstName?.trim() || !data.lastName?.trim() || !emailClean || !data.phone?.trim()) {
      return { success: false, message: 'CI, Nombres, Apellidos, Correo y Celular son requeridos.' };
    }

    // Validar unicidad de CI y Email
    const existingCi = await prisma.student.findUnique({ where: { ci: ciClean } });
    if (existingCi) {
      return { success: false, message: `Ya existe un estudiante registrado con el CI "${ciClean}".` };
    }

    const existingEmail = await prisma.student.findUnique({ where: { email: emailClean } });
    if (existingEmail) {
      return { success: false, message: `Ya existe un estudiante registrado con el correo "${emailClean}".` };
    }

    // Transacción para crear estudiante y generar cuota si aplica
    const student = await prisma.$transaction(async (tx) => {
      const newStudent = await tx.student.create({
        data: {
          ci: ciClean,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim(),
          email: emailClean,
          phone: data.phone.trim(),
          guardianPhone1: data.guardianPhone1?.trim() || null,
          guardianPhone2: data.guardianPhone2?.trim() || null,
          age: Number(data.age) || 18,
          gender: data.gender || 'No especificado',
          address: data.address?.trim() || null,
          status: StudentStatus.ACTIVE,
          currentClassId: data.currentClassId?.trim() || null,
        },
      });

      // Si tiene clase asignada, generar automáticamente la cuota PENDING del mes actual
      if (data.currentClassId?.trim()) {
        const assignedClass = await tx.class.findUnique({
          where: { id: data.currentClassId.trim() },
        });

        if (assignedClass) {
          const now = new Date();
          const currentMonth = now.getMonth() + 1;
          const currentYear = now.getFullYear();
          // Vencimiento estándar: día 25 del mes actual
          const dueDate = new Date(currentYear, currentMonth - 1, 25, 23, 59, 59);

          await tx.tuitionFee.create({
            data: {
              studentId: newStudent.id,
              classId: assignedClass.id,
              month: currentMonth,
              year: currentYear,
              dueDate: dueDate,
              amount: assignedClass.monthlyPrice,
              status: TuitionFeeStatus.PENDING,
            },
          });
        }
      }

      return newStudent;
    });

    revalidatePath('/students');
    revalidatePath('/classes');
    revalidatePath('/');

    return {
      success: true,
      message: `Estudiante ${student.firstName} ${student.lastName} registrado exitosamente.`,
      studentId: student.id,
    };
  } catch (error) {
    console.error('Error al registrar estudiante:', error);
    return { success: false, message: 'Error interno al registrar estudiante. Verifique los datos.' };
  }
}

/**
 * 5. Genera masivamente las cuotas del mes para todos los estudiantes activos con clase
 */
export async function generateMonthlyTuitionsAction(
  month: number,
  year: number,
  dueDay: number = 10
): Promise<{
  success: boolean;
  message: string;
  createdCount: number;
  skippedCount: number;
}> {
  try {
    if (month < 1 || month > 12) {
      return { success: false, message: 'Mes inválido (debe estar entre 1 y 12).', createdCount: 0, skippedCount: 0 };
    }

    if (year < 2020 || year > 2100) {
      return { success: false, message: 'Año inválido.', createdCount: 0, skippedCount: 0 };
    }

    // Obtener todos los estudiantes activos que tengan una clase asignada
    const activeStudents = await prisma.student.findMany({
      where: {
        status: StudentStatus.ACTIVE,
        currentClassId: { not: null },
      },
      include: {
        currentClass: true,
      },
    });

    if (activeStudents.length === 0) {
      return {
        success: true,
        message: 'No hay estudiantes activos con clase asignada para generar mensualidades.',
        createdCount: 0,
        skippedCount: 0,
      };
    }

    // Calcular fecha límite para el mes/año indicado
    const validDueDay = Math.min(Math.max(1, dueDay), 28);
    const dueDate = new Date(year, month - 1, validDueDay, 23, 59, 59);
    const now = new Date();
    const initialStatus = dueDate < now ? TuitionFeeStatus.OVERDUE : TuitionFeeStatus.PENDING;

    let createdCount = 0;
    let skippedCount = 0;

    for (const student of activeStudents) {
      if (!student.currentClassId || !student.currentClass) continue;

      // Comprobar si ya existe la cuota del periodo
      const existingFee = await prisma.tuitionFee.findUnique({
        where: {
          student_class_period_unique: {
            studentId: student.id,
            classId: student.currentClassId,
            month: month,
            year: year,
          },
        },
      });

      if (existingFee) {
        skippedCount++;
      } else {
        await prisma.tuitionFee.create({
          data: {
            studentId: student.id,
            classId: student.currentClassId,
            month: month,
            year: year,
            dueDate: dueDate,
            amount: student.currentClass.monthlyPrice,
            status: initialStatus,
          },
        });
        createdCount++;
      }
    }

    revalidatePath('/');
    revalidatePath('/students');

    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const monthName = months[month - 1];

    return {
      success: true,
      message: `Proceso completado para ${monthName} ${year}: Se crearon ${createdCount} cuotas nuevas (${skippedCount} ya existían).`,
      createdCount,
      skippedCount,
    };
  } catch (error) {
    console.error('Error al generar cuotas mensuales:', error);
    return {
      success: false,
      message: 'Ocurrió un error inesperado durante la generación masiva de cuotas.',
      createdCount: 0,
      skippedCount: 0,
    };
  }
}

/**
 * 6. Actualiza los datos de un estudiante (incluyendo cambio de clase/módulo y estado)
 */
export async function updateStudentAction(
  studentId: string,
  data: {
    ci: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    guardianPhone1?: string | null;
    guardianPhone2?: string | null;
    age: number;
    gender: string;
    address?: string | null;
    status: StudentStatus;
    currentClassId?: string | null;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    if (!studentId) {
      return { success: false, message: 'ID de estudiante no proporcionado.' };
    }

    const ciClean = data.ci?.trim();
    const emailClean = data.email?.trim().toLowerCase();

    if (!ciClean || !data.firstName?.trim() || !data.lastName?.trim() || !emailClean || !data.phone?.trim()) {
      return { success: false, message: 'CI, Nombres, Apellidos, Correo y Celular son requeridos.' };
    }

    // Validar que CI no pertenezca a otro estudiante
    const existingCi = await prisma.student.findFirst({
      where: {
        ci: ciClean,
        NOT: { id: studentId },
      },
    });
    if (existingCi) {
      return { success: false, message: `El CI "${ciClean}" ya está en uso por otro estudiante.` };
    }

    // Validar que Email no pertenezca a otro estudiante
    const existingEmail = await prisma.student.findFirst({
      where: {
        email: emailClean,
        NOT: { id: studentId },
      },
    });
    if (existingEmail) {
      return { success: false, message: `El correo "${emailClean}" ya está en uso por otro estudiante.` };
    }

    const updatedStudent = await prisma.student.update({
      where: { id: studentId },
      data: {
        ci: ciClean,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: emailClean,
        phone: data.phone.trim(),
        guardianPhone1: data.guardianPhone1?.trim() || null,
        guardianPhone2: data.guardianPhone2?.trim() || null,
        age: Number(data.age) || 18,
        gender: data.gender || 'No especificado',
        address: data.address?.trim() || null,
        status: data.status,
        currentClassId: data.currentClassId?.trim() || null,
      },
    });

    revalidatePath('/students');
    revalidatePath('/classes');
    revalidatePath('/');

    return {
      success: true,
      message: `Estudiante ${updatedStudent.firstName} ${updatedStudent.lastName} actualizado exitosamente.`,
    };
  } catch (error) {
    console.error('Error al actualizar estudiante:', error);
    return { success: false, message: 'Error interno al actualizar los datos del estudiante.' };
  }
}

