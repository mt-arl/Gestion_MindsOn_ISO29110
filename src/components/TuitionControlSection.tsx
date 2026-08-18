'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Phone, 
  MessageCircle, 
  User, 
  BookOpen, 
  CreditCard,
  Check,
  Calendar,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { SerializedTuitionFee } from '@/actions/finance';
import { formatCurrency, formatDate, getDaysDiffFromNow, getMonthName } from '@/lib/utils';
import { PaymentModal } from './PaymentModal';

interface TuitionControlSectionProps {
  initialFees: SerializedTuitionFee[];
}

type TabFilter = 'ALL' | 'OVERDUE' | 'PENDING' | 'PAID';

export function TuitionControlSection({ initialFees }: TuitionControlSectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<TabFilter>('ALL');
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<SerializedTuitionFee | null>(null);

  // Contadores por categoría para los badges de las pestañas
  const counts = useMemo(() => {
    return {
      all: initialFees.length,
      overdue: initialFees.filter((f) => f.status === 'OVERDUE').length,
      pending: initialFees.filter((f) => f.status === 'PENDING').length,
      paid: initialFees.filter((f) => f.status === 'PAID').length,
    };
  }, [initialFees]);

  // Filtrado reactivo por pestaña y término de búsqueda
  const filteredFees = useMemo(() => {
    return initialFees.filter((fee) => {
      // Filtro por pestaña
      if (selectedTab !== 'ALL' && fee.status !== selectedTab) {
        return false;
      }

      // Filtro de búsqueda textual
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase();
      const studentName = `${fee.student.firstName} ${fee.student.lastName}`.toLowerCase();
      const ci = fee.student.ci.toLowerCase();
      const email = fee.student.email.toLowerCase();
      const classCode = fee.class.code.toLowerCase();
      const className = fee.class.name.toLowerCase();

      return (
        studentName.includes(query) ||
        ci.includes(query) ||
        email.includes(query) ||
        classCode.includes(query) ||
        className.includes(query)
      );
    });
  }, [initialFees, selectedTab, searchTerm]);

  return (
    <div className="space-y-5">
      {/* Search & Tabs Toolbar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-slate-200/80">
        
        {/* Pestañas de Filtro */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setSelectedTab('ALL')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
              selectedTab === 'ALL'
                ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.01]'
                : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 border border-slate-200/30'
            }`}
          >
            Todos
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
              selectedTab === 'ALL' ? 'bg-slate-850 text-white border border-slate-700' : 'bg-slate-200/60 text-slate-650'
            }`}>
              {counts.all}
            </span>
          </button>

          <button
            onClick={() => setSelectedTab('OVERDUE')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
              selectedTab === 'OVERDUE'
                ? 'bg-rose-600 text-white shadow-md shadow-rose-600/15 scale-[1.01]'
                : 'bg-rose-50/50 text-rose-700 hover:bg-rose-100/80 border border-rose-100/50'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            En Mora
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              selectedTab === 'OVERDUE' ? 'bg-rose-800 text-white' : 'bg-rose-100 text-rose-800'
            }`}>
              {counts.overdue}
            </span>
          </button>

          <button
            onClick={() => setSelectedTab('PENDING')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
              selectedTab === 'PENDING'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/15 scale-[1.01]'
                : 'bg-indigo-50/55 text-indigo-700 hover:bg-indigo-100 border border-indigo-100/40'
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Pendientes
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              selectedTab === 'PENDING' ? 'bg-indigo-800 text-white' : 'bg-indigo-100 text-indigo-800'
            }`}>
              {counts.pending}
            </span>
          </button>

          <button
            onClick={() => setSelectedTab('PAID')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-200 ${
              selectedTab === 'PAID'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/15 scale-[1.01]'
                : 'bg-emerald-50/55 text-emerald-700 hover:bg-emerald-100 border border-emerald-100/40'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Pagados
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
              selectedTab === 'PAID' ? 'bg-emerald-800 text-white' : 'bg-emerald-100 text-emerald-800'
            }`}>
              {counts.paid}
            </span>
          </button>
        </div>

        {/* Barra de Búsqueda Rápida */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por alumno, CI o clase..."
            className="w-full rounded-xl border border-slate-250 bg-slate-50/70 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
          />
        </div>
      </div>

      {/* Tabla de Mensualidades y Alertas */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-655">
            <thead className="bg-slate-50/75 border-b border-slate-200/50 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-4">Estudiante</th>
                <th scope="col" className="px-5 py-4">Clase & Modalidad</th>
                <th scope="col" className="px-5 py-4">Periodo / Monto</th>
                <th scope="col" className="px-5 py-4">Vencimiento</th>
                <th scope="col" className="px-5 py-4">Estado</th>
                <th scope="col" className="px-5 py-4">Contacto</th>
                <th scope="col" className="px-5 py-4 text-right">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredFees.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-16 text-center text-slate-400">
                    <AlertCircle className="mx-auto h-9 w-9 mb-2.5 text-slate-300" />
                    <p className="text-sm font-bold text-slate-655">No se encontraron registros</p>
                    <p className="text-xs text-slate-400 mt-1">Intenta cambiar los filtros de búsqueda o el texto.</p>
                  </td>
                </tr>
              ) : (
                filteredFees.map((fee) => {
                  const daysDiff = getDaysDiffFromNow(fee.dueDate);
                  const isPaid = fee.status === 'PAID';
                  const isOverdue = fee.status === 'OVERDUE';
                  const isPending = fee.status === 'PENDING';

                  // Limpiar número para WhatsApp
                  const rawPhone = fee.student.phone.replace(/[^0-9]/g, '');

                  return (
                    <tr 
                      key={fee.id}
                      className={`transition-colors duration-150 hover:bg-slate-50/70 ${
                        isOverdue ? 'bg-rose-50/15' : ''
                      }`}
                    >
                      {/* Estudiante */}
                      <td className="px-5 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className={`flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl font-bold text-xs border ${
                              isOverdue
                                ? 'bg-rose-50 border-rose-100 text-rose-700'
                                : isPaid
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                                : 'bg-indigo-50 border-indigo-100 text-indigo-750'
                            }`}>
                              {fee.student.firstName[0]}{fee.student.lastName[0]}
                            </div>
                            <div className={`h-2.5 w-2.5 rounded-full absolute -bottom-0.5 -right-0.5 border-2 border-white ${
                              isOverdue
                                ? 'bg-rose-550'
                                : isPaid
                                ? 'bg-emerald-500'
                                : 'bg-amber-400'
                            }`} />
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {fee.student.firstName} {fee.student.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 font-semibold">
                              CI: <span className="font-mono text-slate-550">{fee.student.ci}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Clase */}
                      <td className="px-5 py-4.5">
                        <div>
                          <div className="font-bold text-slate-800 text-xs">
                            {fee.class.name}
                          </div>
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="font-mono text-[9px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/30">
                              {fee.class.code}
                            </span>
                            <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black tracking-wide ${
                              fee.class.modality === 'HIBRIDA'
                                ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                : fee.class.modality === 'VIRTUAL'
                                ? 'bg-sky-50 text-sky-700 border border-sky-100'
                                : 'bg-amber-50 text-amber-700 border border-amber-100'
                            }`}>
                              {fee.class.modality === 'HIBRIDA' ? 'HÍBRIDA' : fee.class.modality}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Periodo y Monto */}
                      <td className="px-5 py-4.5">
                        <div className="font-black text-slate-900 text-sm">
                          {formatCurrency(fee.amount)}
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          {getMonthName(fee.month)} {fee.year}
                        </div>
                      </td>

                      {/* Vencimiento */}
                      <td className="px-5 py-4.5">
                        <div className={`text-xs ${isOverdue ? 'font-black text-rose-600' : 'font-bold text-slate-800'}`}>
                          {formatDate(fee.dueDate)}
                        </div>
                        <div className="mt-0.5">
                          {isOverdue && (
                            <span className="inline-flex items-center text-[10px] font-extrabold text-rose-500">
                              Vencido hace {Math.abs(daysDiff)} días
                            </span>
                          )}
                          {isPending && (
                            <span className="inline-flex items-center text-[10px] font-semibold text-slate-400">
                              {daysDiff === 0 ? 'Vence hoy' : `Vence en ${daysDiff} días`}
                            </span>
                          )}
                          {isPaid && (
                            <span className="inline-flex items-center text-[10px] font-semibold text-emerald-600">
                              Al día
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Estado Badge */}
                      <td className="px-5 py-4.5">
                        {isOverdue && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700 border border-rose-100">
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                            En Mora
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-[11px] font-bold text-indigo-700 border border-indigo-100">
                            <Clock className="h-3 w-3 text-indigo-600" />
                            Pendiente
                          </span>
                        )}
                        {isPaid && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-100">
                            <Check className="h-3 w-3 text-emerald-600" />
                            Pagado
                          </span>
                        )}
                      </td>

                      {/* Contacto & Tutores */}
                      <td className="px-5 py-4.5">
                        <div className="space-y-1">
                          {/* Alumno WhatsApp / Teléfono */}
                          <div className="flex items-center gap-1.5">
                            <a
                              href={`https://wa.me/${rawPhone}?text=Estimado(a)%20${encodeURIComponent(
                                fee.student.firstName
                              )},%20le%20escribimos%20de%20MindsOn%20respecto%20a%20su%20mensualidad%20de%20${encodeURIComponent(
                                getMonthName(fee.month)
                              )}.`}
                              target="_blank"
                              rel="noreferrer"
                              title="Enviar mensaje por WhatsApp"
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50/70 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100/90 border border-emerald-100/50 transition-all duration-200 shadow-sm hover:scale-[1.02]"
                            >
                              <MessageCircle className="h-3 w-3 text-emerald-600" />
                              {fee.student.phone}
                            </a>
                          </div>

                          {/* Contacto de Tutor(es) */}
                          {(fee.student.guardianPhone1 || fee.student.guardianPhone2) && (
                            <div className="text-[10px] text-slate-400 font-semibold pl-1">
                              <span className="font-bold text-slate-350">Tutor:</span>{' '}
                              {fee.student.guardianPhone1 && (
                                <a 
                                  href={`tel:${fee.student.guardianPhone1}`} 
                                  className="hover:underline hover:text-indigo-600 text-slate-500 font-bold"
                                >
                                  {fee.student.guardianPhone1}
                                </a>
                              )}
                              {fee.student.guardianPhone2 && (
                                <span>, {fee.student.guardianPhone2}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Acción */}
                      <td className="px-5 py-4.5 text-right">
                        {isPaid ? (
                          <div className="text-right inline-flex flex-col items-end">
                            <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-slate-450 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200/50">
                              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                              Registrado
                            </span>
                            {fee.payments.length > 0 && (
                              <p className="text-[9px] text-slate-400 font-medium truncate max-w-[120px] mt-1 pr-1.5">
                                {fee.payments[0].notes || 'Comprobante archivado'}
                              </p>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => setSelectedFeeForPayment(fee)}
                            className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-1.8 text-xs font-black text-white shadow-md transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] ${
                              isOverdue
                                ? 'bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 shadow-rose-500/10 hover:shadow-rose-550/20'
                                : 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/10 hover:shadow-emerald-550/20'
                            }`}
                          >
                            <CreditCard className="h-3.5 w-3.5" />
                            Registrar Pago
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

      {/* Modal de Registro de Pago */}
      <PaymentModal
        isOpen={!!selectedFeeForPayment}
        fee={selectedFeeForPayment}
        onClose={() => setSelectedFeeForPayment(null)}
      />
    </div>
  );
}
