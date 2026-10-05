'use client';

import React, { useState, useMemo, useTransition } from 'react';
import { 
  UserPlus, 
  Search, 
  GraduationCap, 
  Phone, 
  MessageCircle, 
  Mail, 
  BookOpen, 
  Edit3, 
  Trash2, 
  AlertCircle, 
  CheckCircle2, 
  Globe, 
  MapPin, 
  Sparkles,
  Users,
  MessageSquare
} from 'lucide-react';
import { SerializedTeacherDetailed, deleteTeacherAction } from '@/actions/teachers';
import { CreateTeacherModal } from './CreateTeacherModal';
import { EditTeacherModal } from './EditTeacherModal';

interface TeachersViewProps {
  initialTeachers: SerializedTeacherDetailed[];
}

export function TeachersView({ initialTeachers }: TeachersViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [teacherToEdit, setTeacherToEdit] = useState<SerializedTeacherDetailed | null>(null);
  
  // Estado para confirmación de eliminación
  const [isDeleting, startDeleteTransition] = useTransition();
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  // Filtrado reactivo de profesores
  const filteredTeachers = useMemo(() => {
    if (!searchTerm.trim()) return initialTeachers;
    const query = searchTerm.toLowerCase();
    return initialTeachers.filter((t) => {
      const fullName = `${t.firstName} ${t.lastName}`.toLowerCase();
      const ci = t.ci.toLowerCase();
      const email = t.email.toLowerCase();
      const phone = t.phone.toLowerCase();
      return (
        fullName.includes(query) ||
        ci.includes(query) ||
        email.includes(query) ||
        phone.includes(query)
      );
    });
  }, [initialTeachers, searchTerm]);

  // Contadores globales
  const totalUnitClasses = initialTeachers.reduce((acc, t) => acc + t.unitClasses.length, 0);
  const totalSpeakingClasses = initialTeachers.reduce((acc, t) => acc + t.speakingClasses.length, 0);

  const handleDeleteTeacher = (teacher: SerializedTeacherDetailed) => {
    const confirmMsg = `¿Estás seguro de que deseas eliminar al docente ${teacher.firstName} ${teacher.lastName} (CI: ${teacher.ci})?`;
    if (!window.confirm(confirmMsg)) return;

    setDeleteError(null);
    setDeleteSuccess(null);

    startDeleteTransition(async () => {
      const res = await deleteTeacherAction(teacher.id);
      if (res.success) {
        setDeleteSuccess(res.message);
        setTimeout(() => setDeleteSuccess(null), 3000);
      } else {
        setDeleteError(res.message);
        setTimeout(() => setDeleteError(null), 5000);
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-950 to-slate-700 bg-clip-text text-transparent">
            Plantel Docente & Profesores
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Registro de profesores, asignación de Unit Classes, Speaking Clubs y Clases Privadas
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4.5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/15 hover:from-indigo-700 hover:to-indigo-800 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200 self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          Registrar Nuevo Docente
        </button>
      </div>

      {/* Global Alerts for Delete Action */}
      {deleteError && (
        <div className="flex items-center gap-2 rounded-2xl bg-rose-50 p-4 text-xs font-semibold text-rose-800 border border-rose-200 shadow-sm animate-in fade-in">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{deleteError}</span>
        </div>
      )}

      {deleteSuccess && (
        <div className="flex items-center gap-2 rounded-2xl bg-emerald-50 p-4 text-xs font-semibold text-emerald-800 border border-emerald-200 shadow-sm animate-in fade-in">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
          <span>{deleteSuccess}</span>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Total Profesores</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{initialTeachers.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Unit Classes</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{totalUnitClasses}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-400">Speaking Classes</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <MessageSquare className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{totalSpeakingClasses}</p>
        </div>
      </div>

      {/* Search Toolbar */}
      <div className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, CI, correo o celular..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
          />
        </div>
        <span className="text-xs text-slate-400 font-bold hidden sm:inline">
          {filteredTeachers.length} docentes encontrados
        </span>
      </div>

      {/* Teachers Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-4">Docente</th>
                <th scope="col" className="px-5 py-4">Contacto / WhatsApp</th>
                <th scope="col" className="px-5 py-4">Unit Classes</th>
                <th scope="col" className="px-5 py-4">Speaking Classes</th>
                <th scope="col" className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredTeachers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2 text-slate-300" />
                    <p className="text-sm font-semibold text-slate-600">No se encontraron profesores</p>
                    <p className="text-xs text-slate-400">Intenta con otro término de búsqueda o registra un nuevo docente.</p>
                  </td>
                </tr>
              ) : (
                filteredTeachers.map((teacher) => {
                  const rawPhone = teacher.phone.replace(/[^0-9]/g, '');

                  return (
                    <tr key={teacher.id} className="transition-colors hover:bg-slate-50/80">
                      {/* Docente Info */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 font-bold text-xs text-indigo-700">
                            {teacher.firstName[0]}{teacher.lastName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {teacher.firstName} {teacher.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-semibold">
                              <span>CI: <strong className="font-mono text-slate-600">{teacher.ci}</strong></span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {teacher.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Contacto */}
                      <td className="px-5 py-4">
                        <a
                          href={`https://wa.me/${rawPhone}?text=Estimado(a)%20profesor(a)%20${encodeURIComponent(
                            teacher.firstName
                          )},%20le%20escribimos%20de%20la%20dirección%20académica%20de%20MindsOn.`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50/70 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-100/40 shadow-sm transition-all"
                        >
                          <MessageCircle className="h-3 w-3 text-emerald-600" />
                          {teacher.phone}
                        </a>
                      </td>

                      {/* Unit Classes */}
                      <td className="px-5 py-4">
                        {teacher.unitClasses.length === 0 ? (
                          <span className="text-[11px] text-slate-400">Sin clases asignadas</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {teacher.unitClasses.map((cls) => (
                              <div
                                key={cls.id}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200"
                              >
                                <span>{cls.code}</span>
                                <span className={`rounded px-1 text-[8px] font-black ${
                                  cls.book === 'AMARILLO'
                                    ? 'bg-amber-200 text-amber-900'
                                    : cls.book === 'ROJO'
                                    ? 'bg-rose-200 text-rose-900'
                                    : 'bg-sky-200 text-sky-900'
                                }`}>
                                  {cls.level}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Speaking Classes */}
                      <td className="px-5 py-4">
                        {teacher.speakingClasses.length === 0 ? (
                          <span className="text-[11px] text-slate-400">--</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {teacher.speakingClasses.map((cls) => (
                              <div
                                key={cls.id}
                                className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[10px] font-bold text-sky-800 border border-sky-200/60"
                              >
                                <span>{cls.code} (Speaking)</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Botón Editar */}
                          <button
                            onClick={() => setTeacherToEdit(teacher)}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-all"
                            title="Editar datos del docente"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          {/* Botón Eliminar */}
                          <button
                            onClick={() => handleDeleteTeacher(teacher)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1 rounded-xl bg-rose-50 px-2.5 py-1.5 text-xs font-bold text-rose-700 border border-rose-200/60 hover:bg-rose-100 transition-all disabled:opacity-50"
                            title="Eliminar docente"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Eliminar</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Crear Docente */}
      <CreateTeacherModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />

      {/* Modal Editar Docente */}
      <EditTeacherModal
        isOpen={!!teacherToEdit}
        teacher={teacherToEdit}
        onClose={() => setTeacherToEdit(null)}
      />
    </div>
  );
}
