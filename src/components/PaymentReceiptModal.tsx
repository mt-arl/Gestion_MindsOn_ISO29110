'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Image from 'next/image';
import { 
  X, 
  Printer, 
  MessageCircle, 
  CheckCircle2, 
  Loader2, 
  AlertCircle, 
  ShieldCheck, 
  Calendar, 
  User, 
  BookOpen, 
  DollarSign, 
  Receipt,
  FileCheck,
  Building,
  Clock,
  Sparkles
} from 'lucide-react';
import { getPaymentReceiptDataAction, PaymentReceiptData } from '@/actions/finance';
import { formatCurrency, formatTuitionDate } from '@/lib/utils';
import { buildWhatsAppUrl } from '@/lib/ecuador-validators';

interface PaymentReceiptModalProps {
  isOpen: boolean;
  paymentIdOrFeeId: string | null;
  onClose: () => void;
}

export function PaymentReceiptModal({
  isOpen,
  paymentIdOrFeeId,
  onClose,
}: PaymentReceiptModalProps) {
  const [isPending, startTransition] = useTransition();
  const [receiptData, setReceiptData] = useState<PaymentReceiptData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && paymentIdOrFeeId) {
      setError(null);
      setReceiptData(null);
      startTransition(async () => {
        const res = await getPaymentReceiptDataAction(paymentIdOrFeeId);
        if (res.success && res.data) {
          setReceiptData(res.data);
        } else {
          setError(res.message || 'No se pudo cargar la información del comprobante.');
        }
      });
    }
  }, [isOpen, paymentIdOrFeeId]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    if (!receiptData) return;

    const studentName = `${receiptData.student.firstName} ${receiptData.student.lastName}`;
    const targetPhone = receiptData.student.phone || receiptData.student.guardianPhone1 || '';
    const invoiceLine = receiptData.invoiceNumber ? `\n🧾 Factura SRI Nº: ${receiptData.invoiceNumber}` : '';

    const message = 
`¡Hola ${studentName}! Te confirmamos la recepción de tu pago en MindsOn Instituto de Inglés.

🧾 Comprobante: ${receiptData.receiptNumber}${invoiceLine}
📅 Fecha: ${formatTuitionDate(receiptData.paymentDate)}
📚 Curso: ${receiptData.class.name} (${receiptData.class.code})
💵 Monto Pagado: USD $${receiptData.amountPaid.toFixed(2)}
💳 Método: ${receiptData.paymentMethod}
✓ Estado: Pagado / Al Día

¡Muchas gracias por tu puntualidad!`;

    const whatsappUrl = buildWhatsAppUrl(targetPhone, message);
    window.open(whatsappUrl, '_blank');
  };

  const isAmarillo = receiptData?.class.book === 'AMARILLO';
  const isRojo = receiptData?.class.book === 'ROJO';
  const isAzul = receiptData?.class.book === 'AZUL';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200 print:p-0 print:bg-white print:static">
      
      {/* Estilos para impresión limpia del voucher */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-receipt-card, #printable-receipt-card * {
            visibility: visible;
          }
          #printable-receipt-card {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 24px;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      <div className="relative w-full max-w-2xl max-h-[94vh] flex flex-col rounded-3xl bg-white shadow-2xl border border-slate-200/80 animate-in zoom-in-95 duration-150 overflow-hidden print:border-none print:shadow-none print:max-w-none print:max-h-none print:rounded-none">
        
        {/* Modal Top Actions Header (No imprimible) */}
        <div className="no-print flex items-center justify-between border-b border-slate-100 bg-slate-50/90 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800 font-bold">
              <Receipt className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 leading-tight">
                Comprobante Digital Oficial
              </h3>
              <p className="text-[11px] text-slate-500 font-medium">
                Voucher de pago y certificación de tesorería
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {receiptData && (
              <>
                <button
                  type="button"
                  onClick={handleSendWhatsApp}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1.5 text-xs font-bold transition-all shadow-xs active:scale-[0.98]"
                  title="Enviar comprobante al estudiante o tutor por WhatsApp"
                >
                  <MessageCircle className="h-3.5 w-3.5 text-emerald-600" />
                  <span className="hidden sm:inline">WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-sm shadow-indigo-600/20 active:scale-[0.98]"
                  title="Imprimir o guardar como PDF"
                >
                  <Printer className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Imprimir / PDF</span>
                </button>
              </>
            )}

            <button
              onClick={onClose}
              className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Container with Receipt Paper */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/50 print:p-0 print:bg-white">
          {isPending ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-indigo-600 mb-3" />
              <p className="text-xs font-bold text-slate-600">Generando comprobante oficial...</p>
            </div>
          ) : error ? (
            <div className="rounded-2xl bg-rose-50 p-6 text-center border border-rose-200 space-y-2">
              <AlertCircle className="mx-auto h-8 w-8 text-rose-500" />
              <p className="text-sm font-bold text-rose-800">{error}</p>
              <p className="text-xs text-rose-600">Verifique que el pago haya sido registrado correctamente en la base de datos.</p>
            </div>
          ) : receiptData ? (
            
            /* The Official Printable Receipt Card */
            <div 
              id="printable-receipt-card"
              className="relative mx-auto max-w-xl rounded-2xl bg-white p-8 shadow-sm border border-slate-200/90 text-slate-800 space-y-6 print:p-0 print:border-none print:shadow-none"
            >
              
              {/* Receipt Header */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start justify-between gap-4 border-b-2 border-slate-900 pb-5">
                {/* Logo & Institute Name */}
                <div className="text-center sm:text-left space-y-1">
                  <div className="relative w-44 h-12">
                    <Image
                      src="/logo.png"
                      alt="MindsOn Logo"
                      fill
                      className="object-contain object-center sm:object-left"
                      priority
                    />
                  </div>
                  <p className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-900 pt-1">
                    Instituto de Inglés MindsOn
                  </p>
                  <p className="text-[10px] text-slate-500 font-medium">
                    RUC / Registro Educativo Institucional • Ecuador
                  </p>
                </div>

                {/* Voucher Title & Number */}
                <div className="text-center sm:text-right space-y-1">
                  <div className="flex flex-col sm:items-end items-center gap-1">
                    <span className="inline-block rounded-md bg-slate-900 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-white">
                      COMPROBANTE DE PAGO
                    </span>
                    {receiptData.invoiceNumber && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-300 px-2 py-0.5 text-[10px] font-black tracking-wide">
                        <Receipt className="h-3 w-3 text-emerald-600" />
                        Factura SRI: {receiptData.invoiceNumber}
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-sm font-black text-slate-900">
                    Nº {receiptData.receiptNumber}
                  </p>
                  <p className="text-[11px] text-slate-500 flex items-center justify-center sm:justify-end gap-1 font-medium">
                    <Clock className="h-3 w-3 text-slate-400" />
                    {formatTuitionDate(receiptData.paymentDate)}
                  </p>
                </div>
              </div>

              {/* Student & Academic Info Box */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 rounded-xl bg-slate-50/80 p-4 border border-slate-200/80 text-xs">
                {/* Student Info */}
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Datos del Estudiante
                  </span>
                  <p className="text-sm font-black text-slate-900">
                    {receiptData.student.firstName} {receiptData.student.lastName}
                  </p>
                  <p className="text-slate-600 font-mono text-[11px]">
                    <strong>C.I.:</strong> {receiptData.student.ci}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    <strong>Teléfono:</strong> {receiptData.student.phone}
                  </p>
                  {(receiptData.student.invoiceName || receiptData.student.invoiceIdNumber) && (
                    <div className="mt-2 pt-2 border-t border-slate-200/80 text-[10.5px] text-slate-600 space-y-0.5">
                      <p className="font-bold text-slate-700 uppercase text-[9px] tracking-wider">Facturación SRI:</p>
                      <p className="truncate"><strong>Razón Social:</strong> {receiptData.student.invoiceName || `${receiptData.student.firstName} ${receiptData.student.lastName}`}</p>
                      <p className="font-mono"><strong>{receiptData.student.invoiceIdType || 'RUC/CI'}:</strong> {receiptData.student.invoiceIdNumber || receiptData.student.ci}</p>
                    </div>
                  )}
                </div>

                {/* Academic Class Info */}
                <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
                  <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                    Programa Académico
                  </span>
                  <p className="text-xs font-bold text-slate-900">
                    {receiptData.class.name} ({receiptData.class.code})
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    <strong>Nivel:</strong> {receiptData.class.level} • <strong>Aula:</strong> {receiptData.class.classroom}
                  </p>
                  <p className="text-slate-600 text-[11px]">
                    <strong>Modalidad:</strong> {receiptData.class.modality}
                  </p>
                </div>
              </div>

              {/* Breakdown Table */}
              <div className="overflow-hidden rounded-xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white text-[10px] uppercase font-black tracking-wider">
                    <tr>
                      <th className="px-4 py-2.5">Concepto / Descripción</th>
                      <th className="px-4 py-2.5 text-center">Periodo</th>
                      <th className="px-4 py-2.5 text-right">Importe</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white font-medium">
                    <tr>
                      <td className="px-4 py-3.5">
                        <div className="font-bold text-slate-900">
                          Mensualidad Regular de Inglés
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Arancel individual pactado • Nivel {receiptData.class.level}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center capitalize text-slate-700 font-bold">
                        {receiptData.tuitionFee.monthName} {receiptData.tuitionFee.year}
                      </td>
                      <td className="px-4 py-3.5 text-right font-black text-slate-900 text-sm">
                        {formatCurrency(receiptData.amountPaid)}
                      </td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-200">
                    <tr>
                      <td colSpan={2} className="px-4 py-3 text-right text-xs font-black uppercase text-slate-700">
                        Total Pagado (USD):
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xl font-black text-emerald-700">
                          {formatCurrency(receiptData.amountPaid)}
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Payment Details & Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Forma de Pago</span>
                  <p className="font-bold text-slate-800 flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
                    {receiptData.paymentMethod}
                  </p>
                  <p className="text-[10px] text-slate-500">
                    Registrado por: <strong>{receiptData.registeredBy}</strong>
                  </p>
                  {receiptData.invoiceNumber && (
                    <p className="text-[10px] font-bold text-emerald-700 flex items-center gap-1 pt-0.5">
                      <Receipt className="h-3 w-3 text-emerald-600 shrink-0" />
                      Factura SRI: <span className="font-mono">{receiptData.invoiceNumber}</span>
                    </p>
                  )}
                </div>

                <div className="rounded-xl bg-slate-50 p-3 border border-slate-200 space-y-1">
                  <span className="text-[10px] font-black uppercase text-slate-400 block">Detalles & Referencia</span>
                  <p className="text-[11px] text-slate-700 font-medium italic">
                    {receiptData.notes || 'Pago confirmado y asentado en libros contables.'}
                  </p>
                </div>
              </div>

              {/* Official Seal & Legal Note */}
              <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-[10px] text-slate-400 text-center sm:text-left max-w-xs space-y-0.5">
                  <p className="font-bold text-slate-600">Certificación Electrónica MindsOn</p>
                  <p>Este documento certifica la recepción conforme del arancel correspondiente al periodo académico indicado.</p>
                </div>

                {/* Sello Digital */}
                <div className="flex items-center gap-2.5 rounded-2xl bg-indigo-50/70 p-3 border border-indigo-200/80 shadow-xs">
                  <ShieldCheck className="h-7 w-7 text-indigo-700 shrink-0" />
                  <div className="text-left">
                    <p className="font-black text-[10px] uppercase text-indigo-900 tracking-wider">
                      MindsOn Instituto
                    </p>
                    <p className="text-[9px] font-bold text-indigo-700">
                      Cobranzas & Tesorería • Válido
                    </p>
                  </div>
                </div>
              </div>

            </div>
          ) : null}
        </div>

        {/* Footer (No imprimible) */}
        <div className="no-print border-t border-slate-100 bg-slate-50/80 px-6 py-3 rounded-b-3xl flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white px-5 py-2 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors shadow-xs"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
