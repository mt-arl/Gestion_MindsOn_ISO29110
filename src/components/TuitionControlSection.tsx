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
  AlertOctagon,
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
import { formatCurrency, formatTuitionDate, getDaysDiffFromNow, getMonthName } from '@/lib/utils';
import { buildWhatsAppUrl } from '@/lib/ecuador-validators';
import { summarizeTuitionFees } from '@/lib/tuition-metrics';
import { MetricCards } from './MetricCards';
import { PaymentModal } from './PaymentModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';
import { CourseFinanceBreakdown } from './CourseFinanceBreakdown';
import { MonthlyCollectionHistorySection } from './MonthlyCollectionHistorySection';
import { FinancialBalanceSection } from './FinancialBalanceSection';
import { TuitionPaymentBlocked } from './TuitionPaymentBlocked';

interface TuitionControlSectionProps {
  initialFees: SerializedTuitionFee[];
  currentPeriod: { month: number; year: number };
  courseBreakdownData: CourseFinanceBreakdownResponse;
  initialMonthlyHistoryData?: MonthlyCollectionHistoryResponse;
  initialAnnualCashflowData?: AnnualCashflowSummaryResponse;
  initialFinancialBalanceData?: MonthlyFinancialBalanceResponse;
}

type MainDashboardView = 'GENERAL' | 'BY_COURSE' | 'HISTORY' | 'BALANCE';
type TabFilter = 'ALL' | 'OVERDUE' | 'PENDING' | 'PAID';

function periodKey(year: number, month: number) {
  return year * 100 + month;
}

export function TuitionControlSection({ 
  initialFees, 
  currentPeriod: { month: currentMonth, year: currentYear },
  courseBreakdownData,
  initialMonthlyHistoryData,
  initialAnnualCashflowData,
  initialFinancialBalanceData
}: TuitionControlSectionProps) {
  const [mainView, setMainView] = useState<MainDashboardView>('GENERAL');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTab, setSelectedTab] = useState<TabFilter>('ALL');
  const currentPeriodKey = periodKey(currentYear, currentMonth);
  const [selectedPeriod, setSelectedPeriod] = useState<number | 'ALL'>(currentPeriodKey);
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<SerializedTuitionFee | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  const periods = useMemo(() => {
    const byPeriod = new Map([
      [currentPeriodKey, { month: currentMonth, year: currentYear, fees: [] as SerializedTuitionFee[] }],
    ]);

    for (const fee of initialFees) {
      const key = periodKey(fee.year, fee.month);
      const period = byPeriod.get(key);
      if (period) {
        period.fees.push(fee);
      } else {
        byPeriod.set(key, { month: fee.month, year: fee.year, fees: [fee] });
      }
    }
    return byPeriod;
  }, [currentMonth, currentYear, currentPeriodKey, initialFees]);

  const activePeriod = selectedPeriod === 'ALL' || periods.has(selectedPeriod)
    ? selectedPeriod
    : currentPeriodKey;
  const monthlyRecord = activePeriod === 'ALL' ? undefined : periods.get(activePeriod);
  const periodFees = monthlyRecord?.fees ?? initialFees;
  const metricsPeriod = monthlyRecord ?? periods.get(currentPeriodKey)!;
  const metricsPeriodTitle = `${getMonthName(metricsPeriod.month)} ${metricsPeriod.year}`;
  const periodTitle = monthlyRecord ? metricsPeriodTitle : 'Todos los meses';
  const periodOptions = [
    { key: 'ALL' as const, label: 'Todos los meses', count: initialFees.length, settled: false },
    ...Array.from(periods.entries())
      .sort(([a], [b]) => Number(b === currentPeriodKey) - Number(a === currentPeriodKey) || b - a)
      .map(([key, { month, year, fees }]) => ({
        key,
        label: `${getMonthName(month)} ${year}`,
        count: fees.length,
        settled: fees.length > 0 && fees.every((fee) => fee.status === 'PAID'),
      })),
  ];

  const summary = useMemo(() => summarizeTuitionFees(periodFees), [periodFees]);
  const metrics = useMemo(
    () => metricsPeriod.fees === periodFees ? summary : summarizeTuitionFees(metricsPeriod.fees),
    [metricsPeriod, periodFees, summary],
  );
  const settled = summary.feeCount > 0 && summary.paidCount === summary.feeCount;

  const openPeriod = (key: number | 'ALL') => {
    if (key === activePeriod) return;
    setSelectedPeriod(key);
    setSelectedTab('ALL');
    setSearchTerm('');
  };

  // Filtrado reactivo por pestaña y término de búsqueda
  const filteredFees = useMemo(() => {
    return periodFees.filter((fee) => {
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
  }, [periodFees, selectedTab, searchTerm]);

  return (
    <div className="space-y-6">
      <section aria-labelledby="monthly-metrics-title" className="space-y-4">
        <h2 id="monthly-metrics-title" className="text-sm font-bold text-slate-700">
          Métricas de {metricsPeriodTitle}
        </h2>
        {/* Alerta Destacada si existen estudiantes en mora */}
        {metrics.overdueCount > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-rose-500/90 via-rose-600/95 to-rose-600 p-5 text-white shadow-xl shadow-rose-500/10 border border-rose-500/20">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15 backdrop-blur-md shadow-inner">
                <AlertOctagon className="h-5 w-5 text-rose-100" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base leading-tight tracking-wide">
                  {metrics.overdueCount} {metrics.overdueCount === 1 ? 'mensualidad vencida' : 'mensualidades vencidas'}
                </h3>
                <p className="text-xs text-rose-100/90 mt-1 font-medium">
                  El saldo vencido es de <strong className="text-white underline decoration-white/40 underline-offset-2">{formatCurrency(metrics.totalOverdue)}</strong> correspondiente a {metrics.overdueStudentsCount} {metrics.overdueStudentsCount === 1 ? 'estudiante' : 'estudiantes'}.
                </p>
              </div>
            </div>
            <div className="shrink-0">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-1.5 text-xs font-black text-rose-700 shadow-[0_4px_12px_rgba(0,0,0,0.05)] border border-rose-100/20">
                Cobranza Prioritaria
              </span>
            </div>
          </div>
        )}
        <MetricCards metrics={metrics} />
      </section>

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
          <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white px-4 py-3">
            <p id="tuition-period-label" className="mb-2 flex items-center gap-1.5 text-xs font-bold text-slate-600">
              <Calendar className="h-4 w-4 text-indigo-600" aria-hidden="true" />
              Historial mensual de cuotas
            </p>
            <div role="group" aria-labelledby="tuition-period-label" className="flex items-center gap-2 overflow-x-auto pb-1">
              {periodOptions.map(({ key, label, count, settled }) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={activePeriod === key}
                  onClick={() => openPeriod(key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-xs font-bold focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-indigo-500 ${
                    activePeriod === key
                      ? 'border-indigo-700 bg-indigo-700 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50'
                  }`}
                >
                  {settled && <CheckCircle2 className={`h-3.5 w-3.5 ${activePeriod === key ? 'text-white' : 'text-emerald-600'}`} aria-hidden="true" />}
                  {label}
                  <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${activePeriod === key ? 'bg-white/20' : 'bg-slate-200'}`}>
                    {count}
                  </span>
                  {settled && <span className="sr-only">Todas las cuotas pagadas</span>}
                </button>
              ))}
            </div>
          </div>

          <section aria-labelledby="tuition-record-title" className="rounded-2xl border border-slate-200/80 bg-white p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 id="tuition-record-title" className="text-sm font-black text-slate-900">
                Registro de cuotas · {periodTitle}
              </h3>
              {settled && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Todas las cuotas pagadas
                </span>
              )}
            </div>
            <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 text-xs sm:grid-cols-4">
              <div>
                <dt className="font-medium text-slate-500">Cuotas emitidas</dt>
                <dd className="mt-0.5 font-bold text-slate-900">{summary.feeCount}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Cuotas pagadas</dt>
                <dd className="mt-0.5 font-bold text-emerald-700">{summary.paidCount} de {summary.feeCount}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Monto emitido</dt>
                <dd className="mt-0.5 font-bold text-slate-900">{formatCurrency(summary.issuedAmount)}</dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500">Saldo por cobrar</dt>
                <dd className="mt-0.5 font-bold text-slate-900">{formatCurrency(summary.outstandingAmount)}</dd>
              </div>
            </dl>
          </section>

          {/* Search & Tabs Toolbar */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-slate-200/80">
            
            {/* Pestañas de Filtro */}
            <div role="group" aria-label="Estado de la cuota" className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
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
                  {summary.feeCount}
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
                  {summary.overdueCount}
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
                  {summary.pendingCount}
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
                <span>Pagadas</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  selectedTab === 'PAID' ? 'bg-emerald-800 text-white' : 'bg-emerald-200/80 text-emerald-900'
                }`}>
                  {summary.paidCount}
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
                <caption className="sr-only">Listado de cuotas · {periodTitle}</caption>
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
                        <p className="text-sm font-bold text-slate-600">
                          {periodFees.length === 0 ? 'No hay mensualidades en este periodo' : 'No se encontraron mensualidades'}
                        </p>
                        <p className="text-xs text-slate-400 font-normal mt-0.5">
                          {initialFees.length === 0
                            ? 'Las cuotas aparecerán aquí cuando se emitan.'
                            : periodFees.length === 0
                              ? 'Selecciona otro mes para consultar sus cuotas.'
                              : 'Intenta con otro término de búsqueda o cambia de filtro.'}
                        </p>
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
                              <span>Vence: {formatTuitionDate(fee.dueDate)}</span>
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
                                  Pagada
                                </span>
                                {fee.payments && fee.payments.length > 0 && (
                                  <div className="space-y-0.5 mt-0.5">
                                    <div className="text-[10px] text-slate-400 pl-1">
                                      Pago del {formatTuitionDate(fee.payments[0].paymentDate)}
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
                            {fee.blockedByPeriod ? (
                              <TuitionPaymentBlocked period={fee.blockedByPeriod} />
                            ) : !isPaid ? (
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
