'use client';

import React, { useState, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  Sparkles, 
  Filter, 
  Clock, 
  MapPin, 
  User, 
  Users, 
  BookOpen, 
  MessageSquare,
  DollarSign,
  Grid,
  LayoutList,
  ChevronLeft,
  ChevronRight,
  Globe,
  Building
} from 'lucide-react';
import { 
  WeeklyScheduleData, 
  RegularClassSchedule, 
  PrivateClassSchedule 
} from '@/actions/schedule';
import { SerializedTeacher, SerializedStudent } from '@/actions/academic';
import { 
  CALENDAR_DAYS, 
  START_HOUR, 
  END_HOUR, 
  TOTAL_HOURS, 
  CalendarEvent, 
  PositionedCalendarEvent,
  getWeekDays,
  formatWeekTitle,
  generateWeeklyCalendarEvents,
  layoutDayEvents
} from '@/lib/calendar-utils';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CreatePrivateClassModal } from './CreatePrivateClassModal';
import { ClassroomsModal } from './ClassroomsModal';
import { ClassDetailsModal } from './ClassDetailsModal';
import { PrivateClassDetailsModal } from './PrivateClassDetailsModal';

interface ScheduleViewProps {
  scheduleData: WeeklyScheduleData;
  teachers: SerializedTeacher[];
  students: SerializedStudent[];
}

const HOUR_HEIGHT = 68; // Altura en píxeles de cada franja de 1 hora

export function ScheduleView({ scheduleData, teachers, students }: ScheduleViewProps) {
  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [isPrivateModalOpen, setIsPrivateModalOpen] = useState(false);
  const [isClassroomsModalOpen, setIsClassroomsModalOpen] = useState(false);
  const [selectedClassForDetails, setSelectedClassForDetails] = useState<RegularClassSchedule | null>(null);
  const [selectedPrivateForDetails, setSelectedPrivateForDetails] = useState<PrivateClassSchedule | null>(null);

  const [filterBook, setFilterBook] = useState<'ALL' | 'AMARILLO' | 'ROJO' | 'AZUL' | 'PRIVATE'>('ALL');
  const [filterClassroom, setFilterClassroom] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'GRID' | 'LIST'>('GRID');

  // Navegación Semanal
  const prevWeek = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() - 7);
      return d;
    });
  };

  const nextWeek = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev);
      d.setDate(d.getDate() + 7);
      return d;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  // 6 días de la semana visible
  const weekDays = useMemo(() => getWeekDays(currentDate), [currentDate]);

  // Título dinámico de Mes y Año
  const monthYearTitle = useMemo(() => formatWeekTitle(weekDays), [weekDays]);

  // Generar eventos posicionados para la semana activa
  const calendarEvents = useMemo(() => {
    return generateWeeklyCalendarEvents(
      scheduleData.regularClasses,
      scheduleData.privateClasses,
      weekDays,
      filterBook,
      filterClassroom
    );
  }, [scheduleData, weekDays, filterBook, filterClassroom]);

  // Agrupar eventos por día y calcular posicionamiento side-by-side
  const eventsByDay = useMemo(() => {
    const map = new Map<string, PositionedCalendarEvent[]>();
    for (const wd of weekDays) {
      const rawEventsForDay = calendarEvents.filter((ev) => ev.dayKey === wd.dayKey);
      const positioned = layoutDayEvents(rawEventsForDay, HOUR_HEIGHT);
      map.set(wd.dayKey, positioned);
    }
    return map;
  }, [calendarEvents, weekDays]);

  // Generador de array de horas: [8, 9, 10, ... 21]
  const hourSlots = useMemo(() => {
    const slots = [];
    for (let h = START_HOUR; h <= END_HOUR; h++) {
      slots.push(h);
    }
    return slots;
  }, []);

  return (
    <div className="space-y-6">
      {/* 1. Header Bar: Navigation & Controls */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between bg-white p-5 rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-slate-200/80">
        
        {/* Month / Year Title & Subtitle */}
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 capitalize tracking-tight">
              {monthYearTitle}
            </h2>
            
            {/* Pill Navigation Controls */}
            <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200/60 shadow-xs">
              <button
                onClick={prevWeek}
                title="Semana anterior"
                className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <button
                onClick={goToToday}
                className="rounded-lg px-3 py-1 text-xs font-bold text-slate-700 hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all"
              >
                Hoy
              </button>

              <button
                onClick={nextWeek}
                title="Semana siguiente"
                className="rounded-lg p-1.5 text-slate-600 hover:bg-white hover:text-slate-900 hover:shadow-xs transition-all"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>

          <p className="text-xs text-slate-500 font-semibold mt-1">
            Semana del {formatDate(weekDays[0].fullDate)} al {formatDate(weekDays[5].fullDate)}
          </p>
        </div>

        {/* View Mode & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Switch View Mode */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/60">
            <button
              onClick={() => setViewMode('GRID')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'GRID'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Grid className="h-3.5 w-3.5" />
              Grilla Semanal
            </button>
            <button
              onClick={() => setViewMode('LIST')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all ${
                viewMode === 'LIST'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LayoutList className="h-3.5 w-3.5" />
              Lista
            </button>
          </div>

          <button
            onClick={() => setIsClassroomsModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-xs hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all"
          >
            <Building className="h-4 w-4 text-indigo-600" />
            Gestionar Aulas
          </button>

          <button
            onClick={() => setIsPrivateModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 active:scale-[0.98] transition-all duration-200"
          >
            <Sparkles className="h-4 w-4" />
            + Agendar Clase Privada
          </button>
        </div>
      </div>

      {/* 2. Toolbar: Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-slate-200/80">
        {/* Book / Type Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setFilterBook('ALL')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              filterBook === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
            }`}
          >
            Todos ({calendarEvents.length})
          </button>

          <button
            onClick={() => setFilterBook('AMARILLO')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold border transition-all ${
              filterBook === 'AMARILLO'
                ? 'bg-amber-500 text-white border-amber-500 shadow-sm shadow-amber-500/20'
                : 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
            }`}
          >
            🟡 Libro Amarillo (Intro A/B)
          </button>

          <button
            onClick={() => setFilterBook('ROJO')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold border transition-all ${
              filterBook === 'ROJO'
                ? 'bg-rose-500 text-white border-rose-500 shadow-sm shadow-rose-500/20'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            🔴 Libro Rojo (L1A/B)
          </button>

          <button
            onClick={() => setFilterBook('AZUL')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold border transition-all ${
              filterBook === 'AZUL'
                ? 'bg-sky-500 text-white border-sky-500 shadow-sm shadow-sky-500/20'
                : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
            }`}
          >
            🔵 Libro Azul (L2A/B)
          </button>

          <button
            onClick={() => setFilterBook('PRIVATE')}
            className={`rounded-xl px-3.5 py-1.5 text-xs font-bold border transition-all ${
              filterBook === 'PRIVATE'
                ? 'bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-600/20'
                : 'bg-purple-50 text-purple-800 border-purple-200 hover:bg-purple-100'
            }`}
          >
            🟣 Clases Privadas
          </button>
        </div>

        {/* Classroom filter */}
        <div className="flex items-center gap-2 shrink-0">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={filterClassroom}
            onChange={(e) => setFilterClassroom(e.target.value)}
            className="rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          >
            <option value="ALL">Todas las Aulas</option>
            <option value="BRAZIL">Aula Brazil</option>
            <option value="JAPAN">Aula Japan</option>
            <option value="LEARNINGLAND">Aula Learningland</option>
            <option value="VIRTUAL">Aula Virtual (Zoom)</option>
          </select>
        </div>
      </div>

      {/* 3. VIEW MODE 1: WEEKLY CALENDAR GRID */}
      {viewMode === 'GRID' ? (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200/90">
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              
              {/* Header Days Row: Strict Alignment with 64px + 6 columns */}
              <div className="grid grid-cols-[64px_repeat(6,1fr)] border-b border-slate-200 bg-slate-50/95 sticky top-0 z-30 shadow-xs">
                {/* Clock Corner */}
                <div className="p-3 text-slate-400 border-r border-slate-200 flex items-center justify-center">
                  <Clock className="h-4 w-4" />
                </div>

                {/* Day Header Cells */}
                {weekDays.map((wd) => {
                  const dayEvents = eventsByDay.get(wd.dayKey) || [];
                  const count = dayEvents.length;

                  return (
                    <div 
                      key={wd.dayKey} 
                      className={`py-2.5 px-3 border-r border-slate-200/70 last:border-r-0 flex items-center justify-between transition-colors ${
                        wd.isToday ? 'bg-indigo-50/60' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Day Number Circle */}
                        {wd.isToday ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-white font-black text-xs shadow-sm shadow-indigo-600/30 ring-4 ring-indigo-100">
                            {wd.dayNumber}
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center text-slate-800 font-extrabold text-sm">
                            {wd.dayNumber}
                          </div>
                        )}

                        <div>
                          <div className={`text-[11px] font-black uppercase tracking-wider ${
                            wd.isToday ? 'text-indigo-700' : 'text-slate-500'
                          }`}>
                            {wd.dayShort}
                          </div>
                        </div>
                      </div>

                      {/* Event count badge */}
                      {count > 0 && (
                        <span className={`rounded-full px-2 py-0.2 text-[10px] font-black ${
                          wd.isToday 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-slate-200/80 text-slate-700'
                        }`}>
                          {count}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Grid Body: Strict Alignment with 64px + 6 columns */}
              <div className="relative grid grid-cols-[64px_repeat(6,1fr)] bg-white">
                
                {/* Column 0: Hours Labels */}
                <div className="border-r border-slate-200/80 select-none bg-slate-50/30">
                  {hourSlots.map((h) => (
                    <div
                      key={h}
                      style={{ height: `${HOUR_HEIGHT}px` }}
                      className="border-b border-slate-100 pr-2 pt-1 text-right text-[11px] font-bold text-slate-400"
                    >
                      {h < 10 ? `0${h}:00` : `${h}:00`}
                    </div>
                  ))}
                </div>

                {/* Day Columns (1 to 6) */}
                {weekDays.map((wd) => {
                  const dayEvents = eventsByDay.get(wd.dayKey) || [];

                  return (
                    <div
                      key={wd.dayKey}
                      className={`relative border-r border-slate-200/60 last:border-r-0 ${
                        wd.isToday ? 'bg-indigo-50/15' : ''
                      }`}
                      style={{ height: `${(TOTAL_HOURS + 1) * HOUR_HEIGHT}px` }}
                    >
                      {/* Horizontal hour grid lines */}
                      {hourSlots.map((h) => (
                        <div
                          key={h}
                          style={{ height: `${HOUR_HEIGHT}px` }}
                          className="border-b border-slate-100/90 pointer-events-none"
                        />
                      ))}

                      {/* Positioned Events for this Day */}
                      {dayEvents.map((ev) => {
                        const widthPercent = 100 / ev.totalCols;
                        const leftPercent = ev.colIndex * widthPercent;

                        const style: React.CSSProperties = {
                          top: `${ev.top}px`,
                          height: `${ev.height}px`,
                          left: `calc(${leftPercent}% + 2px)`,
                          width: `calc(${widthPercent}% - 4px)`,
                          position: 'absolute',
                          zIndex: 10 + ev.colIndex,
                        };

                        const isNarrow = ev.totalCols > 1;

                        // Estilo según libro / tipo / receso
                        let colorStyles = '';
                        if (ev.isRecess) {
                          colorStyles = 'bg-slate-100/95 border-l-4 border-slate-400 text-slate-600 opacity-75 hover:opacity-100 transition-opacity border-dashed shadow-xs';
                        } else if (ev.type === 'PRIVATE') {
                          colorStyles = 'bg-purple-100/95 border-l-4 border-purple-500 text-purple-950 hover:bg-purple-200/95 shadow-purple-500/10';
                        } else if (ev.book === 'AMARILLO') {
                          colorStyles = 'bg-amber-100/95 border-l-4 border-amber-500 text-amber-950 hover:bg-amber-200/95 shadow-amber-500/10';
                        } else if (ev.book === 'ROJO') {
                          colorStyles = 'bg-rose-100/95 border-l-4 border-rose-500 text-rose-950 hover:bg-rose-200/95 shadow-rose-500/10';
                        } else {
                          colorStyles = 'bg-sky-100/95 border-l-4 border-sky-500 text-sky-950 hover:bg-sky-200/95 shadow-sky-500/10';
                        }

                        return (
                          <div
                            key={ev.eventKey}
                            onClick={() => {
                              if (ev.rawClass) setSelectedClassForDetails(ev.rawClass);
                              else if (ev.rawPrivateClass) setSelectedPrivateForDetails(ev.rawPrivateClass);
                            }}
                            style={style}
                            className={`flex flex-col justify-between overflow-hidden rounded-xl p-1.5 sm:p-2 text-left text-xs shadow-sm transition-all duration-150 hover:scale-[1.02] hover:shadow-md hover:z-30 cursor-pointer ${colorStyles}`}
                            title={`${ev.title} • Aula ${ev.classroom} • ${ev.startTime} - ${ev.endTime}`}
                          >
                            <div className="space-y-0.5">
                              {/* Header del bloque */}
                              <div className="flex items-center justify-between gap-1 leading-tight">
                                <span className={`font-black truncate ${isNarrow ? 'text-[10px]' : 'text-[11px]'}`}>
                                  {ev.type === 'PRIVATE' ? ev.title : ev.code}
                                </span>
                                <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-wider px-1 py-0.2 rounded shadow-xs shrink-0 ${
                                  ev.isRecess ? 'bg-slate-200 text-slate-800' : 'bg-white/85'
                                }`}>
                                  {ev.isRecess 
                                    ? '⏸️' 
                                    : ev.type === 'SPEAKING' 
                                    ? 'Speaking' 
                                    : ev.type === 'PRIVATE' 
                                    ? 'Privada' 
                                    : 'Unit'}
                                </span>
                              </div>

                              {/* Nombre del curso */}
                              {ev.type !== 'PRIVATE' && (
                                <p className={`font-bold truncate leading-tight ${isNarrow ? 'text-[10px]' : 'text-[11px]'}`}>
                                  {ev.title}
                                </p>
                              )}

                              {/* Aula y Docente */}
                              <p className={`opacity-85 truncate ${isNarrow ? 'text-[9px]' : 'text-[10px]'}`}>
                                📍 {ev.classroom} {isNarrow ? '' : `• ${ev.teacherName}`}
                              </p>
                            </div>

                            {/* Footer del bloque con hora y alumnos/monto */}
                            <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-extrabold pt-1 border-t border-black/10">
                              <span className="flex items-center gap-0.5 truncate">
                                <Clock className="h-2.5 w-2.5 opacity-70 shrink-0" />
                                {ev.startTime}
                              </span>

                              {ev.type === 'PRIVATE' ? (
                                <span className="bg-white/90 px-1 py-0.2 rounded text-purple-900 font-black text-[9px]">
                                  {formatCurrency(ev.chargeAmount || 0)}
                                </span>
                              ) : (
                                <span className="bg-white/85 px-1 py-0.2 rounded font-black flex items-center gap-0.5 text-[9px]">
                                  <Users className="h-2.5 w-2.5 opacity-70 shrink-0" />
                                  {ev.studentsCount}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* VIEW MODE 2: CARD / LIST VIEW */
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {scheduleData.regularClasses.map((cls) => {
              const isAmarillo = cls.book === 'AMARILLO';
              const isRojo = cls.book === 'ROJO';
              const isAzul = cls.book === 'AZUL';

              const cardClasses = isAmarillo
                ? 'bg-amber-50/70 border-l-4 border-amber-500 text-amber-950'
                : isRojo
                ? 'bg-rose-50/70 border-l-4 border-rose-500 text-rose-950'
                : 'bg-sky-50/70 border-l-4 border-sky-500 text-sky-950';

              return (
                <div
                  key={cls.id}
                  onClick={() => setSelectedClassForDetails(cls)}
                  className={`rounded-2xl p-5 shadow-sm border border-slate-200/80 transition-all hover:scale-[1.01] hover:shadow-md cursor-pointer ${cardClasses}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-[10px] font-black bg-white/80 px-2 py-0.5 rounded shadow-sm">
                        {cls.code}
                      </span>
                      <h3 className="mt-2 text-base font-extrabold tracking-tight">
                        {cls.name}
                      </h3>
                    </div>
                    <span className="rounded-lg bg-white/90 px-2 py-0.5 text-[10px] font-black shadow-sm shrink-0">
                      Aula {cls.classroom}
                    </span>
                  </div>

                  <div className="mt-3.5 space-y-2 rounded-xl bg-white/80 p-3 text-xs shadow-inner">
                    <p className="font-bold text-slate-800">
                      Unit Class: <span className="font-medium text-slate-600">{cls.unitSchedule}</span>
                    </p>
                    <p className="font-bold text-slate-800 pt-1 border-t border-slate-100">
                      Speaking: <span className="font-medium text-slate-600">{cls.speakingSchedule}</span>
                    </p>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs font-bold pt-1">
                    <span className="text-slate-600">
                      {cls.studentsCount} alumnos matriculados
                    </span>
                    <span className="text-indigo-600 inline-flex items-center gap-0.5">
                      Ver Ficha <ChevronRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Ficha Completa del Curso */}
      <ClassDetailsModal
        isOpen={!!selectedClassForDetails}
        cls={selectedClassForDetails}
        onClose={() => setSelectedClassForDetails(null)}
      />

      {/* Modal Detalle de Clase Privada */}
      <PrivateClassDetailsModal
        isOpen={!!selectedPrivateForDetails}
        privateClass={selectedPrivateForDetails}
        onClose={() => setSelectedPrivateForDetails(null)}
      />

      {/* Modal Crear Clase Privada */}
      <CreatePrivateClassModal
        isOpen={isPrivateModalOpen}
        onClose={() => setIsPrivateModalOpen(false)}
        teachers={teachers}
        students={students}
      />

      {/* Modal Gestión de Aulas */}
      <ClassroomsModal
        isOpen={isClassroomsModalOpen}
        onClose={() => setIsClassroomsModalOpen(false)}
      />
    </div>
  );
}
