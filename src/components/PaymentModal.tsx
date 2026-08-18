'use client';

import React, { useState, useTransition } from 'react';
import { 
  CheckCircle2, 
  X, 
  DollarSign, 
  User, 
  BookOpen, 
  Calendar, 
  FileText, 
  Loader2,
  AlertCircle
} from 'lucide-react';
import { SerializedTuitionFee, registerPaymentAction } from '@/actions/finance';
import { formatCurrency, formatDate, getMonthName } from '@/lib/utils';

interface PaymentModalProps {
  isOpen: boolean;
  fee: SerializedTuitionFee | null;
  onClose: () => void;
}

export function PaymentModal({ isOpen, fee, onClose }: PaymentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Transferencia Bancaria / QR');

  if (!isOpen || !fee) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const completeNotes = `[${paymentMethod}] ${notes}`.trim();

    startTransition(async () => {
      const response = await registerPaymentAction(fee.id, completeNotes);
      if (response.success) {
        onClose();
        setNotes('');
      } else {
        setError(response.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200/60 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-100/50 shadow-sm">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                Registrar Pago de Mensualidad
              </h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">
                Periodo: {getMonthName(fee.month)} {fee.year}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-bold text-rose-700 border border-rose-100 shadow-sm animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Student & Class Summary Box */}
          <div className="rounded-xl bg-slate-50/70 p-4 border border-slate-200/50 space-y-2.5 shadow-sm">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                Estudiante:
              </span>
              <span className="font-extrabold text-slate-900">
                {fee.student.firstName} {fee.student.lastName} (CI: {fee.student.ci})
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                <BookOpen className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                Clase:
              </span>
              <span className="font-bold text-slate-800">
                {fee.class.name} ({fee.class.code})
              </span>
            </div>

            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-slate-400 font-bold">
                <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                Fecha Límite:
              </span>
              <span className="font-bold text-slate-600">
                {formatDate(fee.dueDate)}
              </span>
            </div>

            <div className="pt-3.5 border-t border-slate-200/70 flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total a Cobrar:</span>
              <span className="text-xl font-black text-emerald-650">
                {formatCurrency(fee.amount)}
              </span>
            </div>
          </div>

          {/* Forma de Pago */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 tracking-wide">
              Método de Pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full rounded-xl border border-slate-250 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
            >
              <option value="Transferencia Bancaria / QR">Transferencia Bancaria / QR</option>
              <option value="Efectivo en Caja">Efectivo en Caja</option>
              <option value="Tarjeta de Débito / Crédito">Tarjeta de Débito / Crédito</option>
              <option value="Depósito en Cuenta">Depósito en Cuenta</option>
            </select>
          </div>

          {/* Notas / Observaciones */}
          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5 tracking-wide">
              Notas / N° de Comprobante (Opcional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ej. Comprobante #774912 - Banco Unión"
              rows={2}
              className="w-full rounded-xl border border-slate-250 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-2.5 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-emerald-500/15 hover:shadow-emerald-550/25 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Registrando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-white" />
                  Confirmar y Registrar Pago
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
