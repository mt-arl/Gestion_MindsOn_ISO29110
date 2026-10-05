'use client';

import React, { useState, useTransition } from 'react';
import { 
  Plus, 
  X, 
  DollarSign, 
  Calendar, 
  Building2, 
  Tag, 
  FileText, 
  CreditCard, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Sparkles,
  Zap,
  Bookmark
} from 'lucide-react';
import { createExpenseAction } from '@/actions/expenses';
import { EXPENSE_CATEGORY_LABELS, PAYMENT_METHOD_LABELS } from '@/lib/expense-constants';
import { ExpenseType, ExpenseCategory, PaymentMethod } from '@prisma/client';

interface CreateExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExpenseCreated?: () => void;
}

export function CreateExpenseModal({ isOpen, onClose, onExpenseCreated }: CreateExpenseModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<string | number>('');
  const [type, setType] = useState<ExpenseType>(ExpenseType.FIXED);
  const [category, setCategory] = useState<ExpenseCategory>(ExpenseCategory.RENT);
  const [expenseDate, setExpenseDate] = useState(todayStr);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.TRANSFER);
  const [supplier, setSupplier] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setAmount('');
    setType(ExpenseType.FIXED);
    setCategory(ExpenseCategory.RENT);
    setExpenseDate(todayStr);
    setPaymentMethod(PaymentMethod.TRANSFER);
    setSupplier('');
    setInvoiceNumber('');
    setNotes('');
    setError(null);
    setSuccessMsg(null);
  };

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
      const res = await createExpenseAction({
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
          resetForm();
          onClose();
          onExpenseCreated?.();
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
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-600/20">
              <Plus className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                Registrar Egreso / Gasto
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Contabilidad y flujo de egresos operativos de MindsOn
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

          {/* 1. Selector de Tipo de Gasto (Pill Selector) */}
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
            <p className="text-[10px] text-slate-400 mt-1 pl-1 font-medium">
              {type === ExpenseType.FIXED 
                ? 'Fijos: Arriendo, servicios fijos, software, cuotas recurrentes mes a mes.'
                : 'Variables: Honorarios por horas, marketing digital, suministros, mantenimiento eventual.'}
            </p>
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
              placeholder="Ej. Pago Internet Fibra Óptica - Octubre, o Pauta Meta Ads"
              className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-semibold text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
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
                  placeholder="0.00"
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-mono font-black text-rose-700 placeholder:text-slate-300 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
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
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-xs font-bold text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-800 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
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
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
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
              placeholder="Detalles sobre el pago, retenciones o fecha de compensación..."
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10 resize-none"
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
              className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-rose-700 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-rose-600/20 hover:from-rose-700 hover:to-rose-800 active:scale-95 disabled:opacity-50 transition-all"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Registrar Egreso
            </button>
          </div>

        </form>

      </div>
    </div>
  );
}
