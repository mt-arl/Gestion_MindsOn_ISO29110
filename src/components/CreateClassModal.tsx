'use client';

import React, { useState, useTransition } from 'react';
import { 
  BookOpen, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Calendar, 
  UserCheck, 
  Globe, 
  MapPin,
  Clock
} from 'lucide-react';
import { createClassAction, SerializedTeacher } from '@/actions/academic';
import { ClassModality } from '@prisma/client';

interface CreateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: SerializedTeacher[];
}

export function CreateClassModal({ isOpen, onClose, teachers }: CreateClassModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    modality: ClassModality.PRESENCIAL,
    schedule: '',
    monthlyPrice: 60.00,
    primaryTeacherId: teachers[0]?.id || '',
    assistantTeacherId: '',
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await createClassAction({
        ...formData,
        monthlyPrice: Number(formData.monthlyPrice),
        assistantTeacherId: formData.assistantTeacherId || null,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
          setFormData({
            code: '',
            name: '',
            modality: ClassModality.PRESENCIAL,
            schedule: '',
            monthlyPrice: 60.00,
            primaryTeacherId: teachers[0]?.id || '',
            assistantTeacherId: '',
          });
        }, 1500);
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Crear Nueva Clase / Grupo
              </h3>
              <p className="text-xs text-slate-500">
                Configuración académica, modalidad y arancel
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

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Código de Clase *
              </label>
              <input
                type="text"
                name="code"
                required
                value={formData.code}
                onChange={handleChange}
                placeholder="Ej. ENG-B1-02"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium uppercase text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modalidad *
              </label>
              <select
                name="modality"
                value={formData.modality}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value={ClassModality.PRESENCIAL}>Presencial (Aula)</option>
                <option value={ClassModality.VIRTUAL}>Virtual (Online / Zoom)</option>
                <option value={ClassModality.HIBRIDA}>Híbrida (Presencial + Virtual)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nombre de la Clase / Nivel *
            </label>
            <input
              type="text"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              placeholder="Ej. Inglés Intermedio B1 (Intensivo)"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Horario / Días *
              </label>
              <input
                type="text"
                name="schedule"
                required
                value={formData.schedule}
                onChange={handleChange}
                placeholder="Ej: Mar: Presencial (Aula 102) | Jue: Virtual"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Precio Mensual ($ USD) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
                <input
                  type="number"
                  name="monthlyPrice"
                  step="0.01"
                  min="1"
                  required
                  value={formData.monthlyPrice}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 pl-8 pr-3 py-2 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3 pt-1">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Profesor Titular *
              </label>
              <select
                name="primaryTeacherId"
                required
                value={formData.primaryTeacherId}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Selecciona el profesor principal --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName} ({t.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Profesor Asistente (Opcional)
              </label>
              <select
                name="assistantTeacherId"
                value={formData.assistantTeacherId}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Sin asistente --</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            </div>
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
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando Clase...
                </>
              ) : (
                <>
                  <BookOpen className="h-4 w-4" />
                  Guardar Clase
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
