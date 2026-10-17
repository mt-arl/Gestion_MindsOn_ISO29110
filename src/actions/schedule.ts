'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { 
  CourseBook, 
  CourseLevel, 
  ClassModality, 
  PrivateClassStatus, 
  ClassStatus 
} from '@prisma/client';
import { checkClassroomConflictForPrivateClass } from '@/lib/classroom-conflicts';

export type EnrolledStudentSummary = {
  id: string;
  ci: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  guardianPhone1: string | null;
  guardianPhone2: string | null;
  monthlyFee: number;
  status: string;
};

export type RegularClassSchedule = {
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
    colorTheme: string;
  } | null;
  modality: ClassModality;
  classroomId: string | null;
  classroom: string;
  status: ClassStatus;
  recessStartedAt: string | null;
  recessReason: string | null;
  unitSchedule: string;
  speakingSchedule: string | null;
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
  studentsCount: number;
  students: EnrolledStudentSummary[];
};

export type PrivateClassSchedule = {
  id: string;
  studentName: string;
  studentId: string | null;
  teacherId: string;
  teacherName: string;
  teacherPhone: string;
  bookId: string | null;
  bookRef: {
    id: string;
    name: string;
    shortName: string;
    colorTheme: string;
  } | null;
  date: string;
  startTime: string;
  endTime: string;
  classroomId: string | null;
  classroom: string;
  topic: string;
  chargeAmount: number;
  status: PrivateClassStatus;
  createdAt: string;
};

export type WeeklyScheduleData = {
  regularClasses: RegularClassSchedule[];
  privateClasses: PrivateClassSchedule[];
};

/**
 * 1. Obtiene la lista consolidada de horarios regulares y clases privadas
 */
export async function getWeeklyScheduleAction(): Promise<WeeklyScheduleData> {
  try {
    const [classes, privateClasses] = await Promise.all([
      prisma.class.findMany({
        include: {
          classroom: true,
          bookRef: true,
          unitTeacher: true,
          speakingTeacher: true,
          students: {
            where: { status: 'ACTIVE' },
            select: {
              id: true,
              ci: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              guardianPhone1: true,
              guardianPhone2: true,
              monthlyFee: true,
              status: true,
            },
            orderBy: { lastName: 'asc' },
          },
        },
        orderBy: { code: 'asc' },
      }),
      prisma.privateClass.findMany({
        include: {
          classroom: true,
          teacher: true,
          student: true,
          bookRef: true,
        },
        orderBy: [
          { date: 'desc' },
          { startTime: 'asc' },
        ],
      }),
    ]);

    return {
      regularClasses: classes.map((c) => ({
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
          colorTheme: c.bookRef.colorTheme,
        } : null,
        modality: c.modality,
        classroomId: c.classroomId,
        classroom: c.classroom?.name || 'Aula BRAZIL',
        status: c.status,
        recessStartedAt: c.recessStartedAt ? c.recessStartedAt.toISOString() : null,
        recessReason: c.recessReason,
        unitSchedule: c.unitSchedule,
        speakingSchedule: c.speakingSchedule || null,
        unitTeacher: {
          id: c.unitTeacher.id,
          name: `${c.unitTeacher.firstName} ${c.unitTeacher.lastName}`,
          phone: c.unitTeacher.phone,
        },
        speakingTeacher: c.speakingTeacher ? {
          id: c.speakingTeacher.id,
          name: `${c.speakingTeacher.firstName} ${c.speakingTeacher.lastName}`,
          phone: c.speakingTeacher.phone,
        } : null,
        studentsCount: c.students.length,
        students: c.students.map((s) => ({
          id: s.id,
          ci: s.ci || '',
          firstName: s.firstName,
          lastName: s.lastName,
          email: s.email,
          phone: s.phone,
          guardianPhone1: s.guardianPhone1,
          guardianPhone2: s.guardianPhone2,
          monthlyFee: Number(s.monthlyFee),
          status: s.status,
        })),
      })),
      privateClasses: privateClasses.map((p) => ({
        id: p.id,
        studentName: p.student ? `${p.student.firstName} ${p.student.lastName}` : p.studentName,
        studentId: p.studentId,
        teacherId: p.teacherId,
        teacherName: `${p.teacher.firstName} ${p.teacher.lastName}`,
        teacherPhone: p.teacher.phone,
        bookId: p.bookId || null,
        bookRef: p.bookRef ? {
          id: p.bookRef.id,
          name: p.bookRef.name,
          shortName: p.bookRef.shortName,
          colorTheme: p.bookRef.colorTheme,
        } : null,
        date: p.date.toISOString(),
        startTime: p.startTime,
        endTime: p.endTime,
        classroomId: p.classroomId,
        classroom: p.classroom?.name || 'Aula BRAZIL',
        topic: p.topic,
        chargeAmount: Number(p.chargeAmount),
        status: p.status,
        createdAt: p.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error('Error al obtener agenda semanal:', error);
    return { regularClasses: [], privateClasses: [] };
  }
}

/**
 * 2. Agendar una nueva clase privada / sesión personalizada con validación de conflictos de aula
 */
export async function createPrivateClassAction(data: {
  studentName: string;
  studentId?: string | null;
  teacherId: string;
  bookId?: string | null;
  date: string;
  startTime: string;
  endTime: string;
  classroomId?: string;
  classroom?: string;
  topic: string;
  chargeAmount: number;
}): Promise<{ success: boolean; message: string; id?: string }> {
  try {
    if (!data.studentName?.trim() || !data.teacherId || !data.date || !data.startTime || !data.endTime) {
      return { success: false, message: 'Todos los campos obligatorios deben completarse.' };
    }

    if (isNaN(data.chargeAmount) || data.chargeAmount < 0) {
      return { success: false, message: 'El monto acordado debe ser un número válido.' };
    }

    const scheduledDate = new Date(data.date);

    // Resolver aula
    let targetClassroomId: string | null = data.classroomId?.trim() || null;
    if (!targetClassroomId && data.classroom) {
      const found = await prisma.classroom.findFirst({
        where: {
          OR: [
            { id: data.classroom },
            { name: data.classroom },
            { name: { contains: data.classroom.replace(/^Aula\s+/i, '').trim(), mode: 'insensitive' } },
          ],
        },
      });
      if (found) targetClassroomId = found.id;
    }

    if (!targetClassroomId) {
      const defaultRoom = await prisma.classroom.findFirst({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
      if (defaultRoom) targetClassroomId = defaultRoom.id;
    }

    // Validación de conflicto en aula física
    if (targetClassroomId) {
      const conflictCheck = await checkClassroomConflictForPrivateClass(
        targetClassroomId,
        scheduledDate,
        data.startTime.trim(),
        data.endTime.trim()
      );

      if (conflictCheck.hasConflict) {
        return {
          success: false,
          message: conflictCheck.message || 'Conflicto de Aula detectado para la clase privada.',
        };
      }
    }

    const newPrivateClass = await prisma.privateClass.create({
      data: {
        studentName: data.studentName.trim(),
        studentId: data.studentId?.trim() || null,
        teacherId: data.teacherId,
        bookId: data.bookId?.trim() || null,
        date: scheduledDate,
        startTime: data.startTime.trim(),
        endTime: data.endTime.trim(),
        classroomId: targetClassroomId,
        topic: data.topic.trim() || 'Clase personalizada / Nivelación',
        chargeAmount: data.chargeAmount,
        status: PrivateClassStatus.PROGRAMADA,
      },
    });

    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `Clase privada para ${newPrivateClass.studentName} agendada exitosamente.`,
      id: newPrivateClass.id,
    };
  } catch (error) {
    console.error('Error al crear clase privada:', error);
    return { success: false, message: 'Error interno al registrar la clase privada.' };
  }
}

/**
 * 3. Actualiza el estado de una clase privada
 */
export async function updatePrivateClassStatusAction(
  id: string,
  status: PrivateClassStatus
): Promise<{ success: boolean; message: string }> {
  try {
    if (!id || !status) {
      return { success: false, message: 'ID y nuevo estado son obligatorios.' };
    }

    const updated = await prisma.privateClass.update({
      where: { id },
      data: { status },
    });

    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `Estado de la clase privada actualizado a ${updated.status}.`,
    };
  } catch (error) {
    console.error('Error al actualizar estado de clase privada:', error);
    return { success: false, message: 'Error interno al actualizar la clase privada.' };
  }
}
