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
  Loader2
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
  const totalPrimaryClasses = initialTeachers.reduce((acc, t) => acc + t.primaryClasses.length, 0);
  const totalAssistantClasses = initialTeachers.reduce((acc, t) => acc + t.assistantClasses.length, 0);

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
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
            Plantel Docente & Profesores
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Registro de profesores, carga horaria asignada y datos de contacto
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all self-start sm:self-auto"
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
            <span className="text-xs font-bold uppercase text-slate-500">Total Profesores</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{initialTeachers.length}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Clases Titulares</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{totalPrimaryClasses}</p>
        </div>

        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-slate-500">Asistencias de Clase</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700">
              <Users className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-slate-900">{totalAssistantClasses}</p>
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
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10"
          />
        </div>
        <span className="text-xs text-slate-500 font-medium">
          {filteredTeachers.length} docentes encontrados
        </span>
      </div>

      {/* Teachers Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-sm border border-slate-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-[11px] uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-3.5">Docente</th>
                <th scope="col" className="px-5 py-3.5">Contacto / WhatsApp</th>
                <th scope="col" className="px-5 py-3.5">Clases como Titular</th>
                <th scope="col" className="px-5 py-3.5">Clases como Asistente</th>
                <th scope="col" className="px-5 py-3.5 text-right">Acciones</th>
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
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-100 font-bold text-xs text-blue-700">
                            {teacher.firstName[0]}{teacher.lastName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {teacher.firstName} {teacher.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2">
                              <span>CI: <strong className="font-mono text-slate-600">{teacher.ci}</strong></span>
                            </div>
                            <div className="text-[10px] text-slate-400">
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
                          className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 transition-colors"
                        >
                          <MessageCircle className="h-3 w-3 text-emerald-600" />
                          {teacher.phone}
                        </a>
                      </td>

                      {/* Clases Titular */}
                      <td className="px-5 py-4">
                        {teacher.primaryClasses.length === 0 ? (
                          <span className="text-[11px] text-slate-400">Sin clases asignadas</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {teacher.primaryClasses.map((cls) => (
                              <div
                                key={cls.id}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-700 border border-slate-200"
                              >
                                <span>{cls.code}</span>
                                <span className={`rounded px-1 text-[8px] font-bold ${
                                  cls.modality === 'HIBRIDA'
                                    ? 'bg-purple-100 text-purple-700'
                                    : cls.modality === 'VIRTUAL'
                                    ? 'bg-indigo-100 text-indigo-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {cls.modality[0]}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Clases Asistente */}
                      <td className="px-5 py-4">
                        {teacher.assistantClasses.length === 0 ? (
                          <span className="text-[11px] text-slate-400">--</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {teacher.assistantClasses.map((cls) => (
                              <div
                                key={cls.id}
                                className="inline-flex items-center gap-1 rounded-md bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200/60"
                              >
                                <span>{cls.code} (Asistente)</span>
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
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-colors"
                            title="Editar datos del docente"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Editar</span>
                          </button>

                          {/* Botón Eliminar */}
                          <button
                            onClick={() => handleDeleteTeacher(teacher)}
                            disabled={isDeleting}
                            className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 border border-rose-200/60 hover:bg-rose-100 transition-colors disabled:opacity-50"
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
