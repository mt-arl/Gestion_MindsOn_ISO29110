'use client';

import React, { useTransition } from 'react';
import { 
  Sparkles, 
  X, 
  User, 
  Calendar as CalendarIcon, 
  Clock, 
  MapPin, 
  DollarSign, 
  CheckCircle2, 
  XCircle, 
  Loader2, 
  AlertCircle,
  BookOpen
} from 'lucide-react';
import { PrivateClassSchedule, updatePrivateClassStatusAction } from '@/actions/schedule';
import { formatCurrency, formatDate } from '@/lib/utils';
import { getBookColorStyles } from '@/lib/book-colors';
import { PrivateClassStatus } from '@prisma/client';

interface PrivateClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  privateClass: PrivateClassSchedule | null;
}

export function PrivateClassDetailsModal({
  isOpen,
  onClose,
  privateClass,
}: PrivateClassDetailsModalProps) {
  const [isPending, startTransition] = useTransition();

  if (!isOpen || !privateClass) return null;

  const handleStatusChange = (status: PrivateClassStatus) => {
    startTransition(async () => {
      await updatePrivateClassStatusAction(privateClass.id, status);
      onClose();
    });
  };

  const isCompletada = privateClass.status === 'COMPLETADA';
  const isCancelada = privateClass.status === 'CANCELADA';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-purple-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-600 text-white shadow-md shadow-purple-600/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-purple-700">
                Sesión Privada 1 a 1
              </span>
              <h3 className="text-lg font-black tracking-tight text-slate-900">
                {privateClass.studentName}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          
          {/* Tarjeta de Resumen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Fecha & Horario</span>
              <p className="text-xs font-black text-slate-800 mt-1 flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5 text-purple-600" />
                {formatDate(privateClass.date)}
              </p>
              <p className="text-[11px] text-slate-600 font-semibold mt-0.5 flex items-center gap-1">
                <Clock className="h-3 w-3 text-purple-600" />
                {privateClass.startTime} - {privateClass.endTime}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 border border-slate-200/70">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Monto Acordado</span>
              <p className="text-base font-black text-purple-700 mt-1">
                {formatCurrency(privateClass.chargeAmount)}
              </p>
              <span className={`inline-flex items-center rounded-md px-2 py-0.2 text-[9px] font-black uppercase mt-0.5 ${
                isCompletada
                  ? 'bg-emerald-100 text-emerald-800'
                  : isCancelada
                  ? 'bg-rose-100 text-rose-800'
                  : 'bg-purple-100 text-purple-800'
              }`}>
                {privateClass.status}
              </span>
            </div>
          </div>

          {/* Docente y Aula */}
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <User className="h-3.5 w-3.5 text-purple-600" />
                Docente Asignado:
              </span>
              <strong className="text-slate-900 font-bold">{privateClass.teacherName}</strong>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-semibold flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-purple-600" />
                Aula / Espacio:
              </span>
              <strong className="text-slate-900 font-bold">Aula {privateClass.classroom}</strong>
            </div>

            {privateClass.bookRef && (() => {
              const bookStyles = getBookColorStyles(privateClass.bookRef.colorTheme);
              return (
                <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 font-semibold flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5 text-purple-600" />
                    Libro / Material:
                  </span>
                  <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-bold border shadow-xs ${bookStyles.badge}`}>
                    <span className={`h-2 w-2 rounded-full ${bookStyles.indicator}`} />
                    {privateClass.bookRef.name}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* Tema / Observaciones */}
          <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200/70">
            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
              Tema / Objetivo de la Sesión
            </span>
            <p className="text-slate-700 font-medium leading-relaxed">
              {privateClass.topic}
            </p>
          </div>

          {/* Action Buttons: Status */}
          <div className="pt-2 flex items-center justify-between gap-2">
            {privateClass.status === 'PROGRAMADA' ? (
              <div className="flex items-center gap-2 w-full">
                <button
                  type="button"
                  onClick={() => handleStatusChange(PrivateClassStatus.COMPLETADA)}
                  disabled={isPending}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-emerald-600/20 hover:bg-emerald-700 transition-all disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
                  Marcar como Realizada
                </button>

                <button
                  type="button"
                  onClick={() => handleStatusChange(PrivateClassStatus.CANCELADA)}
                  disabled={isPending}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 border border-rose-200 hover:bg-rose-100 transition-all disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancelar
                </button>
              </div>
            ) : (
              <div className="w-full text-center py-1 font-bold text-slate-400 text-xs">
                Esta clase figura como <strong>{privateClass.status}</strong>.
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-3 rounded-b-2xl flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white px-4 py-1.5 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
