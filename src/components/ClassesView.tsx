'use client';

import React, { useState, useTransition } from 'react';
import { 
  BookOpen, 
  Plus, 
  Users, 
  Calendar, 
  GraduationCap, 
  Globe, 
  MapPin, 
  Sparkles, 
  Search, 
  UserCheck, 
  Layers, 
  MessageSquare,
  Edit3,
  PauseCircle,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Clock,
  Building
} from 'lucide-react';
import { 
  SerializedClass, 
  SerializedTeacher, 
  pauseClassAction, 
  resumeClassAction 
} from '@/actions/academic';
import { formatDate } from '@/lib/utils';
import { getBookColorStyles } from '@/lib/book-colors';
import { CreateClassModal } from './CreateClassModal';
import { EditClassModal } from './EditClassModal';
import { ClassroomsModal } from './ClassroomsModal';
import { BooksModal } from './BooksModal';

interface ClassesViewProps {
  initialClasses: SerializedClass[];
  teachers: SerializedTeacher[];
}

export function ClassesView({ initialClasses, teachers }: ClassesViewProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isClassroomsModalOpen, setIsClassroomsModalOpen] = useState(false);
  const [isBooksModalOpen, setIsBooksModalOpen] = useState(false);
  const [classToEdit, setClassToEdit] = useState<SerializedClass | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Estados de pausa/reanudación
  const [isPending, startTransition] = useTransition();
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const filteredClasses = initialClasses.filter((c) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query) ||
      c.level.toLowerCase().includes(query) ||
      c.book.toLowerCase().includes(query) ||
      c.classroom.toLowerCase().includes(query) ||
      c.unitTeacher.firstName.toLowerCase().includes(query) ||
      c.unitTeacher.lastName.toLowerCase().includes(query) ||
      (c.speakingTeacher ? c.speakingTeacher.firstName.toLowerCase().includes(query) || c.speakingTeacher.lastName.toLowerCase().includes(query) : false)
    );
  });

  const totalStudents = initialClasses.reduce((acc, c) => acc + c.studentsCount, 0);
  const activeClassesCount = initialClasses.filter((c) => c.status === 'ACTIVE').length;
  const inRecessClassesCount = initialClasses.filter((c) => c.status === 'IN_RECESS').length;

  const handlePauseClass = (cls: SerializedClass) => {
    const reason = window.prompt(
      `¿Deseas pausar el curso "${cls.name}" (${cls.code})?\n\nAl ponerlo en receso, el ciclo contable de sus alumnos quedará congelado y no se generarán moras automáticas.\n\nIngresa el motivo del receso (opcional):`,
      'Vacaciones de invierno / Receso pedagógico'
    );

    if (reason === null) return; // Cancelado por usuario

    setActionMessage(null);
    startTransition(async () => {
      const res = await pauseClassAction(cls.id, reason);
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
      } else {
        setActionMessage({ type: 'error', text: res.message });
      }
      setTimeout(() => setActionMessage(null), 6000);
    });
  };

  const handleResumeClass = (cls: SerializedClass) => {
    const confirmResume = window.confirm(
      `¿Reactivar el curso "${cls.name}" (${cls.code})?\n\nAl reactivar la clase:\n1. El estado del curso volverá a ACTIVO.\n2. La fecha de próximo pago de todos sus alumnos activos se fijará a 1 mes a partir de hoy.\n3. Se generará su nueva cuota pendiente para el nuevo ciclo de clases.\n\n¿Deseas continuar?`
    );

    if (!confirmResume) return;

    setActionMessage(null);
    startTransition(async () => {
      const res = await resumeClassAction(cls.id);
      if (res.success) {
        setActionMessage({ type: 'success', text: res.message });
      } else {
        setActionMessage({ type: 'error', text: res.message });
      }
      setTimeout(() => setActionMessage(null), 6000);
    });
  };

  const booksSummary = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; colorTheme?: string; legacy?: string; count: number }>();
    for (const c of initialClasses) {
      const key = c.bookRef?.id || c.book;
      const name = c.bookRef?.shortName || c.book;
      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name,
          colorTheme: c.bookRef?.colorTheme,
          legacy: c.book,
          count: 0,
        });
      }
      map.get(key)!.count += 1;
    }
    return Array.from(map.values());
  }, [initialClasses]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-950 to-slate-700 bg-clip-text text-transparent">
            Catálogo de Cursos & Grupos
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Estructura curricular, docentes duales y control de recesos / reactivación
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap self-start sm:self-auto">
          <button
            onClick={() => setIsBooksModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all"
          >
            <BookOpen className="h-4 w-4 text-amber-600" />
            Gestionar Libros
          </button>

          <button
            onClick={() => setIsClassroomsModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all"
          >
            <Building className="h-4 w-4 text-indigo-600" />
            Gestionar Aulas
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4.5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/15 hover:from-indigo-700 hover:to-indigo-800 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            Nueva Clase
          </button>
        </div>
      </div>

      {/* Global Alert */}
      {actionMessage && (
        <div
          className={`flex items-center gap-2 rounded-2xl p-4 text-xs font-bold border shadow-sm animate-in fade-in duration-200 ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {actionMessage.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          )}
          <span>{actionMessage.text}</span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Cursos</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{initialClasses.length}</p>
          <div className="mt-1 flex items-center gap-2 text-[11px] font-semibold text-slate-500">
            <span className="text-emerald-700 font-bold">{activeClassesCount} activos</span>
            {inRecessClassesCount > 0 && (
              <span className="text-amber-700 font-bold">• {inRecessClassesCount} en receso</span>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Alumnos Activos</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{totalStudents}</p>
          <p className="mt-1 text-[11px] text-slate-500 font-medium">Matriculados en grupos</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Libros / Niveles</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-100">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-bold flex-wrap">
            {booksSummary.length > 0 ? (
              booksSummary.map((b) => {
                const styles = getBookColorStyles(b.colorTheme, b.legacy);
                return (
                  <span
                    key={b.id}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border shadow-xs ${styles.badge}`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${styles.indicator}`} />
                    {b.name} ({b.count})
                  </span>
                );
              })
            ) : (
              <span className="text-slate-400 text-xs italic">Sin libros registrados</span>
            )}
          </div>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Aulas del Instituto</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              <MapPin className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-xs font-bold text-slate-700">
            Brazil • Japan • Learningland • Virtual
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nivel, libro, aula, profesor..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
          />
        </div>
        <span className="text-xs text-slate-400 font-bold hidden sm:inline">
          {filteredClasses.length} cursos encontrados
        </span>
      </div>

      {/* Grid of Class Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map((cls) => {
          const colorStyles = getBookColorStyles(cls.bookRef?.colorTheme, cls.book);
          const bookDisplayName = cls.bookRef?.shortName || cls.book;
          const isInRecess = cls.status === 'IN_RECESS';

          const bookBorder = isInRecess
            ? 'border-slate-300 border-2 border-dashed bg-slate-50/70 opacity-90 hover:opacity-100 shadow-sm'
            : colorStyles.cardBorder;

          return (
            <div
              key={cls.id}
              className={`group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-6 shadow-sm border-2 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${bookBorder}`}
            >
              <div>
                {/* Header with Level, Book & Recess Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-[10px] font-black text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                        {cls.code}
                      </span>
                      <span className="rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-extrabold text-indigo-700 border border-indigo-200/60">
                        Nivel {cls.level}
                      </span>
                      {isInRecess && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-slate-200 px-2 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-300 shadow-xs">
                          ⏸️ En Receso
                        </span>
                      )}
                    </div>

                    <h3 className="mt-2.5 text-base font-extrabold text-slate-900 leading-snug tracking-tight">
                      {cls.name}
                    </h3>
                  </div>

                  {/* Book Tag */}
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-black tracking-wide border shadow-sm shrink-0 ${colorStyles.badge}`}
                  >
                    <span className={`h-2 w-2 rounded-full ${colorStyles.indicator}`} />
                    {bookDisplayName}
                  </span>
                </div>

                {/* Recess Banner if In Recess */}
                {isInRecess && (
                  <div className="mt-3 rounded-xl bg-slate-100/90 p-3 border border-slate-200 text-xs text-slate-700 space-y-1">
                    <p className="font-bold flex items-center gap-1 text-slate-800">
                      <PauseCircle className="h-3.5 w-3.5 text-slate-500" />
                      Pausado {cls.recessStartedAt ? `desde el ${formatDate(cls.recessStartedAt)}` : 'recientemente'}
                    </p>
                    {cls.recessReason && (
                      <p className="text-[11px] text-slate-600 font-medium">
                        Motivo: {cls.recessReason}
                      </p>
                    )}
                    <p className="text-[10px] text-slate-500 pt-0.5">
                      Cobros y moras de sus alumnos pausados automáticamente.
                    </p>
                  </div>
                )}

                {/* Aula & Modalidad */}
                <div className="mt-3 flex items-center gap-2 flex-wrap text-xs">
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-slate-700 text-[11px]">
                    <MapPin className="h-3 w-3 text-slate-500" />
                    Aula {cls.classroom}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 text-[11px]">
                    <Globe className="h-3 w-3 text-slate-500" />
                    {cls.modality}
                  </span>
                </div>

                {/* Teachers & Schedules breakdown */}
                <div className="mt-4 space-y-3 rounded-xl bg-slate-50/80 p-3.5 border border-slate-100 text-xs">
                  {/* Unit Class */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                      <span className="flex items-center gap-1">
                        <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                        Unit Class:
                      </span>
                      <span className="text-slate-900">{cls.unitTeacher.firstName} {cls.unitTeacher.lastName}</span>
                    </div>
                    <p className="text-[11px] text-slate-500 pl-4">{cls.unitSchedule}</p>
                  </div>

                  {/* Speaking Class */}
                  {cls.speakingTeacher && (
                    <div className="space-y-1 pt-2 border-t border-slate-200/50">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                          Speaking Class:
                        </span>
                        <span className="text-slate-900">{cls.speakingTeacher.firstName} {cls.speakingTeacher.lastName}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 pl-4">{cls.speakingSchedule || 'Virtual'}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer: Students Count & Action Buttons */}
              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 text-xs font-black text-slate-800 bg-slate-100 border border-slate-200 px-3 py-1 rounded-xl shadow-inner">
                  <Users className="h-3.5 w-3.5 text-indigo-600" />
                  {cls.studentsCount} {cls.studentsCount === 1 ? 'alumno' : 'alumnos'}
                </span>

                <div className="flex items-center gap-1.5">
                  {/* Botón Pausar / Reactivar */}
                  {isInRecess ? (
                    <button
                      onClick={() => handleResumeClass(cls)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 text-xs font-bold shadow-sm shadow-emerald-600/20 transition-all active:scale-[0.98] disabled:opacity-50"
                      title="Reactivar curso y recalcular próximo cobro (+1 mes) para sus alumnos"
                    >
                      {isPending ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <PlayCircle className="h-3.5 w-3.5" />
                      )}
                      Reactivar Curso
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePauseClass(cls)}
                      disabled={isPending}
                      className="inline-flex items-center gap-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200/80 px-2.5 py-1.5 text-xs font-bold transition-all active:scale-[0.98] disabled:opacity-50"
                      title="Poner curso en receso (pausa cobros de alumnos)"
                    >
                      <PauseCircle className="h-3.5 w-3.5 text-amber-700" />
                      Pausar Curso
                    </button>
                  )}

                  {/* Botón Editar */}
                  <button
                    onClick={() => setClassToEdit(cls)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all active:scale-[0.98]"
                    title="Editar curso y horarios"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    Editar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Nueva Clase */}
      <CreateClassModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        teachers={teachers}
      />

      {/* Modal Editar Clase */}
      <EditClassModal
        isOpen={!!classToEdit}
        cls={classToEdit}
        onClose={() => setClassToEdit(null)}
        teachers={teachers}
      />

      {/* Modal Gestión de Aulas */}
      <ClassroomsModal
        isOpen={isClassroomsModalOpen}
        onClose={() => setIsClassroomsModalOpen(false)}
      />

      {/* Modal Gestión de Libros */}
      <BooksModal
        isOpen={isBooksModalOpen}
        onClose={() => setIsBooksModalOpen(false)}
      />
    </div>
  );
}
