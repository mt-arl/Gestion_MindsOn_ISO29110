'use client';

import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Search, 
  Filter, 
  Users, 
  Phone, 
  MessageCircle, 
  Mail, 
  BookOpen, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  Sparkles,
  Edit3,
  History,
  CreditCard
} from 'lucide-react';
import { SerializedStudent, SerializedClass } from '@/actions/academic';
import { formatDate, formatCurrency } from '@/lib/utils';
import { CreateStudentModal } from './CreateStudentModal';
import { EditStudentModal } from './EditStudentModal';
import { StudentFinancialHistoryModal } from './StudentFinancialHistoryModal';

interface StudentsViewProps {
  initialStudents: SerializedStudent[];
  classes: SerializedClass[];
}

export function StudentsView({ initialStudents, classes }: StudentsViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState('ALL');
  
  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [studentToEdit, setStudentToEdit] = useState<SerializedStudent | null>(null);
  const [studentForHistoryId, setStudentForHistoryId] = useState<string | null>(null);

  // Filtrado de alumnos
  const filteredStudents = useMemo(() => {
    return initialStudents.filter((student) => {
      // Filtro de clase
      if (selectedClassFilter !== 'ALL') {
        if (selectedClassFilter === 'UNASSIGNED') {
          if (student.currentClassId) return false;
        } else if (student.currentClassId !== selectedClassFilter) {
          return false;
        }
      }

      // Filtro de búsqueda
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase();
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      const ci = student.ci.toLowerCase();
      const email = student.email.toLowerCase();
      const phone = student.phone.toLowerCase();

      return (
        fullName.includes(query) ||
        ci.includes(query) ||
        email.includes(query) ||
        phone.includes(query)
      );
    });
  }, [initialStudents, selectedClassFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 bg-gradient-to-r from-slate-950 to-slate-700 bg-clip-text text-transparent">
            Gestión de Estudiantes
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">
            Matrícula, asignación de grupos, kardex contable y control de contacto
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/15 hover:from-indigo-700 hover:to-indigo-850 hover:shadow-indigo-650/20 active:scale-[0.98] transition-all duration-200 self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          Registrar Nuevo Estudiante
        </button>
      </div>

      {/* Toolbar: Search & Class Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl bg-white p-4 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.02)] border border-slate-200/80">
        
        {/* Selector de Clase */}
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-slate-400" />
          <select
            value={selectedClassFilter}
            onChange={(e) => setSelectedClassFilter(e.target.value)}
            className="rounded-xl border border-slate-250 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all cursor-pointer"
          >
            <option value="ALL">Todas las Clases ({initialStudents.length} alumnos)</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.code} - {cls.name} ({cls.studentsCount} alumnos)
              </option>
            ))}
            <option value="UNASSIGNED">Sin clase asignada</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, CI, correo o celular..."
            className="w-full rounded-xl border border-slate-250 bg-slate-50/70 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
          />
        </div>
      </div>

      {/* Students Table */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-655">
            <thead className="bg-slate-50/75 border-b border-slate-200/50 text-[10px] uppercase font-extrabold text-slate-400 tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-4">Estudiante</th>
                <th scope="col" className="px-5 py-4">Clase Asignada</th>
                <th scope="col" className="px-5 py-4">Edad / Género</th>
                <th scope="col" className="px-5 py-4">Contacto Principal</th>
                <th scope="col" className="px-5 py-4">Contacto Tutores</th>
                <th scope="col" className="px-5 py-4">Estado</th>
                <th scope="col" className="px-5 py-4">Cuentas</th>
                <th scope="col" className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-16 text-center text-slate-400">
                    <AlertCircle className="mx-auto h-9 w-9 mb-2.5 text-slate-300" />
                    <p className="text-sm font-bold text-slate-655">No se encontraron estudiantes</p>
                    <p className="text-xs text-slate-400 mt-1">Intenta cambiar los parámetros de búsqueda o registra uno nuevo.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  const rawPhone = student.phone.replace(/[^0-9]/g, '');

                  return (
                    <tr key={student.id} className="transition-colors duration-150 hover:bg-slate-50/70">
                      {/* Estudiante */}
                      <td className="px-5 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9.5 w-9.5 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 font-bold text-xs text-indigo-700">
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs">
                              {student.firstName} {student.lastName}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5 font-semibold">
                              <span>CI: <strong className="font-mono text-slate-550">{student.ci}</strong></span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {student.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Clase Asignada */}
                      <td className="px-5 py-4.5">
                        {student.currentClass ? (
                          <div>
                            <div className="font-bold text-slate-800 text-xs">
                              {student.currentClass.name}
                            </div>
                            <div className="mt-1.5 flex items-center gap-1.5">
                              <span className="font-mono text-[9px] font-extrabold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200/30">
                                {student.currentClass.code}
                              </span>
                              <span className={`rounded-lg px-2 py-0.5 text-[9px] font-black tracking-wide ${
                                student.currentClass.modality === 'HIBRIDA'
                                  ? 'bg-purple-50 text-purple-700 border border-purple-100'
                                  : student.currentClass.modality === 'VIRTUAL'
                                  ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                                  : 'bg-amber-50 text-amber-700 border border-amber-100'
                              }`}>
                                {student.currentClass.modality === 'HIBRIDA' ? 'HÍBRIDA' : student.currentClass.modality}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 border border-slate-200/30">
                            Sin clase asignada
                          </span>
                        )}
                      </td>

                      {/* Edad / Género */}
                      <td className="px-5 py-4.5">
                        <div className="text-xs text-slate-800 font-bold">
                          {student.age} años
                        </div>
                        <div className="text-[11px] text-slate-400 font-semibold mt-0.5">
                          {student.gender}
                        </div>
                      </td>

                      {/* Contacto Alumno */}
                      <td className="px-5 py-4.5">
                        <a
                          href={`https://wa.me/${rawPhone}?text=Hola%20${encodeURIComponent(
                            student.firstName
                          )},%20te%20escribimos%20de%20MindsOn.`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50/70 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-100/40 shadow-sm transition-all duration-200 hover:scale-[1.02]"
                        >
                          <MessageCircle className="h-3 w-3 text-emerald-600" />
                          {student.phone}
                        </a>
                      </td>

                      {/* Contacto Tutores */}
                      <td className="px-5 py-4.5">
                        <div className="space-y-0.5 text-[11px]">
                          {student.guardianPhone1 && (
                            <div className="text-slate-600 font-semibold pl-1">
                              <span className="text-slate-400 text-[10px] font-bold">T1:</span> {student.guardianPhone1}
                            </div>
                          )}
                          {student.guardianPhone2 && (
                            <div className="text-slate-600 font-semibold pl-1">
                              <span className="text-slate-400 text-[10px] font-bold">T2:</span> {student.guardianPhone2}
                            </div>
                          )}
                          {!student.guardianPhone1 && !student.guardianPhone2 && (
                            <span className="text-slate-450 text-[10px] font-medium pl-1">Sin registro</span>
                          )}
                        </div>
                      </td>

                      {/* Estado Académico */}
                      <td className="px-5 py-4.5">
                        <span className={`inline-flex items-center rounded-lg px-2.5 py-0.5 text-[10px] font-black border ${
                          student.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : student.status === 'GRADUATED'
                            ? 'bg-indigo-50 text-indigo-700 border-indigo-250'
                            : student.status === 'DROPPED'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}>
                          {student.status === 'ACTIVE'
                            ? 'Activo'
                            : student.status === 'GRADUATED'
                            ? 'Graduado'
                            : student.status === 'DROPPED'
                            ? 'Retirado'
                            : student.status}
                        </span>
                      </td>

                      {/* Resumen de Cuentas */}
                      <td className="px-5 py-4.5">
                        {student.pendingOrOverdueCount > 0 ? (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-0.5 text-[10px] font-black text-rose-700 border border-rose-200">
                            <AlertTriangle className="h-3 w-3 text-rose-600" />
                            {student.pendingOrOverdueCount} pendiente(s)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            Al día
                          </span>
                        )}
                      </td>

                      {/* Acciones */}
                      <td className="px-5 py-4.5 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Botón Kardex / Historial */}
                          <button
                            onClick={() => setStudentForHistoryId(student.id)}
                            className="inline-flex items-center gap-1 rounded-xl bg-indigo-50/70 hover:bg-indigo-100 px-3 py-1.5 text-xs font-bold text-indigo-700 border border-indigo-200/50 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] shadow-sm"
                            title="Ver historial financiero y registro de pagos"
                          >
                            <History className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Kardex</span>
                          </button>

                          {/* Botón Editar */}
                          <button
                            onClick={() => setStudentToEdit(student)}
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-50 hover:bg-slate-100/90 border border-slate-200/60 px-3 py-1.5 text-xs font-bold text-slate-700 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 shadow-sm"
                            title="Editar datos y cambiar clase"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                            <span className="hidden sm:inline">Editar</span>
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

      {/* Modal de Registro Nuevo */}
      <CreateStudentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        classes={classes}
      />

      {/* Modal de Edición */}
      <EditStudentModal
        isOpen={!!studentToEdit}
        student={studentToEdit}
        onClose={() => setStudentToEdit(null)}
        classes={classes}
      />

      {/* Modal de Kardex / Historial Financiero */}
      <StudentFinancialHistoryModal
        isOpen={!!studentForHistoryId}
        studentId={studentForHistoryId}
        onClose={() => setStudentForHistoryId(null)}
      />
    </div>
  );
}
