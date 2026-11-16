import React from 'react';
import { Header } from '@/components/Header';
import { TuitionControlSection } from '@/components/TuitionControlSection';
import { 
  getFinancialDashboardData, 
  getCourseFinanceGroups,
  getMonthlyCollectionHistoryAction,
  getAnnualCashflowSummaryAction
} from '@/actions/finance';
import { getMonthlyFinancialBalanceAction } from '@/actions/expenses';
import { Sparkles } from 'lucide-react';
import { tuitionDay } from '@/lib/tuition-dates';

// Desactivar caché estática para reflejar datos financieros en tiempo real
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { fees } = await getFinancialDashboardData();
  const [
    courseGroups,
    monthlyHistoryData, 
    annualCashflowData,
    financialBalanceData
  ] = await Promise.all([
    getCourseFinanceGroups(),
    getMonthlyCollectionHistoryAction(),
    getAnnualCashflowSummaryAction(),
    getMonthlyFinancialBalanceAction(),
  ]);

  const today = tuitionDay(new Date());

  return (
    <div className="min-h-screen bg-slate-50/50 pb-16">
      {/* Header institucional */}
      <Header />

      {/* Main Container */}
      <main className="mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8 space-y-6">
        
        {/* Welcome & Quick Summary Header */}
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl bg-gradient-to-r from-slate-950 to-slate-700 bg-clip-text text-transparent">
              Panel de Control Financiero & Cobranzas
            </h1>
            <p className="text-xs text-slate-400 sm:text-sm font-medium">
              Supervisión de mensualidades, desglose de recaudación por curso y registro ágil de pagos.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50/70 px-3.5 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-100/60 shadow-[0_1px_2px_rgba(79,70,229,0.02)]">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
              Sincronización de Mora Activa
            </span>
          </div>
        </div>

        {/* Sección de Control de Mensualidades y Cobranzas */}
        <section aria-label="Control de Pagos y Mensualidades" className="space-y-3">
          <TuitionControlSection 
            initialFees={fees} 
            currentPeriod={{ month: today.getUTCMonth() + 1, year: today.getUTCFullYear() }}
            courseGroups={courseGroups}
            initialMonthlyHistoryData={monthlyHistoryData}
            initialAnnualCashflowData={annualCashflowData}
            initialFinancialBalanceData={financialBalanceData}
          />
        </section>
      </main>
    </div>
  );
}
