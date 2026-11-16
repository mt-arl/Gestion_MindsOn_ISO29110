'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { 
  TrendingUp, 
  DollarSign, 
  Calendar, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  ArrowLeft, 
  ArrowRight, 
  Filter, 
  Search, 
  Building, 
  Wallet, 
  CreditCard, 
  ChevronRight, 
  RefreshCw,
  Loader2,
  Sparkles,
  PieChart,
  FileSpreadsheet,
  ArrowUpRight
} from 'lucide-react';
import { 
  MonthlyCollectionHistoryResponse, 
  AnnualCashflowSummaryResponse,
  MonthlyPaymentTransaction,
  getMonthlyCollectionHistoryAction,
  getAnnualCashflowSummaryAction
} from '@/actions/finance';
import { formatCurrency, formatDateTime, getMonthName } from '@/lib/utils';
import { TUITION_TIME_ZONE, tuitionDay, tuitionPeriodKey, type TuitionPeriod } from '@/lib/tuition-dates';
import { PaymentReceiptModal } from './PaymentReceiptModal';

interface MonthlyCollectionHistorySectionProps {
  initialMonthlyData: MonthlyCollectionHistoryResponse;
  initialAnnualData: AnnualCashflowSummaryResponse;
  initialPeriod?: TuitionPeriod;
}

export function MonthlyCollectionHistorySection({
  initialMonthlyData,
  initialAnnualData,
  initialPeriod,
}: MonthlyCollectionHistorySectionProps) {
  const [isPending, startTransition] = useTransition();
  const [monthlyData, setMonthlyData] = useState<MonthlyCollectionHistoryResponse>(initialMonthlyData);
  const [annualData, setAnnualData] = useState<AnnualCashflowSummaryResponse>(initialAnnualData);

  const [selectedYear, setSelectedYear] = useState(initialPeriod?.year ?? initialMonthlyData.year);
  const [selectedMonth, setSelectedMonth] = useState(initialPeriod?.month ?? initialMonthlyData.month);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [selectedReceiptPaymentId, setSelectedReceiptPaymentId] = useState<string | null>(null);

  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadError(false);
    startTransition(async () => {
      try {
        const [monthly, annual] = await Promise.all([
          getMonthlyCollectionHistoryAction(selectedYear, selectedMonth),
          getAnnualCashflowSummaryAction(selectedYear),
        ]);
        if (!cancelled) {
          setMonthlyData(monthly);
          setAnnualData(annual);
        }
      } catch {
        if (!cancelled) setLoadError(true);
      }
    });
    return () => { cancelled = true; };
  }, [selectedYear, selectedMonth]);

  // Selección de mes y scroll suave hacia el cuadre superior
  const handleSelectMonth = (monthNumber: number) => {
    setSelectedYear(annualData.year);
    setSelectedMonth(monthNumber);

    setTimeout(() => {
      const cuadreSection = document.getElementById('seccion-cuadre-mensual');
      if (cuadreSection) {
        cuadreSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }
    }, 50);
  };

  // Navegación de mes con flechas
  const handleNavigateMonth = (offset: number) => {
    let newMonth = selectedMonth + offset;
    let newYear = selectedYear;

    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    } else if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }

    setSelectedYear(newYear);
    setSelectedMonth(newMonth);
  };

  const handleGoToCurrentMonth = () => {
    const now = tuitionDay(new Date());
    setSelectedYear(now.getUTCFullYear());
    setSelectedMonth(now.getUTCMonth() + 1);
  };

  // Filtrado de transacciones
  const filteredTransactions = useMemo(() => {
    return monthlyData.transactions.filter((tx) => {
      if (methodFilter !== 'ALL' && tx.methodGroup !== methodFilter) return false;

      // Filtro de texto
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase();
      const studentName = `${tx.student.firstName} ${tx.student.lastName}`.toLowerCase();
      const ci = (tx.student.ci || '').toLowerCase();
      const receiptNo = tx.receiptNumber.toLowerCase();
      const course = `${tx.class.name} ${tx.class.code}`.toLowerCase();
      const ref = (tx.referenceNumber || '').toLowerCase();
      const notes = (tx.notes || '').toLowerCase();

      return (
        studentName.includes(query) ||
        ci.includes(query) ||
        receiptNo.includes(query) ||
        course.includes(query) ||
        ref.includes(query) ||
        notes.includes(query)
      );
    });
  }, [monthlyData.transactions, methodFilter, searchTerm]);

  const priorPayments = useMemo(() => {
    const groups = new Map<number, {
      label: string;
      cents: number;
      transactions: MonthlyPaymentTransaction[];
    }>();
    let totalCents = 0;
    for (const payment of monthlyData.priorPeriodTransactions) {
      const key = tuitionPeriodKey({ year: payment.feeYear, month: payment.feeMonth });
      let group = groups.get(key);
      if (!group) {
        group = { label: `${payment.feeMonthName} ${payment.feeYear}`, cents: 0, transactions: [] };
        groups.set(key, group);
      }
      const cents = Math.round(payment.amountPaid * 100);
      group.cents += cents;
      group.transactions.push(payment);
      totalCents += cents;
    }
    return { groups: Array.from(groups).sort(([a], [b]) => b - a), total: totalCents / 100 };
  }, [monthlyData.priorPeriodTransactions]);

  const { metrics } = monthlyData;
  const failed = loadError || monthlyData.error || annualData.error;
  const matchesPeriod = monthlyData.month === selectedMonth && monthlyData.year === selectedYear
    && annualData.year === selectedYear;

  const now = tuitionDay(new Date());
  const isCurrentActiveMonth = selectedMonth === (now.getUTCMonth() + 1) && selectedYear === now.getUTCFullYear();

  return (
    <div className="space-y-6">
      {/* Contenedor Superior con Anclaje para Scroll */}
      <div id="seccion-cuadre-mensual" className="scroll-mt-24 space-y-6">
        
        {/* 1. Barra de Control de Periodo */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 rounded-2xl bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-slate-200/80">
          
          {/* Selector de Navegación de Mes */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleNavigateMonth(-1)}
              disabled={isPending}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all disabled:opacity-50"
              title="Mes Anterior"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2">
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value, 10))}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-black text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {getMonthName(i + 1)}
                  </option>
                ))}
              </select>

              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value, 10))}
                disabled={isPending}
                className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-xs font-black text-slate-800 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
              >
                {[2024, 2025, 2026, 2027, 2028].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={() => handleNavigateMonth(1)}
              disabled={isPending}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all disabled:opacity-50"
              title="Mes Siguiente"
            >
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* Acciones Rápidas */}
          <div className="flex items-center gap-2">
            {!isCurrentActiveMonth && (
              <button
                onClick={handleGoToCurrentMonth}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-100 active:scale-95 transition-all"
              >
                <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                Ir al Mes Actual ({getMonthName(now.getUTCMonth() + 1)})
              </button>
            )}

            {isPending && (
              <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                Actualizando cuadre...
              </div>
            )}
          </div>
        </div>

        {failed && <p role="alert" className="text-sm text-rose-700">No se pudo cargar el cuadre del periodo.</p>}
        {matchesPeriod && !failed && <>
        {/* 2. Tarjetas de Cuadre de Caja del Mes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Recaudación Total en Caja */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border border-emerald-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                Total recaudado de las cuotas
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100/80 text-emerald-700 shadow-sm shadow-emerald-500/10">
                <DollarSign className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                {formatCurrency(metrics.totalCollected)}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Cobrado hasta hoy de las cuotas de {monthlyData.monthName} {monthlyData.year}
              </p>
            </div>

            {/* Desglose por Método */}
            <div className="mt-4 pt-3 border-t border-slate-100 space-y-1 text-[11px]">
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span className="flex items-center gap-1">
                  <Building className="h-3 w-3 text-indigo-500" /> Bancos / QR:
                </span>
                <strong className="text-slate-900 font-mono">{formatCurrency(metrics.byMethod.transfer)}</strong>
              </div>
              <div className="flex items-center justify-between text-slate-600 font-medium">
                <span className="flex items-center gap-1">
                  <Wallet className="h-3 w-3 text-emerald-500" /> Efectivo:
                </span>
                <strong className="text-slate-900 font-mono">{formatCurrency(metrics.byMethod.cash)}</strong>
              </div>
              {metrics.byMethod.cardOrDeposit > 0 && (
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3 text-purple-500" /> Tarjeta / Depósito:
                  </span>
                  <strong className="text-slate-900 font-mono">{formatCurrency(metrics.byMethod.cardOrDeposit)}</strong>
                </div>
              )}
              {metrics.byMethod.other > 0 && (
                <div className="flex items-center justify-between text-slate-600 font-medium">
                  <span>Otros o sin especificar</span>
                  <strong>{formatCurrency(metrics.byMethod.other)}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Transacciones Registradas */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border border-slate-200/80">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-slate-600">
                Pagos Registrados
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <Receipt className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight font-mono">
                {metrics.paymentCount}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Pagos de las cuotas del periodo
              </p>
            </div>


          </div>

          {/* Efectividad de Cobro */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border border-indigo-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-800">
                Tasa de cobro de las cuotas
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100/80 text-indigo-700 shadow-sm shadow-indigo-500/10">
                <TrendingUp className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-indigo-700 tracking-tight font-mono">
                {metrics.recoveryRate}%
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                {formatCurrency(metrics.paidMonth)} pagados de {formatCurrency(metrics.projectedMonth)} emitidos
              </p>
            </div>

            {/* Barra de Progreso */}
            <div className="mt-4 pt-3 border-t border-slate-100">
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-indigo-600 transition-all duration-500"
                  style={{ width: `${Math.min(100, metrics.recoveryRate)}%` }}
                />
              </div>
            </div>
          </div>

          {/* Cartera Pendiente / Mora del Mes */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border border-rose-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-rose-800">
                Saldo Pendiente / Mora
              </span>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-100/80 text-rose-700 shadow-sm shadow-rose-500/10">
                <AlertCircle className="h-5 w-5" />
              </div>
            </div>

            <div className="mt-3">
              <div className="text-2xl sm:text-3xl font-black text-rose-700 tracking-tight font-mono">
                {formatCurrency(metrics.overdueMonth)}
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Saldo de las cuotas de {monthlyData.monthName}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500">
                Cuotas emitidas <strong className="text-slate-800 font-mono">{formatCurrency(metrics.projectedMonth)}</strong>
              </span>
            </div>
          </div>
        </div>

        <section aria-labelledby="prior-payments-title" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="prior-payments-title" className="text-lg font-black text-slate-900">
                Cobros de meses anteriores
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Pagos recibidos en {monthlyData.monthName} {monthlyData.year} por cuotas de periodos anteriores.
              </p>
            </div>
            <strong className="text-xl text-emerald-700">{formatCurrency(priorPayments.total)}</strong>
          </div>

          {priorPayments.groups.length === 0 && (
            <p className="text-sm text-slate-500">No hay cobros de cuotas anteriores registrados en este mes.</p>
          )}

          {priorPayments.groups.map(([key, group]) => (
            <details key={key} className="rounded-xl border border-slate-200">
              <summary className="cursor-pointer rounded-xl bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800">
                {group.label} · {group.transactions.length} {group.transactions.length === 1 ? 'pago' : 'pagos'} · {formatCurrency(group.cents / 100)}
              </summary>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-700">
                  <thead className="border-b border-slate-100 text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3">Estudiante y curso</th>
                      <th scope="col" className="px-4 py-3">Fecha de pago</th>
                      <th scope="col" className="px-4 py-3">Método</th>
                      <th scope="col" className="px-4 py-3">Monto</th>
                      <th scope="col" className="px-4 py-3">Recibo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.transactions.map((payment) => (
                      <tr key={payment.id}>
                        <td className="px-4 py-3">
                          <strong>{payment.student.firstName} {payment.student.lastName}</strong>
                          <div className="text-slate-500">{payment.class.name} ({payment.class.code})</div>
                        </td>
                        <td className="px-4 py-3">{formatDateTime(payment.paymentDate, TUITION_TIME_ZONE)}</td>
                        <td className="px-4 py-3">{payment.paymentMethod}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-bold">{formatCurrency(payment.amountPaid)}</td>
                        <td className="px-4 py-3">
                          <button type="button" className="font-bold text-indigo-700 underline"
                            onClick={() => setSelectedReceiptPaymentId(payment.paymentId)}>
                            {payment.receiptNumber}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          ))}
        </section>

        {/* 3. Libro Diario de Pagos del Mes (Tabla de Transacciones) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-600" />
                Libro Diario de Pagos — {monthlyData.monthName} {monthlyData.year}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Pagos aplicados a las cuotas del periodo
              </p>
            </div>

            {/* Filtros de la Tabla */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Método de pago */}
              <div className="flex flex-wrap items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80">
                {[
                  ['ALL', 'Todos'],
                  ['transfer', 'Bancos / QR'],
                  ['cash', 'Efectivo'],
                  ['cardOrDeposit', 'Tarjeta / Depósito'],
                  ['other', 'Otros'],
                ].map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={methodFilter === value}
                    onClick={() => setMethodFilter(value)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                      methodFilter === value ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Input de Búsqueda */}
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar recibo, CI, alumno..."
                  className="w-full rounded-xl border border-slate-200 bg-white py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-3 focus:ring-indigo-500/10 transition-all"
                />
              </div>
            </div>
          </div>

          {/* Tabla de Transacciones */}
          <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border border-slate-200/80">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                  <tr>
                    <th scope="col" className="px-5 py-4">Nº Recibo</th>
                    <th scope="col" className="px-5 py-4">Fecha y Hora</th>
                    <th scope="col" className="px-5 py-4">Estudiante & Curso</th>
                    <th scope="col" className="px-5 py-4">Concepto</th>
                    <th scope="col" className="px-5 py-4">Método de Pago</th>
                    <th scope="col" className="px-5 py-4">Monto Recibido</th>
                    <th scope="col" className="px-5 py-4 text-right">Comprobante</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                        <Receipt className="mx-auto h-8 w-8 mb-2 text-slate-300" />
                        <p className="text-sm font-bold text-slate-600">No se encontraron pagos registrados</p>
                        <p className="text-xs text-slate-400 font-normal mt-0.5">
                          No hay transacciones registradas en {monthlyData.monthName} {monthlyData.year} con los filtros seleccionados.
                        </p>
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((tx) => {
                      const isTransfer = tx.paymentMethod.toLowerCase().includes('transferencia') || tx.paymentMethod.toLowerCase().includes('banco') || tx.paymentMethod.toLowerCase().includes('qr');
                      const isCash = tx.paymentMethod.toLowerCase().includes('efectivo');

                      return (
                        <tr key={tx.id} className="transition-colors duration-150 hover:bg-slate-50/70">
                          {/* Nº Recibo */}
                          <td className="px-5 py-4.5">
                            <span className="font-mono text-xs font-black text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg">
                              {tx.receiptNumber}
                            </span>
                          </td>

                          {/* Fecha y Hora */}
                          <td className="px-5 py-4.5">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 text-xs">
                                {formatDateTime(tx.paymentDate, TUITION_TIME_ZONE)}
                              </span>
                              <div className="text-[10px] text-slate-400">
                                Reg: {tx.registeredBy}
                              </div>
                            </div>
                          </td>

                          {/* Estudiante & Curso */}
                          <td className="px-5 py-4.5">
                            <div>
                              <div className="font-bold text-slate-900 text-xs">
                                {tx.student.firstName} {tx.student.lastName}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                                <span className="font-mono text-slate-500">CI: {tx.student.ci || 'N/A'}</span>
                                <span>•</span>
                                <span className="font-semibold text-slate-600 bg-slate-100 px-1.5 py-0.2 rounded text-[10px]">
                                  {tx.class.name} ({tx.class.code})
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Concepto */}
                          <td className="px-5 py-4.5">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-800 text-xs">
                                Mensualidad {tx.feeMonthName} {tx.feeYear}
                              </span>
                              <div className="text-[10px] text-slate-400">
                                Arancel: {formatCurrency(tx.feeAmount)}
                              </div>
                            </div>
                          </td>

                          {/* Método de Pago */}
                          <td className="px-5 py-4.5">
                            <span className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[11px] font-bold border shadow-xs ${
                              isTransfer
                                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                                : isCash
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                                : 'bg-purple-50 text-purple-800 border-purple-200'
                            }`}>
                              {isTransfer ? <Building className="h-3 w-3 text-indigo-600" /> : isCash ? <Wallet className="h-3 w-3 text-emerald-600" /> : <CreditCard className="h-3 w-3 text-purple-600" />}
                              {tx.paymentMethod}
                              {tx.referenceNumber && <span className="font-mono text-[10px] opacity-85">#{tx.referenceNumber}</span>}
                            </span>
                          </td>

                          {/* Monto Recibido */}
                          <td className="px-5 py-4.5">
                            <span className="font-black text-sm text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100 inline-block font-mono">
                              {formatCurrency(tx.amountPaid)}
                            </span>
                          </td>

                          {/* Comprobante */}
                          <td className="px-5 py-4.5 text-right">
                            <div className="flex flex-col items-end gap-1">
                              {tx.invoiceNumber && (
                                <span className="inline-flex items-center gap-1 font-mono text-[9.5px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 shadow-2xs" title={`Factura SRI: ${tx.invoiceNumber}`}>
                                  SRI: {tx.invoiceNumber}
                                </span>
                              )}
                              <button
                                onClick={() => setSelectedReceiptPaymentId(tx.paymentId)}
                                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-xs transition-all active:scale-95"
                              >
                                <Receipt className="h-3.5 w-3.5 text-indigo-600" />
                                Ver Recibo
                              </button>
                            </div>
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
        </>}
      </div>

      {matchesPeriod && !failed && <div className="space-y-4 pt-4 border-t border-slate-200/70">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
              Resumen anual por periodo de cuota — {annualData.year}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Consolidado de los 12 meses. Haz clic en cualquier mes para abrir su cuadre detallado.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold bg-white px-4 py-2 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-slate-500">Cuotas cobradas del año</span>
            <span className="font-black text-emerald-700 text-sm font-mono">{formatCurrency(annualData.annualTotalCollected)}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Cuotas emitidas</span>
            <span className="font-bold text-slate-800 font-mono">{formatCurrency(annualData.annualTotalProjected)}</span>
          </div>
        </div>

        {/* Grilla / Tabla Anual */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border border-slate-200/80">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                <tr>
                  <th scope="col" className="px-5 py-4">Mes</th>
                  <th scope="col" className="px-5 py-4">Recaudado de las cuotas</th>
                  <th scope="col" className="px-5 py-4">Cuotas emitidas</th>
                  <th scope="col" className="px-5 py-4">Saldo Pendiente</th>
                  <th scope="col" className="px-5 py-4">Transacciones</th>
                  <th scope="col" className="px-5 py-4">Tasa de cobro de cuotas</th>
                  <th scope="col" className="px-5 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {annualData.months.map((m) => {
                  const isSelected = m.month === selectedMonth && annualData.year === selectedYear;
                  const isCurrentMonth = m.month === (now.getUTCMonth() + 1) && annualData.year === now.getUTCFullYear();

                  return (
                    <tr
                      key={m.month}
                      onClick={() => handleSelectMonth(m.month)}
                      className={`cursor-pointer transition-colors duration-150 ${
                        isSelected 
                          ? 'bg-indigo-50/80 font-semibold border-l-4 border-indigo-600' 
                          : 'hover:bg-indigo-50/60'
                      }`}
                    >
                      {/* Mes */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-xs ${isSelected ? 'text-indigo-700' : 'text-slate-900'}`}>
                            {m.monthName}
                          </span>
                          {isCurrentMonth && (
                            <span className="rounded-md bg-indigo-600 px-1.5 py-0.2 text-[9px] font-black text-white">
                              Mes Actual
                            </span>
                          )}
                          {isSelected && (
                            <span className="rounded-md bg-indigo-100 text-indigo-700 px-1.5 py-0.2 text-[9px] font-black border border-indigo-200">
                              Activo
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Total Recaudado */}
                      <td className="px-5 py-4 font-mono font-bold text-emerald-700 text-xs">
                        {formatCurrency(m.totalCollected)}
                      </td>

                      {/* Proyectado */}
                      <td className="px-5 py-4 font-mono text-slate-600 text-xs">
                        {formatCurrency(m.totalProjected)}
                      </td>

                      {/* Saldo Pendiente */}
                      <td className="px-5 py-4 font-mono text-xs">
                        {m.totalOverdue > 0 ? (
                          <span className="text-rose-700 font-bold">{formatCurrency(m.totalOverdue)}</span>
                        ) : (
                          <span className="text-slate-400">$0.00</span>
                        )}
                      </td>

                      {/* Transacciones */}
                      <td className="px-5 py-4 text-slate-700">
                        {m.paymentCount} {m.paymentCount === 1 ? 'pago' : 'pagos'}
                      </td>

                      {/* Efectividad */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-indigo-600"
                              style={{ width: `${Math.min(100, m.collectionRate)}%` }}
                            />
                          </div>
                          <span className="font-bold text-slate-800 text-xs">
                            {m.collectionRate}%
                          </span>
                        </div>
                      </td>

                      {/* Acción */}
                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectMonth(m.month);
                          }}
                          className={`inline-flex items-center gap-1 text-xs font-bold transition-all px-2.5 py-1 rounded-lg ${
                            isSelected 
                              ? 'bg-indigo-600 text-white shadow-xs' 
                              : 'text-indigo-600 hover:bg-indigo-100/70'
                          }`}
                        >
                          <span>Ver Cuadre</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>}

      {/* Modal de Comprobante / Recibo */}
      {selectedReceiptPaymentId && (
        <PaymentReceiptModal
          isOpen={!!selectedReceiptPaymentId}
          paymentIdOrFeeId={selectedReceiptPaymentId}
          onClose={() => setSelectedReceiptPaymentId(null)}
        />
      )}
    </div>
  );
}
