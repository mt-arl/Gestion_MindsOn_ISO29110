'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  Edit3, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  MessageSquare
} from 'lucide-react';
import { updateClassAction, SerializedClass, SerializedTeacher } from '@/actions/academic';
import { getClassroomsAction, SerializedClassroom } from '@/actions/classrooms';
import { getBooksAction, SerializedBook } from '@/actions/books';
import { getBookForLevel } from '@/lib/utils';
import { 
  ClassModality, 
  CourseLevel, 
  CourseBook 
} from '@prisma/client';

interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  cls: SerializedClass | null;
  teachers: SerializedTeacher[];
}

const DAYS_OF_WEEK = [
  { key: 'Lunes', label: 'Lun' },
  { key: 'Martes', label: 'Mar' },
  { key: 'Miércoles', label: 'Mié' },
  { key: 'Jueves', label: 'Jue' },
  { key: 'Viernes', label: 'Vie' },
  { key: 'Sábado', label: 'Sáb' },
];

function parseScheduleString(scheduleStr?: string, defaultDays: string[] = ['Lunes', 'Miércoles']) {
  if (!scheduleStr) {
    return { days: defaultDays, startTime: '17:00', endTime: '18:30' };
  }

  const foundDays: string[] = [];
  if (/lun/i.test(scheduleStr)) foundDays.push('Lunes');
  if (/mar/i.test(scheduleStr)) foundDays.push('Martes');
  if (/mi[eé]/i.test(scheduleStr)) foundDays.push('Miércoles');
  if (/jue/i.test(scheduleStr)) foundDays.push('Jueves');
  if (/vie/i.test(scheduleStr)) foundDays.push('Viernes');
  if (/s[aá]b/i.test(scheduleStr)) foundDays.push('Sábado');

  const timeMatch = scheduleStr.match(/(\d{1,2}:\d{2})\s*[-–a]\s*(\d{1,2}:\d{2})/);
  const startTime = timeMatch ? timeMatch[1].padStart(5, '0') : '17:00';
  const endTime = timeMatch ? timeMatch[2].padStart(5, '0') : '18:30';

  return {
    days: foundDays.length > 0 ? foundDays : defaultDays,
    startTime,
    endTime,
  };
}

export function EditClassModal({ isOpen, onClose, cls, teachers }: EditClassModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [classrooms, setClassrooms] = useState<SerializedClassroom[]>([]);
  const [selectedClassroomId, setSelectedClassroomId] = useState<string>('');

  const [books, setBooks] = useState<SerializedBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>('');

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [level, setLevel] = useState<CourseLevel>(CourseLevel.INTRO_A);
  const [book, setBook] = useState<CourseBook>(CourseBook.AMARILLO);
  const [modality, setModality] = useState<ClassModality>(ClassModality.PRESENCIAL);
  const [unitTeacherId, setUnitTeacherId] = useState('');
  const [speakingTeacherId, setSpeakingTeacherId] = useState('');

  // Horarios Estructurados
  const [unitDays, setUnitDays] = useState<string[]>(['Lunes', 'Miércoles']);
  const [unitStartTime, setUnitStartTime] = useState('17:00');
  const [unitEndTime, setUnitEndTime] = useState('18:30');

  const [speakingDays, setSpeakingDays] = useState<string[]>(['Viernes']);
  const [speakingStartTime, setSpeakingStartTime] = useState('17:00');
  const [speakingEndTime, setSpeakingEndTime] = useState('18:30');

  useEffect(() => {
    if (isOpen) {
      getClassroomsAction(false).then((data) => {
        setClassrooms(data);
        if (cls) {
          const match = data.find((cr) => cr.id === cls.classroomId || cr.name === cls.classroom);
          if (match) {
            setSelectedClassroomId(match.id);
          } else if (cls.classroomId) {
            setSelectedClassroomId(cls.classroomId);
          } else if (data.length > 0) {
            setSelectedClassroomId(data[0].id);
          }
        }
      });
      getBooksAction(false).then((data) => {
        setBooks(data);
        if (cls) {
          if (cls.bookId) {
            setSelectedBookId(cls.bookId);
          } else {
            const match = data.find((b) =>
              b.shortName.toLowerCase().includes(cls.book.toLowerCase()) ||
              b.name.toLowerCase().includes(cls.book.toLowerCase())
            );
            if (match) setSelectedBookId(match.id);
          }
        }
      });
    }
  }, [isOpen, cls]);

  useEffect(() => {
    if (cls) {
      setCode(cls.code || '');
      setName(cls.name || '');
      setLevel(cls.level as CourseLevel || CourseLevel.INTRO_A);
      setBook(cls.book as CourseBook || CourseBook.AMARILLO);
      if (cls.bookId) {
        setSelectedBookId(cls.bookId);
      } else if (books.length > 0) {
        const match = books.find((b) =>
          b.shortName.toLowerCase().includes(cls.book.toLowerCase()) ||
          b.name.toLowerCase().includes(cls.book.toLowerCase())
        );
        if (match) setSelectedBookId(match.id);
      }
      setModality(cls.modality as ClassModality || ClassModality.PRESENCIAL);
      if (cls.classroomId) {
        setSelectedClassroomId(cls.classroomId);
      }
      setUnitTeacherId(cls.unitTeacherId || teachers[0]?.id || '');
      setSpeakingTeacherId(cls.speakingTeacherId || teachers[1]?.id || teachers[0]?.id || '');

      const parsedUnit = parseScheduleString(cls.unitSchedule, ['Lunes', 'Miércoles']);
      setUnitDays(parsedUnit.days);
      setUnitStartTime(parsedUnit.startTime);
      setUnitEndTime(parsedUnit.endTime);

      const parsedSpeaking = parseScheduleString(cls.speakingSchedule || undefined, ['Viernes']);
      setSpeakingDays(parsedSpeaking.days);
      setSpeakingStartTime(parsedSpeaking.startTime);
      setSpeakingEndTime(parsedSpeaking.endTime);

      setError(null);
      setSuccessMsg(null);
    }
  }, [cls, teachers, books]);

  if (!isOpen || !cls) return null;

  const toggleUnitDay = (dayKey: string) => {
    setUnitDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  const toggleSpeakingDay = (dayKey: string) => {
    setSpeakingDays((prev) =>
      prev.includes(dayKey) ? prev.filter((d) => d !== dayKey) : [...prev, dayKey]
    );
  };

  const handleLevelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedLevel = e.target.value as CourseLevel;
    const autoBook = getBookForLevel(selectedLevel);
    setLevel(selectedLevel);
    setBook(autoBook as CourseBook);
    if (books.length > 0) {
      const match = books.find((b) =>
        b.shortName.toLowerCase().includes(autoBook.toLowerCase()) ||
        b.name.toLowerCase().includes(autoBook.toLowerCase())
      );
      if (match) setSelectedBookId(match.id);
    }
  };

  const isPresencial = modality === ClassModality.PRESENCIAL;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!unitTeacherId) {
      setError('Debes asignar al Profesor de Unit Class.');
      return;
    }

    if (!isPresencial && !speakingTeacherId) {
      setError('Debes asignar al Profesor de Speaking para cursos virtuales o híbridos.');
      return;
    }

    if (unitDays.length === 0) {
      setError('Debes seleccionar al menos un día para la Unit Class.');
      return;
    }

    if (!isPresencial && speakingDays.length === 0) {
      setError('Debes seleccionar al menos un día para la Speaking Class.');
      return;
    }

    const unitScheduleFormatted = `${unitDays.join(' y ')} ${unitStartTime} - ${unitEndTime}`;
    const speakingScheduleFormatted = !isPresencial && speakingDays.length > 0
      ? `${speakingDays.join(' y ')} ${speakingStartTime} - ${speakingEndTime} (Virtual)`
      : null;

    startTransition(async () => {
      const res = await updateClassAction(cls.id, {
        code,
        name,
        level,
        book,
        bookId: selectedBookId || null,
        modality,
        classroomId: selectedClassroomId,
        unitTeacherId,
        speakingTeacherId: !isPresencial ? speakingTeacherId : null,
        unitSchedule: unitScheduleFormatted,
        speakingSchedule: speakingScheduleFormatted,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
        }, 1500);
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Editar Datos del Curso / Grupo
              </h3>
              <p className="text-xs text-slate-500">
                Modificar nivel, libro, aula, docentes y franjas horarias
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs font-semibold text-rose-700 border border-rose-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-xs font-semibold text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Código y Nombre */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código Único *
              </label>
              <input
                type="text"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-900 uppercase focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombre Descriptivo *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          {/* Nivel, Libro y Aula */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nivel del Curso *
              </label>
              <select
                value={level}
                onChange={handleLevelChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              >
                <option value={CourseLevel.INTRO_A}>Intro A</option>
                <option value={CourseLevel.INTRO_B}>Intro B</option>
                <option value={CourseLevel.L1A}>Level 1A (L1A)</option>
                <option value={CourseLevel.L1B}>Level 1B (L1B)</option>
                <option value={CourseLevel.L2A}>Level 2A (L2A)</option>
                <option value={CourseLevel.L2B}>Level 2B (L2B)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Libro / Material *
              </label>
              <select
                value={selectedBookId}
                onChange={(e) => {
                  const bId = e.target.value;
                  setSelectedBookId(bId);
                  const chosen = books.find((b) => b.id === bId);
                  if (chosen) {
                    const s = chosen.shortName.toLowerCase();
                    if (s.includes('amarillo')) setBook(CourseBook.AMARILLO);
                    else if (s.includes('rojo')) setBook(CourseBook.ROJO);
                    else if (s.includes('azul')) setBook(CourseBook.AZUL);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              >
                {books.length > 0 ? (
                  books.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} {b.levelsLabel ? `(${b.levelsLabel})` : ''}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="">🟡 Amarillo (Intro A/B)</option>
                    <option value="">🔴 Rojo (L1A/B)</option>
                    <option value="">🔵 Azul (L2A/B)</option>
                  </>
                )}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Aula Asignada *
              </label>
              <select
                value={selectedClassroomId}
                onChange={(e) => setSelectedClassroomId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isVirtual ? '(Virtual)' : `(Cap: ${c.capacity})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Modalidad */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Modalidad de Enseñanza *
            </label>
            <select
              value={modality}
              onChange={(e) => setModality(e.target.value as ClassModality)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
            >
              <option value={ClassModality.PRESENCIAL}>Presencial (En Instituto)</option>
              <option value={ClassModality.VIRTUAL}>Virtual (En Línea / Zoom)</option>
              <option value={ClassModality.HIBRIDA}>Híbrida (Presencial + Virtual)</option>
            </select>
          </div>

          {/* Asignación de Profesores */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              Docentes Asignados
            </h4>
            
            <div className={`grid grid-cols-1 ${!isPresencial ? 'sm:grid-cols-2' : ''} gap-3`}>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Profesor Unit Class *
                </label>
                <select
                  required
                  value={unitTeacherId}
                  onChange={(e) => setUnitTeacherId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="">-- Seleccionar Profesor --</option>
                  {teachers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.firstName} {t.lastName} ({t.ci})
                    </option>
                  ))}
                </select>
              </div>

              {!isPresencial && (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Profesor Speaking *
                  </label>
                  <select
                    required={!isPresencial}
                    value={speakingTeacherId}
                    onChange={(e) => setSpeakingTeacherId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="">-- Seleccionar Profesor --</option>
                    {teachers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName} ({t.ci})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {isPresencial && (
              <p className="text-[11px] text-slate-400 italic">
                * Los cursos presenciales son impartidos por el docente de Unit Class en el aula asignada y no requieren docente de Speaking virtual separado.
              </p>
            )}
          </div>

          {/* Horarios Estructurados */}
          <div className="space-y-4 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              Horarios de Clase
            </h4>

            {/* A. Horario Unit Class */}
            <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-200/70 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <BookOpen className="h-3.5 w-3.5 text-indigo-600" />
                  Horario Unit Class *
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {isPresencial ? 'Clases Presenciales en Aula' : 'Clases Teóricas / Presenciales'}
                </span>
              </div>

              {/* Selector de Días Unit */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                  Días de Clase:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {DAYS_OF_WEEK.map((day) => {
                    const isSelected = unitDays.includes(day.key);
                    return (
                      <button
                        type="button"
                        key={day.key}
                        onClick={() => toggleUnitDay(day.key)}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
                          isSelected
                            ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 scale-[1.02]'
                            : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                        }`}
                      >
                        {day.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Franja Horaria Unit */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hora Inicio:
                  </label>
                  <input
                    type="time"
                    value={unitStartTime}
                    onChange={(e) => setUnitStartTime(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Hora Fin:
                  </label>
                  <input
                    type="time"
                    value={unitEndTime}
                    onChange={(e) => setUnitEndTime(e.target.value)}
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            </div>

            {/* B. Horario Speaking Class (Solo Virtual / Híbrida) */}
            {!isPresencial && (
              <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-200/70 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare className="h-3.5 w-3.5 text-blue-600" />
                    Horario Speaking Class *
                  </span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    Sesión de Conversación / Virtual
                  </span>
                </div>

                {/* Selector de Días Speaking */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1.5">
                    Días de Speaking:
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {DAYS_OF_WEEK.map((day) => {
                      const isSelected = speakingDays.includes(day.key);
                      return (
                        <button
                          type="button"
                          key={day.key}
                          onClick={() => toggleSpeakingDay(day.key)}
                          className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all duration-150 ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm shadow-blue-600/20 scale-[1.02]'
                              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          {day.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Franja Horaria Speaking */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Hora Inicio:
                    </label>
                    <input
                      type="time"
                      value={speakingStartTime}
                      onChange={(e) => setSpeakingStartTime(e.target.value)}
                      required={!isPresencial}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Hora Fin:
                    </label>
                    <input
                      type="time"
                      value={speakingEndTime}
                      onChange={(e) => setSpeakingEndTime(e.target.value)}
                      required={!isPresencial}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
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
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Actualizando...
                </>
              ) : (
                <>
                  <Edit3 className="h-4 w-4" />
                  Guardar Cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
