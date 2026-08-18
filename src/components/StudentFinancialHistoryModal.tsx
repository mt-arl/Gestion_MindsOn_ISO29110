'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  History, 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  DollarSign, 
  CreditCard, 
  Calendar, 
  BookOpen, 
  Phone, 
  Mail, 
  User, 
  FileText, 
  Loader2, 
  Sparkles,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { 
  getStudentFinancialHistory, 
  StudentFinancialHistory, 
  SerializedTuitionFee 
} from '@/actions/finance';
import { formatCurrency, formatDate, getDaysDiffFromNow, getMonthName } from '@/lib/utils';
import { PaymentModal } from './PaymentModal';

interface StudentFinancialHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string | null;
}

export function StudentFinancialHistoryModal({
  isOpen,
  onClose,
  studentId,
}: StudentFinancialHistoryModalProps) {
  const [historyData, setHistoryData] = useState<StudentFinancialHistory | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<SerializedTuitionFee | null>(null);

  const fetchHistory = async () => {
    if (!studentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const res = await getStudentFinancialHistory(studentId);
      if (res.success && res.data) {
        setHistoryData(res.data);
      } else {
        setError(res.message || 'No se pudo cargar el historial.');
      }
    } catch (err) {
      console.error(err);
      setError('Error de conexión al cargar el kardex.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && studentId) {
      fetchHistory();
    } else {
      setHistoryData(null);
    }
  }, [isOpen, studentId]);

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
          
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
                <History className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Kardex Financiero & Historial de Pagos
                </h3>
                <p className="text-xs text-slate-500">
                  Estado de cuenta individual y registro cronológico de mensualidades
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Modal Body / Scrollable */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-3" />
                <p className="text-sm font-medium">Cargando kardex del estudiante...</p>
              </div>
            ) : error ? (
              <div className="rounded-xl bg-rose-50 p-4 text-xs font-semibold text-rose-700 border border-rose-200 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            ) : historyData ? (
              <>
                {/* 1. Student Summary Banner */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-slate-900 p-5 text-white shadow-md">
                  <div className="flex items-center gap-3.5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-blue-600 font-black text-base text-white shadow-inner">
                      {historyData.student.firstName[0]}{historyData.student.lastName[0]}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-lg font-bold">
                          {historyData.student.firstName} {historyData.student.lastName}
                        </h2>
                        <span className="rounded-md bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                          CI: {historyData.student.ci}
                        </span>
                      </div>
                      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span>{historyData.student.email}</span>
                        <span>•</span>
                        <span>{historyData.student.phone}</span>
                        {historyData.student.guardianPhone1 && (
                          <>
                            <span>•</span>
                            <span>Tutor: {historyData.student.guardianPhone1}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end gap-2 shrink-0">
                    {historyData.student.currentClass ? (
                      <span className="rounded-lg bg-blue-950 px-2.5 py-1 text-xs font-semibold text-blue-300 border border-blue-800">
                        {historyData.student.currentClass.name} ({historyData.student.currentClass.code})
                      </span>
                    ) : (
                      <span className="rounded-lg bg-slate-800 px-2.5 py-1 text-xs text-slate-400">
                        Sin clase asignada
                      </span>
                    )}

                    {historyData.metrics.isUpToDate ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-xs font-bold text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Al Día
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/20 px-2.5 py-0.5 text-xs font-bold text-rose-400 border border-rose-500/30 animate-pulse">
                        <AlertTriangle className="h-3.5 w-3.5" />
                        {historyData.metrics.overdueCount} {historyData.metrics.overdueCount === 1 ? 'Cuota en Mora' : 'Cuotas en Mora'}
                      </span>
                    )}
                  </div>
                </div>

                {/* 2. Quick KPIs Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Total Pagado */}
                  <div className="rounded-2xl bg-white p-4 shadow-sm border border-emerald-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-emerald-700">
                        Total Pagado
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-slate-900">
                      {formatCurrency(historyData.metrics.totalPaid)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {historyData.metrics.paidCount} cuotas pagadas
                    </p>
                  </div>

                  {/* Saldo Adeudado / Mora */}
                  <div className={`rounded-2xl p-4 shadow-sm border ${
                    historyData.metrics.totalOverdue > 0
                      ? 'bg-rose-50/50 border-rose-200'
                      : historyData.metrics.totalPending > 0
                      ? 'bg-blue-50/50 border-blue-200'
                      : 'bg-white border-slate-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs font-bold uppercase ${
                        historyData.metrics.totalOverdue > 0 ? 'text-rose-800' : 'text-slate-600'
                      }`}>
                        Saldo por Cobrar
                      </span>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                        historyData.metrics.totalOverdue > 0
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        <DollarSign className="h-4 w-4" />
                      </div>
                    </div>
                    <p className={`mt-2 text-2xl font-extrabold ${
                      historyData.metrics.totalOverdue > 0 ? 'text-rose-700' : 'text-slate-900'
                    }`}>
                      {formatCurrency(historyData.metrics.totalDebt)}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {historyData.metrics.overdueCount > 0 && (
                        <span className="font-bold text-rose-700 mr-1">
                          ({historyData.metrics.overdueCount} en mora)
                        </span>
                      )}
                      {historyData.metrics.pendingCount} pendientes
                    </p>
                  </div>

                  {/* Total de Cuotas */}
                  <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-slate-500">
                        Historial de Cuotas
                      </span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
                        <Calendar className="h-4 w-4" />
                      </div>
                    </div>
                    <p className="mt-2 text-2xl font-extrabold text-slate-900">
                      {historyData.fees.length}
                    </p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Periodos registrados en sistema
                    </p>
                  </div>
                </div>

                {/* 3. Table of Fees & Payments */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Detalle Cronológico de Mensualidades
                  </h4>

                  <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-600">
                        <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                          <tr>
                            <th className="px-4 py-3">Periodo</th>
                            <th className="px-4 py-3">Clase Cursada</th>
                            <th className="px-4 py-3">Monto</th>
                            <th className="px-4 py-3">Vencimiento</th>
                            <th className="px-4 py-3">Estado</th>
                            <th className="px-4 py-3">Detalle de Pago</th>
                            <th className="px-4 py-3 text-right">Acción</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {historyData.fees.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                                Sin mensualidades emitidas para este estudiante.
                              </td>
                            </tr>
                          ) : (
                            historyData.fees.map((fee) => {
                              const isPaid = fee.status === 'PAID';
                              const isOverdue = fee.status === 'OVERDUE';
                              const isPending = fee.status === 'PENDING';
                              const daysDiff = getDaysDiffFromNow(fee.dueDate);
                              const lastPayment = fee.payments[0];

                              return (
                                <tr 
                                  key={fee.id} 
                                  className={`hover:bg-slate-50/80 ${isOverdue ? 'bg-rose-50/30' : ''}`}
                                >
                                  {/* Periodo */}
                                  <td className="px-4 py-3.5">
                                    <div className="font-bold text-slate-900 text-xs">
                                      {getMonthName(fee.month)} {fee.year}
                                    </div>
                                  </td>

                                  {/* Clase */}
                                  <td className="px-4 py-3.5">
                                    <div className="font-semibold text-slate-800 text-xs">
                                      {fee.class.name}
                                    </div>
                                    <div className="mt-0.5 flex items-center gap-1.5">
                                      <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 py-0.2 rounded">
                                        {fee.class.code}
                                      </span>
                                      <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                                        fee.class.modality === 'HIBRIDA'
                                          ? 'bg-purple-50 text-purple-700 border border-purple-200/50'
                                          : fee.class.modality === 'VIRTUAL'
                                          ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/50'
                                          : 'bg-amber-50 text-amber-700 border border-amber-200/50'
                                      }`}>
                                        {fee.class.modality === 'HIBRIDA' ? 'HÍBRIDA' : fee.class.modality}
                                      </span>
                                    </div>
                                  </td>

                                  {/* Monto */}
                                  <td className="px-4 py-3.5 font-bold text-slate-900 text-sm">
                                    {formatCurrency(fee.amount)}
                                  </td>

                                  {/* Vencimiento */}
                                  <td className="px-4 py-3.5">
                                    <div className="text-slate-800 font-medium">
                                      {formatDate(fee.dueDate)}
                                    </div>
                                    {isOverdue && (
                                      <span className="text-[10px] font-bold text-rose-600">
                                        Vencido hace {Math.abs(daysDiff)} días
                                      </span>
                                    )}
                                    {isPending && (
                                      <span className="text-[10px] text-slate-500">
                                        {daysDiff === 0 ? 'Vence hoy' : `Vence en ${daysDiff} días`}
                                      </span>
                                    )}
                                  </td>

                                  {/* Estado */}
                                  <td className="px-4 py-3.5">
                                    {isOverdue && (
                                      <span className="inline-flex items-center gap-1 rounded-lg bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                                        <AlertTriangle className="h-3 w-3 text-rose-600" />
                                        En Mora
                                      </span>
                                    )}
                                    {isPending && (
                                      <span className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                                        <Clock className="h-3 w-3 text-blue-600" />
                                        Pendiente
                                      </span>
                                    )}
                                    {isPaid && (
                                      <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                                        <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                        Pagado
                                      </span>
                                    )}
                                  </td>

                                  {/* Detalle de Pago */}
                                  <td className="px-4 py-3.5">
                                    {lastPayment ? (
                                      <div className="space-y-0.5 text-[11px]">
                                        <div className="text-slate-700 font-semibold">
                                          {formatDate(lastPayment.paymentDate)}
                                        </div>
                                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                                          {lastPayment.notes || 'Comprobante archivado'}
                                        </div>
                                      </div>
                                    ) : (
                                      <span className="text-slate-400 text-[11px]">--</span>
                                    )}
                                  </td>

                                  {/* Acción Cobrar */}
                                  <td className="px-4 py-3.5 text-right">
                                    {isPaid ? (
                                      <span className="text-[11px] font-semibold text-emerald-600">
                                        Completado
                                      </span>
                                    ) : (
                                      <button
                                        onClick={() => setSelectedFeeForPayment(fee)}
                                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-bold text-white shadow-sm transition-all ${
                                          isOverdue
                                            ? 'bg-rose-600 hover:bg-rose-700'
                                            : 'bg-emerald-600 hover:bg-emerald-700'
                                        }`}
                                      >
                                        <CreditCard className="h-3 w-3" />
                                        Cobrar
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* Footer */}
          <div className="border-t border-slate-100 bg-slate-50 px-6 py-3.5 rounded-b-2xl flex items-center justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-white px-4 py-2 text-xs font-semibold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm"
            >
              Cerrar Kardex
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Pago Directo */}
      <PaymentModal
        isOpen={!!selectedFeeForPayment}
        fee={selectedFeeForPayment}
        onClose={() => {
          setSelectedFeeForPayment(null);
          fetchHistory(); // Refrescar el historial tras registrar el pago
        }}
      />
    </>
  );
}
