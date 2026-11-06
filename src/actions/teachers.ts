'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { 
  ClassModality, 
  CourseBook, 
  CourseLevel, 
  PrivateClassStatus 
} from '@prisma/client';
import { requireAuth } from '@/lib/require-auth';

export type SerializedTeacherDetailed = {
  id: string;
  ci: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  unitClasses: Array<{
    id: string;
    code: string;
    name: string;
    level: CourseLevel;
    book: CourseBook;
    modality: ClassModality;
    classroom: string;
    unitSchedule: string;
    studentsCount: number;
  }>;
  speakingClasses: Array<{
    id: string;
    code: string;
    name: string;
    level: CourseLevel;
    book: CourseBook;
    modality: ClassModality;
    classroom: string;
    speakingSchedule: string | null;
    studentsCount: number;
  }>;
  privateClasses: Array<{
    id: string;
    studentName: string;
    date: string;
    startTime: string;
    endTime: string;
    classroom: string;
    status: PrivateClassStatus;
    chargeAmount: number;
  }>;
  createdAt: string;
};

/**
 * 1. Obtiene la lista completa de docentes con sus clases asignadas (Unit, Speaking y Privadas)
 */
export async function getTeachersList(search?: string): Promise<SerializedTeacherDetailed[]> {
  try {
    await requireAuth();
    const whereCondition: Record<string, unknown> = {};

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

    const teachers = await prisma.teacher.findMany({
      where: whereCondition,
      include: {
        unitClasses: {
          include: {
            classroom: true,
            _count: { select: { students: true } },
          },
          orderBy: { code: 'asc' },
        },
        speakingClasses: {
          include: {
            classroom: true,
            _count: { select: { students: true } },
          },
          orderBy: { code: 'asc' },
        },
        privateClasses: {
          include: { classroom: true },
          orderBy: { date: 'desc' },
          take: 5,
        },
      },
      orderBy: { lastName: 'asc' },
    });

    return teachers.map((t) => ({
      id: t.id,
      ci: t.ci,
      firstName: t.firstName,
      lastName: t.lastName,
      email: t.email,
      phone: t.phone,
      unitClasses: t.unitClasses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        level: c.level,
        book: c.book,
        modality: c.modality,
        classroom: c.classroom?.name || 'Aula BRAZIL',
        unitSchedule: c.unitSchedule,
        studentsCount: c._count.students,
      })),
      speakingClasses: t.speakingClasses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        level: c.level,
        book: c.book,
        modality: c.modality,
        classroom: c.classroom?.name || 'Aula VIRTUAL',
        speakingSchedule: c.speakingSchedule,
        studentsCount: c._count.students,
      })),
      privateClasses: t.privateClasses.map((p) => ({
        id: p.id,
        studentName: p.studentName,
        date: p.date.toISOString(),
        startTime: p.startTime,
        endTime: p.endTime,
        classroom: p.classroom?.name || 'Aula BRAZIL',
        status: p.status,
        chargeAmount: Number(p.chargeAmount),
      })),
      createdAt: t.createdAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error al obtener lista de profesores:', error);
    return [];
  }
}

/**
 * 2. Registra un nuevo docente
 */
export async function createTeacherAction(data: {
  ci: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}): Promise<{ success: boolean; message: string; teacherId?: string }> {
  try {
    await requireAuth();
    const ciClean = data.ci?.trim();
    const emailClean = data.email?.trim().toLowerCase();

    if (!ciClean || !data.firstName?.trim() || !data.lastName?.trim() || !emailClean || !data.phone?.trim()) {
      return { success: false, message: 'Todos los campos son obligatorios.' };
    }

    // Validar unicidad de CI y Email
    const existingCi = await prisma.teacher.findUnique({ where: { ci: ciClean } });
    if (existingCi) {
      return { success: false, message: `Ya existe un profesor registrado con el CI "${ciClean}".` };
    }

    const existingEmail = await prisma.teacher.findUnique({ where: { email: emailClean } });
    if (existingEmail) {
      return { success: false, message: `Ya existe un profesor registrado con el correo "${emailClean}".` };
    }

    const newTeacher = await prisma.teacher.create({
      data: {
        ci: ciClean,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: emailClean,
        phone: data.phone.trim(),
      },
    });

    revalidatePath('/teachers');
    revalidatePath('/classes');
    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `Docente ${newTeacher.firstName} ${newTeacher.lastName} registrado exitosamente.`,
      teacherId: newTeacher.id,
    };
  } catch (error) {
    console.error('Error al crear docente:', error);
    return { success: false, message: 'Error interno al registrar el docente.' };
  }
}

/**
 * 3. Actualiza la información de un docente existente
 */
export async function updateTeacherAction(
  teacherId: string,
  data: {
    ci: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth();
    if (!teacherId) {
      return { success: false, message: 'ID de docente no proporcionado.' };
    }

    const ciClean = data.ci?.trim();
    const emailClean = data.email?.trim().toLowerCase();

    if (!ciClean || !data.firstName?.trim() || !data.lastName?.trim() || !emailClean || !data.phone?.trim()) {
      return { success: false, message: 'Todos los campos son obligatorios.' };
    }

    // Validar CI único (excluyendo este docente)
    const existingCi = await prisma.teacher.findFirst({
      where: {
        ci: ciClean,
        NOT: { id: teacherId },
      },
    });
    if (existingCi) {
      return { success: false, message: `El CI "${ciClean}" ya está asignado a otro docente.` };
    }

    // Validar Email único (excluyendo este docente)
    const existingEmail = await prisma.teacher.findFirst({
      where: {
        email: emailClean,
        NOT: { id: teacherId },
      },
    });
    if (existingEmail) {
      return { success: false, message: `El correo "${emailClean}" ya está asignado a otro docente.` };
    }

    const updated = await prisma.teacher.update({
      where: { id: teacherId },
      data: {
        ci: ciClean,
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        email: emailClean,
        phone: data.phone.trim(),
      },
    });

    revalidatePath('/teachers');
    revalidatePath('/classes');
    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `Docente ${updated.firstName} ${updated.lastName} actualizado exitosamente.`,
    };
  } catch (error) {
    console.error('Error al actualizar docente:', error);
    return { success: false, message: 'Error interno al actualizar datos del docente.' };
  }
}

/**
 * 4. Elimina un docente validando integridad referencial
 */
export async function deleteTeacherAction(
  teacherId: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth();
    if (!teacherId) {
      return { success: false, message: 'ID de docente no proporcionado.' };
    }

    // Verificar si es profesor de Unit o Speaking de alguna clase
    const [unitClassesCount, speakingClassesCount, privateClassesCount] = await Promise.all([
      prisma.class.count({ where: { unitTeacherId: teacherId } }),
      prisma.class.count({ where: { speakingTeacherId: teacherId } }),
      prisma.privateClass.count({ where: { teacherId: teacherId } }),
    ]);

    const totalAssigned = unitClassesCount + speakingClassesCount + privateClassesCount;

    if (totalAssigned > 0) {
      return {
        success: false,
        message: `No se puede eliminar: el docente tiene asignadas ${unitClassesCount} clase(s) de Unit, ${speakingClassesCount} clase(s) de Speaking y ${privateClassesCount} clase(s) privada(s). Debe reasignarlas antes de eliminarlo.`,
      };
    }

    await prisma.teacher.delete({
      where: { id: teacherId },
    });

    revalidatePath('/teachers');
    revalidatePath('/classes');
    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: 'Docente eliminado correctamente del sistema.',
    };
  } catch (error) {
    console.error('Error al eliminar docente:', error);
    return { success: false, message: 'Ocurrió un error interno al intentar eliminar el docente.' };
  }
}
