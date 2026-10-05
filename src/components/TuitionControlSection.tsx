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
  BookOpenCheck,
  History,
  Check,
  Calendar,
  AlertCircle,
  Sparkles,
  Layers,
  GraduationCap,
  Receipt,
  TrendingUp,
  Scale
} from 'lucide-react';
import { 
  SerializedTuitionFee, 
  CourseFinanceBreakdownResponse,
  MonthlyCollectionHistoryResponse,
  AnnualCashflowSummaryResponse
} from '@/actions/finance';
import { MonthlyFinancialBalanceResponse } from '@/actions/expenses';
import { formatCurrency, formatDate, getDaysDiffFromNow, getMonthName } from '@/lib/utils';
import { buildWhatsAppUrl } from '@/lib/ecuador-validators';
import { PaymentModal } from './PaymentModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { CourseFinanceBreakdown } from './CourseFinanceBreakdown';
import { MonthlyCollectionHistorySection } from './MonthlyCollectionHistorySection';
import { FinancialBalanceSection } from './FinancialBalanceSection';

interface TuitionControlSectionProps {
  initialFees: SerializedTuitionFee[];
  courseBreakdownData: CourseFinanceBreakdownResponse;
  initialMonthlyHistoryData?: MonthlyCollectionHistoryResponse;
  initialAnnualCashflowData?: AnnualCashflowSummaryResponse;
  initialFinancialBalanceData?: MonthlyFinancialBalanceResponse;
}

type MainDashboardView = 'GENERAL' | 'BY_COURSE' | 'HISTORY' | 'BALANCE';
type TabFilter = 'ALL' | 'OVERDUE' | 'PENDING' | 'PAID';

export function TuitionControlSection({ 
  initialFees, 
  courseBreakdownData,
  initialMonthlyHistoryData,
  initialAnnualCashflowData,
  initialFinancialBalanceData
}: TuitionControlSectionProps) {
  const [mainView, setMainView] = useState<MainDashboardView>('GENERAL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<TabFilter>('ALL');
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<SerializedTuitionFee | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

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
      const ci = (fee.student.ci || '').toLowerCase();
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
    <div className="space-y-6">
      {/* 1. Selector Superior de Vista Principal (Segmented Control Moderno) */}
      <div className="inline-flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-100/90 border border-slate-200/80 rounded-2xl shadow-inner">
        {/* Tab 1: Control de Mensualidades */}
        <button
          type="button"
          onClick={() => setMainView('GENERAL')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
            mainView === 'GENERAL'
              ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/10'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <CreditCard className={`w-4 h-4 shrink-0 ${mainView === 'GENERAL' ? 'text-indigo-400' : 'text-slate-500'}`} />
          <span>Control de Mensualidades</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              mainView === 'GENERAL'
                ? 'bg-slate-800 text-indigo-300'
                : 'bg-slate-200/80 text-slate-600'
            }`}
          >
            {initialFees.length}
          </span>
        </button>

        {/* Tab 2: Recaudación por Curso */}
        <button
          type="button"
          onClick={() => setMainView('BY_COURSE')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
            mainView === 'BY_COURSE'
              ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/10'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <BookOpenCheck className={`w-4 h-4 shrink-0 ${mainView === 'BY_COURSE' ? 'text-emerald-400' : 'text-slate-500'}`} />
          <span>Recaudación por Curso</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
              mainView === 'BY_COURSE'
                ? 'bg-slate-800 text-emerald-300'
                : 'bg-slate-200/80 text-slate-600'
            }`}
          >
            {courseBreakdownData.courses.length} grupos
          </span>
        </button>

        {/* Tab 3: Historial & Cuadre Mensual */}
        <button
          type="button"
          onClick={() => setMainView('HISTORY')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
            mainView === 'HISTORY'
              ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/10'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <History className={`w-4 h-4 shrink-0 ${mainView === 'HISTORY' ? 'text-sky-400' : 'text-slate-500'}`} />
          <span>Historial & Cuadre Mensual</span>
        </button>

        {/* Tab 4: Balance & Egresos */}
        <button
          type="button"
          onClick={() => setMainView('BALANCE')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all duration-150 ${
            mainView === 'BALANCE'
              ? 'bg-slate-900 text-white shadow-sm shadow-slate-900/10'
              : 'text-slate-600 hover:text-slate-900 hover:bg-white/70'
          }`}
        >
          <Scale className={`w-4 h-4 shrink-0 ${mainView === 'BALANCE' ? 'text-amber-400' : 'text-slate-500'}`} />
          <span>Balance & Egresos</span>
        </button>
      </div>

      {/* 2. Contenido Condicional según Pestaña Principal */}
      {mainView === 'BALANCE' ? (
        <FinancialBalanceSection initialData={initialFinancialBalanceData} />
      ) : mainView === 'HISTORY' && initialMonthlyHistoryData && initialAnnualCashflowData ? (
        <MonthlyCollectionHistorySection
          initialMonthlyData={initialMonthlyHistoryData}
          initialAnnualData={initialAnnualCashflowData}
        />
      ) : mainView === 'BY_COURSE' ? (
        <CourseFinanceBreakdown initialData={courseBreakdownData} />
      ) : (
        <div className="space-y-5">
          {/* Search & Tabs Toolbar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-slate-200/80">
            
            {/* Pestañas de Filtro */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <button
                onClick={() => setSelectedTab('ALL')}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 shrink-0 ${
                  selectedTab === 'ALL'
                    ? 'bg-slate-900 text-white shadow-md shadow-slate-900/10 scale-[1.01]'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/60'
                }`}
              >
                <Filter className="h-3.5 w-3.5 shrink-0" />
                <span>Todos</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  selectedTab === 'ALL' ? 'bg-slate-800 text-white border border-slate-700' : 'bg-slate-200/70 text-slate-600'
                }`}>
                  {counts.all}
                </span>
              </button>

              <button
                onClick={() => setSelectedTab('OVERDUE')}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 shrink-0 ${
                  selectedTab === 'OVERDUE'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/15 scale-[1.01]'
                    : 'bg-rose-50/70 text-rose-700 hover:bg-rose-100/80 border border-rose-200/60'
                }`}
              >
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-rose-600" />
                <span>En Mora</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  selectedTab === 'OVERDUE' ? 'bg-rose-800 text-white' : 'bg-rose-200/80 text-rose-800'
                }`}>
                  {counts.overdue}
                </span>
              </button>

              <button
                onClick={() => setSelectedTab('PENDING')}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 shrink-0 ${
                  selectedTab === 'PENDING'
                    ? 'bg-amber-500 text-white shadow-md shadow-amber-500/15 scale-[1.01]'
                    : 'bg-amber-50/70 text-amber-800 hover:bg-amber-100/80 border border-amber-200/60'
                }`}
              >
                <Clock className="h-3.5 w-3.5 shrink-0 text-amber-600" />
                <span>Pendientes</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  selectedTab === 'PENDING' ? 'bg-amber-700 text-white' : 'bg-amber-200/80 text-amber-900'
                }`}>
                  {counts.pending}
                </span>
              </button>

              <button
                onClick={() => setSelectedTab('PAID')}
                className={`inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all duration-200 shrink-0 ${
                  selectedTab === 'PAID'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/15 scale-[1.01]'
                    : 'bg-emerald-50/70 text-emerald-800 hover:bg-emerald-100/80 border border-emerald-200/60'
                }`}
              >
                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                <span>Al Día / Pagados</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  selectedTab === 'PAID' ? 'bg-emerald-800 text-white' : 'bg-emerald-200/80 text-emerald-900'
                }`}>
                  {counts.paid}
                </span>
              </button>
            </div>

            {/* Input de Búsqueda */}
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Buscar por alumno, CI, código de clase..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
              />
            </div>
          </div>

          {/* Tabla de Mensualidades */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border border-slate-200/80">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-4">Estudiante</th>
                    <th scope="col" className="px-5 py-4">Clase / Libro</th>
                    <th scope="col" className="px-5 py-4">Periodo & Vencimiento</th>
                    <th scope="col" className="px-5 py-4">Arancel</th>
                    <th scope="col" className="px-5 py-4">Estado</th>
                    <th scope="col" className="px-5 py-4">Contacto Alumno</th>
                    <th scope="col" className="px-5 py-4">Tutores</th>
                    <th scope="col" className="px-5 py-4 text-right">Acción</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredFees.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                        <AlertCircle className="mx-auto h-8 w-8 mb-2 text-slate-300" />
                        <p className="text-sm font-bold text-slate-600">No se encontraron mensualidades</p>
                        <p className="text-xs text-slate-400 font-normal mt-0.5">Intenta con otro término de búsqueda o cambia de filtro.</p>
                      </td>
                    </tr>
                  ) : (
                    filteredFees.map((fee: SerializedTuitionFee) => {
                      const isOverdue = fee.status === 'OVERDUE';
                      const isPending = fee.status === 'PENDING';
                      const isPaid = fee.status === 'PAID';
                      const daysDiff = getDaysDiffFromNow(fee.dueDate);
                      const rawPhone = fee.student.phone.replace(/[^0-9]/g, '');

                      const isAmarillo = fee.class.book === 'AMARILLO';
                      const isRojo = fee.class.book === 'ROJO';
                      const isAzul = fee.class.book === 'AZUL';

                      return (
                        <tr 
                          key={fee.id} 
                          className={`transition-colors duration-150 hover:bg-slate-50/70 ${
                            isOverdue ? 'bg-rose-50/20' : ''
                          }`}
                        >
                          {/* Estudiante */}
                          <td className="px-5 py-4.5">
                            <div className="flex items-center gap-3">
                              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl font-bold text-xs ${
                                isOverdue
                                  ? 'bg-rose-100 text-rose-700'
                                  : isPaid
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : 'bg-indigo-50 text-indigo-700'
                              }`}>
                                {fee.student.firstName[0]}{fee.student.lastName[0]}
                              </div>
                              <div>
                                <div className="font-bold text-slate-900 text-xs">
                                  {fee.student.firstName} {fee.student.lastName}
                                </div>
                                <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                                  <span>CI: <strong className="font-mono text-slate-600">{fee.student.ci || 'Sin Cédula'}</strong></span>
                                  {fee.student.invoiceIdNumber && (
                                    <span 
                                      className="text-[9px] font-bold bg-amber-50 text-amber-800 border border-amber-200 px-1 rounded font-mono cursor-help"
                                      title={`Facturación SRI: ${fee.student.invoiceName || 'Nombre no asignado'} (${fee.student.invoiceIdType || 'ID'}: ${fee.student.invoiceIdNumber})`}
                                    >
                                      SRI
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          {/* Clase / Libro */}
                          <td className="px-5 py-4.5">
                            <div>
                              <div className="font-bold text-slate-800 text-xs">
                                {fee.class.name}
                              </div>
                              <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                                <span className="font-mono text-[9px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                                  {fee.class.code}
                                </span>
                                <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] font-black border ${
                                  isAmarillo
                                    ? 'bg-amber-50 text-amber-900 border-amber-300'
                                    : isRojo
                                    ? 'bg-rose-50 text-rose-900 border-rose-300'
                                    : 'bg-sky-50 text-sky-900 border-sky-300'
                                }`}>
                                  <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${
                                    isAmarillo ? 'bg-amber-500' : isRojo ? 'bg-rose-500' : 'bg-sky-500'
                                  }`} />
                                  {isAmarillo ? 'Amarillo' : isRojo ? 'Rojo' : 'Azul'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Periodo & Vencimiento */}
                          <td className="px-5 py-4.5">
                            <div className="font-bold text-slate-900 text-xs capitalize">
                              {getMonthName(fee.month)} {fee.year}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span>Vence: {formatDate(fee.dueDate)}</span>
                            </div>
                          </td>

                          {/* Monto / Arancel */}
                          <td className="px-5 py-4.5 font-bold text-slate-900 text-xs">
                            <span className="font-black text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100 inline-block">
                              {formatCurrency(fee.amount)}
                            </span>
                          </td>

                          {/* Estado */}
                          <td className="px-5 py-4.5">
                            {isOverdue && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-black text-rose-700 border border-rose-200 shadow-sm animate-pulse">
                                  <AlertTriangle className="h-3 w-3 text-rose-600" />
                                  En Mora
                                </span>
                                <div className="text-[10px] font-bold text-rose-600 pl-1">
                                  {Math.abs(daysDiff)} {Math.abs(daysDiff) === 1 ? 'día' : 'días'} vencido
                                </div>
                              </div>
                            )}

                            {isPending && (
                              <div className="space-y-1">
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-2.5 py-1 text-[11px] font-bold text-amber-800 border border-amber-200 shadow-sm">
                                  <Clock className="h-3 w-3 text-amber-600" />
                                  Pendiente
                                </span>
                                <div className="text-[10px] text-slate-400 pl-1 font-semibold">
                                  {daysDiff > 0 ? `Vence en ${daysDiff} días` : 'Vence hoy'}
                                </div>
                              </div>
                            )}

                            {isPaid && (
                              <div>
                                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 border border-emerald-200 shadow-sm">
                                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                                  Al Día
                                </span>
                                {fee.payments && fee.payments.length > 0 && (
                                  <div className="space-y-0.5 mt-0.5">
                                    <div className="text-[10px] text-slate-400 pl-1">
                                      {formatDate(fee.payments[0].paymentDate)}
                                    </div>
                                    {fee.payments[0].invoiceNumber && (
                                      <div 
                                        className="inline-flex items-center gap-1 font-mono text-[9px] font-bold text-emerald-800 bg-emerald-100/70 px-1 py-0.2 rounded border border-emerald-200 truncate max-w-[120px]"
                                        title={`Factura SRI: ${fee.payments[0].invoiceNumber}`}
                                      >
                                        SRI: {fee.payments[0].invoiceNumber}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Contacto Alumno con WhatsApp */}
                          <td className="px-5 py-4.5">
                            <a
                              href={buildWhatsAppUrl(
                                fee.student.phone,
                                `Estimado estudiante ${fee.student.firstName}, le escribimos de MindsOn respecto a su mensualidad de ${getMonthName(fee.month)} (${formatCurrency(fee.amount)}).`
                              )}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50/70 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-100/40 shadow-sm transition-all duration-200 hover:scale-[1.02]"
                            >
                              <MessageCircle className="h-3 w-3 text-emerald-600" />
                              {fee.student.phone}
                            </a>
                          </td>

                          {/* Contacto Tutores */}
                          <td className="px-5 py-4.5">
                            <div className="space-y-1 text-[11px]">
                              {fee.student.guardianPhone1 && (
                                <div className="text-slate-600 font-semibold pl-1">
                                  <a
                                    href={buildWhatsAppUrl(
                                      fee.student.guardianPhone1,
                                      `Estimado tutor de ${fee.student.firstName}, le escribimos de MindsOn respecto a la mensualidad de ${getMonthName(fee.month)} (${formatCurrency(fee.amount)}).`
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-700 font-bold"
                                  >
                                    <span className="text-slate-400 text-[10px]">T1:</span> {fee.student.guardianPhone1}
                                    <MessageCircle className="h-2.5 w-2.5 text-emerald-600" />
                                  </a>
                                </div>
                              )}
                              {fee.student.guardianPhone2 && (
                                <div className="text-slate-600 font-semibold pl-1">
                                  <a
                                    href={buildWhatsAppUrl(
                                      fee.student.guardianPhone2,
                                      `Estimado tutor de ${fee.student.firstName}, le escribimos de MindsOn respecto a la mensualidad de ${getMonthName(fee.month)} (${formatCurrency(fee.amount)}).`
                                    )}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-700 font-bold"
                                  >
                                    <span className="text-slate-400 text-[10px]">T2:</span> {fee.student.guardianPhone2}
                                    <MessageCircle className="h-2.5 w-2.5 text-emerald-600" />
                                  </a>
                                </div>
                              )}
                              {!fee.student.guardianPhone1 && !fee.student.guardianPhone2 && (
                                <span className="text-slate-400 text-[10px] font-medium pl-1">Sin registro</span>
                              )}
                            </div>
                          </td>

                          {/* Acción: Registrar Pago o Ver Recibo */}
                          <td className="px-5 py-4.5 text-right">
                            {!isPaid ? (
                              <button
                                onClick={() => setSelectedFeeForPayment(fee)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-3 py-1.5 text-xs font-bold text-white shadow-sm shadow-indigo-600/20 hover:from-indigo-700 hover:to-indigo-800 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                              >
                                <CreditCard className="h-3.5 w-3.5" />
                                Registrar Pago
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedReceiptId(fee.id)}
                                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-3 py-1.5 text-xs font-bold border border-emerald-200/80 shadow-xs transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
                                title="Ver / Reimprimir Comprobante Oficial de Pago"
                              >
                                <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                                Recibo
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

          {/* Modal de Registro de Pagos */}
          <PaymentModal
            isOpen={!!selectedFeeForPayment}
            fee={selectedFeeForPayment}
            onClose={() => setSelectedFeeForPayment(null)}
          />

          {/* Modal de Comprobante Oficial */}
          <PaymentReceiptModal
            isOpen={!!selectedReceiptId}
            paymentIdOrFeeId={selectedReceiptId}
            onClose={() => setSelectedReceiptId(null)}
          />
        </div>
      )}
    </div>
  );
}
