'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { ClassStatus } from '@prisma/client';

export type SerializedClassroom = {
  id: string;
  name: string;
  capacity: number;
  location: string | null;
  isVirtual: boolean;
  isActive: boolean;
  activeClassesCount?: number;
  createdAt: string;
  updatedAt: string;
};

/**
 * 1. Obtiene la lista de aulas registradas (por defecto activas o todas)
 */
export async function getClassroomsAction(includeInactive: boolean = false): Promise<SerializedClassroom[]> {
  try {
    const classrooms = await prisma.classroom.findMany({
      where: includeInactive ? undefined : { isActive: true },
      include: {
        _count: {
          select: {
            classes: {
              where: { status: ClassStatus.ACTIVE },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return classrooms.map((c) => ({
      id: c.id,
      name: c.name,
      capacity: c.capacity,
      location: c.location,
      isVirtual: c.isVirtual,
      isActive: c.isActive,
      activeClassesCount: c._count.classes,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error al obtener aulas:', error);
    return [];
  }
}

/**
 * 2. Crea una nueva aula
 */
export async function createClassroomAction(data: {
  name: string;
  capacity?: number;
  location?: string | null;
  isVirtual?: boolean;
}): Promise<{ success: boolean; message: string; classroom?: SerializedClassroom }> {
  try {
    const nameClean = data.name?.trim();
    if (!nameClean) {
      return { success: false, message: 'El nombre del aula es obligatorio.' };
    }

    const existing = await prisma.classroom.findUnique({
      where: { name: nameClean },
    });

    if (existing) {
      return { success: false, message: `Ya existe un aula registrada con el nombre "${nameClean}".` };
    }

    const created = await prisma.classroom.create({
      data: {
        name: nameClean,
        capacity: Number(data.capacity) || 15,
        location: data.location?.trim() || null,
        isVirtual: Boolean(data.isVirtual),
        isActive: true,
      },
    });

    revalidatePath('/classes');
    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `Aula "${created.name}" creada exitosamente.`,
      classroom: {
        id: created.id,
        name: created.name,
        capacity: created.capacity,
        location: created.location,
        isVirtual: created.isVirtual,
        isActive: created.isActive,
        createdAt: created.createdAt.toISOString(),
        updatedAt: created.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Error al crear aula:', error);
    return { success: false, message: 'Error interno al registrar el aula.' };
  }
}

/**
 * 3. Actualiza los datos de un aula
 */
export async function updateClassroomAction(
  id: string,
  data: {
    name: string;
    capacity?: number;
    location?: string | null;
    isVirtual?: boolean;
    isActive?: boolean;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    if (!id) {
      return { success: false, message: 'ID del aula no proporcionado.' };
    }

    const nameClean = data.name?.trim();
    if (!nameClean) {
      return { success: false, message: 'El nombre del aula es obligatorio.' };
    }

    const duplicate = await prisma.classroom.findFirst({
      where: {
        name: nameClean,
        NOT: { id },
      },
    });

    if (duplicate) {
      return { success: false, message: `Ya existe otra aula con el nombre "${nameClean}".` };
    }

    await prisma.classroom.update({
      where: { id },
      data: {
        name: nameClean,
        capacity: Number(data.capacity) || 15,
        location: data.location?.trim() || null,
        isVirtual: Boolean(data.isVirtual),
        ...(typeof data.isActive === 'boolean' ? { isActive: data.isActive } : {}),
      },
    });

    revalidatePath('/classes');
    revalidatePath('/schedule');
    revalidatePath('/');

    return { success: true, message: 'Aula actualizada correctamente.' };
  } catch (error) {
    console.error('Error al actualizar aula:', error);
    return { success: false, message: 'Error interno al actualizar el aula.' };
  }
}

/**
 * 4. Desactiva un aula verificando que no tenga cursos activos asignados
 */
export async function deleteClassroomAction(id: string): Promise<{ success: boolean; message: string }> {
  try {
    if (!id) {
      return { success: false, message: 'ID del aula no proporcionado.' };
    }

    // Verificar si tiene clases activas
    const activeClasses = await prisma.class.findMany({
      where: {
        classroomId: id,
        status: ClassStatus.ACTIVE,
      },
      select: { code: true, name: true },
    });

    if (activeClasses.length > 0) {
      const classNames = activeClasses.map((c) => `${c.code} (${c.name})`).join(', ');
      return {
        success: false,
        message: `No se puede desactivar el aula porque tiene ${activeClasses.length} curso(s) activo(s) asignado(s): ${classNames}. Reasigna los cursos antes de desactivarla.`,
      };
    }

    await prisma.classroom.update({
      where: { id },
      data: { isActive: false },
    });

    revalidatePath('/classes');
    revalidatePath('/schedule');
    revalidatePath('/');

    return { success: true, message: 'Aula desactivada correctamente.' };
  } catch (error) {
    console.error('Error al desactivar aula:', error);
    return { success: false, message: 'Error interno al desactivar el aula.' };
  }
}
