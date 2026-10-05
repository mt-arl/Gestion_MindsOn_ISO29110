'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  Repeat, 
  X, 
  Plus, 
  DollarSign, 
  Calendar, 
  Building2, 
  Tag, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Edit3, 
  Trash2, 
  Power, 
  PowerOff,
  Sparkles,
  Info,
  Layers
} from 'lucide-react';
import { 
  getRecurringExpensesAction, 
  createRecurringExpenseAction, 
  updateRecurringExpenseAction, 
  toggleRecurringExpenseAction, 
  deleteRecurringExpenseAction,
  SerializedRecurringExpense
} from '@/actions/expenses';
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/expense-constants';
import { ExpenseCategory, PaymentMethod } from '@prisma/client';
import { formatCurrency } from '@/lib/utils';

interface RecurringExpensesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTemplatesChanged?: () => void;
}

export function RecurringExpensesModal({
  isOpen,
  onClose,
  onTemplatesChanged,
}: RecurringExpensesModalProps) {
  const [isPending, startTransition] = useTransition();
  const [templates, setTemplates] = useState<SerializedRecurringExpense[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  // Estados del formulario
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string | number>('');
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.RENT);
  const [dayOfMonth, setDayOfMonth] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [supplier, setSupplier] = useState('');
  const [notes, setNotes] = useState('');
  const [syncCurrentMonth, setSyncCurrentMonth] = useState(true);

  // Feedback y mensajes
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // Cargar lista de plantillas al abrir
  const loadTemplates = async () => {
    setLoadingList(true);
    try {
      const data = await getRecurringExpensesAction();
      setTemplates(data);
    } catch {
      setErrorMsg('No se pudieron cargar las plantillas de gastos recurrentes.');
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      resetForm();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setCategory(ExpenseCategory.RENT);
    setDayOfMonth(1);
    setPaymentMethod(PaymentMethod.TRANSFER);
    setSupplier('');
    setNotes('');
    setSyncCurrentMonth(true);
    setErrorMsg(null);
  };

  const handleStartEdit = (template: SerializedRecurringExpense) => {
    setEditingId(template.id);
    setTitle(template.title);
    setAmount(template.amount);
    setCategory(template.category);
    setDayOfMonth(template.dayOfMonth);
    setPaymentMethod(template.paymentMethod);
    setSupplier(template.supplier || '');
    setNotes(template.notes || '');
    setSyncCurrentMonth(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    // Scroll hacia el formulario
    const formElem = document.getElementById('recurring-expense-form');
    if (formElem) {
      formElem.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const titleClean = title.trim();
    if (!titleClean) {
      setErrorMsg('Debes ingresar la descripción o concepto del gasto.');
      return;
    }

    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setErrorMsg('El monto mensual debe ser un número positivo mayor a $0 USD.');
      return;
    }

    const dayNum = Math.min(31, Math.max(1, parseInt(String(dayOfMonth), 10) || 1));

    startTransition(async () => {
      if (editingId) {
        // Actualizar plantilla existente
        const res = await updateRecurringExpenseAction(editingId, {
          title: titleClean,
          amount: amtNum,
          category,
          dayOfMonth: dayNum,
          paymentMethod,
          supplier: supplier.trim() || null,
          notes: notes.trim() || null,
          syncCurrentMonth,
        });

        if (res.success) {
          setSuccessMsg(res.message);
          resetForm();
          await loadTemplates();
          if (onTemplatesChanged) onTemplatesChanged();
        } else {
          setErrorMsg(res.message);
        }
      } else {
        // Crear nueva plantilla
        const res = await createRecurringExpenseAction({
          title: titleClean,
          amount: amtNum,
          category,
          dayOfMonth: dayNum,
          paymentMethod,
          supplier: supplier.trim() || null,
          notes: notes.trim() || null,
          isActive: true,
        });

        if (res.success) {
          setSuccessMsg(res.message);
          resetForm();
          await loadTemplates();
          if (onTemplatesChanged) onTemplatesChanged();
        } else {
          setErrorMsg(res.message);
        }
      }
    });
  };

  const handleToggleActive = async (template: SerializedRecurringExpense) => {
    setTogglingId(template.id);
    setErrorMsg(null);
    try {
      const res = await toggleRecurringExpenseAction(template.id, !template.isActive);
      if (res.success) {
        setSuccessMsg(res.message);
        await loadTemplates();
        if (onTemplatesChanged) onTemplatesChanged();
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Error al cambiar el estado de la plantilla.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async (template: SerializedRecurringExpense) => {
    const confirmed = window.confirm(
      `¿Deseas eliminar la plantilla recurrente "${template.title}"?\n\nLos gastos ya generados en meses anteriores se conservarán en el balance histórico, pero dejarán de generarse a futuro.`
    );
    if (!confirmed) return;

    setDeletingId(template.id);
    setErrorMsg(null);
    try {
      const res = await deleteRecurringExpenseAction(template.id);
      if (res.success) {
        setSuccessMsg(res.message);
        if (editingId === template.id) {
          resetForm();
        }
        await loadTemplates();
        if (onTemplatesChanged) onTemplatesChanged();
      } else {
        setErrorMsg(res.message);
      }
    } catch {
      setErrorMsg('Error al eliminar la plantilla recurrente.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200 overflow-y-auto">
      <div 
        className="relative w-full max-w-4xl my-8 rounded-3xl bg-white p-6 sm:p-8 shadow-2xl border border-slate-200/80 max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header del Modal */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-sm">
              <Repeat className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
                <span>Plantillas de Gastos Fijos Recurrentes</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800 border border-indigo-200">
                  {templates.length} {templates.length === 1 ? 'Plantilla' : 'Plantillas'}
                </span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Gastos maestros que se generan automáticamente cada mes (Arriendo, Servicios, Nómina, etc.)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notificaciones globales de feedback */}
        {errorMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
            <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </div>
        )}

        {successMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
            <button onClick={() => setSuccessMsg(null)} className="text-slate-400 hover:text-slate-600 text-xs">✕</button>
          </div>
        )}

        {/* Contenido en 2 Secciones scrolleables */}
        <div className="overflow-y-auto space-y-6 pt-5 pr-1 flex-1">
          {/* SECCIÓN 1: Formulario Rápido (Crear / Editar Plantilla) */}
          <div id="recurring-expense-form" className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200/80 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {editingId ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-700 bg-amber-100/80 px-2.5 py-1 rounded-lg border border-amber-200">
                    <Edit3 className="h-3.5 w-3.5" />
                    Editando Plantilla
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 bg-white px-2.5 py-1 rounded-lg border border-slate-200">
                    <Plus className="h-3.5 w-3.5 text-indigo-600" />
                    Nueva Plantilla de Gasto Recurrente
                  </span>
                )}
              </div>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs font-semibold text-slate-500 hover:text-slate-800 underline"
                >
                  Cancelar Edición
                </button>
              )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Concepto / Título */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Concepto del Gasto Fijo *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ej. Arriendo Instalaciones, Internet Fibra Óptica, Zoom Pro"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  />
                </div>

                {/* Monto Mensual en USD */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Monto Fijo Mensual (USD) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="0.00"
                      required
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Categoría */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Categoría Contable *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {Object.entries(EXPENSE_CATEGORY_LABELS).map(([catKey, label]) => (
                      <option key={catKey} value={catKey}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Día del Mes de Cobro (1-31) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Día de Cobro Programado *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10) || 1)}
                      required
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Día del mes (1 al 31)
                  </span>
                </div>

                {/* Método de Pago habitual */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Método de Pago Habitual *
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  >
                    {Object.entries(PAYMENT_METHOD_LABELS).map(([metKey, label]) => (
                      <option key={metKey} value={metKey}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Proveedor o Beneficiario */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Proveedor o Beneficiario (Opcional)
                  </label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={supplier}
                      onChange={(e) => setSupplier(e.target.value)}
                      placeholder="Ej. Inmobiliaria Quito, CNT, Prof. Carlos"
                      className="w-full pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Notas u observaciones */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Notas u Observaciones (Opcional)
                  </label>
                  <input
                    type="text"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Ej. N° de contrato, cuenta de depósito, etc."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Opción de sincronizar con el mes actual en caso de edición */}
              {editingId && (
                <div className="flex items-center gap-2 pt-1 text-xs text-slate-600">
                  <input
                    type="checkbox"
                    id="syncCurrentMonth"
                    checked={syncCurrentMonth}
                    onChange={(e) => setSyncCurrentMonth(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500/20 h-4 w-4"
                  />
                  <label htmlFor="syncCurrentMonth" className="cursor-pointer">
                    Actualizar también el registro de gasto generado para el mes actual
                  </label>
                </div>
              )}

              {/* Botón de Guardar */}
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 active:scale-[0.98] transition-all shadow-md shadow-slate-900/10 disabled:opacity-50"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin text-white" />
                      <span>Guardando plantilla...</span>
                    </>
                  ) : editingId ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                      <span>Actualizar Plantilla</span>
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      <span>Registrar Gasto Recurrente</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* SECCIÓN 2: Listado de Plantillas Activas y Pausadas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <Layers className="h-3.5 w-3.5" />
                <span>Listado de Plantillas Programadas</span>
              </h4>
              <span className="text-[11px] text-slate-400">
                Total mensual acumulado: <strong className="text-slate-800 font-bold">
                  {formatCurrency(
                    templates
                      .filter((t) => t.isActive)
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </strong>
              </span>
            </div>

            {loadingList ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                <span>Cargando plantillas...</span>
              </div>
            ) : templates.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className={`p-4 rounded-2xl border transition-all duration-150 flex flex-col justify-between ${
                      tpl.isActive
                        ? editingId === tpl.id
                          ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-500/20'
                          : 'bg-white border-slate-200/80 hover:border-slate-300 shadow-sm'
                        : 'bg-slate-50/70 border-slate-200 opacity-60'
                    }`}
                  >
                    <div>
                      {/* Top: Categoría, Estado y Monto */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200/60 mb-1">
                            {EXPENSE_CATEGORY_LABELS[tpl.category] || tpl.category}
                          </span>
                          <h5 className="text-sm font-bold text-slate-900 leading-tight">
                            {tpl.title}
                          </h5>
                          {tpl.supplier && (
                            <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                              {tpl.supplier}
                            </p>
                          )}
                        </div>

                        <div className="text-right">
                          <span className="text-sm font-black text-rose-600 block">
                            {formatCurrency(tpl.amount)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-semibold">
                            / mes
                          </span>
                        </div>
                      </div>

                      {/* Info de Cobro Programado */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-indigo-500" />
                          <span className="font-semibold text-slate-800">
                            Día {tpl.dayOfMonth} de cada mes
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {PAYMENT_METHOD_LABELS[tpl.paymentMethod] || tpl.paymentMethod}
                        </span>
                      </div>
                    </div>

                    {/* Acciones de la Tarjeta */}
                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                      {/* Toggle Activo / En Pausa */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(tpl)}
                        disabled={togglingId === tpl.id}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          tpl.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-slate-200/80 text-slate-600 hover:bg-slate-300 border border-slate-300'
                        }`}
                        title={tpl.isActive ? 'Pausar generación de este gasto' : 'Reanudar generación'}
                      >
                        {togglingId === tpl.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : tpl.isActive ? (
                          <Power className="h-3 w-3 text-emerald-600" />
                        ) : (
                          <PowerOff className="h-3 w-3 text-slate-500" />
                        )}
                        <span>{tpl.isActive ? 'Activo' : 'En Pausa'}</span>
                      </button>

                      {/* Botones Editar / Eliminar */}
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(tpl)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                          title="Editar plantilla"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleDelete(tpl)}
                          disabled={deletingId === tpl.id}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
                          title="Eliminar plantilla"
                        >
                          {deletingId === tpl.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-rose-600" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center rounded-2xl bg-slate-50 border border-dashed border-slate-200 space-y-2">
                <Repeat className="h-8 w-8 text-slate-300 mx-auto" />
                <h5 className="text-xs font-bold text-slate-700">
                  No hay plantillas de gastos recurrentes creadas
                </h5>
                <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
                  Registra arriba gastos como el arriendo o servicios básicos para que aparezcan automáticamente calculados en cada nuevo mes.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <Info className="h-3.5 w-3.5 text-indigo-500" />
            <span>Al iniciar cada mes calendario, las plantillas activas se registran automáticamente como Gastos Fijos.</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
