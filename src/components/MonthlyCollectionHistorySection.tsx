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
import { formatCurrency, formatDate, formatDateTime, getMonthName } from '@/lib/utils';
import { PaymentReceiptModal } from './PaymentReceiptModal';

interface MonthlyCollectionHistorySectionProps {
  initialMonthlyData: MonthlyCollectionHistoryResponse;
  initialAnnualData: AnnualCashflowSummaryResponse;
  onMonthChange?: (year: number, month: number) => void;
}

export function MonthlyCollectionHistorySection({
  initialMonthlyData,
  initialAnnualData,
  onMonthChange,
}: MonthlyCollectionHistorySectionProps) {
  const [isPending, startTransition] = useTransition();
  const [monthlyData, setMonthlyData] = useState<MonthlyCollectionHistoryResponse>(initialMonthlyData);
  const [annualData, setAnnualData] = useState<AnnualCashflowSummaryResponse>(initialAnnualData);

  const [selectedYear, setSelectedYear] = useState<number>(initialMonthlyData.year);
  const [selectedMonth, setSelectedMonth] = useState<number>(initialMonthlyData.month);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [methodFilter, setMethodFilter] = useState<string>('ALL');
  const [selectedReceiptPaymentId, setSelectedReceiptPaymentId] = useState<string | null>(null);

  // Sincronización reactiva de datos al cambiar selectedYear o selectedMonth
  useEffect(() => {
    startTransition(async () => {
      const [mRes, aRes] = await Promise.all([
        getMonthlyCollectionHistoryAction(selectedYear, selectedMonth),
        getAnnualCashflowSummaryAction(selectedYear),
      ]);
      setMonthlyData(mRes);
      setAnnualData(aRes);
    });

    if (onMonthChange) {
      onMonthChange(selectedYear, selectedMonth);
    }
  }, [selectedYear, selectedMonth]);

  // Selección de mes y scroll suave hacia el cuadre superior
  const handleSelectMonth = (monthNumber: number) => {
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
    const now = new Date();
    setSelectedYear(now.getFullYear());
    setSelectedMonth(now.getMonth() + 1);
  };

  // Filtrado de transacciones
  const filteredTransactions = useMemo(() => {
    return monthlyData.transactions.filter((tx) => {
      // Filtro de método
      if (methodFilter !== 'ALL') {
        const lowerMethod = tx.paymentMethod.toLowerCase();
        if (methodFilter === 'TRANSFER' && !lowerMethod.includes('transferencia') && !lowerMethod.includes('banco') && !lowerMethod.includes('qr')) return false;
        if (methodFilter === 'CASH' && !lowerMethod.includes('efectivo') && !lowerMethod.includes('cash')) return false;
        if (methodFilter === 'CARD' && !lowerMethod.includes('tarjeta') && !lowerMethod.includes('depósito') && !lowerMethod.includes('deposito')) return false;
      }

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

  const { metrics } = monthlyData;

  const now = new Date();
  const isCurrentActiveMonth = selectedMonth === (now.getMonth() + 1) && selectedYear === now.getFullYear();

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
                Ir al Mes Actual ({getMonthName(now.getMonth() + 1)})
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

        {/* 2. Tarjetas de Cuadre de Caja del Mes */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          
          {/* Recaudación Total en Caja */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border border-emerald-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-800">
                Total Ingresado en Caja
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
                Efectivo real percibido en {monthlyData.monthName} {monthlyData.year}
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
                Comprobantes emitidos en el periodo
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                100% de recibos con voucher digital
              </span>
            </div>
          </div>

          {/* Efectividad de Cobro */}
          <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border border-indigo-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black uppercase tracking-wider text-indigo-800">
                Tasa de Recuperación
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
                Cobrado vs. Proyectado ({formatCurrency(metrics.projectedMonth)})
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
                Por recaudar en {monthlyData.monthName}
              </p>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <span className="text-[11px] font-bold text-slate-500">
                Proyección total: <strong className="text-slate-800 font-mono">{formatCurrency(metrics.projectedMonth)}</strong>
              </span>
            </div>
          </div>
        </div>

        {/* 3. Libro Diario de Pagos del Mes (Tabla de Transacciones) */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-indigo-600" />
                Libro Diario de Pagos — {monthlyData.monthName} {monthlyData.year}
              </h2>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Registro cronológico correlativo de transacciones recibidas
              </p>
            </div>

            {/* Filtros de la Tabla */}
            <div className="flex items-center gap-2.5 flex-wrap">
              {/* Método de pago */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => setMethodFilter('ALL')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    methodFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Todos
                </button>
                <button
                  onClick={() => setMethodFilter('TRANSFER')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    methodFilter === 'TRANSFER' ? 'bg-indigo-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Bancos
                </button>
                <button
                  onClick={() => setMethodFilter('CASH')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-bold transition-all ${
                    methodFilter === 'CASH' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Efectivo
                </button>
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
                                {formatDateTime(tx.paymentDate)}
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
      </div>

      {/* 4. Tabla Resumen Anual de Cierres (Enero a Diciembre) */}
      <div className="space-y-4 pt-4 border-t border-slate-200/70">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h2 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
              Resumen Anual de Flujo de Caja — {annualData.year}
            </h2>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Consolidado de los 12 meses. Haz clic en cualquier mes para abrir su cuadre detallado.
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-bold bg-white px-4 py-2 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-slate-500">Recaudación Anual:</span>
            <span className="font-black text-emerald-700 text-sm font-mono">{formatCurrency(annualData.annualTotalCollected)}</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-500">Proyección:</span>
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
                  <th scope="col" className="px-5 py-4">Total Recaudado</th>
                  <th scope="col" className="px-5 py-4">Proyectado</th>
                  <th scope="col" className="px-5 py-4">Saldo Pendiente</th>
                  <th scope="col" className="px-5 py-4">Transacciones</th>
                  <th scope="col" className="px-5 py-4">Efectividad</th>
                  <th scope="col" className="px-5 py-4 text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {annualData.months.map((m) => {
                  const isSelected = m.month === selectedMonth && annualData.year === selectedYear;
                  const isCurrentMonth = m.month === (now.getMonth() + 1) && annualData.year === now.getFullYear();

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
      </div>

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
