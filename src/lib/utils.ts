import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { TUITION_TIME_ZONE, tuitionDaysUntil } from '@/lib/tuition-dates';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formatea un valor numérico o Decimal a moneda USD
 */
export function formatCurrency(amount: number | string | { toString(): string } | null | undefined): string {
  if (amount === null || amount === undefined) return '$0.00 USD';
  const num = typeof amount === 'number' ? amount : parseFloat(amount.toString());
  if (isNaN(num)) return '$0.00 USD';
  return new Intl.NumberFormat('es-BO', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(num);
}

/**
 * Formatea una fecha a formato legible en español
 */
export function formatDate(date: Date | string, timeZone?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone,
  }).format(d);
}

export function formatTuitionDate(date: Date | string): string {
  return formatDate(date, TUITION_TIME_ZONE);
}

/**
 * Devuelve la diferencia en días con respecto a hoy
 * Si es negativo, significa que ya pasaron X días (vencido).
 */
export function getDaysDiffFromNow(dueDate: Date | string): number {
  return tuitionDaysUntil(new Date(dueDate), new Date());
}

/**
 * Nombre de mes en español
 */
export function getMonthName(monthNumber: number): string {
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  return months[monthNumber - 1] || `Mes ${monthNumber}`;
}

/**
 * Helper para asignar el libro automáticamente según el nivel del curso
 */
export function getBookForLevel(level: 'INTRO_A' | 'INTRO_B' | 'L1A' | 'L1B' | 'L2A' | 'L2B' | string): 'AMARILLO' | 'ROJO' | 'AZUL' {
  if (level === 'INTRO_A' || level === 'INTRO_B') {
    return 'AMARILLO';
  }
  if (level === 'L1A' || level === 'L1B') {
    return 'ROJO';
  }
  return 'AZUL';
}

/**
 * Formatea una fecha y hora a formato legible en español (DD/MM/YYYY - HH:mm)
 */
export function formatDateTime(date: Date | string, timeZone?: string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const datePart = new Intl.DateTimeFormat('es-ES', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('es-ES', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${datePart} - ${timePart}`;
}

