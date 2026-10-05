import { ExpenseCategory, PaymentMethod } from '@prisma/client';

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  RENT: 'Arriendo de Instalaciones',
  UTILITIES: 'Servicios Básicos (Luz, Agua, Internet)',
  TEACHER_PAYROLL: 'Honorarios / Profesores',
  MARKETING: 'Publicidad & Redes',
  SUPPLIES: 'Materiales & Oficina',
  SOFTWARE: 'Software & Licencias',
  MAINTENANCE: 'Mantenimiento & Equipos',
  OTHER: 'Otros / Varios',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  TRANSFER: 'Transferencia Bancaria',
  CASH: 'Efectivo',
  CARD: 'Tarjeta de Crédito/Débito',
  DEPOSIT: 'Depósito Bancario',
};
