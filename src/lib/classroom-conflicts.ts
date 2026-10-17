import prisma from '@/lib/prisma';
import { ClassStatus, PrivateClassStatus } from '@prisma/client';
import { 
  extractDaysFromSchedule, 
  extractTimesFromSchedule, 
  timeStringToDecimal,
  CALENDAR_DAYS 
} from '@/lib/calendar-utils';

export interface ClassroomConflictResult {
  hasConflict: boolean;
  message?: string;
  conflictDetails?: {
    classroomName: string;
    day: string;
    startTime: string;
    endTime: string;
    conflictingClassCode?: string;
    conflictingClassName?: string;
  };
}

/**
 * Valida si un horario de curso regular genera conflicto en un aula física.
 * Regla de Exclusividad de Aula Física:
 * InicioExistente < FinNuevo && FinExistente > InicioNuevo
 */
export async function checkClassroomConflictForClass(
  classroomId: string,
  unitSchedule: string,
  speakingSchedule?: string,
  excludeClassId?: string
): Promise<ClassroomConflictResult> {
  if (!classroomId) {
    return { hasConflict: false };
  }

  // 1. Obtener datos del aula
  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  // Si no existe o es virtual, se permite concurrencia ilimitada sin bloqueo
  if (!classroom || classroom.isVirtual) {
    return { hasConflict: false };
  }

  // Horarios de la nueva clase a validar
  const schedulesToCheck = [unitSchedule, speakingSchedule].filter(Boolean) as string[];

  // 3. Consultar otros cursos activos en la misma aula física
  const existingClasses = await prisma.class.findMany({
    where: {
      classroomId: classroom.id,
      status: ClassStatus.ACTIVE,
      ...(excludeClassId ? { id: { not: excludeClassId } } : {}),
    },
    select: {
      id: true,
      code: true,
      name: true,
      unitSchedule: true,
      speakingSchedule: true,
    },
  });

  for (const newSched of schedulesToCheck) {
    const newDays = extractDaysFromSchedule(newSched);
    const newTimes = extractTimesFromSchedule(newSched);
    const newStart = timeStringToDecimal(newTimes.startTime);
    const newEnd = timeStringToDecimal(newTimes.endTime);

    if (newDays.length === 0 || newStart >= newEnd) continue;

    for (const existing of existingClasses) {
      const existingSchedules = [existing.unitSchedule, existing.speakingSchedule].filter(
        (s): s is string => typeof s === 'string' && s.length > 0
      );

      for (const exSched of existingSchedules) {
        const existingDays = extractDaysFromSchedule(exSched);
        const existingTimes = extractTimesFromSchedule(exSched);
        const existingStart = timeStringToDecimal(existingTimes.startTime);
        const existingEnd = timeStringToDecimal(existingTimes.endTime);

        for (const day of newDays) {
          if (existingDays.includes(day)) {
            // Condición matemática: InicioExistente < FinNuevo && FinExistente > InicioNuevo
            if (existingStart < newEnd && existingEnd > newStart) {
              return {
                hasConflict: true,
                message: `❌ Conflicto de Aula: El ${classroom.name} ya está ocupada el día ${day} de ${existingTimes.startTime} a ${existingTimes.endTime} por el curso ${existing.code} (${existing.name}). Por favor, selecciona otra aula u otro horario.`,
                conflictDetails: {
                  classroomName: classroom.name,
                  day,
                  startTime: existingTimes.startTime,
                  endTime: existingTimes.endTime,
                  conflictingClassCode: existing.code,
                  conflictingClassName: existing.name,
                },
              };
            }
          }
        }
      }
    }
  }

  return { hasConflict: false };
}

/**
 * Valida si una clase privada en una fecha específica genera conflicto con cursos regulares o clases privadas en un aula física.
 */
export async function checkClassroomConflictForPrivateClass(
  classroomId: string,
  date: Date,
  startTime: string,
  endTime: string,
  excludePrivateClassId?: string
): Promise<ClassroomConflictResult> {
  if (!classroomId || !startTime || !endTime) {
    return { hasConflict: false };
  }

  const classroom = await prisma.classroom.findUnique({
    where: { id: classroomId },
  });

  if (!classroom || classroom.isVirtual) {
    return { hasConflict: false };
  }

  const newStart = timeStringToDecimal(startTime);
  const newEnd = timeStringToDecimal(endTime);
  const dayIndex = date.getDay(); // 0 Dom, 1 Lun, ..., 6 Sáb
  const dayMatch = CALENDAR_DAYS.find((d) => d.dayIndex === dayIndex);
  const dayKey = dayMatch ? dayMatch.key : null;

  // 1. Validar contra cursos regulares si coincide el día de la semana
  if (dayKey) {
    const existingClasses = await prisma.class.findMany({
      where: {
        classroomId: classroom.id,
        status: ClassStatus.ACTIVE,
      },
      select: {
        id: true,
        code: true,
        name: true,
        unitSchedule: true,
      },
    });

    for (const existing of existingClasses) {
      const existingDays = extractDaysFromSchedule(existing.unitSchedule);
      if (existingDays.includes(dayKey)) {
        const existingTimes = extractTimesFromSchedule(existing.unitSchedule);
        const existingStart = timeStringToDecimal(existingTimes.startTime);
        const existingEnd = timeStringToDecimal(existingTimes.endTime);

        if (existingStart < newEnd && existingEnd > newStart) {
          return {
            hasConflict: true,
            message: `Conflicto de Aula: El ${classroom.name} ya está ocupada el día ${dayKey} de ${existingTimes.startTime} a ${existingTimes.endTime} por el curso ${existing.code} (${existing.name}). Por favor, selecciona otra aula u otro horario.`,
            conflictDetails: {
              classroomName: classroom.name,
              day: dayKey,
              startTime: existingTimes.startTime,
              endTime: existingTimes.endTime,
              conflictingClassCode: existing.code,
              conflictingClassName: existing.name,
            },
          };
        }
      }
    }
  }

  // 2. Validar contra otras clases privadas en la misma fecha
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const existingPrivate = await prisma.privateClass.findMany({
    where: {
      classroomId: classroom.id,
      status: PrivateClassStatus.PROGRAMADA,
      date: { gte: startOfDay, lte: endOfDay },
      ...(excludePrivateClassId ? { id: { not: excludePrivateClassId } } : {}),
    },
    select: {
      id: true,
      studentName: true,
      topic: true,
      startTime: true,
      endTime: true,
    },
  });

  for (const priv of existingPrivate) {
    const privStart = timeStringToDecimal(priv.startTime);
    const privEnd = timeStringToDecimal(priv.endTime);

    if (privStart < newEnd && privEnd > newStart) {
      return {
        hasConflict: true,
        message: `Conflicto de Aula: El ${classroom.name} ya está reservada de ${priv.startTime} a ${priv.endTime} para la clase privada de ${priv.studentName} (${priv.topic}). Por favor, selecciona otra aula u horario.`,
        conflictDetails: {
          classroomName: classroom.name,
          day: dayKey || 'Fecha seleccionada',
          startTime: priv.startTime,
          endTime: priv.endTime,
          conflictingClassName: `Clase Privada - ${priv.studentName}`,
        },
      };
    }
  }

  return { hasConflict: false };
}
