'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { 
  ClassModality, 
  StudentStatus, 
  TuitionFeeStatus,
  CourseLevel,
  CourseBook,
  ClassStatus
} from '@prisma/client';
import { getBookForLevel } from '@/lib/utils';
import { validateEcuadorianId, validateEcuadorianPhone } from '@/lib/ecuador-validators';
import { checkClassroomConflictForClass } from '@/lib/classroom-conflicts';

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
  level: CourseLevel;
  book: CourseBook;
  modality: ClassModality;
  classroom: string;
  classroomId: string | null;
  status: ClassStatus;
  recessStartedAt: string | null;
  recessReason: string | null;
  unitSchedule: string;
  speakingSchedule: string;
  unitTeacherId: string;
  unitTeacher: SerializedTeacher;
  speakingTeacherId: string;
  speakingTeacher: SerializedTeacher;
  studentsCount: number;
  createdAt: string;
};

export type SerializedStudent = {
  id: string;
  ci: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  guardianPhone1: string | null;
  guardianPhone2: string | null;
  enrollmentDate: string;
  nextPaymentDate: string | null;
  age: number;
  gender: string;
  address: string | null;
  status: StudentStatus;
  monthlyFee: number;
  hasDisability: boolean;
  disabilityDescription: string | null;
  notes: string | null;
  invoiceIdType: string | null;
  invoiceIdNumber: string | null;
  invoiceName: string | null;
  invoiceEmail: string | null;
  invoiceAddress: string | null;
  invoicePhone: string | null;
  currentClassId: string | null;
  currentClass: {
    id: string;
    code: string;
    name: string;
    level: CourseLevel;
    book: CourseBook;
    modality: ClassModality;
    classroom: string;
    status: ClassStatus;
    recessStartedAt: string | null;
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
 * 1. Obtiene la lista de clases con profesores (Unit y Speaking), estado de receso y conteo de alumnos
 */
export async function getClassesList(): Promise<SerializedClass[]> {
  try {
    const classes = await prisma.class.findMany({
      include: {
        classroom: true,
        unitTeacher: true,
        speakingTeacher: true,
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
      level: c.level,
      book: c.book,
      modality: c.modality,
      classroom: c.classroom?.name || 'Aula BRAZIL',
      classroomId: c.classroomId,
      status: c.status,
      recessStartedAt: c.recessStartedAt ? c.recessStartedAt.toISOString() : null,
      recessReason: c.recessReason,
      unitSchedule: c.unitSchedule,
      speakingSchedule: c.speakingSchedule,
      unitTeacherId: c.unitTeacherId,
      unitTeacher: {
        id: c.unitTeacher.id,
        ci: c.unitTeacher.ci,
        firstName: c.unitTeacher.firstName,
        lastName: c.unitTeacher.lastName,
        email: c.unitTeacher.email,
        phone: c.unitTeacher.phone,
      },
      speakingTeacherId: c.speakingTeacherId,
      speakingTeacher: {
        id: c.speakingTeacher.id,
        ci: c.speakingTeacher.ci,
        firstName: c.speakingTeacher.firstName,
        lastName: c.speakingTeacher.lastName,
        email: c.speakingTeacher.email,
        phone: c.speakingTeacher.phone,
      },
      studentsCount: c._count.students,
      createdAt: c.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error al obtener lista de clases:', error);
    return [];
  }
}

/**
 * 2. Registra una nueva clase en el sistema
 */
export async function createClassAction(data: {
  code: string;
  name: string;
  level: CourseLevel;
  book?: CourseBook;
  modality: ClassModality;
  classroom?: string;
  classroomId?: string | null;
  unitSchedule: string;
  speakingSchedule: string;
  unitTeacherId: string;
  speakingTeacherId: string;
}): Promise<{ success: boolean; message: string; classId?: string }> {
  try {
    const normalizedCode = data.code?.trim().toUpperCase();

    if (!normalizedCode || !data.name?.trim() || !data.unitTeacherId || !data.speakingTeacherId) {
      return { success: false, message: 'Código, Nombre, Docente Unit y Docente Speaking son obligatorios.' };
    }

    // Validar código único
    const existing = await prisma.class.findUnique({
      where: { code: normalizedCode },
    });

    if (existing) {
      return { success: false, message: `Ya existe una clase registrada con el código "${normalizedCode}".` };
    }

    // Resolver ID de Aula
    let resolvedClassroomId = data.classroomId || null;
    if (!resolvedClassroomId && data.classroom) {
      const found = await prisma.classroom.findFirst({
        where: {
          OR: [
            { id: data.classroom },
            { name: data.classroom },
          ],
        },
      });
      if (found) {
        resolvedClassroomId = found.id;
      }
    }

    // Validar conflicto de aula física
    if (resolvedClassroomId) {
      const conflictCheck = await checkClassroomConflictForClass(
        resolvedClassroomId,
        data.unitSchedule,
        data.speakingSchedule
      );
      if (conflictCheck.hasConflict) {
        return { success: false, message: conflictCheck.message! };
      }
    }

    const assignedBook = data.book || getBookForLevel(data.level);

    const newClass = await prisma.class.create({
      data: {
        code: normalizedCode,
        name: data.name.trim(),
        level: data.level,
        book: assignedBook,
        modality: data.modality,
        classroomId: resolvedClassroomId,
        status: ClassStatus.ACTIVE,
        unitSchedule: data.unitSchedule.trim(),
        speakingSchedule: data.speakingSchedule.trim(),
        unitTeacherId: data.unitTeacherId,
        speakingTeacherId: data.speakingTeacherId,
      },
    });

    revalidatePath('/classes');
    revalidatePath('/schedule');
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
 * 3. Actualiza una clase existente
 */
export async function updateClassAction(
  classId: string,
  data: {
    code: string;
    name: string;
    level: CourseLevel;
    book?: CourseBook;
    modality: ClassModality;
    classroom?: string;
    classroomId?: string | null;
    unitSchedule: string;
    speakingSchedule: string;
    unitTeacherId: string;
    speakingTeacherId: string;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    if (!classId) {
      return { success: false, message: 'ID de clase no proporcionado.' };
    }

    const normalizedCode = data.code.trim().toUpperCase();

    // Validar código único excluyendo esta clase
    const existing = await prisma.class.findFirst({
      where: {
        code: normalizedCode,
        NOT: { id: classId },
      },
    });

    if (existing) {
      return { success: false, message: `Ya existe otra clase con el código "${normalizedCode}".` };
    }

    // Resolver ID de Aula
    let resolvedClassroomId = data.classroomId || null;
    if (!resolvedClassroomId && data.classroom) {
      const found = await prisma.classroom.findFirst({
        where: {
          OR: [
            { id: data.classroom },
            { name: data.classroom },
          ],
        },
      });
      if (found) {
        resolvedClassroomId = found.id;
      }
    }

    // Validar conflicto de aula física
    if (resolvedClassroomId) {
      const conflictCheck = await checkClassroomConflictForClass(
        resolvedClassroomId,
        data.unitSchedule,
        data.speakingSchedule,
        classId
      );
      if (conflictCheck.hasConflict) {
        return { success: false, message: conflictCheck.message! };
      }
    }

    const assignedBook = data.book || getBookForLevel(data.level);

    const updated = await prisma.class.update({
      where: { id: classId },
      data: {
        code: normalizedCode,
        name: data.name.trim(),
        level: data.level,
        book: assignedBook,
        modality: data.modality,
        classroomId: resolvedClassroomId,
        unitSchedule: data.unitSchedule.trim(),
        speakingSchedule: data.speakingSchedule.trim(),
        unitTeacherId: data.unitTeacherId,
        speakingTeacherId: data.speakingTeacherId,
      },
    });

    revalidatePath('/classes');
    revalidatePath('/students');
    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `Clase "${updated.name}" actualizada exitosamente.`,
    };
  } catch (error) {
    console.error('Error al actualizar clase:', error);
    return { success: false, message: 'Error interno al actualizar la clase.' };
  }
}

/**
 * 4. Pausa / Pone en receso una clase (Congela ciclo contable de sus alumnos)
 */
export async function pauseClassAction(
  classId: string,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  try {
    if (!classId) {
      return { success: false, message: 'ID de clase no proporcionado.' };
    }

    const updated = await prisma.class.update({
      where: { id: classId },
      data: {
        status: ClassStatus.IN_RECESS,
        recessStartedAt: new Date(),
        recessReason: reason?.trim() || null,
      },
    });

    revalidatePath('/classes');
    revalidatePath('/students');
    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `El curso "${updated.name}" (${updated.code}) ha entrado en receso. Los cobros automáticos quedan pausados.`,
    };
  } catch (error) {
    console.error('Error al pausar clase:', error);
    return { success: false, message: 'Error interno al pausar la clase.' };
  }
}

/**
 * 5. Reactiva una clase en receso y recalcula el próximo cobro (+1 mes) para sus alumnos
 */
export async function resumeClassAction(
  classId: string,
  resumeDate?: string | Date
): Promise<{ success: boolean; message: string; updatedStudentsCount: number }> {
  try {
    if (!classId) {
      return { success: false, message: 'ID de clase no proporcionado.', updatedStudentsCount: 0 };
    }

    const effectiveResumeDate = resumeDate ? new Date(resumeDate) : new Date();

    // Fecha del próximo pago: 1 mes a partir de la fecha de reactivación
    const nextPaymentDate = new Date(effectiveResumeDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);

    const targetMonth = nextPaymentDate.getMonth() + 1;
    const targetYear = nextPaymentDate.getFullYear();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Reactivar la clase
      const updatedClass = await tx.class.update({
        where: { id: classId },
        data: {
          status: ClassStatus.ACTIVE,
          recessStartedAt: null,
          recessReason: null,
        },
      });

      // 2. Buscar estudiantes activos en esta clase
      const activeStudents = await tx.student.findMany({
        where: {
          currentClassId: classId,
          status: StudentStatus.ACTIVE,
        },
      });

      // 3. Actualizar fecha de cobro y generar cuota PENDING para cada estudiante
      for (const student of activeStudents) {
        await tx.student.update({
          where: { id: student.id },
          data: {
            nextPaymentDate: nextPaymentDate,
          },
        });

        // Verificar si ya existe cuota para ese periodo
        const existingFee = await tx.tuitionFee.findUnique({
          where: {
            student_class_period_unique: {
              studentId: student.id,
              classId: classId,
              month: targetMonth,
              year: targetYear,
            },
          },
        });

        if (!existingFee) {
          await tx.tuitionFee.create({
            data: {
              studentId: student.id,
              classId: classId,
              month: targetMonth,
              year: targetYear,
              dueDate: nextPaymentDate,
              amount: student.monthlyFee,
              status: TuitionFeeStatus.PENDING,
            },
          });
        }
      }

      return {
        className: updatedClass.name,
        classCode: updatedClass.code,
        studentsCount: activeStudents.length,
      };
    });

    revalidatePath('/classes');
    revalidatePath('/students');
    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `Curso "${result.className}" reactivado exitosamente. Próximo cobro fijado para el ${nextPaymentDate.toLocaleDateString('es-ES')} (${result.studentsCount} alumnos actualizados).`,
      updatedStudentsCount: result.studentsCount,
    };
  } catch (error) {
    console.error('Error al reactivar clase:', error);
    return { success: false, message: 'Error interno al reactivar la clase.', updatedStudentsCount: 0 };
  }
}

/**
 * 6. Obtiene la lista de estudiantes con discapacidad, notas, mensualidad individual y estado de cuentas
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
        currentClass: {
          include: {
            classroom: true,
          },
        },
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
        nextPaymentDate: s.nextPaymentDate ? s.nextPaymentDate.toISOString() : null,
        age: s.age,
        gender: s.gender,
        address: s.address,
        status: s.status,
        monthlyFee: Number(s.monthlyFee),
        hasDisability: s.hasDisability,
        disabilityDescription: s.disabilityDescription,
        notes: s.notes,
        invoiceIdType: s.invoiceIdType,
        invoiceIdNumber: s.invoiceIdNumber,
        invoiceName: s.invoiceName,
        invoiceEmail: s.invoiceEmail,
        invoiceAddress: s.invoiceAddress,
        invoicePhone: s.invoicePhone,
        currentClassId: s.currentClassId,
        currentClass: s.currentClass
          ? {
              id: s.currentClass.id,
              code: s.currentClass.code,
              name: s.currentClass.name,
              level: s.currentClass.level,
              book: s.currentClass.book,
              modality: s.currentClass.modality,
              classroom: s.currentClass.classroom?.name || 'Aula BRAZIL',
              status: s.currentClass.status,
              recessStartedAt: s.currentClass.recessStartedAt ? s.currentClass.recessStartedAt.toISOString() : null,
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
 * 7. Registra un nuevo estudiante con validaciones ecuatorianas oficiales y campos de discapacidad/notas
 */
export async function createStudentAction(data: {
  ci?: string | null;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  guardianPhone1?: string | null;
  guardianPhone2?: string | null;
  age: number;
  gender: string;
  address?: string | null;
  monthlyFee: number;
  hasDisability?: boolean;
  disabilityDescription?: string | null;
  notes?: string | null;
  invoiceIdType?: string | null;
  invoiceIdNumber?: string | null;
  invoiceName?: string | null;
  invoiceEmail?: string | null;
  invoiceAddress?: string | null;
  invoicePhone?: string | null;
  currentClassId?: string | null;
  customFirstPaymentDate?: string;
}): Promise<{ success: boolean; message: string; studentId?: string }> {
  try {
    const ciClean = data.ci?.trim() ? data.ci.trim() : null;
    const emailClean = data.email?.trim().toLowerCase();
    const firstNameClean = data.firstName?.trim();
    const lastNameClean = data.lastName?.trim();
    const phoneClean = data.phone?.trim();

    if (!firstNameClean || !lastNameClean || !emailClean || !phoneClean) {
      return { success: false, message: 'Nombres, Apellidos, Correo y Celular son campos requeridos.' };
    }

    // 1. Validación de Cédula Ecuatoriana (Algoritmo Módulo 10) si se proporciona
    if (ciClean) {
      const idValidation = validateEcuadorianId(ciClean);
      if (!idValidation.isValid) {
        return { success: false, message: idValidation.error || 'Cédula de identidad ecuatoriana inválida.' };
      }

      // Validar unicidad de CI
      const existingCi = await prisma.student.findUnique({ where: { ci: ciClean } });
      if (existingCi) {
        return { success: false, message: `Ya existe un estudiante registrado con la cédula "${ciClean}".` };
      }
    }

    // 2. Validación de Celulares Ecuatorianos
    const phoneValidation = validateEcuadorianPhone(phoneClean);
    if (!phoneValidation.isValid) {
      return { success: false, message: phoneValidation.error || 'Número de celular del estudiante inválido.' };
    }

    if (data.guardianPhone1?.trim()) {
      const gPhone1Validation = validateEcuadorianPhone(data.guardianPhone1.trim());
      if (!gPhone1Validation.isValid) {
        return { success: false, message: `Celular de Tutor 1 inválido: ${gPhone1Validation.error}` };
      }
    }

    if (data.guardianPhone2?.trim()) {
      const gPhone2Validation = validateEcuadorianPhone(data.guardianPhone2.trim());
      if (!gPhone2Validation.isValid) {
        return { success: false, message: `Celular de Tutor 2 inválido: ${gPhone2Validation.error}` };
      }
    }

    if (isNaN(data.monthlyFee) || data.monthlyFee < 0) {
      return { success: false, message: 'La mensualidad individual debe ser un monto válido mayor o igual a 0.' };
    }

    if (data.hasDisability && !data.disabilityDescription?.trim()) {
      return { success: false, message: 'Si el estudiante presenta alguna discapacidad, debes ingresar la descripción o adaptaciones requeridas.' };
    }

    const existingEmail = await prisma.student.findUnique({ where: { email: emailClean } });
    if (existingEmail) {
      return { success: false, message: `Ya existe un estudiante registrado con el correo "${emailClean}".` };
    }

    const enrollmentDate = new Date();
    let nextPaymentDate: Date;
    if (data.customFirstPaymentDate && data.customFirstPaymentDate.trim()) {
      const parts = data.customFirstPaymentDate.trim().split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        nextPaymentDate = new Date(y, m - 1, d, 12, 0, 0);
      } else {
        nextPaymentDate = new Date(enrollmentDate);
        nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
      }
    } else {
      nextPaymentDate = new Date(enrollmentDate);
      nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    }

    // Transacción para crear estudiante y generar cuota si aplica
    const student = await prisma.$transaction(async (tx) => {
      const newStudent = await tx.student.create({
        data: {
          ci: ciClean,
          firstName: firstNameClean,
          lastName: lastNameClean,
          email: emailClean,
          phone: phoneClean,
          guardianPhone1: data.guardianPhone1?.trim() || null,
          guardianPhone2: data.guardianPhone2?.trim() || null,
          enrollmentDate: enrollmentDate,
          nextPaymentDate: nextPaymentDate,
          age: Number(data.age) || 18,
          gender: data.gender || 'No especificado',
          address: data.address?.trim() || null,
          status: StudentStatus.ACTIVE,
          monthlyFee: data.monthlyFee,
          hasDisability: Boolean(data.hasDisability),
          disabilityDescription: data.hasDisability ? (data.disabilityDescription?.trim() || null) : null,
          notes: data.notes?.trim() || null,
          invoiceIdType: data.invoiceIdType || 'CEDULA',
          invoiceIdNumber: data.invoiceIdNumber?.trim() || null,
          invoiceName: data.invoiceName?.trim() || null,
          invoiceEmail: data.invoiceEmail?.trim() || null,
          invoiceAddress: data.invoiceAddress?.trim() || null,
          invoicePhone: data.invoicePhone?.trim() || null,
          currentClassId: data.currentClassId?.trim() || null,
        },
      });

      // Si tiene clase asignada y no está en receso, generar cuota PENDING con vencimiento en nextPaymentDate
      if (data.currentClassId?.trim()) {
        const assignedClass = await tx.class.findUnique({
          where: { id: data.currentClassId.trim() },
        });

        if (assignedClass && assignedClass.status !== ClassStatus.IN_RECESS) {
          const targetMonth = nextPaymentDate.getMonth() + 1;
          const targetYear = nextPaymentDate.getFullYear();

          await tx.tuitionFee.create({
            data: {
              studentId: newStudent.id,
              classId: assignedClass.id,
              month: targetMonth,
              year: targetYear,
              dueDate: nextPaymentDate,
              amount: newStudent.monthlyFee,
              status: TuitionFeeStatus.PENDING,
            },
          });
        }
      }

      return newStudent;
    });

    revalidatePath('/students');
    revalidatePath('/classes');
    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `Estudiante ${student.firstName} ${student.lastName} registrado exitosamente con mensualidad de $${data.monthlyFee.toFixed(2)} USD. Próximo cobro: ${nextPaymentDate.toLocaleDateString('es-ES')}.`,
      studentId: student.id,
    };
  } catch (error) {
    console.error('Error al registrar estudiante:', error);
    return { success: false, message: 'Error interno al registrar estudiante. Verifique los datos.' };
  }
}

/**
 * 8. Actualiza los datos de un estudiante con validaciones ecuatorianas y campos de discapacidad/notas
 */
export async function updateStudentAction(
  studentId: string,
  data: {
    ci?: string | null;
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
    monthlyFee: number;
    hasDisability?: boolean;
    disabilityDescription?: string | null;
    notes?: string | null;
    invoiceIdType?: string | null;
    invoiceIdNumber?: string | null;
    invoiceName?: string | null;
    invoiceEmail?: string | null;
    invoiceAddress?: string | null;
    invoicePhone?: string | null;
    currentClassId?: string | null;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    if (!studentId) {
      return { success: false, message: 'ID de estudiante no proporcionado.' };
    }

    const ciClean = data.ci?.trim() ? data.ci.trim() : null;
    const emailClean = data.email?.trim().toLowerCase();
    const firstNameClean = data.firstName?.trim();
    const lastNameClean = data.lastName?.trim();
    const phoneClean = data.phone?.trim();

    if (!firstNameClean || !lastNameClean || !emailClean || !phoneClean) {
      return { success: false, message: 'Nombres, Apellidos, Correo y Celular son requeridos.' };
    }

    // 1. Validación de Cédula Ecuatoriana si fue provista
    if (ciClean) {
      const idValidation = validateEcuadorianId(ciClean);
      if (!idValidation.isValid) {
        return { success: false, message: idValidation.error || 'Cédula de identidad ecuatoriana inválida.' };
      }

      // Validar que CI no pertenezca a otro estudiante
      const existingCi = await prisma.student.findFirst({
        where: {
          ci: ciClean,
          NOT: { id: studentId },
        },
      });
      if (existingCi) {
        return { success: false, message: `La cédula "${ciClean}" ya está en uso por otro estudiante.` };
      }
    }

    // 2. Validación de Celulares Ecuatorianos
    const phoneValidation = validateEcuadorianPhone(phoneClean);
    if (!phoneValidation.isValid) {
      return { success: false, message: phoneValidation.error || 'Número de celular del estudiante inválido.' };
    }

    if (data.guardianPhone1?.trim()) {
      const gPhone1Validation = validateEcuadorianPhone(data.guardianPhone1.trim());
      if (!gPhone1Validation.isValid) {
        return { success: false, message: `Celular de Tutor 1 inválido: ${gPhone1Validation.error}` };
      }
    }

    if (data.guardianPhone2?.trim()) {
      const gPhone2Validation = validateEcuadorianPhone(data.guardianPhone2.trim());
      if (!gPhone2Validation.isValid) {
        return { success: false, message: `Celular de Tutor 2 inválido: ${gPhone2Validation.error}` };
      }
    }

    if (isNaN(data.monthlyFee) || data.monthlyFee < 0) {
      return { success: false, message: 'La mensualidad individual debe ser un monto válido.' };
    }

    if (data.hasDisability && !data.disabilityDescription?.trim()) {
      return { success: false, message: 'Si el estudiante presenta alguna discapacidad, debes ingresar la descripción correspondiente.' };
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
        firstName: firstNameClean,
        lastName: lastNameClean,
        email: emailClean,
        phone: phoneClean,
        guardianPhone1: data.guardianPhone1?.trim() || null,
        guardianPhone2: data.guardianPhone2?.trim() || null,
        age: Number(data.age) || 18,
        gender: data.gender || 'No especificado',
        address: data.address?.trim() || null,
        status: data.status,
        monthlyFee: data.monthlyFee,
        hasDisability: Boolean(data.hasDisability),
        disabilityDescription: data.hasDisability ? (data.disabilityDescription?.trim() || null) : null,
        notes: data.notes?.trim() || null,
        invoiceIdType: data.invoiceIdType || 'CEDULA',
        invoiceIdNumber: data.invoiceIdNumber?.trim() || null,
        invoiceName: data.invoiceName?.trim() || null,
        invoiceEmail: data.invoiceEmail?.trim() || null,
        invoiceAddress: data.invoiceAddress?.trim() || null,
        invoicePhone: data.invoicePhone?.trim() || null,
        currentClassId: data.currentClassId?.trim() || null,
      },
    });

    revalidatePath('/students');
    revalidatePath('/classes');
    revalidatePath('/schedule');
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

/**
 * 9. Genera masivamente las cuotas del mes para todos los estudiantes activos (excluye clases en receso)
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

    // Obtener todos los estudiantes activos con clase asignada y que NO esté en receso
    const activeStudents = await prisma.student.findMany({
      where: {
        status: StudentStatus.ACTIVE,
        currentClassId: { not: null },
        currentClass: {
          status: { not: ClassStatus.IN_RECESS },
        },
      },
      include: {
        currentClass: true,
      },
    });

    if (activeStudents.length === 0) {
      return {
        success: true,
        message: 'No hay estudiantes activos en clases operativas (no en receso) para generar mensualidades.',
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
            amount: student.monthlyFee,
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
      message: `Proceso completado para ${monthName} ${year}: Se crearon ${createdCount} cuotas nuevas (${skippedCount} ya existían o fueron omitidas).`,
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
