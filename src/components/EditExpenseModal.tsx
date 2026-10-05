'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  Edit3, 
  X, 
  DollarSign, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Bookmark,
  Zap,
  Repeat
} from 'lucide-react';
import { 
  updateExpenseAction, 
  SerializedExpense
} from '@/actions/expenses';
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/expense-constants';
import { ExpenseType, ExpenseCategory, PaymentMethod } from '@prisma/client';

interface EditExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: SerializedExpense | null;
  onExpenseUpdated?: () => void;
}

export function EditExpenseModal({ isOpen, onClose, expense, onExpenseUpdated }: EditExpenseModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string | number>('');
  const [type, setType] = useState<ExpenseType>(ExpenseType.FIXED);
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.RENT);
  const [expenseDate, setExpenseDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (expense) {
      setTitle(expense.title);
      setAmount(expense.amount);
      setType(expense.type);
      setCategory(expense.category);
      setExpenseDate(expense.expenseDate.split('T')[0]);
      setPaymentMethod(expense.paymentMethod);
      setSupplier(expense.supplier || '');
      setInvoiceNumber(expense.invoiceNumber || '');
      setNotes(expense.notes || '');
      setError(null);
      setSuccessMsg(null);
    }
  }, [expense]);

  if (!isOpen || !expense) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const titleClean = title.trim();
    if (!titleClean) {
      setError('Debes ingresar la descripción o concepto del gasto.');
      return;
    }

    const amtNum = Number(amount);
    if (isNaN(amtNum) || amtNum <= 0) {
      setError('El monto debe ser un valor positivo mayor a $0 USD.');
      return;
    }

    startTransition(async () => {
      const res = await updateExpenseAction(expense.id, {
        title: titleClean,
        amount: amtNum,
        type,
        category,
        expenseDate,
        paymentMethod,
        supplier: supplier.trim() || null,
        invoiceNumber: invoiceNumber.trim() || null,
        notes: notes.trim() || null,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onClose();
          onExpenseUpdated?.();
        }, 1200);
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 bg-slate-50/70 sticky top-0 z-10 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Edit3 className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                Editar Egreso / Gasto
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Actualizar detalles contables del comprobante
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
          
          {/* Recurring Expense Notice */}
          {expense?.recurringExpenseId && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-indigo-50/80 p-3.5 text-xs text-indigo-900 border border-indigo-200/70 shadow-xs">
              <Repeat className="h-4 w-4 shrink-0 text-indigo-600 mt-0.5" />
              <div>
                <strong className="font-bold">Gasto Generado por Plantilla Recurrente:</strong>
                <p className="text-[11px] text-indigo-700 mt-0.5">
                  Los cambios que realices aquí se aplicarán exclusivamente a este mes. Para modificar el valor de todos los meses futuros, edita la plantilla en el panel de <em>Gastos Recurrentes</em>.
                </p>
              </div>
            </div>
          )}

          {/* Alerts */}
          {error && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-rose-50 p-3.5 text-xs font-bold text-rose-800 border border-rose-200 shadow-xs animate-in fade-in">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-start gap-2.5 rounded-2xl bg-emerald-50 p-3.5 text-xs font-bold text-emerald-800 border border-emerald-200 shadow-xs animate-in fade-in">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* 1. Selector de Tipo de Gasto */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Tipo de Egreso *
            </label>
            <div className="grid grid-cols-2 gap-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200/80">
              <button
                type="button"
                onClick={() => setType(ExpenseType.FIXED)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  type === ExpenseType.FIXED
                    ? 'bg-white text-indigo-900 shadow-xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Bookmark className={`h-4 w-4 ${type === ExpenseType.FIXED ? 'text-indigo-600' : 'text-slate-400'}`} />
                <span>📌 Gasto Fijo</span>
              </button>

              <button
                type="button"
                onClick={() => setType(ExpenseType.VARIABLE)}
                className={`flex items-center justify-center gap-2 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  type === ExpenseType.VARIABLE
                    ? 'bg-white text-amber-900 shadow-xs border border-slate-200'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <Zap className={`h-4 w-4 ${type === ExpenseType.VARIABLE ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>⚡ Gasto Variable</span>
              </button>
            </div>
          </div>

          {/* 2. Título / Concepto */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Concepto / Descripción del Gasto *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            />
          </div>

          {/* 3. Monto y Fecha */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monto en USD ($) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-mono font-black text-rose-700 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha del Desembolso *
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>
          </div>

          {/* 4. Categoría y Método de Pago */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Categoría del Gasto *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              >
                {Object.values(ExpenseCategory).map((cat) => (
                  <option key={cat} value={cat}>
                    {EXPENSE_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Método de Pago *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              >
                {Object.values(PaymentMethod).map((pm) => (
                  <option key={pm} value={pm}>
                    {PAYMENT_METHOD_LABELS[pm]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* 5. Proveedor y Factura */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Proveedor / Beneficiario (Opcional)
              </label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Ej. Inmobiliaria, CNT, Meta Platforms"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nº Factura / Comprobante (Opcional)
              </label>
              <input
                type="text"
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Ej. FAC-001-098234"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          {/* 6. Observaciones */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observaciones / Notas (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:from-indigo-700 hover:to-indigo-800 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Guardar Cambios
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
