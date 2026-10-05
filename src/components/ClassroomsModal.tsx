'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  Building, 
  X, 
  Plus, 
  Edit2, 
  Check, 
  AlertCircle, 
  CheckCircle2, 
  Users, 
  MapPin, 
  Video, 
  Loader2,
  Power,
  Sparkles
} from 'lucide-react';
import { 
  getClassroomsAction, 
  createClassroomAction, 
  updateClassroomAction, 
  deleteClassroomAction,
  SerializedClassroom 
} from '@/actions/classrooms';

interface ClassroomsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClassroomsUpdated?: () => void;
}

export function ClassroomsModal({ isOpen, onClose, onClassroomsUpdated }: ClassroomsModalProps) {
  const [classrooms, setClassrooms] = useState<SerializedClassroom[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState<number | string>(15);
  const [location, setLocation] = useState('');
  const [isVirtual, setIsVirtual] = useState(false);

  const loadClassrooms = async () => {
    setIsLoading(true);
    try {
      const data = await getClassroomsAction(true);
      setClassrooms(data);
    } catch (err) {
      console.error(err);
      setMessage({ type: 'error', text: 'No se pudieron cargar las aulas.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadClassrooms();
      setMessage(null);
      setIsFormOpen(false);
      setEditingId(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setCapacity(15);
    setLocation('');
    setIsVirtual(false);
    setIsFormOpen(false);
  };

  const handleStartEdit = (cr: SerializedClassroom) => {
    setEditingId(cr.id);
    setName(cr.name);
    setCapacity(cr.capacity);
    setLocation(cr.location || '');
    setIsVirtual(cr.isVirtual);
    setIsFormOpen(true);
    setMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const cleanName = name.trim();
    if (!cleanName) {
      setMessage({ type: 'error', text: 'El nombre del aula es obligatorio.' });
      return;
    }

    startTransition(async () => {
      if (editingId) {
        // Actualizar
        const res = await updateClassroomAction(editingId, {
          name: cleanName,
          capacity: Number(capacity) || 15,
          location: location.trim() || null,
          isVirtual,
        });

        if (res.success) {
          setMessage({ type: 'success', text: res.message });
          resetForm();
          await loadClassrooms();
          onClassroomsUpdated?.();
        } else {
          setMessage({ type: 'error', text: res.message });
        }
      } else {
        // Crear
        const res = await createClassroomAction({
          name: cleanName,
          capacity: Number(capacity) || 15,
          location: location.trim() || null,
          isVirtual,
        });

        if (res.success) {
          setMessage({ type: 'success', text: res.message });
          resetForm();
          await loadClassrooms();
          onClassroomsUpdated?.();
        } else {
          setMessage({ type: 'error', text: res.message });
        }
      }
    });
  };

  const handleToggleActive = (cr: SerializedClassroom) => {
    setMessage(null);
    startTransition(async () => {
      if (cr.isActive) {
        // Desactivar: deleteClassroomAction verifica si tiene cursos activos asignados
        const res = await deleteClassroomAction(cr.id);
        if (res.success) {
          setMessage({ type: 'success', text: res.message });
          await loadClassrooms();
          onClassroomsUpdated?.();
        } else {
          setMessage({ type: 'error', text: res.message });
        }
      } else {
        // Reactivar
        const res = await updateClassroomAction(cr.id, {
          name: cr.name,
          isActive: true,
        });
        if (res.success) {
          setMessage({ type: 'success', text: `Aula "${cr.name}" reactivada exitosamente.` });
          await loadClassrooms();
          onClassroomsUpdated?.();
        } else {
          setMessage({ type: 'error', text: res.message });
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col animate-in zoom-in-95 duration-150">
        
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6 bg-slate-50/70">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-600/20">
              <Building className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black tracking-tight text-slate-900">
                Gestión de Aulas & Espacios
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                Control de aulas físicas, entornos virtuales y validación de aforo
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Notificaciones de Acción */}
        {message && (
          <div className="px-6 pt-4">
            <div
              className={`flex items-start gap-2.5 rounded-2xl p-3.5 text-xs font-bold border shadow-xs animate-in fade-in duration-150 ${
                message.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <span className="leading-relaxed">{message.text}</span>
            </div>
          </div>
        )}

        {/* Contenido Scrolleable */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">

          {/* Botón para Abrir Formulario o Formulario Activo */}
          {!isFormOpen ? (
            <div className="flex items-center justify-between bg-indigo-50/60 p-4 rounded-2xl border border-indigo-100">
              <div>
                <p className="text-xs font-bold text-indigo-950">
                  ¿Deseas agregar una nueva aula al instituto?
                </p>
                <p className="text-[11px] text-indigo-700/80 mt-0.5 font-medium">
                  Crea aulas físicas para control de solapamiento o virtuales para clases en línea.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setIsFormOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all shrink-0 ml-3"
              >
                <Plus className="h-4 w-4" />
                Nueva Aula
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between border-b border-slate-200/80 pb-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                  {editingId ? 'Editar Datos del Aula' : 'Registrar Nueva Aula'}
                </span>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-slate-400 hover:text-slate-600 font-semibold"
                >
                  Cancelar
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Nombre */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Nombre del Aula *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej. Aula CANADA o Aula VIRTUAL 2"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {/* Capacidad */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Capacidad (Estudiantes) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              {/* Ubicación */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Ubicación / Referencia Física (Opcional)
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ej. Planta Principal - Frente a Secretaría, o Zoom Institucional"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              {/* Toggle Es Virtual */}
              <div className="flex items-center gap-2 pt-1">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isVirtual}
                    onChange={(e) => setIsVirtual(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Es un espacio Virtual / Online (Zoom / Meet)
                    </span>
                    <p className="text-[10px] text-slate-500">
                      Las aulas virtuales admiten concurrencia ilimitada y no bloquean horarios coincidentes.
                    </p>
                  </div>
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition-all"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingId ? 'Guardar Cambios' : 'Registrar Aula'}
                </button>
              </div>
            </form>
          )}

          {/* Listado de Aulas */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Aulas Registradas ({classrooms.length})
              </h4>
              <span className="text-[11px] text-slate-400 font-medium">
                {classrooms.filter((c) => c.isActive).length} Activas • {classrooms.filter((c) => !c.isActive).length} Inactivas
              </span>
            </div>

            {isLoading ? (
              <div className="flex items-center justify-center py-12 text-slate-400">
                <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                <span className="ml-2 text-xs font-bold">Cargando aulas...</span>
              </div>
            ) : classrooms.length === 0 ? (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center text-slate-400">
                <Building className="mx-auto h-8 w-8 text-slate-300 mb-1" />
                <p className="text-xs font-bold">No hay aulas registradas en el sistema.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-2.5">
                {classrooms.map((cr) => {
                  const isActive = cr.isActive;
                  const isVirtual = cr.isVirtual;
                  const classesCount = cr.activeClassesCount || 0;

                  return (
                    <div
                      key={cr.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                        isActive
                          ? 'bg-white border-slate-200/90 shadow-xs hover:border-slate-300'
                          : 'bg-slate-50/70 border-dashed border-slate-200 text-slate-400 opacity-75'
                      }`}
                    >
                      {/* Información Principal */}
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs font-black ${isActive ? 'text-slate-900' : 'text-slate-500'}`}>
                            {cr.name}
                          </span>

                          {/* Badge Presencial / Virtual */}
                          <span className={`inline-flex items-center gap-1 rounded-lg px-2 py-0.5 text-[10px] font-bold border ${
                            isVirtual 
                              ? 'bg-purple-50 text-purple-700 border-purple-200' 
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {isVirtual ? <Video className="h-3 w-3" /> : <MapPin className="h-3 w-3" />}
                            {isVirtual ? 'Virtual' : 'Presencial'}
                          </span>

                          {/* Badge Activo/Inactivo */}
                          <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-bold ${
                            isActive
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : 'bg-slate-200 text-slate-600 border border-slate-300'
                          }`}>
                            {isActive ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>

                        {/* Detalles de Capacidad y Ubicación */}
                        <div className="flex items-center gap-3 text-[11px] text-slate-500 font-medium flex-wrap">
                          <span className="flex items-center gap-1">
                            <Users className="h-3 w-3 text-slate-400" />
                            Aforo: <strong>{cr.capacity} estudiantes</strong>
                          </span>
                          {cr.location && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]" title={cr.location}>
                                {cr.location}
                              </span>
                            </>
                          )}
                          <span>•</span>
                          <span className="text-indigo-600 font-bold">
                            {classesCount} {classesCount === 1 ? 'curso activo' : 'cursos activos'}
                          </span>
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="flex items-center gap-1.5 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleStartEdit(cr)}
                          disabled={isPending}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-bold text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
                          title="Editar información del aula"
                        >
                          <Edit2 className="h-3 w-3 text-indigo-600" />
                          Editar
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleActive(cr)}
                          disabled={isPending}
                          className={`inline-flex items-center gap-1 rounded-xl border px-2.5 py-1.5 text-[11px] font-bold shadow-xs active:scale-95 transition-all ${
                            isActive
                              ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                          }`}
                          title={isActive ? 'Desactivar aula' : 'Reactivar aula'}
                        >
                          <Power className="h-3 w-3" />
                          {isActive ? 'Desactivar' : 'Activar'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 p-4 bg-slate-50 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-slate-800 active:scale-95 transition-all"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
}
