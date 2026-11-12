import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Users, 
  ArrowUpRight,
  ShieldAlert
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils';
import type { summarizeTuitionFees } from '@/lib/tuition-metrics';

interface MetricCardsProps {
  metrics: ReturnType<typeof summarizeTuitionFees>;
}

export function MetricCards({ metrics }: MetricCardsProps) {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Recaudado (Verde / Emerald) */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.05)] border border-emerald-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_-4px_rgba(16,185,129,0.1)]">
        <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-emerald-50/50 opacity-60 pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/50">
            Total Recaudado
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-black tracking-tight text-slate-900">
            {formatCurrency(metrics.totalPaid)}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center rounded-lg bg-emerald-50 px-2.5 py-0.5 font-extrabold text-emerald-700 border border-emerald-100/60 shadow-sm">
              <ArrowUpRight className="mr-0.5 h-3.5 w-3.5" />
              {metrics.paidCount} {metrics.paidCount === 1 ? 'cuota pagada' : 'cuotas pagadas'}
            </span>
            <span>Tasa cobro: <strong className="text-slate-700">{metrics.collectionRate}%</strong></span>
          </div>
        </div>
      </div>

      {/* 2. Pendiente (Azul / Indigo) */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.05)] border border-indigo-100 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_-4px_rgba(79,70,229,0.1)]">
        <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-indigo-50/50 opacity-60 pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/50">
            Por Cobrar (Vigente)
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100/50">
            <Clock className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-black tracking-tight text-slate-900">
            {formatCurrency(metrics.totalPending)}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span className="inline-flex items-center rounded-lg bg-indigo-50 px-2.5 py-0.5 font-extrabold text-indigo-700 border border-indigo-100/60 shadow-sm">
              {metrics.pendingCount} {metrics.pendingCount === 1 ? 'cuota' : 'cuotas'}
            </span>
            <span>Dentro de plazo límite</span>
          </div>
        </div>
      </div>

      {/* 3. Cartera Vencida / Mora (Rojo / Rose - Destacada) */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_4px_20px_rgba(244,63,94,0.06)] border-2 border-rose-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(244,63,94,0.12)]">
        <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-rose-50/80 opacity-70 pointer-events-none" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-800 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200/50">
              Cartera Vencida
            </span>
            {metrics.overdueCount > 0 && (
              <span className="rounded-full bg-rose-600 px-2 py-0.5 text-[9px] font-black text-white uppercase tracking-wider glow-active">
                Mora
              </span>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-600 text-white shadow-md shadow-rose-500/30">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-black tracking-tight text-rose-600">
            {formatCurrency(metrics.totalOverdue)}
          </p>
          <div className="mt-3 flex items-center gap-2 text-xs text-rose-900 font-semibold">
            <span className="inline-flex items-center rounded-lg bg-rose-50 px-2.5 py-0.5 font-black text-rose-800 border border-rose-100">
              <AlertTriangle className="mr-0.5 h-3.5 w-3.5 text-rose-600" />
              {metrics.overdueStudentsCount} {metrics.overdueStudentsCount === 1 ? 'moroso' : 'morosos'}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Estado de Alumnado (Gris / Slate) */}
      <div className="relative overflow-hidden rounded-2xl bg-white p-6 shadow-[0_4px_20px_-4px_rgba(100,116,139,0.05)] border border-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_8px_30px_-4px_rgba(100,116,139,0.1)]">
        <div className="absolute right-0 top-0 h-20 w-20 translate-x-4 -translate-y-4 rounded-full bg-slate-50/50 opacity-60 pointer-events-none" />
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/50">
            Alumnos con cuota
          </span>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-600 border border-slate-200/40">
            <Users className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-4">
          <p className="text-3xl font-black tracking-tight text-slate-900">
            {metrics.studentsCount}
          </p>
          <div className="mt-3 flex items-center gap-1.5 text-[11px] font-bold">
            <span className="inline-flex items-center rounded-lg bg-emerald-50/70 px-2 py-0.5 text-emerald-700 border border-emerald-100/50">
              {metrics.studentsWithoutOverdueCount} sin mora
            </span>
            <span className="text-slate-300 font-medium">•</span>
            <span className="inline-flex items-center rounded-lg bg-rose-50/70 px-2 py-0.5 text-rose-700 border border-rose-100/50">
              {metrics.overdueStudentsCount} en mora
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
