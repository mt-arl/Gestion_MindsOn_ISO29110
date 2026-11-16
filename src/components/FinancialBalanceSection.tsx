'use client';

import React, { useState, useEffect, useTransition, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  ArrowLeft, 
  ArrowRight, 
  Filter, 
  Search, 
  Plus, 
  Trash2, 
  Edit3, 
  ArrowUpRight, 
  ArrowDownRight, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Percent, 
  PieChart, 
  FileText, 
  Loader2, 
  RefreshCw, 
  Sparkles, 
  Building2, 
  Tag, 
  CreditCard,
  Zap,
  Bookmark,
  Receipt,
  Layers,
  Check,
  Repeat
} from 'lucide-react';
import { 
  getMonthlyFinancialBalanceAction, 
  deleteExpenseAction,
  MonthlyFinancialBalanceResponse, 
  SerializedExpense
} from '@/actions/expenses';
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/expense-constants';
import { ExpenseType, ExpenseCategory, PaymentMethod } from '@prisma/client';
import { formatCurrency, formatTuitionDate, getMonthName } from '@/lib/utils';
import { tuitionDay } from '@/lib/tuition-dates';
import { CreateExpenseModal } from './CreateExpenseModal';
import { EditExpenseModal } from './EditExpenseModal';
import { RecurringExpensesModal } from './RecurringExpensesModal';

interface FinancialBalanceSectionProps {
  initialData?: MonthlyFinancialBalanceResponse;
  onViewPayments?: (year: number, month: number) => void;
}

export function FinancialBalanceSection({
  initialData,
  onViewPayments,
}: FinancialBalanceSectionProps) {
  const now = tuitionDay(new Date());
  const currentCalendarYear = now.getUTCFullYear();
  const currentCalendarMonth = now.getUTCMonth() + 1;

  const [isPending, startTransition] = useTransition();
  const [data, setData] = useState<MonthlyFinancialBalanceResponse | null>(initialData || null);
  const [selectedYear, setSelectedYear] = useState<number>(initialData?.year || currentCalendarYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialData?.month || currentCalendarMonth);

  // Filtros de la tabla
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'FIXED' | 'VARIABLE'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | ExpenseCategory>('ALL');

  // Modales y estados de acción
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isRecurringModalOpen, setIsRecurringModalOpen] = useState(false);
  const [selectedExpenseForEdit, setSelectedExpenseForEdit] = useState<SerializedExpense | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const latestRequest = useRef(0);
  const [loadError, setLoadError] = useState(false);
  const loadBalance = (year: number, month: number) => {
    const request = ++latestRequest.current;
    setLoadError(false);
    startTransition(async () => {
      try {
        const result = await getMonthlyFinancialBalanceAction(year, month);
        if (request === latestRequest.current) setData(result);
      } catch {
        if (request === latestRequest.current) setLoadError(true);
      }
    });
  };

  // Cargar si no hay initialData
  useEffect(() => {
    if (!initialData) {
      loadBalance(selectedYear, selectedMonth);
    }
  }, []);

  // Navegación de mes con botones
  const handleNavigateMonth = (offset: number) => {
    let newMonth = selectedMonth + offset;
    let newYear = selectedYear;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
    loadBalance(newYear, newMonth);
  };

  const handleGoToCurrentMonth = () => {
    setSelectedYear(currentCalendarYear);
    setSelectedMonth(currentCalendarMonth);
    loadBalance(currentCalendarYear, currentCalendarMonth);
  };

  // Eliminación de un egreso
  const handleDeleteExpense = async (expense: SerializedExpense) => {
    const isRecurring = Boolean(expense.recurringExpenseId);
    const confirmed = window.confirm(
      isRecurring
        ? `¿Deseas eliminar este registro de "${expense.title}" (${formatCurrency(expense.amount)})?\n\nNota: Este gasto proviene de una plantilla recurrente programada. Eliminarlo aquí solo lo retirará del mes actual (${getMonthName(selectedMonth)} ${selectedYear}), sin afectar la plantilla maestra ni meses futuros.`
        : `¿Estás seguro de que deseas eliminar el gasto "${expense.title}" por ${formatCurrency(expense.amount)}?\nEsta acción no se puede deshacer.`
    );
    if (!confirmed) return;

    setDeletingId(expense.id);
    try {
      const res = await deleteExpenseAction(expense.id);
      if (res.success) {
        setFeedbackMessage({ type: 'success', text: res.message });
        loadBalance(selectedYear, selectedMonth);
      } else {
        setFeedbackMessage({ type: 'error', text: res.message });
      }
    } catch {
      setFeedbackMessage({ type: 'error', text: 'Error inesperado al intentar eliminar el gasto.' });
    } finally {
      setDeletingId(null);
      setTimeout(() => setFeedbackMessage(null), 4000);
    }
  };

  // Filtrado reactivo de egresos
  const filteredExpenses = useMemo(() => {
    if (!data?.expenses) return [];

    return data.expenses.filter((exp) => {
      // Filtro tipo (FIXED / VARIABLE)
      if (typeFilter !== 'ALL' && exp.type !== typeFilter) {
        return false;
      }

      // Filtro categoría
      if (categoryFilter !== 'ALL' && exp.category !== categoryFilter) {
        return false;
      }

      // Filtro de búsqueda de texto
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const title = exp.title.toLowerCase();
      const supplier = (exp.supplier || '').toLowerCase();
      const invoice = (exp.invoiceNumber || '').toLowerCase();
      const notes = (exp.notes || '').toLowerCase();
      const catLabel = (EXPENSE_CATEGORY_LABELS[exp.category] || '').toLowerCase();

      return (
        title.includes(q) ||
        supplier.includes(q) ||
        invoice.includes(q) ||
        notes.includes(q) ||
        catLabel.includes(q)
      );
    });
  }, [data?.expenses, typeFilter, categoryFilter, searchTerm]);

  // Suma total de los egresos actualmente filtrados
  const filteredTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [filteredExpenses]);

  const summary = data?.summary || {
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
  };

  const matchesPeriod = data?.year === selectedYear && data?.month === selectedMonth;
  const isCurrentMonthSelected = selectedYear === currentCalendarYear && selectedMonth === currentCalendarMonth;

  return (
    <div id="seccion-balance-financiero" className="space-y-6">
      {/* 1. Header & Selector de Periodo */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-slate-200/80">
        <div className="flex flex-wrap items-center gap-3">
          {/* Navegador de Meses */}
          <div className="flex items-center rounded-xl bg-slate-100/90 p-1 border border-slate-200/80 shadow-inner">
            <button
              onClick={() => handleNavigateMonth(-1)}
              disabled={isPending}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all disabled:opacity-40"
              title="Mes Anterior"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            
            <div className="px-3 py-1 flex items-center gap-2">
              <Calendar className="h-4 w-4 text-slate-500" />
              <span className="text-xs sm:text-sm font-bold text-slate-800">
                {getMonthName(selectedMonth)} {selectedYear}
              </span>
              {isPending && <Loader2 className="h-3.5 w-3.5 text-indigo-600 animate-spin" />}
            </div>

            <button
              onClick={() => handleNavigateMonth(1)}
              disabled={isPending}
              className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-white transition-all disabled:opacity-40"
              title="Mes Siguiente"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {!isCurrentMonthSelected && (
            <button
              onClick={handleGoToCurrentMonth}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200/80 transition-colors"
            >
              <Sparkles className="h-3 w-3 text-indigo-500" />
              <span>Ir a Mes Actual</span>
            </button>
          )}
        </div>

        {/* Acciones principales: Registrar Egreso, Gastos Recurrentes & Refrescar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => loadBalance(selectedYear, selectedMonth)}
            disabled={isPending}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 border border-slate-200/80 transition-colors"
            title="Recargar balance"
          >
            <RefreshCw className={`h-4 w-4 ${isPending ? 'animate-spin text-indigo-600' : ''}`} />
          </button>

          <button
            type="button"
            onClick={() => setIsRecurringModalOpen(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200/80 active:scale-[0.98] transition-all"
            title="Gestionar plantillas de gastos fijos programados para cada mes"
          >
            <Repeat className="h-4 w-4 text-indigo-600" />
            <span>Gastos Recurrentes</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 active:scale-[0.98] transition-all shadow-md shadow-rose-600/20"
          >
            <Plus className="h-4 w-4 stroke-[2.5]" />
            <span>Registrar Egreso / Gasto</span>
          </button>
        </div>
      </div>

      {/* Notificación de feedback */}
      {feedbackMessage && (
        <div className={`p-4 rounded-xl border flex items-center justify-between text-xs sm:text-sm font-medium animate-in fade-in slide-in-from-top-2 duration-200 ${
          feedbackMessage.type === 'success' 
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
            : 'bg-rose-50 text-rose-800 border-rose-200'
        }`}>
          <div className="flex items-center gap-2">
            {feedbackMessage.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
          <button 
            onClick={() => setFeedbackMessage(null)}
            className="text-slate-400 hover:text-slate-600 text-xs px-2 py-0.5"
          >
            Cerrar
          </button>
        </div>
      )}

      {(loadError || data?.error) && (
        <p role="alert" className="text-sm text-rose-700">No se pudo cargar el balance del periodo.</p>
      )}
      {matchesPeriod && !loadError && !data?.error && <>
      {/* 2. Tarjetas de Métricas Clave (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Ingresos Reales Cobrados */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Ingresos Cobrados
              </p>
              <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">
                {formatCurrency(summary.totalIncome)}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <ArrowUpRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Cobrado de las cuotas del mes</span>
            {onViewPayments && data && (
              <button type="button" disabled={isPending} className="font-bold text-indigo-700 hover:underline"
                onClick={() => onViewPayments(data.year, data.month)}>
                Ver libro diario
              </button>
            )}
          </div>
          <p className="mt-2 text-[11px] text-slate-600">
            Cobros de meses anteriores <strong>{formatCurrency(summary.priorPeriodIncome)}</strong>
          </p>
        </div>

        {/* Card 2: Egresos Operativos Totales */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Egresos Operativos
              </p>
              <h3 className="text-2xl font-black text-rose-600 mt-1 tracking-tight">
                {formatCurrency(summary.totalExpenses)}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <ArrowDownRight className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Fijos: <strong className="text-slate-700">{formatCurrency(summary.fixedExpensesSubtotal)}</strong></span>
            <span>Var: <strong className="text-amber-700">{formatCurrency(summary.variableExpensesSubtotal)}</strong></span>
          </div>
        </div>

        {/* Card 3: Utilidad Neta (Superávit o Déficit) */}
        <div className={`relative overflow-hidden rounded-2xl p-5 border shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between transition-colors ${
          summary.isSurplus 
            ? 'bg-gradient-to-br from-emerald-50/50 via-white to-white border-emerald-200/80' 
            : 'bg-gradient-to-br from-rose-50/50 via-white to-white border-rose-200/80'
        }`}>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Utilidad Neta
                </p>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                  summary.isSurplus 
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                    : 'bg-rose-100 text-rose-800 border border-rose-200'
                }`}>
                  {summary.isSurplus ? 'Superávit' : 'Déficit'}
                </span>
              </div>
              <h3 className={`text-2xl font-black mt-1 tracking-tight ${
                summary.isSurplus ? 'text-emerald-700' : 'text-rose-700'
              }`}>
                {summary.isSurplus ? '+' : ''}{formatCurrency(summary.netBalance)}
              </h3>
            </div>
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl border ${
              summary.isSurplus 
                ? 'bg-emerald-100/60 text-emerald-700 border-emerald-200' 
                : 'bg-rose-100/60 text-rose-700 border-rose-200'
            }`}>
              {summary.isSurplus ? <CheckCircle2 className="h-5 w-5" /> : <AlertTriangle className="h-5 w-5" />}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Balance del periodo</span>
            <span className={`font-bold ${summary.isSurplus ? 'text-emerald-700' : 'text-rose-700'}`}>
              {summary.isSurplus ? 'Rentable' : 'Flujo Negativo'}
            </span>
          </div>
        </div>

        {/* Card 4: Margen Operativo (%) */}
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] flex flex-col justify-between">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Margen Operativo
              </p>
              <h3 className={`text-2xl font-black mt-1 tracking-tight ${
                summary.operatingMarginPercentage >= 30 
                  ? 'text-emerald-700' 
                  : summary.operatingMarginPercentage > 0 
                  ? 'text-indigo-700' 
                  : 'text-rose-600'
              }`}>
                {summary.totalIncome > 0 ? `${summary.operatingMarginPercentage}%` : '—'}
              </h3>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Percent className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Retención del ingreso</span>
            <span className="font-semibold text-slate-700">
              {summary.totalIncome === 0 ? 'Sin ingresos' : summary.operatingMarginPercentage >= 40 ? 'Óptimo' : summary.operatingMarginPercentage > 0 ? 'Saludable' : 'Alerta'}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Barra Visual de Distribución de Ingresos y Flujo de Caja */}
      <div className="rounded-2xl bg-white p-5 sm:p-6 border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <PieChart className="h-4 w-4 text-indigo-600" />
              <span>Distribución de los ingresos de las cuotas</span>
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Proporción de los ingresos del mes destinada a cubrir gastos fijos, variables y margen retenido.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-slate-700">
              Ingresos Base: {formatCurrency(summary.totalIncome)}
            </span>
          </div>
        </div>

        {/* Barra Gráfica de Progreso Segmentada */}
        {summary.totalIncome > 0 ? (
          <div className="space-y-3">
            <div className="h-4 w-full bg-slate-100 rounded-full overflow-hidden flex shadow-inner">
              {/* Segmento Gastos Fijos */}
              {summary.fixedPercentageOfIncome > 0 && (
                <div
                  style={{ width: `${Math.min(100, summary.fixedPercentageOfIncome)}%` }}
                  className="h-full bg-slate-700 transition-all duration-500 relative group cursor-pointer"
                  title={`Gastos Fijos: ${summary.fixedPercentageOfIncome}% (${formatCurrency(summary.fixedExpensesSubtotal)})`}
                />
              )}

              {/* Segmento Gastos Variables */}
              {summary.variablePercentageOfIncome > 0 && (
                <div
                  style={{ width: `${Math.max(0, Math.min(100 - summary.fixedPercentageOfIncome, summary.variablePercentageOfIncome))}%` }}
                  className="h-full bg-amber-500 transition-all duration-500 relative group cursor-pointer"
                  title={`Gastos Variables: ${summary.variablePercentageOfIncome}% (${formatCurrency(summary.variableExpensesSubtotal)})`}
                />
              )}

              {/* Segmento Margen Libre */}
              {summary.freeMarginPercentageOfIncome > 0 && (
                <div
                  style={{ width: `${summary.freeMarginPercentageOfIncome}%` }}
                  className="h-full bg-emerald-500 transition-all duration-500 relative group cursor-pointer"
                  title={`Margen Libre: ${summary.freeMarginPercentageOfIncome}% (${formatCurrency(summary.netBalance)})`}
                />
              )}
            </div>

            {/* Leyenda y Detalles */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              {/* Fijos */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/60">
                <div className="h-3 w-3 rounded-full bg-slate-700 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700">Gastos Fijos</span>
                    <span className="font-bold text-slate-900">{summary.fixedPercentageOfIncome}%</span>
                  </div>
                  <p className="text-[11px] text-slate-500 truncate">
                    {formatCurrency(summary.fixedExpensesSubtotal)}
                  </p>
                </div>
              </div>

              {/* Variables */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60">
                <div className="h-3 w-3 rounded-full bg-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-900">Gastos Variables</span>
                    <span className="font-bold text-amber-900">{summary.variablePercentageOfIncome}%</span>
                  </div>
                  <p className="text-[11px] text-amber-700 truncate">
                    {formatCurrency(summary.variableExpensesSubtotal)}
                  </p>
                </div>
              </div>

              {/* Margen */}
              <div className={`flex items-center gap-2 p-2.5 rounded-xl border ${
                summary.isSurplus 
                  ? 'bg-emerald-50/60 border-emerald-200/60 text-emerald-900' 
                  : 'bg-rose-50/60 border-rose-200/60 text-rose-900'
              }`}>
                <div className={`h-3 w-3 rounded-full shrink-0 ${summary.isSurplus ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {summary.isSurplus ? 'Margen Libre' : 'Déficit'}
                    </span>
                    <span className="font-bold">
                      {summary.isSurplus ? `${summary.freeMarginPercentageOfIncome}%` : '0%'}
                    </span>
                  </div>
                  <p className="text-[11px] truncate">
                    {formatCurrency(summary.netBalance)}
                  </p>
                </div>
              </div>
            </div>

            {/* Aviso si los egresos superan los ingresos */}
            {!summary.isSurplus && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-50 text-rose-800 text-xs border border-rose-200">
                <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
                <span>
                  <strong>Atención:</strong> Los egresos de este mes superan los ingresos recaudados en {formatCurrency(Math.abs(summary.netBalance))}. Revisa los gastos variables o acelera la cobranza de mensualidades pendientes.
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-500">
            No se han registrado cobros de las cuotas de {getMonthName(selectedMonth)} {selectedYear} para calcular la distribución porcentual.
          </div>
        )}
      </div>

      {/* 4. Desglose Rápido por Categorías de Gastos */}
      {data?.expensesByCategory && data.expensesByCategory.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Desglose de Egresos por Categoría
            </h4>
            <span className="text-xs text-slate-400">
              {data.expensesByCategory.length} categorías activas
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {data.expensesByCategory.map((cat) => (
              <button
                key={cat.category}
                type="button"
                onClick={() => setCategoryFilter(categoryFilter === cat.category ? 'ALL' : cat.category)}
                className={`p-3 rounded-xl border text-left transition-all duration-150 ${
                  categoryFilter === cat.category
                    ? 'bg-slate-900 text-white border-slate-800 shadow-sm ring-2 ring-indigo-500/20'
                    : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-800'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className={`font-bold truncate ${categoryFilter === cat.category ? 'text-white' : 'text-slate-800'}`}>
                    {cat.categoryLabel}
                  </span>
                </div>
                <div className="flex items-baseline justify-between">
                  <span className={`text-sm font-black ${categoryFilter === cat.category ? 'text-rose-300' : 'text-rose-600'}`}>
                    {formatCurrency(cat.total)}
                  </span>
                  <span className={`text-[10px] font-semibold ${categoryFilter === cat.category ? 'text-slate-300' : 'text-slate-500'}`}>
                    {cat.percentageOfTotal}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 5. Tabla Detallada de Egresos */}
      <div className="space-y-4">
        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-slate-200/80">
          {/* Filtros por tipo de gasto (Fijo / Variable) */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setTypeFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                typeFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Todos ({data?.expenses.length || 0})
            </button>

            <button
              onClick={() => setTypeFilter('FIXED')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                typeFilter === 'FIXED'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Bookmark className="h-3 w-3 text-indigo-400" />
              <span>Solo Fijos</span>
            </button>

            <button
              onClick={() => setTypeFilter('VARIABLE')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                typeFilter === 'VARIABLE'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200/60'
              }`}
            >
              <Zap className="h-3 w-3 text-amber-300" />
              <span>Solo Variables</span>
            </button>

            {/* Selector de categoría */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="ALL">Todas las Categorías</option>
              {Object.entries(EXPENSE_CATEGORY_LABELS).map(([catKey, label]) => (
                <option key={catKey} value={catKey}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* Buscador textual */}
          <div className="relative min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar concepto, proveedor, factura..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border border-slate-200 bg-slate-50/50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:bg-white"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* Tabla de Registros */}
        <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Fecha</th>
                  <th className="py-3 px-4">Concepto / Detalle</th>
                  <th className="py-3 px-4">Tipo</th>
                  <th className="py-3 px-4">Categoría</th>
                  <th className="py-3 px-4">Método</th>
                  <th className="py-3 px-4">Proveedor / Factura</th>
                  <th className="py-3 px-4 text-right">Monto (USD)</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length > 0 ? (
                  filteredExpenses.map((exp) => (
                    <tr 
                      key={exp.id} 
                      className="hover:bg-slate-50/60 transition-colors group"
                    >
                      {/* Fecha */}
                      <td className="py-3.5 px-4 font-semibold text-slate-700 whitespace-nowrap">
                        {formatTuitionDate(exp.expenseDate)}
                      </td>

                      {/* Concepto / Título & Notas */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                            {exp.title}
                          </span>
                          {exp.recurringExpenseId && (
                            <span 
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/70 shrink-0"
                              title="Generado automáticamente desde la plantilla de gastos recurrentes"
                            >
                              <Repeat className="h-2.5 w-2.5 text-indigo-500" />
                              <span>Recurrente</span>
                            </span>
                          )}
                        </div>
                        {exp.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                            {exp.notes}
                          </div>
                        )}
                      </td>

                      {/* Tipo: Fijo vs Variable */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {exp.type === ExpenseType.FIXED ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            <Bookmark className="h-2.5 w-2.5 text-slate-500" />
                            Fijo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Zap className="h-2.5 w-2.5 text-amber-500" />
                            Variable
                          </span>
                        )}
                      </td>

                      {/* Categoría */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-[11px] font-semibold bg-slate-50 text-slate-700 border border-slate-200/60">
                          {EXPENSE_CATEGORY_LABELS[exp.category] || exp.category}
                        </span>
                      </td>

                      {/* Método de Pago */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600 font-medium">
                        {PAYMENT_METHOD_LABELS[exp.paymentMethod] || exp.paymentMethod}
                      </td>

                      {/* Proveedor / Factura */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-600">
                        {exp.supplier ? (
                          <div className="font-semibold text-slate-800">{exp.supplier}</div>
                        ) : (
                          <span className="text-slate-400 italic">No especificado</span>
                        )}
                        {exp.invoiceNumber && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            N° {exp.invoiceNumber}
                          </div>
                        )}
                      </td>

                      {/* Monto */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <span className="font-black text-sm text-rose-600">
                          -{formatCurrency(exp.amount)}
                        </span>
                      </td>

                      {/* Acciones */}
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedExpenseForEdit(exp)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors"
                            title="Editar gasto"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp)}
                            disabled={deletingId === exp.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-colors disabled:opacity-50"
                            title="Eliminar gasto"
                          >
                            {deletingId === exp.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="py-12 px-4 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
                          <Receipt className="h-6 w-6" />
                        </div>
                        <h4 className="text-sm font-bold text-slate-700">
                          No se encontraron gastos registrados
                        </h4>
                        <p className="text-xs text-slate-400 max-w-sm">
                          {searchTerm || typeFilter !== 'ALL' || categoryFilter !== 'ALL'
                            ? 'No hay egresos que coincidan con los filtros de búsqueda aplicados.'
                            : `Aún no se han registrado egresos operativos en ${getMonthName(selectedMonth)} ${selectedYear}.`}
                        </p>
                        <button
                          onClick={() => setIsCreateModalOpen(true)}
                          className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          <span>Registrar Primer Gasto</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>

              {/* Footer con Total Acumulado */}
              {filteredExpenses.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-50/90 border-t border-slate-200 text-xs font-bold text-slate-700">
                    <td colSpan={6} className="py-3 px-4 text-right">
                      Total Egresos ({filteredExpenses.length} {filteredExpenses.length === 1 ? 'registro' : 'registros'}):
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="font-black text-sm text-rose-600">
                        -{formatCurrency(filteredTotal)}
                      </span>
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </div>

      </>}

      {/* Modal para Crear Egreso */}
      <CreateExpenseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onExpenseCreated={() => loadBalance(selectedYear, selectedMonth)}
      />

      {/* Modal para Editar Egreso */}
      <EditExpenseModal
        isOpen={selectedExpenseForEdit !== null}
        onClose={() => setSelectedExpenseForEdit(null)}
        expense={selectedExpenseForEdit}
        onExpenseUpdated={() => {
          setSelectedExpenseForEdit(null);
          loadBalance(selectedYear, selectedMonth);
        }}
      />

      {/* Modal para Gestión de Plantillas de Gastos Recurrentes */}
      <RecurringExpensesModal
        isOpen={isRecurringModalOpen}
        onClose={() => setIsRecurringModalOpen(false)}
        onTemplatesChanged={() => loadBalance(selectedYear, selectedMonth)}
      />
    </div>
  );
}
