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
  AlertCircle,
  Building2,
  Copy,
  Check,
  Receipt
} from 'lucide-react';
import { SerializedTuitionFee, registerPaymentAction } from '@/actions/finance';
import { formatCurrency, formatDate, getMonthName } from '@/lib/utils';
import { PaymentReceiptModal } from './PaymentReceiptModal';

interface PaymentModalProps {
  isOpen: boolean;
  fee: SerializedTuitionFee | null;
  onClose: () => void;
  onPaymentSuccess?: (paymentId: string) => void;
}

export function PaymentModal({ 
  isOpen, 
  fee, 
  onClose,
  onPaymentSuccess 
}: PaymentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [copiedSriFeedback, setCopiedSriFeedback] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState('Transferencia Bancaria / QR');
  const [receiptPaymentId, setReceiptPaymentId] = useState<string | null>(null);

  if (!isOpen && !receiptPaymentId) return null;

  const handleCopySriData = () => {
    if (!fee) return;
    const idNum = fee.student.invoiceIdNumber?.trim() || fee.student.ci || 'Consumidor Final';
    const name = fee.student.invoiceName?.trim() || `${fee.student.firstName} ${fee.student.lastName}`;
    const email = fee.student.invoiceEmail?.trim() || fee.student.email || 'N/A';
    const address = fee.student.invoiceAddress?.trim() || 'Quito, Ecuador';

    const textToCopy = `RUC/CI: ${idNum} | Razón Social: ${name} | Correo: ${email} | Dirección: ${address}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedSriFeedback(true);
    setTimeout(() => setCopiedSriFeedback(false), 2000);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!fee) return;

    const completeNotes = `[${paymentMethod}] ${notes}`.trim();

    startTransition(async () => {
      const response = await registerPaymentAction(
        fee.id, 
        completeNotes, 
        invoiceNumber.trim() || null
      );
      if (response.success && response.paymentId) {
        const newPaymentId = response.paymentId;
        onClose();
        setNotes('');
        setInvoiceNumber('');
        if (onPaymentSuccess) {
          onPaymentSuccess(newPaymentId);
        } else {
          setReceiptPaymentId(newPaymentId);
        }
      } else if (response.success) {
        onClose();
        setNotes('');
        setInvoiceNumber('');
      } else {
        setError(response.message);
      }
    });
  };

  return (
    <>
      {isOpen && fee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200/60 animate-in zoom-in-95 duration-150">
            
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 px-6 py-4.5">
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
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
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

              {/* Tarjeta de Datos Fiscales para Facturación SRI en Línea */}
              <div className="rounded-xl border border-amber-200/80 bg-gradient-to-br from-amber-50/50 via-amber-50/20 to-white p-3.5 shadow-xs space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-amber-700" />
                    <span className="text-[11px] font-black uppercase tracking-wider text-amber-950">
                      Datos para Emitir Factura SRI en Línea
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopySriData}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-black transition-all ${
                      copiedSriFeedback
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-amber-100/90 text-amber-900 hover:bg-amber-200 border border-amber-300/80 shadow-2xs active:scale-95'
                    }`}
                  >
                    {copiedSriFeedback ? (
                      <>
                        <Check className="h-3.5 w-3.5" />
                        <span>¡Copiado!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        <span>📋 Copiar Datos SRI</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-white/90 p-2 border border-amber-200/60 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      {fee.student.invoiceIdType || 'Cédula / RUC'}
                    </span>
                    <span className="font-mono font-black text-slate-800">
                      {fee.student.invoiceIdNumber || fee.student.ci || 'Consumidor Final'}
                    </span>
                  </div>

                  <div className="rounded-lg bg-white/90 p-2 border border-amber-200/60 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Razón Social / Nombre
                    </span>
                    <span className="font-bold text-slate-800 truncate block" title={fee.student.invoiceName || `${fee.student.firstName} ${fee.student.lastName}`}>
                      {fee.student.invoiceName || `${fee.student.firstName} ${fee.student.lastName}`}
                    </span>
                  </div>

                  <div className="rounded-lg bg-white/90 p-2 border border-amber-200/60 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Correo Fiscal
                    </span>
                    <span className="font-medium text-slate-700 truncate block" title={fee.student.invoiceEmail || fee.student.email}>
                      {fee.student.invoiceEmail || fee.student.email || 'Sin registrar'}
                    </span>
                  </div>

                  <div className="rounded-lg bg-white/90 p-2 border border-amber-200/60 shadow-2xs">
                    <span className="text-[10px] font-bold text-slate-400 block uppercase">
                      Dirección Fiscal
                    </span>
                    <span className="font-medium text-slate-700 truncate block" title={fee.student.invoiceAddress || 'Quito, Ecuador'}>
                      {fee.student.invoiceAddress || 'Quito, Ecuador'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Forma de Pago & Factura SRI */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1.5 tracking-wide">
                    <span className="flex items-center gap-1">
                      <Receipt className="h-3.5 w-3.5 text-indigo-600" />
                      N° Factura SRI (Opcional)
                    </span>
                  </label>
                  <input
                    type="text"
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="Ej. 001-001-000000123"
                    className="w-full rounded-xl border border-slate-250 bg-white px-3.5 py-2 font-mono text-xs font-bold text-slate-800 placeholder:text-slate-400 placeholder:font-sans focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
                  />
                </div>
              </div>

              {/* Notas / Observaciones */}
              <div>
                <label className="block text-xs font-black text-slate-700 mb-1.5 tracking-wide">
                  Notas / N° de Comprobante (Opcional)
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ej. Comprobante #774912 - Banco Pichincha"
                  rows={2}
                  className="w-full rounded-xl border border-slate-250 bg-white px-3.5 py-2 text-xs font-bold text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
                />
              </div>

              {/* Action Buttons */}
              <div className="shrink-0 flex items-center justify-end gap-3 pt-2.5 border-t border-slate-100">
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
      )}

      {/* Comprobante de Pago Oficial Automático */}
      <PaymentReceiptModal
        isOpen={!!receiptPaymentId}
        paymentIdOrFeeId={receiptPaymentId}
        onClose={() => setReceiptPaymentId(null)}
      />
    </>
  );
}
