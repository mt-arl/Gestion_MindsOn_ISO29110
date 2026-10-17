'use client';

import React from 'react';
import { 
  BookOpen, 
  X, 
  Users, 
  User, 
  Calendar, 
  MapPin, 
  Globe, 
  MessageCircle, 
  Phone, 
  DollarSign, 
  MessageSquare, 
  Layers,
  GraduationCap,
  Sparkles,
  AlertCircle,
  PauseCircle,
  Clock
} from 'lucide-react';
import { RegularClassSchedule } from '@/actions/schedule';
import { formatCurrency, formatDate } from '@/lib/utils';
import { buildWhatsAppUrl } from '@/lib/ecuador-validators';
import { getBookColorStyles } from '@/lib/book-colors';

interface ClassDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  cls: RegularClassSchedule | null;
}

export function ClassDetailsModal({ isOpen, onClose, cls }: ClassDetailsModalProps) {
  if (!isOpen || !cls) return null;

  const colorStyles = getBookColorStyles(cls.bookRef?.colorTheme, cls.book);
  const bookName = cls.bookRef?.name || (cls.book === 'AMARILLO' ? 'Libro Amarillo' : cls.book === 'ROJO' ? 'Libro Rojo' : 'Libro Azul');
  const isInRecess = cls.status === 'IN_RECESS';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4 rounded-t-2xl">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-black text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-sm">
                {cls.code}
              </span>
              <span className="rounded-lg bg-indigo-50 px-2.5 py-0.5 text-xs font-black text-indigo-700 border border-indigo-200">
                Nivel {cls.level}
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-black border shadow-sm ${colorStyles.badge}`}
              >
                <span className={`h-2 w-2 rounded-full shrink-0 ${colorStyles.indicator}`} />
                {bookName}
              </span>

              {isInRecess && (
                <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-300 shadow-xs">
                  <PauseCircle className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                  Curso en Receso
                </span>
              )}
            </div>

            <h2 className="text-xl font-black tracking-tight text-slate-900">
              {cls.name}
            </h2>

            <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold pt-0.5">
              <span className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                Aula {cls.classroom}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Globe className="h-3.5 w-3.5 text-slate-400" />
                {cls.modality}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* Banner Informativo de Pausa / Receso */}
          {isInRecess && (
            <div className="rounded-2xl bg-slate-100/90 p-4 border border-slate-200 text-xs text-slate-700 space-y-1.5 shadow-xs">
              <p className="font-bold text-slate-900 flex items-center gap-1.5">
                <PauseCircle className="h-4 w-4 text-slate-500" />
                Este curso se encuentra temporalmente en receso {cls.recessStartedAt ? `desde el ${formatDate(cls.recessStartedAt)}` : ''}.
              </p>
              {cls.recessReason && (
                <p className="text-[11px] text-slate-600 font-medium pl-5.5">
                  Motivo: {cls.recessReason}
                </p>
              )}
              <p className="text-[11px] text-slate-500 pl-5.5">
                Las fechas de cobro de los alumnos se actualizarán automáticamente (+1 mes) al reactivar el curso.
              </p>
            </div>
          )}

          {/* Docentes y Horarios Cards */}
          <div className={`grid grid-cols-1 ${cls.speakingTeacher ? 'sm:grid-cols-2' : ''} gap-4`}>
            {/* Unit Class */}
            <div className="rounded-2xl bg-indigo-50/50 p-4 border border-indigo-100/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase text-indigo-700 flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4" />
                  {cls.modality === 'PRESENCIAL' ? 'Docente & Horario de Aula' : 'Unit Class (Presencial / Aula)'}
                </span>
              </div>
              <div className="pt-1">
                <p className="text-sm font-bold text-slate-900">
                  {cls.unitTeacher.name}
                </p>
                <p className="text-xs text-indigo-900 font-medium mt-1">
                  {cls.unitSchedule}
                </p>
                {cls.unitTeacher.phone && (
                  <p className="text-[11px] text-slate-500 mt-1">
                    Contacto: {cls.unitTeacher.phone}
                  </p>
                )}
              </div>
            </div>

            {/* Speaking Class */}
            {cls.speakingTeacher && (
              <div className="rounded-2xl bg-sky-50/50 p-4 border border-sky-100/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-sky-700 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    Speaking Class (Virtual / Zoom)
                  </span>
                </div>
                <div className="pt-1">
                  <p className="text-sm font-bold text-slate-900">
                    {cls.speakingTeacher.name}
                  </p>
                  <p className="text-xs text-sky-900 font-medium mt-1">
                    {cls.speakingSchedule || 'Horario por coordinar'}
                  </p>
                  {cls.speakingTeacher.phone && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Contacto: {cls.speakingTeacher.phone}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Lista de Estudiantes Inscritos */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-2">
                <Users className="h-4 w-4 text-slate-500" />
                Alumnos Matriculados Activos ({cls.students.length})
              </h3>
            </div>

            {cls.students.length === 0 ? (
              <div className="rounded-2xl bg-slate-50 p-8 text-center border border-slate-200/80">
                <AlertCircle className="mx-auto h-8 w-8 mb-2 text-slate-300" />
                <p className="text-sm font-bold text-slate-700">No hay estudiantes asignados a este curso todavía</p>
                <p className="text-xs text-slate-400 mt-0.5">Puedes inscribir alumnos desde el módulo de Estudiantes.</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200/80">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-slate-50/80 border-b border-slate-200/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      <tr>
                        <th className="px-4 py-3">Estudiante</th>
                        <th className="px-4 py-3">WhatsApp / Celular</th>
                        <th className="px-4 py-3">Tutores</th>
                        <th className="px-4 py-3 text-right">Mensualidad</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {cls.students.map((st) => {
                        const rawPhone = st.phone.replace(/[^0-9]/g, '');
                        return (
                          <tr key={st.id} className="hover:bg-slate-50/70 transition-colors">
                            {/* Alumno */}
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2.5">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 font-bold text-xs text-indigo-700">
                                  {st.firstName[0]}{st.lastName[0]}
                                </div>
                                <div>
                                  <div className="font-bold text-slate-900 text-xs">
                                    {st.firstName} {st.lastName}
                                  </div>
                                  <div className="text-[10px] text-slate-400 font-mono">
                                    CI: {st.ci}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Celular y WhatsApp */}
                            <td className="px-4 py-3">
                              <a
                                href={buildWhatsAppUrl(
                                  st.phone,
                                  `Hola ${st.firstName}, te escribimos de MindsOn respecto a tu clase ${cls.name}.`
                                )}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-100/50 shadow-sm"
                              >
                                <MessageCircle className="h-3 w-3 text-emerald-600" />
                                {st.phone}
                              </a>
                            </td>

                            {/* Tutores */}
                            <td className="px-4 py-3 text-[11px] text-slate-600">
                              {st.guardianPhone1 && <div><strong className="text-slate-400 text-[10px]">T1:</strong> {st.guardianPhone1}</div>}
                              {st.guardianPhone2 && <div><strong className="text-slate-400 text-[10px]">T2:</strong> {st.guardianPhone2}</div>}
                              {!st.guardianPhone1 && !st.guardianPhone2 && <span className="text-slate-400">--</span>}
                            </td>

                            {/* Tarifa */}
                            <td className="px-4 py-3 text-right">
                              <span className="font-black text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-100">
                                {formatCurrency(st.monthlyFee)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-6 py-3.5 rounded-b-2xl flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 border border-slate-200 hover:bg-slate-100 transition-colors shadow-sm"
          >
            Cerrar Ficha
          </button>
        </div>
      </div>
    </div>
  );
}
