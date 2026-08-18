'use client';

import React, { useState, useTransition } from 'react';
import { 
  CalendarDays, 
  X, 
  Sparkles, 
  Loader2, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  Layers
} from 'lucide-react';
import { generateMonthlyTuitionsAction } from '@/actions/academic';

interface GenerateTuitionsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GenerateTuitionsModal({ isOpen, onClose }: GenerateTuitionsModalProps) {
  const [isPending, startTransition] = useTransition();
  const currentDate = new Date();
  
  const [month, setMonth] = useState<number>(currentDate.getMonth() + 1);
  const [year, setYear] = useState<number>(currentDate.getFullYear());
  const [dueDay, setDueDay] = useState<number>(10);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setResult(null);

    startTransition(async () => {
      const res = await generateMonthlyTuitionsAction(Number(month), Number(year), Number(dueDay));
      setResult(res);
      if (res.success) {
        // Auto close after 2.5 seconds or let user see result
        setTimeout(() => {
          onClose();
          setResult(null);
        }, 2500);
      }
    });
  };

  const months = [
    { value: 1, name: 'Enero' },
    { value: 2, name: 'Febrero' },
    { value: 3, name: 'Marzo' },
    { value: 4, name: 'Abril' },
    { value: 5, name: 'Mayo' },
    { value: 6, name: 'Junio' },
    { value: 7, name: 'Julio' },
    { value: 8, name: 'Agosto' },
    { value: 9, name: 'Septiembre' },
    { value: 10, name: 'Octubre' },
    { value: 11, name: 'Noviembre' },
    { value: 12, name: 'Diciembre' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <CalendarDays className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Emitir Mensualidades del Mes
              </h3>
              <p className="text-xs text-slate-500">
                Generador masivo de cuentas por cobrar
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {result && (
            <div
              className={`flex items-start gap-2.5 rounded-xl p-3.5 text-xs font-semibold border ${
                result.success
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {result.success ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span>{result.message}</span>
            </div>
          )}

          <div className="rounded-xl bg-blue-50/70 p-3.5 text-xs text-blue-900 border border-blue-100">
            <div className="flex items-center gap-1.5 font-bold mb-1">
              <Sparkles className="h-3.5 w-3.5 text-blue-600" />
              Proceso Automatizado:
            </div>
            <p className="text-[11px] leading-relaxed text-blue-700">
              Se creará la cuota con el precio de cada clase asignada a los estudiantes activos. Las cuotas ya existentes para este mes/año serán ignoradas para evitar duplicaciones.
            </p>
          </div>

          {/* Selector de Mes */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Mes a Facturar
              </label>
              <select
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                {months.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Año
              </label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                min={2024}
                max={2030}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Día límite de pago */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Día Límite de Vencimiento
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={dueDay}
                onChange={(e) => setDueDay(Number(e.target.value))}
                min={1}
                max={28}
                className="w-24 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <span className="text-xs text-slate-500">
                de cada mes (por ej. día 10 o 25)
              </span>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Emitiendo Cuotas...
                </>
              ) : (
                <>
                  <Layers className="h-4 w-4" />
                  Generar Cuotas
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
