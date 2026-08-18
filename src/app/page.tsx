import React from 'react';
import { Header } from '@/components/Header';
import { MetricCards } from '@/components/MetricCards';
import { TuitionControlSection } from '@/components/TuitionControlSection';
import { getFinancialDashboardData } from '@/actions/finance';
import { 
  AlertOctagon, 
  TrendingUp, 
  ShieldAlert, 
  Sparkles, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

// Desactivar caché estática para reflejar datos financieros en tiempo real
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const { metrics, fees } = await getFinancialDashboardData();

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
              Supervisión de mensualidades, detección automática de morosidad y registro ágil de pagos.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50/70 px-3.5 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-100/60 shadow-[0_1px_2px_rgba(79,70,229,0.02)]">
              <Sparkles className="h-3.5 w-3.5 text-indigo-600 animate-pulse" />
              Sincronización de Mora Activa
            </span>
          </div>
        </div>

        {/* Alerta Destacada si existen estudiantes en mora */}
        {metrics.overdueCount > 0 && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-rose-500/90 via-rose-600/95 to-rose-600 p-5 text-white shadow-xl shadow-rose-500/10 border border-rose-500/20">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 border border-white/15 backdrop-blur-md shadow-inner">
                <AlertOctagon className="h-5 w-5 text-rose-100" />
              </div>
              <div>
                <h3 className="font-black text-sm sm:text-base leading-tight tracking-wide">
                  Atención Requerida: {metrics.overdueCount} {metrics.overdueCount === 1 ? 'mensualidad vencida' : 'mensualidades vencidas'} detectadas
                </h3>
                <p className="text-xs text-rose-100/90 mt-1 font-medium">
                  Monto total acumulado en mora: <strong className="text-white underline decoration-white/40 underline-offset-2">{formatCurrency(metrics.totalOverdue)}</strong> correspondiente a {metrics.overdueStudentsCount} {metrics.overdueStudentsCount === 1 ? 'estudiante' : 'estudiantes'}.
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

        {/* Tarjetas de Métricas (KPIs) */}
        <section aria-label="Métricas Financieras">
          <MetricCards metrics={metrics} />
        </section>

        {/* Sección de Control de Mensualidades y Cobranzas */}
        <section aria-label="Control de Pagos y Mensualidades" className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="h-4 w-4 text-slate-500" />
              <h2 className="text-base font-extrabold text-slate-800 tracking-tight">
                Control de Mensualidades & Alertas
              </h2>
            </div>
            <span className="text-xs text-slate-400 font-medium">
              Mostrando {fees.length} registros
            </span>
          </div>

          <TuitionControlSection initialFees={fees} />
        </section>
      </main>
    </div>
  );
}
