export const TUITION_TIME_ZONE = 'America/Guayaquil';

const DAY_MS = 24 * 60 * 60 * 1000;
const ECUADOR_OFFSET_MS = 5 * 60 * 60 * 1000;

export type TuitionPeriod = { year: number; month: number };

export function tuitionPeriodKey({ year, month }: TuitionPeriod): number {
  return year * 12 + month;
}

// Representar los días civiles de Ecuador a medianoche UTC simplifica el cálculo de periodos.
export function tuitionDay(date: Date): Date {
  const local = new Date(date.getTime() - ECUADOR_OFFSET_MS);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()));
}

export function tuitionPeriod(day: Date, offset = 0): Date {
  return new Date(Date.UTC(day.getUTCFullYear(), day.getUTCMonth() + offset, 1));
}

export function tuitionDayStart(day: Date): Date {
  return new Date(day.getTime() + ECUADOR_OFFSET_MS);
}

export function tuitionDateInput(date: Date): string {
  return tuitionDay(date).toISOString().slice(0, 10);
}

export function parseTuitionDateInput(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const day = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(day.getTime()) || day.getUTCFullYear() < 100 || day.toISOString().slice(0, 10) !== value) return null;
  return tuitionDayStart(day);
}

export function firstTuitionPeriod(enrollmentDay: Date, issuedFees: readonly TuitionPeriod[]): Date {
  let first = tuitionPeriod(enrollmentDay, 1);
  // Una cuota histórica confirma que el ciclo ya había comenzado.
  for (const { year, month } of issuedFees) {
    const period = new Date(Date.UTC(year, month - 1, 1));
    if (period < first) first = period;
  }
  return first;
}

export function tuitionDueDate(enrollmentDay: Date, period: Date): Date {
  const year = period.getUTCFullYear();
  const month = period.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  const day = Math.min(enrollmentDay.getUTCDate(), daysInMonth);
  return new Date(Date.UTC(year, month, day + 1) + ECUADOR_OFFSET_MS - 1);
}

export function upcomingTuitionDate(
  enrollmentDate: Date,
  now: Date,
  issuedFees: readonly (TuitionPeriod & { status: string })[] = [],
): Date {
  const enrollmentDay = tuitionDay(enrollmentDate);
  const firstPeriod = firstTuitionPeriod(enrollmentDay, issuedFees);
  let period = tuitionPeriod(tuitionDay(now));
  if (period < firstPeriod) period = firstPeriod;

  let due = tuitionDueDate(enrollmentDay, period);
  while (due < now || issuedFees.some((fee) =>
    fee.status === 'PAID' && fee.month === period.getUTCMonth() + 1 && fee.year === period.getUTCFullYear()
  )) {
    period = tuitionPeriod(period, 1);
    due = tuitionDueDate(enrollmentDay, period);
  }
  return due;
}

export function tuitionDaysUntil(dueDate: Date, now: Date): number {
  return (tuitionDay(dueDate).getTime() - tuitionDay(now).getTime()) / DAY_MS;
}
