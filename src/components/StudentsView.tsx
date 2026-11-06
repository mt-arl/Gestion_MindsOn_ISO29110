'use client';

import React, { useState, useMemo } from 'react';
import { 
  UserPlus, 
  Search, 
  Filter, 
  MessageCircle, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle, 
  Edit3,
  History,
  Calendar,
  Clock
} from 'lucide-react';
import { SerializedStudent, SerializedClass } from '@/actions/academic';
import { formatCurrency, formatTuitionDate } from '@/lib/utils';
import { buildWhatsAppUrl } from '@/lib/ecuador-validators';
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
      const ci = (student.ci || '').toLowerCase();
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
          <p className="text-xs sm:text-sm text-slate-500 font-medium mt-0.5">
            Matrícula, arancel individual acordado, próximo cobro, kardex y asignación de grupo
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-700 px-4.5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/15 hover:from-indigo-700 hover:to-indigo-800 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all duration-200 self-start sm:self-auto"
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
            className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
          >
            <option value="ALL">Todas las Clases ({initialStudents.length} alumnos)</option>
            <option value="UNASSIGNED">Sin Curso Asignado</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.code}) - {c.studentsCount} alumnos
              </option>
            ))}
          </select>
        </div>

        {/* Input de Búsqueda */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nombre, CI, correo..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-2 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all duration-200"
          />
        </div>
      </div>

      {/* Tabla de Estudiantes */}
      <div className="overflow-hidden rounded-2xl bg-white shadow-[0_4px_25px_-5px_rgba(0,0,0,0.03)] border border-slate-200/80">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[10px] uppercase font-black text-slate-400 tracking-wider">
              <tr>
                <th scope="col" className="px-5 py-4">Estudiante</th>
                <th scope="col" className="px-5 py-4">Curso Asignado</th>
                <th scope="col" className="px-5 py-4">Arancel Pactado</th>
                <th scope="col" className="px-5 py-4">Próximo Cobro</th>
                <th scope="col" className="px-5 py-4">Edad / Género</th>
                <th scope="col" className="px-5 py-4">Contacto Alumno</th>
                <th scope="col" className="px-5 py-4">Tutores</th>
                <th scope="col" className="px-5 py-4">Estado</th>
                <th scope="col" className="px-5 py-4">Cuentas</th>
                <th scope="col" className="px-5 py-4 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-12 text-center text-slate-400">
                    <AlertCircle className="mx-auto h-8 w-8 mb-2 text-slate-300" />
                    <p className="text-sm font-bold text-slate-600">No se encontraron estudiantes</p>
                    <p className="text-xs text-slate-400 font-normal mt-0.5">Intenta con otro término de búsqueda o selecciona otra clase.</p>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => {
                  return (
                    <tr 
                      key={student.id} 
                      className="transition-colors duration-150 hover:bg-slate-50/70"
                    >
                      {/* Estudiante */}
                      <td className="px-5 py-4.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 font-bold text-xs text-indigo-700">
                            {student.firstName[0]}{student.lastName[0]}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                              <span>{student.firstName} {student.lastName}</span>
                              {student.hasDisability && (
                                <span 
                                  title={student.disabilityDescription ? `Adaptación: ${student.disabilityDescription}` : "Estudiante con necesidades específicas"} 
                                  className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1 py-0.2 text-[9px] font-bold text-rose-700 border border-rose-200 cursor-help"
                                >
                                  ♿ Adaptación
                                </span>
                              )}
                              {student.notes && (
                                <span 
                                  title={`Observaciones: ${student.notes}`} 
                                  className="cursor-help text-xs"
                                >
                                  📝
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>CI: <strong className="font-mono text-slate-600">{student.ci || 'Sin Cédula'}</strong></span>
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
                            <div className="mt-0.5 flex items-center gap-1.5">
                              <span className="font-mono text-[9px] font-extrabold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded-md border border-slate-200">
                                {student.currentClass.code}
                              </span>
                              <span className="text-[10px] text-slate-400">
                                Nivel {student.currentClass.level}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200">
                            Sin asignar
                          </span>
                        )}
                      </td>

                      {/* Arancel Pactado */}
                      <td className="px-5 py-4.5 font-bold text-slate-900 text-xs">
                        <span className="font-black text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100 inline-block">
                          {formatCurrency(student.monthlyFee)}
                        </span>
                      </td>

                      {/* Próximo Cobro */}
                      <td className="px-5 py-4.5">
                        {student.nextPaymentDate ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 text-slate-900 font-bold text-xs">
                              <Calendar className="h-3 w-3 text-indigo-600" />
                              {formatTuitionDate(student.nextPaymentDate)}
                            </span>
                            <div className="text-[10px] text-slate-400 font-medium">
                              Ciclo mensual regular
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400 font-medium">
                            No programado
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
                          href={buildWhatsAppUrl(student.phone, `Hola ${student.firstName}, te escribimos de MindsOn.`)}
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
                        <div className="space-y-1 text-[11px]">
                          {student.guardianPhone1 && (
                            <div className="text-slate-600 font-semibold pl-1">
                              <a
                                href={buildWhatsAppUrl(student.guardianPhone1, `Estimado tutor de ${student.firstName}, le escribimos de MindsOn.`)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-700 font-bold"
                              >
                                <span className="text-slate-400 text-[10px]">T1:</span> {student.guardianPhone1}
                                <MessageCircle className="h-2.5 w-2.5 text-emerald-600" />
                              </a>
                            </div>
                          )}
                          {student.guardianPhone2 && (
                            <div className="text-slate-600 font-semibold pl-1">
                              <a
                                href={buildWhatsAppUrl(student.guardianPhone2, `Estimado tutor de ${student.firstName}, le escribimos de MindsOn.`)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-slate-700 hover:text-emerald-700 font-bold"
                              >
                                <span className="text-slate-400 text-[10px]">T2:</span> {student.guardianPhone2}
                                <MessageCircle className="h-2.5 w-2.5 text-emerald-600" />
                              </a>
                            </div>
                          )}
                          {!student.guardianPhone1 && !student.guardianPhone2 && (
                            <span className="text-slate-400 text-[10px] font-medium pl-1">Sin registro</span>
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
                            className="inline-flex items-center gap-1 rounded-xl bg-slate-100 hover:bg-slate-200/80 px-3 py-1.5 text-xs font-bold text-slate-700 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
                            title="Editar datos del estudiante"
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

      {/* Modal Crear Estudiante */}
      <CreateStudentModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        classes={classes}
      />

      {/* Modal Editar Estudiante */}
      <EditStudentModal
        isOpen={!!studentToEdit}
        student={studentToEdit}
        classes={classes}
        onClose={() => setStudentToEdit(null)}
      />

      {/* Modal Kardex / Historial Financiero */}
      <StudentFinancialHistoryModal
        isOpen={!!studentForHistoryId}
        studentId={studentForHistoryId}
        onClose={() => setStudentForHistoryId(null)}
      />
    </div>
  );
}
