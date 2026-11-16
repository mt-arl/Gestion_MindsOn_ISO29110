'use server';

import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { ExpenseType, ExpenseCategory, PaymentMethod } from '@prisma/client';
import { getMonthName } from '@/lib/utils';
import { EXPENSE_CATEGORY_LABELS } from '@/lib/expense-constants';
import { requireAuth } from '@/lib/require-auth';
import { financialMonthRange, tuitionDay } from '@/lib/tuition-dates';
import { priorTuitionPaymentsWhere } from '@/lib/tuition-payments';

export type SerializedExpense = {
  id: string;
  title: string;
  amount: number;
  type: ExpenseType;
  category: ExpenseCategory;
  expenseDate: string; // ISO
  paymentMethod: PaymentMethod;
  invoiceNumber: string | null;
  supplier: string | null;
  notes: string | null;
  recurringExpenseId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type SerializedRecurringExpense = {
  id: string;
  title: string;
  amount: number;
  category: ExpenseCategory;
  dayOfMonth: number;
  paymentMethod: PaymentMethod;
  supplier: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CategoryExpenseBreakdown = {
  category: ExpenseCategory;
  categoryLabel: string;
  total: number;
  count: number;
  percentageOfTotal: number;
};

export type MonthlyFinancialBalanceResponse = {
  error?: true;
  year: number;
  month: number;
  monthName: string;
  summary: {
    priorPeriodIncome: number;
    totalIncome: number;            // Ingresos Reales Cobrados (Payments)
    totalExpenses: number;          // Egresos Totales
    netBalance: number;             // totalIncome - totalExpenses
    operatingMarginPercentage: number; // ((totalIncome - totalExpenses) / totalIncome) * 100
    fixedExpensesSubtotal: number;
    variableExpensesSubtotal: number;
    fixedPercentageOfIncome: number;
    variablePercentageOfIncome: number;
    freeMarginPercentageOfIncome: number;
    isSurplus: boolean;             // netBalance >= 0
  };
  expensesByCategory: CategoryExpenseBreakdown[];
  expenses: SerializedExpense[];
};

/**
 * Sincroniza automáticamente las plantillas activas de gastos recurrentes para el mes consultado.
 * Si una plantilla activa aún no tiene un registro Expense en dicho periodo, se crea automáticamente como FIXED.
 */
async function syncMonthlyRecurringExpenses(targetYear: number, targetMonth: number): Promise<void> {
  try {
    const activeTemplates = await prisma.recurringExpense.findMany({
      where: { isActive: true },
    });

    if (activeTemplates.length === 0) return;

    const monthRange = financialMonthRange(targetYear, targetMonth);
    const daysInMonth = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();

    // Obtener qué plantillas ya tienen un Expense generado en este mes
    const existingExpenses = await prisma.expense.findMany({
      where: {
        expenseDate: monthRange,
        recurringExpenseId: {
          not: null,
        },
      },
      select: {
        recurringExpenseId: true,
      },
    });

    const generatedTemplateIds = new Set(existingExpenses.map((e) => e.recurringExpenseId));
    const templatesToGenerate = activeTemplates.filter((t) => !generatedTemplateIds.has(t.id));

    if (templatesToGenerate.length > 0) {
      await Promise.all(
        templatesToGenerate.map((template) => {
          const safeDay = Math.min(Math.max(1, template.dayOfMonth), daysInMonth);
          const expenseDate = new Date(Date.UTC(targetYear, targetMonth - 1, safeDay, 12));

          return prisma.expense.create({
            data: {
              title: template.title,
              amount: template.amount,
              type: ExpenseType.FIXED,
              category: template.category,
              expenseDate,
              paymentMethod: template.paymentMethod,
              supplier: template.supplier,
              notes: template.notes ? `[Plantilla Recurrente] ${template.notes}` : '[Gasto Recurrente Programado]',
              recurringExpenseId: template.id,
            },
          });
        })
      );
    }
  } catch (syncError) {
    console.error('Error al sincronizar gastos recurrentes del periodo:', syncError);
  }
}

/**
 * 1. Obtiene el balance financiero mensual comparando ingresos de cobranzas vs. egresos operativos
 */
export async function getMonthlyFinancialBalanceAction(
  year?: number,
  month?: number
): Promise<MonthlyFinancialBalanceResponse> {
  try {
    await requireAuth();
    const cutoff = new Date();
    const now = tuitionDay(cutoff);
    const targetYear = typeof year === 'number' && year >= 2020 && year <= 2100 ? year : now.getUTCFullYear();
    const targetMonth = typeof month === 'number' && month >= 1 && month <= 12 ? month : now.getUTCMonth() + 1;

    const monthRange = financialMonthRange(targetYear, targetMonth);

    // 0. Sincronización automática de gastos recurrentes programados para este mes
    if (now.getUTCFullYear() === targetYear && now.getUTCMonth() + 1 === targetMonth) {
      await syncMonthlyRecurringExpenses(targetYear, targetMonth);
    }

    // 1. Pagos registrados hasta hoy para las cuotas del periodo.
    const period = { year: targetYear, month: targetMonth };
    const [payments, priorPayments, rawExpenses] = await Promise.all([
      prisma.payment.findMany({
        where: { tuitionFee: period, paymentDate: { lte: cutoff } },
        select: { amountPaid: true },
      }),
      prisma.payment.aggregate({
        where: priorTuitionPaymentsWhere(period, cutoff),
        _sum: { amountPaid: true },
      }),
      prisma.expense.findMany({
        where: { expenseDate: monthRange },
        orderBy: { expenseDate: 'desc' },
      }),
    ]);

    const totalIncome = payments.reduce((cents, p) => cents + Math.round(Number(p.amountPaid) * 100), 0) / 100;
    const priorPeriodIncome = Number(priorPayments._sum.amountPaid ?? 0);

    let totalExpenses = 0;
    let fixedExpensesSubtotal = 0;
    let variableExpensesSubtotal = 0;

    const categoryMap = new Map<ExpenseCategory, { total: number; count: number }>();
    Object.values(ExpenseCategory).forEach((cat) => {
      categoryMap.set(cat, { total: 0, count: 0 });
    });

    const serializedExpenses: SerializedExpense[] = rawExpenses.map((exp) => {
      const amt = Number(exp.amount);
      totalExpenses += amt;

      if (exp.type === ExpenseType.FIXED) {
        fixedExpensesSubtotal += amt;
      } else {
        variableExpensesSubtotal += amt;
      }

      const currentCat = categoryMap.get(exp.category) || { total: 0, count: 0 };
      currentCat.total += amt;
      currentCat.count += 1;
      categoryMap.set(exp.category, currentCat);

      return {
        id: exp.id,
        title: exp.title,
        amount: amt,
        type: exp.type,
        category: exp.category,
        expenseDate: exp.expenseDate.toISOString(),
        paymentMethod: exp.paymentMethod,
        invoiceNumber: exp.invoiceNumber,
        supplier: exp.supplier,
        notes: exp.notes,
        recurringExpenseId: exp.recurringExpenseId,
        createdAt: exp.createdAt.toISOString(),
        updatedAt: exp.updatedAt.toISOString(),
      };
    });

    const netBalance = Math.round((totalIncome - totalExpenses) * 100) / 100;
    const isSurplus = netBalance >= 0;

    const operatingMarginPercentage = totalIncome > 0 
      ? Math.round(((netBalance / totalIncome) * 100) * 10) / 10 
      : 0;

    const fixedPercentageOfIncome = totalIncome > 0
      ? Math.round(((fixedExpensesSubtotal / totalIncome) * 100) * 10) / 10
      : 0;

    const variablePercentageOfIncome = totalIncome > 0
      ? Math.round(((variableExpensesSubtotal / totalIncome) * 100) * 10) / 10
      : 0;

    const freeMarginPercentageOfIncome = totalIncome > 0
      ? Math.max(0, operatingMarginPercentage)
      : 0;

    // Desglose por categoría ordenado por mayor gasto
    const expensesByCategory: CategoryExpenseBreakdown[] = Object.values(ExpenseCategory)
      .map((cat) => {
        const stats = categoryMap.get(cat) || { total: 0, count: 0 };
        return {
          category: cat,
          categoryLabel: EXPENSE_CATEGORY_LABELS[cat] || cat,
          total: Math.round(stats.total * 100) / 100,
          count: stats.count,
          percentageOfTotal: totalExpenses > 0 ? Math.round(((stats.total / totalExpenses) * 100) * 10) / 10 : 0,
        };
      })
      .filter((item) => item.total > 0 || item.count > 0)
      .sort((a, b) => b.total - a.total);

    return {
      year: targetYear,
      month: targetMonth,
      monthName: getMonthName(targetMonth),
      summary: {
        priorPeriodIncome,
        totalIncome: Math.round(totalIncome * 100) / 100,
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        netBalance,
        operatingMarginPercentage,
        fixedExpensesSubtotal: Math.round(fixedExpensesSubtotal * 100) / 100,
        variableExpensesSubtotal: Math.round(variableExpensesSubtotal * 100) / 100,
        fixedPercentageOfIncome,
        variablePercentageOfIncome,
        freeMarginPercentageOfIncome,
        isSurplus,
      },
      expensesByCategory,
      expenses: serializedExpenses,
    };
  } catch (error) {
    console.error('Error al obtener balance financiero mensual:', error);
    const now = tuitionDay(new Date());
    return {
      error: true,
      year: year || now.getUTCFullYear(),
      month: month || now.getUTCMonth() + 1,
      monthName: getMonthName(month || now.getUTCMonth() + 1),
      summary: {
        priorPeriodIncome: 0,
        totalIncome: 0,
        totalExpenses: 0,
        netBalance: 0,
        operatingMarginPercentage: 0,
        fixedExpensesSubtotal: 0,
        variableExpensesSubtotal: 0,
        fixedPercentageOfIncome: 0,
        variablePercentageOfIncome: 0,
        freeMarginPercentageOfIncome: 0,
        isSurplus: true,
      },
      expensesByCategory: [],
      expenses: [],
    };
  }
}

/**
 * 2. Registra un nuevo egreso / gasto
 */
export async function createExpenseAction(data: {
  title: string;
  amount: number;
  type: ExpenseType;
  category: ExpenseCategory;
  expenseDate: string; // YYYY-MM-DD
  paymentMethod: PaymentMethod;
  invoiceNumber?: string | null;
  supplier?: string | null;
  notes?: string | null;
  recurringExpenseId?: string | null;
}): Promise<{ success: boolean; message: string; expenseId?: string }> {
  try {
    await requireAuth();
    const titleClean = data.title?.trim();
    if (!titleClean) {
      return { success: false, message: 'La descripción o concepto del gasto es obligatoria.' };
    }

    const amtNum = Number(data.amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      return { success: false, message: 'El monto del gasto debe ser un número positivo mayor a $0 USD.' };
    }

    if (!data.type || !Object.values(ExpenseType).includes(data.type)) {
      return { success: false, message: 'Debes seleccionar si es Gasto Fijo o Variable.' };
    }

    if (!data.category || !Object.values(ExpenseCategory).includes(data.category)) {
      return { success: false, message: 'Debes seleccionar una categoría de gasto válida.' };
    }

    if (!data.paymentMethod || !Object.values(PaymentMethod).includes(data.paymentMethod)) {
      return { success: false, message: 'Debes seleccionar un método de pago válido.' };
    }

    let parsedDate = new Date();
    if (data.expenseDate && data.expenseDate.trim()) {
      const parts = data.expenseDate.trim().split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        parsedDate = new Date(Date.UTC(y, m - 1, d, 12));
      }
    }

    const created = await prisma.expense.create({
      data: {
        title: titleClean,
        amount: amtNum,
        type: data.type,
        category: data.category,
        expenseDate: parsedDate,
        paymentMethod: data.paymentMethod,
        invoiceNumber: data.invoiceNumber?.trim() || null,
        supplier: data.supplier?.trim() || null,
        notes: data.notes?.trim() || null,
        recurringExpenseId: data.recurringExpenseId?.trim() || null,
      },
    });

    revalidatePath('/');
    revalidatePath('/classes');
    revalidatePath('/schedule');

    return {
      success: true,
      message: `Gasto "${created.title}" por $${created.amount.toFixed(2)} USD registrado exitosamente.`,
      expenseId: created.id,
    };
  } catch (error) {
    console.error('Error al registrar gasto:', error);
    return { success: false, message: 'Error interno al registrar el gasto.' };
  }
}

/**
 * 3. Actualiza un egreso existente
 */
export async function updateExpenseAction(
  id: string,
  data: {
    title: string;
    amount: number;
    type: ExpenseType;
    category: ExpenseCategory;
    expenseDate: string; // YYYY-MM-DD
    paymentMethod: PaymentMethod;
    invoiceNumber?: string | null;
    supplier?: string | null;
    notes?: string | null;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth();
    if (!id) {
      return { success: false, message: 'ID de gasto no proporcionado.' };
    }

    const titleClean = data.title?.trim();
    if (!titleClean) {
      return { success: false, message: 'La descripción o concepto del gasto es obligatoria.' };
    }

    const amtNum = Number(data.amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      return { success: false, message: 'El monto debe ser mayor a $0 USD.' };
    }

    let parsedDate = new Date();
    if (data.expenseDate && data.expenseDate.trim()) {
      const parts = data.expenseDate.trim().split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10);
        const d = parseInt(parts[2], 10);
        parsedDate = new Date(Date.UTC(y, m - 1, d, 12));
      }
    }

    await prisma.expense.update({
      where: { id },
      data: {
        title: titleClean,
        amount: amtNum,
        type: data.type,
        category: data.category,
        expenseDate: parsedDate,
        paymentMethod: data.paymentMethod,
        invoiceNumber: data.invoiceNumber?.trim() || null,
        supplier: data.supplier?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    revalidatePath('/');

    return { success: true, message: 'Gasto actualizado correctamente.' };
  } catch (error) {
    console.error('Error al actualizar gasto:', error);
    return { success: false, message: 'Error interno al actualizar el gasto.' };
  }
}

/**
 * 4. Elimina un egreso registrado
 */
export async function deleteExpenseAction(id: string): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth();
    if (!id) {
      return { success: false, message: 'ID de gasto no proporcionado.' };
    }

    const existing = await prisma.expense.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, message: 'El registro de gasto no existe o ya fue eliminado.' };
    }

    await prisma.expense.delete({
      where: { id },
    });

    revalidatePath('/');

    return { success: true, message: `Egreso "${existing.title}" eliminado correctamente.` };
  } catch (error) {
    console.error('Error al eliminar gasto:', error);
    return { success: false, message: 'Error interno al eliminar el gasto.' };
  }
}

/**
 * 5. Obtiene todas las plantillas de gastos recurrentes programados
 */
export async function getRecurringExpensesAction(): Promise<SerializedRecurringExpense[]> {
  try {
    await requireAuth();
    const templates = await prisma.recurringExpense.findMany({
      orderBy: [
        { isActive: 'desc' },
        { dayOfMonth: 'asc' },
      ],
    });

    return templates.map((t) => ({
      id: t.id,
      title: t.title,
      amount: Number(t.amount),
      category: t.category,
      dayOfMonth: t.dayOfMonth,
      paymentMethod: t.paymentMethod,
      supplier: t.supplier,
      notes: t.notes,
      isActive: t.isActive,
      createdAt: t.createdAt.toISOString(),
      updatedAt: t.updatedAt.toISOString(),
    }));
  } catch (error) {
    console.error('Error al obtener plantillas de gastos recurrentes:', error);
    return [];
  }
}

/**
 * 6. Registra una nueva plantilla de gasto recurrente programado
 */
export async function createRecurringExpenseAction(data: {
  title: string;
  amount: number;
  category: ExpenseCategory;
  dayOfMonth: number;
  paymentMethod?: PaymentMethod;
  supplier?: string | null;
  notes?: string | null;
  isActive?: boolean;
}): Promise<{ success: boolean; message: string; recurringExpenseId?: string }> {
  try {
    await requireAuth();
    const titleClean = data.title?.trim();
    if (!titleClean) {
      return { success: false, message: 'El concepto o título del gasto recurrente es obligatorio.' };
    }

    const amt = Number(data.amount);
    if (isNaN(amt) || amt <= 0) {
      return { success: false, message: 'El monto mensual debe ser un valor positivo mayor a $0 USD.' };
    }

    const dayNum = Math.min(31, Math.max(1, parseInt(String(data.dayOfMonth), 10) || 1));
    const paymentMethod = data.paymentMethod || PaymentMethod.TRANSFER;

    const created = await prisma.recurringExpense.create({
      data: {
        title: titleClean,
        amount: amt,
        category: data.category,
        dayOfMonth: dayNum,
        paymentMethod,
        supplier: data.supplier?.trim() || null,
        notes: data.notes?.trim() || null,
        isActive: data.isActive !== undefined ? data.isActive : true,
      },
    });

    // Si se crea activa, generar inmediatamente el gasto para el mes en curso si no existe
    if (created.isActive) {
      const now = tuitionDay(new Date());
      await syncMonthlyRecurringExpenses(now.getUTCFullYear(), now.getUTCMonth() + 1);
    }

    revalidatePath('/');
    return {
      success: true,
      message: `Plantilla recurrente "${created.title}" registrada exitosamente.`,
      recurringExpenseId: created.id,
    };
  } catch (error) {
    console.error('Error al crear plantilla de gasto recurrente:', error);
    return { success: false, message: 'Error interno al registrar la plantilla recurrente.' };
  }
}

/**
 * 7. Modifica una plantilla de gasto recurrente maestro
 */
export async function updateRecurringExpenseAction(
  id: string,
  data: {
    title: string;
    amount: number;
    category: ExpenseCategory;
    dayOfMonth: number;
    paymentMethod?: PaymentMethod;
    supplier?: string | null;
    notes?: string | null;
    syncCurrentMonth?: boolean;
  }
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth();
    if (!id) return { success: false, message: 'ID de plantilla no proporcionado.' };

    const titleClean = data.title?.trim();
    if (!titleClean) return { success: false, message: 'El concepto o título es obligatorio.' };

    const amt = Number(data.amount);
    if (isNaN(amt) || amt <= 0) return { success: false, message: 'El monto debe ser mayor a $0 USD.' };

    const dayNum = Math.min(31, Math.max(1, parseInt(String(data.dayOfMonth), 10) || 1));

    const updated = await prisma.recurringExpense.update({
      where: { id },
      data: {
        title: titleClean,
        amount: amt,
        category: data.category,
        dayOfMonth: dayNum,
        paymentMethod: data.paymentMethod || PaymentMethod.TRANSFER,
        supplier: data.supplier?.trim() || null,
        notes: data.notes?.trim() || null,
      },
    });

    // Sincronizar el gasto generado del mes en curso si está habilitado
    if (data.syncCurrentMonth !== false) {
      const now = tuitionDay(new Date());
      const monthRange = financialMonthRange(now.getUTCFullYear(), now.getUTCMonth() + 1);
      const daysInMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0)).getUTCDate();
      const safeDay = Math.min(dayNum, daysInMonth);

      await prisma.expense.updateMany({
        where: {
          recurringExpenseId: id,
          expenseDate: monthRange,
        },
        data: {
          title: updated.title,
          amount: updated.amount,
          category: updated.category,
          paymentMethod: updated.paymentMethod,
          supplier: updated.supplier,
          expenseDate: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), safeDay, 12)),
        },
      });
    }

    revalidatePath('/');
    return { success: true, message: `Plantilla recurrente "${updated.title}" actualizada exitosamente.` };
  } catch (error) {
    console.error('Error al actualizar plantilla recurrente:', error);
    return { success: false, message: 'Error interno al actualizar la plantilla recurrente.' };
  }
}

/**
 * 8. Activa o pausa la generación automática de una plantilla recurrente
 */
export async function toggleRecurringExpenseAction(
  id: string,
  isActive: boolean
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth();
    if (!id) return { success: false, message: 'ID no proporcionado.' };

    const updated = await prisma.recurringExpense.update({
      where: { id },
      data: { isActive },
    });

    if (isActive) {
      const now = tuitionDay(new Date());
      await syncMonthlyRecurringExpenses(now.getUTCFullYear(), now.getUTCMonth() + 1);
    }

    revalidatePath('/');
    return {
      success: true,
      message: `Plantilla "${updated.title}" ${isActive ? 'activada' : 'pausada'} correctamente.`,
    };
  } catch (error) {
    console.error('Error al alternar estado de plantilla recurrente:', error);
    return { success: false, message: 'Error interno al actualizar el estado de la plantilla.' };
  }
}

/**
 * 9. Elimina una plantilla de gasto recurrente
 * Los registros históricos ya generados en meses pasados se conservan (recurringExpenseId pasa a null).
 */
export async function deleteRecurringExpenseAction(
  id: string
): Promise<{ success: boolean; message: string }> {
  try {
    await requireAuth();
    if (!id) return { success: false, message: 'ID no proporcionado.' };

    const existing = await prisma.recurringExpense.findUnique({
      where: { id },
    });

    if (!existing) {
      return { success: false, message: 'La plantilla no existe o ya fue eliminada.' };
    }

    await prisma.recurringExpense.delete({
      where: { id },
    });

    revalidatePath('/');
    return {
      success: true,
      message: `Plantilla recurrente "${existing.title}" eliminada. Los gastos pasados se conservan en el historial.`,
    };
  } catch (error) {
    console.error('Error al eliminar plantilla recurrente:', error);
    return { success: false, message: 'Error interno al eliminar la plantilla recurrente.' };
  }
}

