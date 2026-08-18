'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  Edit3, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  GraduationCap
} from 'lucide-react';
import { updateTeacherAction, SerializedTeacherDetailed } from '@/actions/teachers';

interface EditTeacherModalProps {
  isOpen: boolean;
  onClose: () => void;
  teacher: SerializedTeacherDetailed | null;
}

export function EditTeacherModal({ isOpen, onClose, teacher }: EditTeacherModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ci: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });

  useEffect(() => {
    if (teacher) {
      setFormData({
        ci: teacher.ci || '',
        firstName: teacher.firstName || '',
        lastName: teacher.lastName || '',
        email: teacher.email || '',
        phone: teacher.phone || '',
      });
      setError(null);
      setSuccessMsg(null);
    }
  }, [teacher]);

  if (!isOpen || !teacher) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await updateTeacherAction(teacher.id, formData);
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
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Editar Datos del Docente
              </h3>
              <p className="text-xs text-slate-500">
                Actualizar información de contacto y credenciales
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

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              C.I. / Documento de Identidad *
            </label>
            <input
              type="text"
              name="ci"
              required
              value={formData.ci}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nombres *
              </label>
              <input
                type="text"
                name="firstName"
                required
                value={formData.firstName}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Apellidos *
              </label>
              <input
                type="text"
                name="lastName"
                required
                value={formData.lastName}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Correo Institucional / Personal *
            </label>
            <input
              type="email"
              name="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teléfono / Celular WhatsApp *
            </label>
            <input
              type="text"
              name="phone"
              required
              value={formData.phone}
              onChange={handleChange}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-4 focus:ring-blue-500/10"
            />
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
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-all disabled:opacity-50"
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
