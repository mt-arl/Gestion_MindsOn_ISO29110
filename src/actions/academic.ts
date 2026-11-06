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
import { ensureDefaultBooksAndLinkClasses } from '@/actions/books';
import { requireAuth } from '@/lib/require-auth';
import { issueMonthlyTuitions, syncMonthlyTuitions, updateStudentTuitionDeadlines, withTuitionTransaction } from '@/lib/tuition-billing';
import { parseTuitionDateInput, TUITION_TIME_ZONE, tuitionDay, tuitionPeriod, upcomingTuitionDate } from '@/lib/tuition-dates';

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
  bookId: string | null;
  bookRef: {
    id: string;
    name: string;
    shortName: string;
    levelsLabel: string | null;
    colorTheme: string;
  } | null;
  modality: ClassModality;
  classroom: string;
  classroomId: string | null;
  status: ClassStatus;
  recessStartedAt: string | null;
  recessReason: string | null;
  unitSchedule: string;
  speakingSchedule: string | null;
  unitTeacherId: string;
  unitTeacher: SerializedTeacher;
  speakingTeacherId: string | null;
  speakingTeacher: SerializedTeacher | null;
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
    await requireAuth();
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
    await requireAuth();
    await ensureDefaultBooksAndLinkClasses();

    const classes = await prisma.class.findMany({
      include: {
        classroom: true,
        bookRef: true,
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
      bookId: c.bookId,
      bookRef: c.bookRef ? {
        id: c.bookRef.id,
        name: c.bookRef.name,
        shortName: c.bookRef.shortName,
        levelsLabel: c.bookRef.levelsLabel,
        colorTheme: c.bookRef.colorTheme,
      } : null,
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
      speakingTeacherId: c.speakingTeacherId || null,
      speakingTeacher: c.speakingTeacher ? {
        id: c.speakingTeacher.id,
        ci: c.speakingTeacher.ci,
        firstName: c.speakingTeacher.firstName,
        lastName: c.speakingTeacher.lastName,
        email: c.speakingTeacher.email,
        phone: c.speakingTeacher.phone,
      } : null,
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
  bookId?: string | null;
  modality: ClassModality;
  classroom?: string;
  classroomId?: string | null;
  unitSchedule: string;
  speakingSchedule?: string | null;
  unitTeacherId: string;
  speakingTeacherId?: string | null;
}): Promise<{ success: boolean; message: string; classId?: string }> {
  try {
    await requireAuth();
    const normalizedCode = data.code?.trim().toUpperCase();
    const isPresencial = data.modality === ClassModality.PRESENCIAL;

    if (!normalizedCode || !data.name?.trim() || !data.unitTeacherId) {
      return { success: false, message: 'Código, Nombre y Docente Unit son obligatorios.' };
    }

    if (!isPresencial && !data.speakingTeacherId) {
      return { success: false, message: 'Para cursos virtuales o híbridos, el Docente Speaking es obligatorio.' };
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

    const effectiveSpeakingSchedule = isPresencial ? undefined : (data.speakingSchedule?.trim() || undefined);

    // Validar conflicto de aula física
    if (resolvedClassroomId) {
      const conflictCheck = await checkClassroomConflictForClass(
        resolvedClassroomId,
        data.unitSchedule,
        effectiveSpeakingSchedule
      );
      if (conflictCheck.hasConflict) {
        return { success: false, message: conflictCheck.message! };
      }
    }

    let resolvedBookId = data.bookId || null;
    let assignedBook = data.book || getBookForLevel(data.level);

    if (resolvedBookId) {
      const selectedBook = await prisma.book.findUnique({ where: { id: resolvedBookId } });
      if (selectedBook) {
        const sName = selectedBook.shortName.toLowerCase();
        if (sName.includes('amarillo')) assignedBook = CourseBook.AMARILLO;
        else if (sName.includes('rojo')) assignedBook = CourseBook.ROJO;
        else if (sName.includes('azul')) assignedBook = CourseBook.AZUL;
      }
    } else if (assignedBook) {
      const matchingBook = await prisma.book.findFirst({
        where: {
          OR: [
            { shortName: { equals: assignedBook === CourseBook.AMARILLO ? 'Amarillo' : assignedBook === CourseBook.ROJO ? 'Rojo' : 'Azul', mode: 'insensitive' } },
            { name: { contains: assignedBook === CourseBook.AMARILLO ? 'Amarillo' : assignedBook === CourseBook.ROJO ? 'Rojo' : 'Azul', mode: 'insensitive' } },
          ],
        },
      });
      if (matchingBook) {
        resolvedBookId = matchingBook.id;
      }
    }

    const newClass = await prisma.class.create({
      data: {
        code: normalizedCode,
        name: data.name.trim(),
        level: data.level,
        book: assignedBook,
        bookId: resolvedBookId,
        modality: data.modality,
        classroomId: resolvedClassroomId,
        status: ClassStatus.ACTIVE,
        unitSchedule: data.unitSchedule.trim(),
        speakingSchedule: isPresencial ? null : (data.speakingSchedule?.trim() || null),
        unitTeacherId: data.unitTeacherId,
        speakingTeacherId: isPresencial ? null : (data.speakingTeacherId || null),
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
    bookId?: string | null;
    modality: ClassModality;
    classroom?: string;
    classroomId?: string | null;
    unitSchedule: string;
    speakingSchedule?: string | null;
    unitTeacherId: string;
    speakingTeacherId?: string | null;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth();
    if (!classId) {
      return { success: false, message: 'ID de clase no proporcionado.' };
    }

    const normalizedCode = data.code.trim().toUpperCase();
    const isPresencial = data.modality === ClassModality.PRESENCIAL;

    if (!normalizedCode || !data.name?.trim() || !data.unitTeacherId) {
      return { success: false, message: 'Código, Nombre y Docente Unit son obligatorios.' };
    }

    if (!isPresencial && !data.speakingTeacherId) {
      return { success: false, message: 'Para cursos virtuales o híbridos, el Docente Speaking es obligatorio.' };
    }

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

    const effectiveSpeakingSchedule = isPresencial ? undefined : (data.speakingSchedule?.trim() || undefined);

    // Validar conflicto de aula física
    if (resolvedClassroomId) {
      const conflictCheck = await checkClassroomConflictForClass(
        resolvedClassroomId,
        data.unitSchedule,
        effectiveSpeakingSchedule,
        classId
      );
      if (conflictCheck.hasConflict) {
        return { success: false, message: conflictCheck.message! };
      }
    }

    let resolvedBookId = data.bookId !== undefined ? data.bookId : undefined;
    let assignedBook = data.book || getBookForLevel(data.level);

    if (resolvedBookId) {
      const selectedBook = await prisma.book.findUnique({ where: { id: resolvedBookId } });
      if (selectedBook) {
        const sName = selectedBook.shortName.toLowerCase();
        if (sName.includes('amarillo')) assignedBook = CourseBook.AMARILLO;
        else if (sName.includes('rojo')) assignedBook = CourseBook.ROJO;
        else if (sName.includes('azul')) assignedBook = CourseBook.AZUL;
      }
    } else if (resolvedBookId === null && !data.book) {
      assignedBook = getBookForLevel(data.level);
    } else if (resolvedBookId === undefined && assignedBook) {
      const matchingBook = await prisma.book.findFirst({
        where: {
          OR: [
            { shortName: { equals: assignedBook === CourseBook.AMARILLO ? 'Amarillo' : assignedBook === CourseBook.ROJO ? 'Rojo' : 'Azul', mode: 'insensitive' } },
            { name: { contains: assignedBook === CourseBook.AMARILLO ? 'Amarillo' : assignedBook === CourseBook.ROJO ? 'Rojo' : 'Azul', mode: 'insensitive' } },
          ],
        },
      });
      if (matchingBook) {
        resolvedBookId = matchingBook.id;
      }
    }

    const updated = await prisma.class.update({
      where: { id: classId },
      data: {
        code: normalizedCode,
        name: data.name.trim(),
        level: data.level,
        book: assignedBook,
        ...(resolvedBookId !== undefined ? { bookId: resolvedBookId } : {}),
        modality: data.modality,
        classroomId: resolvedClassroomId,
        unitSchedule: data.unitSchedule.trim(),
        speakingSchedule: isPresencial ? null : (data.speakingSchedule?.trim() || null),
        unitTeacherId: data.unitTeacherId,
        speakingTeacherId: isPresencial ? null : (data.speakingTeacherId || null),
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
    await requireAuth();
    if (!classId) {
      return { success: false, message: 'ID de clase no proporcionado.' };
    }

    const updated = await withTuitionTransaction(async (tx) => {
      const now = new Date();
      await issueMonthlyTuitions(tx, now, { currentClassId: classId });
      return tx.class.update({
        where: { id: classId, status: ClassStatus.ACTIVE },
        data: {
          status: ClassStatus.IN_RECESS,
          recessStartedAt: now,
          recessReason: reason?.trim() || null,
        },
      });
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
 * 5. Reactiva un curso y retoma el calendario individual de sus alumnos.
 */
export async function resumeClassAction(
  classId: string,
): Promise<{ success: boolean; message: string; updatedStudentsCount: number }> {
  try {
    await requireAuth();
    if (!classId) {
      return { success: false, message: 'ID de clase no proporcionado.', updatedStudentsCount: 0 };
    }

    const result = await withTuitionTransaction(async (tx) => {
      const now = new Date();
      const scope = { currentClassId: classId, status: StudentStatus.ACTIVE };
      const updatedClass = await tx.class.update({
        where: { id: classId, status: ClassStatus.IN_RECESS },
        data: { status: ClassStatus.ACTIVE, recessStartedAt: null, recessReason: null },
      });

      // Omitir los periodos que transcurrieron en receso.
      await tx.student.updateMany({
        where: { ...scope, tuitionSyncedThrough: { not: null } },
        data: { tuitionSyncedThrough: tuitionPeriod(tuitionDay(now), -1) },
      });
      await issueMonthlyTuitions(tx, now, scope, { activeSince: now });

      return { className: updatedClass.name, studentsCount: await tx.student.count({ where: scope }) };
    });

    revalidatePath('/classes');
    revalidatePath('/students');
    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `Curso "${result.className}" reactivado exitosamente. Se retomó el calendario individual de ${result.studentsCount} alumnos.`,
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
    await requireAuth();
    await syncMonthlyTuitions();
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
          select: { status: true, month: true, year: true },
        },
      },
      orderBy: { lastName: 'asc' },
    });

    const now = new Date();
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
        nextPaymentDate: s.status === StudentStatus.ACTIVE && s.currentClass?.status === ClassStatus.ACTIVE
          ? upcomingTuitionDate(
              s.enrollmentDate,
              now,
              s.tuitionFees,
            ).toISOString()
          : null,
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
}): Promise<{ success: boolean; message: string; studentId?: string }> {
  try {
    await requireAuth();
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
    const student = await prisma.student.create({
      data: {
        ci: ciClean,
        firstName: firstNameClean,
        lastName: lastNameClean,
        email: emailClean,
        phone: phoneClean,
        guardianPhone1: data.guardianPhone1?.trim() || null,
        guardianPhone2: data.guardianPhone2?.trim() || null,
        enrollmentDate: enrollmentDate,
        tuitionSyncedThrough: tuitionPeriod(tuitionDay(enrollmentDate)),
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
      include: { currentClass: { select: { status: true } } },
    });

    revalidatePath('/students');
    revalidatePath('/classes');
    revalidatePath('/schedule');
    revalidatePath('/');

    const nextPaymentDate = upcomingTuitionDate(enrollmentDate, enrollmentDate);
    const dateNotice = student.currentClass?.status === ClassStatus.ACTIVE
      ? ` Próximo cobro: ${nextPaymentDate.toLocaleDateString('es-EC', { timeZone: TUITION_TIME_ZONE })}.`
      : '';

    return {
      success: true,
      message: `Estudiante ${student.firstName} ${student.lastName} registrado exitosamente con mensualidad de $${data.monthlyFee.toFixed(2)} USD.${dateNotice}`,
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
    enrollmentDate?: string;
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
    await requireAuth();
    if (!studentId) {
      return { success: false, message: 'ID de estudiante no proporcionado.' };
    }

    let enrollmentDate: Date | undefined;
    if (data.enrollmentDate !== undefined) {
      const parsed = typeof data.enrollmentDate === 'string' ? parseTuitionDateInput(data.enrollmentDate) : null;
      if (!parsed || parsed > new Date()) {
        return { success: false, message: 'Ingresa una fecha de matrícula válida hasta el día de hoy.' };
      }
      enrollmentDate = parsed;
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

    const updatedStudent = await withTuitionTransaction(async (tx) => {
      const now = new Date();
      const scope = { id: studentId };
      const current = await tx.student.findUniqueOrThrow({ where: scope });
      const currentClassId = data.currentClassId?.trim() || null;
      const assignmentChanged = current.currentClassId !== currentClassId || current.status !== data.status;
      const oldEnrollmentDay = tuitionDay(current.enrollmentDate);
      const correctedDate = enrollmentDate && tuitionDay(enrollmentDate).getTime() !== oldEnrollmentDay.getTime()
        ? enrollmentDate : undefined;
      const currentPeriod = tuitionPeriod(tuitionDay(now));
      const newlyEligibleThisMonth = correctedDate &&
        tuitionPeriod(oldEnrollmentDay, 1) > currentPeriod &&
        tuitionPeriod(tuitionDay(correctedDate), 1) <= currentPeriod;

      if (correctedDate) {
        await issueMonthlyTuitions(tx, now, scope, { throughPreviousMonth: true });
      } else if (assignmentChanged || !current.monthlyFee.equals(data.monthlyFee)) {
        await issueMonthlyTuitions(tx, now, scope);
      }

      const student = await tx.student.update({
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
          enrollmentDate: correctedDate,
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
          currentClassId,
        },
      });

      if (correctedDate) {
        await updateStudentTuitionDeadlines(tx, studentId, correctedDate, now);
      }

      if ((assignmentChanged || newlyEligibleThisMonth) && student.status === StudentStatus.ACTIVE && currentClassId) {
        await tx.student.updateMany({
          where: { ...scope, tuitionSyncedThrough: { not: null } },
          data: { tuitionSyncedThrough: tuitionPeriod(currentPeriod, -1) },
        });
      }
      if (correctedDate || assignmentChanged) {
        await issueMonthlyTuitions(tx, now, scope, { activeSince: assignmentChanged ? now : undefined });
      }

      return student;
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
