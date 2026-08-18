'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  Edit3, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  BookOpen, 
  User, 
  Sparkles,
  ShieldCheck
} from 'lucide-react';
import { updateStudentAction, SerializedStudent, SerializedClass } from '@/actions/academic';
import { StudentStatus } from '@prisma/client';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: SerializedStudent | null;
  classes: SerializedClass[];
}

interface StudentFormData {
  ci: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  guardianPhone1: string;
  guardianPhone2: string;
  age: number;
  gender: string;
  address: string;
  status: StudentStatus;
  currentClassId: string;
}

export function EditStudentModal({ isOpen, onClose, student, classes }: EditStudentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState<StudentFormData>({
    ci: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    guardianPhone1: '',
    guardianPhone2: '',
    age: 18,
    gender: 'Masculino',
    address: '',
    status: StudentStatus.ACTIVE,
    currentClassId: '',
  });

  useEffect(() => {
    if (student) {
      setFormData({
        ci: student.ci || '',
        firstName: student.firstName || '',
        lastName: student.lastName || '',
        email: student.email || '',
        phone: student.phone || '',
        guardianPhone1: student.guardianPhone1 || '',
        guardianPhone2: student.guardianPhone2 || '',
        age: student.age || 18,
        gender: student.gender || 'Masculino',
        address: student.address || '',
        status: student.status as StudentStatus,
        currentClassId: student.currentClassId || '',
      });
      setError(null);
      setSuccessMsg(null);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await updateStudentAction(student.id, {
        ...formData,
        age: Number(formData.age) || 18,
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
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Editar Datos del Estudiante
              </h3>
              <p className="text-xs text-slate-500">
                Modificar información personal, estado y reasignar clase
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

          {/* 1. Datos Personales */}
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
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
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* 2. Contactos de Tutores */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              2. Contacto de Tutores / Apoderados
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono Tutor 1
                </label>
                <input
                  type="text"
                  name="guardianPhone1"
                  value={formData.guardianPhone1}
                  onChange={handleChange}
                  placeholder="+591 7XXXXXXX"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Teléfono Tutor 2
                </label>
                <input
                  type="text"
                  name="guardianPhone2"
                  value={formData.guardianPhone2}
                  onChange={handleChange}
                  placeholder="+591 7XXXXXXX"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            </div>
          </div>

          {/* 3. Clase Actual & Estado Académico */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              3. Asignación de Clase y Estado
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clase Asignada (Cambio de Grupo/Módulo)
                </label>
                <select
                  name="currentClassId"
                  value={formData.currentClassId}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="">-- Sin clase asignada --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} ({cls.code}) - {cls.modality} (${cls.monthlyPrice.toFixed(2)} USD)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estado Académico
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value={StudentStatus.ACTIVE}>Activo (ACTIVE)</option>
                  <option value={StudentStatus.INACTIVE}>Inactivo (INACTIVE)</option>
                  <option value={StudentStatus.GRADUATED}>Graduado (GRADUATED)</option>
                  <option value={StudentStatus.DROPPED}>Retirado (DROPPED)</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-blue-700 bg-blue-50 p-2.5 rounded-xl border border-blue-100">
              <Sparkles className="h-3.5 w-3.5 text-blue-600 shrink-0" />
              <span>
                Al cambiar la clase asignada, las próximas cuotas emitidas tomarán automáticamente el precio y horario del nuevo grupo.
              </span>
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
