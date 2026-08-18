'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { ClassModality } from '@prisma/client';

export type SerializedTeacherDetailed = {
  id: string;
  ci: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  primaryClasses: Array<{
    id: string;
    code: string;
    name: string;
    modality: ClassModality;
    schedule: string;
    monthlyPrice: number;
    studentsCount: number;
  }>;
  assistantClasses: Array<{
    id: string;
    code: string;
    name: string;
    modality: ClassModality;
    schedule: string;
    monthlyPrice: number;
    studentsCount: number;
  }>;
  createdAt: string;
};

/**
 * 1. Obtiene la lista completa de docentes con sus clases asignadas
 */
export async function getTeachersList(search?: string): Promise<SerializedTeacherDetailed[]> {
  try {
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
        primaryClasses: {
          include: {
            _count: { select: { students: true } },
          },
          orderBy: { code: 'asc' },
        },
        assistantClasses: {
          include: {
            _count: { select: { students: true } },
          },
          orderBy: { code: 'asc' },
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
      primaryClasses: t.primaryClasses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        modality: c.modality,
        schedule: c.schedule,
        monthlyPrice: Number(c.monthlyPrice),
        studentsCount: c._count.students,
      })),
      assistantClasses: t.assistantClasses.map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        modality: c.modality,
        schedule: c.schedule,
        monthlyPrice: Number(c.monthlyPrice),
        studentsCount: c._count.students,
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
    if (!teacherId) {
      return { success: false, message: 'ID de docente no proporcionado.' };
    }

    // Verificar si es profesor titular de alguna clase activa
    const primaryClassesCount = await prisma.class.count({
      where: { primaryTeacherId: teacherId },
    });

    if (primaryClassesCount > 0) {
      return {
        success: false,
        message: `No se puede eliminar: el docente es titular de ${primaryClassesCount} clase(s) activa(s). Debe reasignar las clases a otro profesor antes de eliminarlo.`,
      };
    }

    await prisma.teacher.delete({
      where: { id: teacherId },
    });

    revalidatePath('/teachers');
    revalidatePath('/classes');
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
