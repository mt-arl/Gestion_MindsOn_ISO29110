'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { CourseBook } from '@prisma/client';
import { requireAuth } from '@/lib/require-auth';

export interface SerializedBook {
  id: string;
  name: string;
  shortName: string;
  levelsLabel: string | null;
  colorTheme: string;
  sortOrder: number;
  isActive: boolean;
  classesCount: number;
  createdAt: string;
  updatedAt: string;
}

/**
 * 1. Inicializa los libros base (Amarillo, Rojo, Azul) si la tabla está vacía
 * y vincula automáticamente cualquier clase que aún tenga bookId nulo.
 */
export async function ensureDefaultBooksAndLinkClasses(): Promise<void> {
  try {
    await requireAuth();
    const count = await prisma.book.count();

    if (count === 0) {
      await prisma.book.createMany({
        data: [
          {
            name: 'Libro Amarillo',
            shortName: 'Amarillo',
            levelsLabel: 'Intro A / Intro B',
            colorTheme: 'yellow',
            sortOrder: 1,
            isActive: true,
          },
          {
            name: 'Libro Rojo',
            shortName: 'Rojo',
            levelsLabel: 'Level 1A / Level 1B',
            colorTheme: 'red',
            sortOrder: 2,
            isActive: true,
          },
          {
            name: 'Libro Azul',
            shortName: 'Azul',
            levelsLabel: 'Level 2A / Level 2B',
            colorTheme: 'blue',
            sortOrder: 3,
            isActive: true,
          },
        ],
        skipDuplicates: true,
      });
    }

    // Vincular clases que aún tengan bookId: null
    const unlinkedClasses = await prisma.class.findMany({
      where: { bookId: null },
      select: { id: true, book: true },
    });

    if (unlinkedClasses.length > 0) {
      const allBooks = await prisma.book.findMany();
      const amarilloBook = allBooks.find((b) => b.shortName.toLowerCase().includes('amarillo') || b.colorTheme === 'yellow');
      const rojoBook = allBooks.find((b) => b.shortName.toLowerCase().includes('rojo') || b.colorTheme === 'red');
      const azulBook = allBooks.find((b) => b.shortName.toLowerCase().includes('azul') || b.colorTheme === 'blue');

      for (const cls of unlinkedClasses) {
        let targetBookId: string | null = null;
        if (cls.book === CourseBook.AMARILLO && amarilloBook) {
          targetBookId = amarilloBook.id;
        } else if (cls.book === CourseBook.ROJO && rojoBook) {
          targetBookId = rojoBook.id;
        } else if (cls.book === CourseBook.AZUL && azulBook) {
          targetBookId = azulBook.id;
        }

        if (targetBookId) {
          await prisma.class.update({
            where: { id: cls.id },
            data: { bookId: targetBookId },
          });
        }
      }
    }
  } catch (error) {
    console.error('Error al inicializar libros predeterminados y vincular clases:', error);
  }
}

/**
 * 2. Obtiene la lista de libros registrados
 */
export async function getBooksAction(includeInactive: boolean = false): Promise<SerializedBook[]> {
  try {
    await requireAuth();
    await ensureDefaultBooksAndLinkClasses();

    const books = await prisma.book.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: {
        _count: {
          select: { classes: true },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    });

    return books.map((b) => ({
      id: b.id,
      name: b.name,
      shortName: b.shortName,
      levelsLabel: b.levelsLabel,
      colorTheme: b.colorTheme,
      sortOrder: b.sortOrder,
      isActive: b.isActive,
      classesCount: b._count.classes,
      createdAt: b.createdAt.toISOString(),
      updatedAt: b.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error al obtener libros:', error);
    return [];
  }
}

/**
 * 3. Crea un nuevo libro en el sistema
 */
export async function createBookAction(data: {
  name: string;
  shortName: string;
  levelsLabel?: string | null;
  colorTheme?: string;
  sortOrder?: number;
}): Promise<{ success: boolean; message: string; book?: SerializedBook }> {
  try {
    await requireAuth();
    const nameClean = data.name?.trim();
    const shortNameClean = data.shortName?.trim();

    if (!nameClean || !shortNameClean) {
      return { success: false, message: 'El nombre completo y el nombre corto del libro son obligatorios.' };
    }

    const existing = await prisma.book.findFirst({
      where: {
        OR: [
          { name: { equals: nameClean, mode: 'insensitive' } },
          { shortName: { equals: shortNameClean, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      return { success: false, message: `Ya existe un libro registrado con el nombre "${nameClean}" o "${shortNameClean}".` };
    }

    const newBook = await prisma.book.create({
      data: {
        name: nameClean,
        shortName: shortNameClean,
        levelsLabel: data.levelsLabel?.trim() || null,
        colorTheme: data.colorTheme || 'yellow',
        sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
        isActive: true,
      },
      include: {
        _count: { select: { classes: true } },
      },
    });

    revalidatePath('/classes');
    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `Libro "${newBook.name}" creado exitosamente.`,
      book: {
        id: newBook.id,
        name: newBook.name,
        shortName: newBook.shortName,
        levelsLabel: newBook.levelsLabel,
        colorTheme: newBook.colorTheme,
        sortOrder: newBook.sortOrder,
        isActive: newBook.isActive,
        classesCount: newBook._count.classes,
        createdAt: newBook.createdAt.toISOString(),
        updatedAt: newBook.updatedAt.toISOString(),
      },
    };
  } catch (error) {
    console.error('Error al crear libro:', error);
    return { success: false, message: 'Error interno al registrar el nuevo libro.' };
  }
}

/**
 * 4. Actualiza un libro existente
 */
export async function updateBookAction(
  id: string,
  data: {
    name: string;
    shortName: string;
    levelsLabel?: string | null;
    colorTheme?: string;
    sortOrder?: number;
    isActive?: boolean;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth();
    if (!id) {
      return { success: false, message: 'ID de libro no proporcionado.' };
    }

    const nameClean = data.name?.trim();
    const shortNameClean = data.shortName?.trim();

    if (!nameClean || !shortNameClean) {
      return { success: false, message: 'El nombre completo y el nombre corto del libro son obligatorios.' };
    }

    // Validar nombre único excluyendo este libro
    const existing = await prisma.book.findFirst({
      where: {
        NOT: { id },
        OR: [
          { name: { equals: nameClean, mode: 'insensitive' } },
          { shortName: { equals: shortNameClean, mode: 'insensitive' } },
        ],
      },
    });

    if (existing) {
      return { success: false, message: `Ya existe otro libro registrado con el nombre "${nameClean}" o "${shortNameClean}".` };
    }

    await prisma.book.update({
      where: { id },
      data: {
        name: nameClean,
        shortName: shortNameClean,
        levelsLabel: data.levelsLabel?.trim() || null,
        colorTheme: data.colorTheme || 'yellow',
        sortOrder: typeof data.sortOrder === 'number' ? data.sortOrder : 0,
        isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
      },
    });

    revalidatePath('/classes');
    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `Libro "${nameClean}" actualizado exitosamente.`,
    };
  } catch (error) {
    console.error('Error al actualizar libro:', error);
    return { success: false, message: 'Error interno al actualizar los datos del libro.' };
  }
}

/**
 * 5. Elimina un libro (valida que no tenga cursos asignados)
 */
export async function deleteBookAction(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth();
    if (!id) {
      return { success: false, message: 'ID de libro no proporcionado.' };
    }

    const book = await prisma.book.findUnique({
      where: { id },
      include: {
        classes: {
          select: { id: true, code: true, name: true },
        },
      },
    });

    if (!book) {
      return { success: false, message: 'El libro que intenta eliminar no existe.' };
    }

    if (book.classes.length > 0) {
      const classCodes = book.classes.map((c) => `${c.code} (${c.name})`).join(', ');
      return {
        success: false,
        message: `No se puede eliminar "${book.name}" porque está asignado a ${book.classes.length} curso(s) activo(s): ${classCodes}. Reasigna los cursos a otro libro antes de eliminarlo.`,
      };
    }

    await prisma.book.delete({
      where: { id },
    });

    revalidatePath('/classes');
    revalidatePath('/schedule');
    revalidatePath('/');

    return {
      success: true,
      message: `Libro "${book.name}" eliminado exitosamente.`,
    };
  } catch (error) {
    console.error('Error al eliminar libro:', error);
    return { success: false, message: 'Error interno al eliminar el libro.' };
  }
}
