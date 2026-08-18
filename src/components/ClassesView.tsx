'use client';

import React, { useState } from 'react';
import { 
  BookOpen, 
  Plus, 
  Users, 
  Calendar, 
  DollarSign, 
  GraduationCap, 
  Globe, 
  MapPin, 
  Sparkles,
  Search,
  UserCheck
} from 'lucide-react';
import { SerializedClass, SerializedTeacher } from '@/actions/academic';
import { formatCurrency } from '@/lib/utils';
import { CreateClassModal } from './CreateClassModal';

interface ClassesViewProps {
  initialClasses: SerializedClass[];
  teachers: SerializedTeacher[];
}

export function ClassesView({ initialClasses, teachers }: ClassesViewProps) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredClasses = initialClasses.filter((c) => {
    if (!searchTerm.trim()) return true;
    const query = searchTerm.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      c.code.toLowerCase().includes(query) ||
      c.primaryTeacher.firstName.toLowerCase().includes(query) ||
      c.primaryTeacher.lastName.toLowerCase().includes(query)
    );
  });

  const totalStudents = initialClasses.reduce((acc, c) => acc + c.studentsCount, 0);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-950 to-slate-700 bg-clip-text text-transparent">
            Catálogo de Clases & Horarios
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            Gestión de cursos, modalidades de impartición y asignación de profesores
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/15 hover:from-indigo-700 hover:to-indigo-850 hover:shadow-indigo-650/20 active:scale-[0.98] transition-all duration-200 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Nueva Clase
        </button>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_rgba(79,70,229,0.03)] border border-slate-200/80 transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-indigo-50/50 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Clases</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100/55">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{initialClasses.length}</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_rgba(59,130,246,0.03)] border border-slate-200/80 transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-blue-50/50 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Alumnos Inscritos</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-100/55">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">{totalStudents}</p>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-white p-5 shadow-[0_4px_20px_-4px_rgba(16,185,129,0.03)] border border-slate-200/80 transition-all duration-300 hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 h-16 w-16 translate-x-4 -translate-y-4 rounded-full bg-emerald-50/50 pointer-events-none" />
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Modalidades</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100/55">
              <Globe className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2.5 text-[11px] font-bold text-slate-700 leading-none">
            <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100/50">{initialClasses.filter((c) => c.modality === 'PRESENCIAL').length} Pres</span>
            <span className="text-slate-300 px-0.5 font-medium">•</span>
            <span className="text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100/50">{initialClasses.filter((c) => c.modality === 'HIBRIDA').length} Híb</span>
            <span className="text-slate-300 px-0.5 font-medium">•</span>
            <span className="text-indigo-705 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100/50">{initialClasses.filter((c) => c.modality === 'VIRTUAL').length} Virt</span>
          </p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-slate-200/80">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, código o profesor..."
            className="w-full rounded-xl border border-slate-250 bg-slate-50/70 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
          />
        </div>
        <span className="text-xs text-slate-450 font-bold hidden sm:inline">
          {filteredClasses.length} clases encontradas
        </span>
      </div>

      {/* Grid of Class Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClasses.map((cls) => {
          const isVirtual = cls.modality === 'VIRTUAL';
          const isHybrid = cls.modality === 'HIBRIDA';

          return (
            <div
              key={cls.id}
              className="group relative flex flex-col justify-between overflow-hidden rounded-2xl bg-white p-6 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-slate-200/80 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_12px_30px_-4px_rgba(79,70,229,0.07)] hover:border-indigo-200"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-black text-slate-655 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200/40">
                      {cls.code}
                    </span>
                    <h3 className="mt-2.5 text-base font-extrabold text-slate-900 leading-snug tracking-tight">
                      {cls.name}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-0.8 text-[10px] font-black tracking-wide border ${
                      isHybrid
                        ? 'bg-purple-50 text-purple-700 border-purple-100'
                        : isVirtual
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-100'
                        : 'bg-amber-50 text-amber-700 border-amber-100'
                    }`}
                  >
                    {isHybrid ? (
                      <Sparkles className="h-3 w-3 text-purple-600" />
                    ) : isVirtual ? (
                      <Globe className="h-3 w-3" />
                    ) : (
                      <MapPin className="h-3 w-3" />
                    )}
                    {cls.modality === 'HIBRIDA' ? 'HÍBRIDA' : cls.modality}
                  </span>
                </div>

                {/* Details */}
                <div className="mt-5 space-y-2.5 text-xs text-slate-600 font-medium">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="text-slate-700">{cls.schedule}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4 text-slate-400 shrink-0" />
                    <span>
                      Titular:{' '}
                      <strong className="text-slate-800 font-bold pl-0.5">
                        {cls.primaryTeacher.firstName} {cls.primaryTeacher.lastName}
                      </strong>
                    </span>
                  </div>

                  {cls.assistantTeacher && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 pl-0.5">
                      <GraduationCap className="h-4 w-4 text-slate-400 shrink-0" />
                      <span>
                        Asistente: <strong className="text-slate-600 font-semibold">{cls.assistantTeacher.firstName} {cls.assistantTeacher.lastName}</strong>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Footer / Price & Capacity */}
              <div className="mt-6 pt-4.5 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">
                    Precio Mensual
                  </span>
                  <span className="text-lg font-black text-emerald-600">
                    {formatCurrency(cls.monthlyPrice)}
                  </span>
                </div>

                <div className="text-right">
                  <span className="text-[9px] uppercase font-black text-slate-400 block tracking-wider">
                    Alumnos
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-black text-slate-850 bg-slate-50 border border-slate-200/60 px-2.5 py-1 rounded-xl mt-0.5 shadow-sm">
                    <Users className="h-3.5 w-3.5 text-slate-500" />
                    {cls.studentsCount}
                  </span>
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
    </div>
  );
}
