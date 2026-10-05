import { 
  RegularClassSchedule, 
  PrivateClassSchedule 
} from '@/actions/schedule';
import { CourseBook, CourseLevel } from '@prisma/client';

export const CALENDAR_DAYS = [
  { key: 'Lunes', label: 'Lunes', short: 'Lun', dayIndex: 1 },
  { key: 'Martes', label: 'Martes', short: 'Mar', dayIndex: 2 },
  { key: 'Miércoles', label: 'Miércoles', short: 'Mié', dayIndex: 3 },
  { key: 'Jueves', label: 'Jueves', short: 'Jue', dayIndex: 4 },
  { key: 'Viernes', label: 'Viernes', short: 'Vie', dayIndex: 5 },
  { key: 'Sábado', label: 'Sábado', short: 'Sáb', dayIndex: 6 },
] as const;

export type DayKey = typeof CALENDAR_DAYS[number]['key'];

export const START_HOUR = 8;
export const END_HOUR = 21;
export const TOTAL_HOURS = END_HOUR - START_HOUR; // 13 hours: 8 to 21

export type WeekDayInfo = {
  dayKey: DayKey;
  dayShort: string;
  dayNumber: number;
  fullDate: Date;
  dateString: string; // YYYY-MM-DD
  isToday: boolean;
};

export type CalendarEvent = {
  id: string;
  eventKey: string;
  dayKey: DayKey;
  type: 'UNIT' | 'SPEAKING' | 'PRIVATE';
  title: string;
  code?: string;
  level?: CourseLevel;
  book?: CourseBook;
  classroom: string;
  modality?: string;
  teacherName: string;
  startTime: string;
  endTime: string;
  startDecimal: number;
  endDecimal: number;
  startMinutes: number;
  endMinutes: number;
  topPercent: number;
  heightPercent: number;
  studentsCount?: number;
  chargeAmount?: number;
  status?: string;
  isRecess?: boolean;
  topic?: string;
  rawClass?: RegularClassSchedule;
  rawPrivateClass?: PrivateClassSchedule;
};

export interface PositionedCalendarEvent extends CalendarEvent {
  colIndex: number;  // Índice de columna dentro del grupo de colisión (0, 1, ...)
  totalCols: number; // Total de eventos simultáneos en ese instante
  top: number;       // Posición top en px
  height: number;    // Altura en px
}

/**
 * Obtiene los 6 días de la semana (Lunes a Sábado) basados en una fecha dada
 */
export function getWeekDays(date: Date): WeekDayInfo[] {
  const start = new Date(date);
  const day = start.getDay();
  // Ajuste a Lunes (en JS 0 es Domingo)
  const diff = start.getDate() - day + (day === 0 ? -6 : 1);
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);

  const todayStr = new Date().toDateString();

  return CALENDAR_DAYS.map((d, idx) => {
    const current = new Date(start);
    current.setDate(start.getDate() + idx);
    const isToday = todayStr === current.toDateString();
    
    // YYYY-MM-DD local
    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const dayNum = String(current.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${dayNum}`;

    return {
      dayKey: d.key,
      dayShort: d.short,
      dayNumber: current.getDate(),
      fullDate: current,
      dateString,
      isToday,
    };
  });
}

/**
 * Genera el título dinámico de Mes y Año en español (ej: "Agosto de 2026" o "Agosto - Septiembre de 2026")
 */
export function formatWeekTitle(weekDays: WeekDayInfo[]): string {
  if (weekDays.length === 0) return '';
  const firstDay = weekDays[0].fullDate;
  const lastDay = weekDays[weekDays.length - 1].fullDate;

  const firstMonth = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(firstDay);
  const lastMonth = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(lastDay);
  const firstYear = firstDay.getFullYear();
  const lastYear = lastDay.getFullYear();

  const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

  if (firstMonth === lastMonth && firstYear === lastYear) {
    return `${capitalize(firstMonth)} de ${firstYear}`;
  } else if (firstYear === lastYear) {
    return `${capitalize(firstMonth)} - ${capitalize(lastMonth)} de ${firstYear}`;
  } else {
    return `${capitalize(firstMonth)} de ${firstYear} - ${capitalize(lastMonth)} de ${lastYear}`;
  }
}

/**
 * Convierte "17:30" en decimal 17.5
 */
export function timeStringToDecimal(timeStr: string): number {
  if (!timeStr) return 8;
  const parts = timeStr.trim().split(':');
  const hours = parseInt(parts[0], 10) || 8;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours + minutes / 60;
}

/**
 * Parsea días de una cadena de horario
 */
export function extractDaysFromSchedule(scheduleStr: string): DayKey[] {
  if (!scheduleStr) return [];
  const days: DayKey[] = [];
  if (/lun/i.test(scheduleStr)) days.push('Lunes');
  if (/mar/i.test(scheduleStr)) days.push('Martes');
  if (/mi[eé]/i.test(scheduleStr)) days.push('Miércoles');
  if (/jue/i.test(scheduleStr)) days.push('Jueves');
  if (/vie/i.test(scheduleStr)) days.push('Viernes');
  if (/s[aá]b/i.test(scheduleStr)) days.push('Sábado');
  return days;
}

/**
 * Extrae horas de inicio y fin de una cadena tipo "17:00 - 18:30"
 */
export function extractTimesFromSchedule(scheduleStr: string): { startTime: string; endTime: string } {
  if (!scheduleStr) return { startTime: '17:00', endTime: '18:30' };
  const match = scheduleStr.match(/(\d{1,2}:\d{2})\s*[-–a]\s*(\d{1,2}:\d{2})/);
  if (match) {
    return {
      startTime: match[1].padStart(5, '0'),
      endTime: match[2].padStart(5, '0'),
    };
  }
  return { startTime: '17:00', endTime: '18:30' };
}

/**
 * Genera la lista completa de eventos de calendario posicionados para la semana activa
 */
export function generateWeeklyCalendarEvents(
  regularClasses: RegularClassSchedule[],
  privateClasses: PrivateClassSchedule[],
  weekDays: WeekDayInfo[],
  filterBook: 'ALL' | 'AMARILLO' | 'ROJO' | 'AZUL' | 'PRIVATE' = 'ALL',
  filterClassroom: string = 'ALL'
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  // Mapeo de fecha YYYY-MM-DD a DayKey de la semana visible
  const weekDateMap = new Map<string, DayKey>();
  for (const wd of weekDays) {
    weekDateMap.set(wd.dateString, wd.dayKey);
  }

  // 1. Procesar Cursos Regulares (Unit Classes y Speaking)
  if (filterBook !== 'PRIVATE') {
    for (const cls of regularClasses) {
      if (filterBook !== 'ALL' && cls.book !== filterBook) continue;
      if (filterClassroom !== 'ALL' && cls.classroom !== filterClassroom) continue;

      // Unit Classes
      const unitDays = extractDaysFromSchedule(cls.unitSchedule);
      const unitTimes = extractTimesFromSchedule(cls.unitSchedule);
      const unitStartDec = timeStringToDecimal(unitTimes.startTime);
      const unitEndDec = Math.max(unitStartDec + 0.5, timeStringToDecimal(unitTimes.endTime));

      for (const day of unitDays) {
        const clampedStart = Math.max(START_HOUR, Math.min(END_HOUR, unitStartDec));
        const clampedEnd = Math.max(clampedStart + 0.5, Math.min(END_HOUR, unitEndDec));
        const topPercent = ((clampedStart - START_HOUR) / TOTAL_HOURS) * 100;
        const heightPercent = ((clampedEnd - clampedStart) / TOTAL_HOURS) * 100;

        events.push({
          id: cls.id,
          eventKey: `${cls.id}-unit-${day}`,
          dayKey: day,
          type: 'UNIT',
          title: cls.name,
          code: cls.code,
          level: cls.level,
          book: cls.book,
          classroom: cls.classroom,
          modality: cls.modality,
          teacherName: cls.unitTeacher.name,
          startTime: unitTimes.startTime,
          endTime: unitTimes.endTime,
          startDecimal: unitStartDec,
          endDecimal: unitEndDec,
          startMinutes: Math.round(unitStartDec * 60),
          endMinutes: Math.round(unitEndDec * 60),
          topPercent,
          heightPercent: Math.max(heightPercent, 4),
          studentsCount: cls.studentsCount,
          isRecess: cls.status === 'IN_RECESS',
          rawClass: cls,
        });
      }

      // Speaking Classes
      const speakingDays = extractDaysFromSchedule(cls.speakingSchedule);
      const speakingTimes = extractTimesFromSchedule(cls.speakingSchedule);
      const spkStartDec = timeStringToDecimal(speakingTimes.startTime);
      const spkEndDec = Math.max(spkStartDec + 0.5, timeStringToDecimal(speakingTimes.endTime));

      for (const day of speakingDays) {
        const clampedStart = Math.max(START_HOUR, Math.min(END_HOUR, spkStartDec));
        const clampedEnd = Math.max(clampedStart + 0.5, Math.min(END_HOUR, spkEndDec));
        const topPercent = ((clampedStart - START_HOUR) / TOTAL_HOURS) * 100;
        const heightPercent = ((clampedEnd - clampedStart) / TOTAL_HOURS) * 100;

        events.push({
          id: cls.id,
          eventKey: `${cls.id}-speaking-${day}`,
          dayKey: day,
          type: 'SPEAKING',
          title: `${cls.name} [Speaking]`,
          code: cls.code,
          level: cls.level,
          book: cls.book,
          classroom: 'Aula VIRTUAL',
          modality: 'VIRTUAL',
          teacherName: cls.speakingTeacher.name,
          startTime: speakingTimes.startTime,
          endTime: speakingTimes.endTime,
          startDecimal: spkStartDec,
          endDecimal: spkEndDec,
          startMinutes: Math.round(spkStartDec * 60),
          endMinutes: Math.round(spkEndDec * 60),
          topPercent,
          heightPercent: Math.max(heightPercent, 4),
          studentsCount: cls.studentsCount,
          isRecess: cls.status === 'IN_RECESS',
          rawClass: cls,
        });
      }
    }
  }

  // 2. Procesar Clases Privadas (Solo las que caen en la semana activa)
  if (filterBook === 'ALL' || filterBook === 'PRIVATE') {
    for (const priv of privateClasses) {
      if (filterClassroom !== 'ALL' && priv.classroom !== filterClassroom) continue;

      // Obtener YYYY-MM-DD de la clase privada
      const privDate = new Date(priv.date);
      const year = privDate.getFullYear();
      const month = String(privDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(privDate.getDate()).padStart(2, '0');
      const privDateStr = `${year}-${month}-${dayNum}`;

      // Verificar si cae en la semana actual visible
      const matchedDayKey = weekDateMap.get(privDateStr);
      if (!matchedDayKey) continue; // No pertenece a la semana activa

      const privStartDec = timeStringToDecimal(priv.startTime);
      const privEndDec = Math.max(privStartDec + 0.5, timeStringToDecimal(priv.endTime));

      const clampedStart = Math.max(START_HOUR, Math.min(END_HOUR, privStartDec));
      const clampedEnd = Math.max(clampedStart + 0.5, Math.min(END_HOUR, privEndDec));
      const topPercent = ((clampedStart - START_HOUR) / TOTAL_HOURS) * 100;
      const heightPercent = ((clampedEnd - clampedStart) / TOTAL_HOURS) * 100;

      events.push({
        id: priv.id,
        eventKey: `private-${priv.id}-${matchedDayKey}`,
        dayKey: matchedDayKey,
        type: 'PRIVATE',
        title: `Privada: ${priv.studentName}`,
        classroom: priv.classroom,
        teacherName: priv.teacherName,
        startTime: priv.startTime,
        endTime: priv.endTime,
        startDecimal: privStartDec,
        endDecimal: privEndDec,
        startMinutes: Math.round(privStartDec * 60),
        endMinutes: Math.round(privEndDec * 60),
        topPercent,
        heightPercent: Math.max(heightPercent, 4),
        chargeAmount: priv.chargeAmount,
        status: priv.status,
        topic: priv.topic,
        rawPrivateClass: priv,
      });
    }
  }

  return events;
}

/**
 * Calcula el diseño side-by-side (concurrencia) para eventos que se traslapan en un mismo día.
 */
export function layoutDayEvents(
  events: CalendarEvent[], 
  hourHeight: number = 68
): PositionedCalendarEvent[] {
  if (events.length === 0) return [];

  // 1. Ordenar por hora de inicio ascendente; si coinciden, el de mayor duración primero
  const sorted = [...events].sort((a, b) => {
    if (a.startMinutes !== b.startMinutes) return a.startMinutes - b.startMinutes;
    return (b.endMinutes - b.startMinutes) - (a.endMinutes - a.startMinutes);
  });

  // 2. Agrupar eventos en clusters que se traslapan
  const clusters: CalendarEvent[][] = [];
  let currentCluster: CalendarEvent[] = [];
  let clusterEnd = -1;

  for (const event of sorted) {
    if (currentCluster.length === 0) {
      currentCluster.push(event);
      clusterEnd = event.endMinutes;
    } else if (event.startMinutes < clusterEnd) {
      // Hay colisión/traslape con el cluster actual
      currentCluster.push(event);
      clusterEnd = Math.max(clusterEnd, event.endMinutes);
    } else {
      // No hay colisión, cerramos el cluster anterior y abrimos uno nuevo
      clusters.push(currentCluster);
      currentCluster = [event];
      clusterEnd = event.endMinutes;
    }
  }
  if (currentCluster.length > 0) clusters.push(currentCluster);

  // 3. Asignar sub-columnas (colIndex) dentro de cada cluster usando empaquetado de intervalos
  const result: PositionedCalendarEvent[] = [];

  for (const cluster of clusters) {
    const columns: CalendarEvent[][] = [];

    for (const event of cluster) {
      let placed = false;
      for (let i = 0; i < columns.length; i++) {
        const lastInCol = columns[i][columns[i].length - 1];
        if (lastInCol.endMinutes <= event.startMinutes) {
          columns[i].push(event);
          (event as any).colIndex = i;
          placed = true;
          break;
        }
      }
      if (!placed) {
        columns.push([event]);
        (event as any).colIndex = columns.length - 1;
      }
    }

    const totalCols = columns.length;
    for (const event of cluster) {
      const topPx = (event.startDecimal - START_HOUR) * hourHeight;
      const duration = Math.max(event.endDecimal - event.startDecimal, 0.75);
      const heightPx = Math.max(duration * hourHeight - 4, 32);

      result.push({
        ...event,
        colIndex: (event as any).colIndex,
        totalCols,
        top: topPx,
        height: heightPx,
      });
    }
  }

  return result;
}
