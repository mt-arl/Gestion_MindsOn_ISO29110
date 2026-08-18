'use client';

import React, { useState, useTransition } from 'react';
import { 
  UserPlus, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  Phone, 
  Mail, 
  User, 
  MapPin,
  Sparkles
} from 'lucide-react';
import { createStudentAction, SerializedClass } from '@/actions/academic';

interface CreateStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  classes: SerializedClass[];
}

export function CreateStudentModal({ isOpen, onClose, classes }: CreateStudentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    ci: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    guardianPhone1: '',
    guardianPhone2: '',
    age: 16,
    gender: 'Masculino',
    address: '',
    currentClassId: '',
  });

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await createStudentAction({
        ...formData,
        age: Number(formData.age) || 16,
        currentClassId: formData.currentClassId || null,
        guardianPhone1: formData.guardianPhone1 || null,
        guardianPhone2: formData.guardianPhone2 || null,
        address: formData.address || null,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
          setFormData({
            ci: '',
            firstName: '',
            lastName: '',
            email: '',
            phone: '',
            guardianPhone1: '',
            guardianPhone2: '',
            age: 16,
            gender: 'Masculino',
            address: '',
            currentClassId: '',
          });
        }, 1500);
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <UserPlus className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Registrar Nuevo Estudiante
              </h3>
              <p className="text-xs text-slate-500">
                Datos personales, tutores y asignación de clase
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

        {/* Modal Form */}
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

          {/* Información Personal */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              1. Datos del Estudiante
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  C.I. / Documento *
                </label>
                <input
                  type="text"
                  name="ci"
                  required
                  value={formData.ci}
                  onChange={handleChange}
                  placeholder="Ej. 10293847"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

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
                  placeholder="Ej. Juan Carlos"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  placeholder="Ej. Pérez Rojas"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="alumno@ejemplo.com"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Celular / WhatsApp *
                </label>
                <input
                  type="text"
                  name="phone"
                  required
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+591 7XXXXXXX"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Edad
                  </label>
                  <input
                    type="number"
                    name="age"
                    min={5}
                    max={99}
                    value={formData.age}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Género
                  </label>
                  <select
                    name="gender"
                    value={formData.gender}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-slate-200 px-2 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Masculino">Masc.</option>
                    <option value="Femenino">Fem.</option>
                    <option value="Otro">Otro</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dirección de Domicilio
              </label>
              <input
                type="text"
                name="address"
                value={formData.address}
                onChange={handleChange}
                placeholder="Ej. Calle Los Álamos #320, Zona Norte"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Contactos de Tutores */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              2. Contacto de Tutores / Apoderados (Opcional)
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono / Celular Tutor 1
                </label>
                <input
                  type="text"
                  name="guardianPhone1"
                  value={formData.guardianPhone1}
                  onChange={handleChange}
                  placeholder="+591 71112233 (Padre / Madre)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono / Celular Tutor 2
                </label>
                <input
                  type="text"
                  name="guardianPhone2"
                  value={formData.guardianPhone2}
                  onChange={handleChange}
                  placeholder="+591 72223344 (Contacto de emergencia)"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* Asignación de Clase */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              3. Matrícula y Asignación de Clase
            </h4>
            <div className="rounded-xl bg-slate-50 p-3.5 border border-slate-200">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Clase Inicial
              </label>
              <select
                name="currentClassId"
                value={formData.currentClassId}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              >
                <option value="">-- Sin clase asignada por el momento --</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.code}) - {cls.modality} (${cls.monthlyPrice.toFixed(2)} USD)
                  </option>
                ))}
              </select>
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-blue-700">
                <Sparkles className="h-3 w-3 text-blue-600 shrink-0" />
                <span>
                  Al asignar una clase, se creará automáticamente la cuota pendiente del mes actual para control de cobro.
                </span>
              </div>
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
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-600/20 hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando Estudiante...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Registrar Estudiante
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
