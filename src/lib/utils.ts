import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Devuelve la diferencia en días con respecto a hoy
 * Si es negativo, significa que ya pasaron X días (vencido).
 */
export function getDaysDiffFromNow(dueDate: Date | string): number {
  const target = new Date(dueDate);
  const now = new Date();
  // Normalizar a medianoche para comparar solo fechas
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - now.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
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
export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const datePart = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(d);
  const timePart = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
  return `${datePart} - ${timePart}`;
}

