'use client';

import React, { useState, useEffect, useTransition, useMemo } from 'react';
import { 
  Edit3, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  DollarSign, 
  Sparkles,
  HeartPulse,
  FileText,
  Check,
  Calendar,
  Landmark,
  Copy,
  CheckCheck
} from 'lucide-react';
import { updateStudentAction, SerializedStudent, SerializedClass } from '@/actions/academic';
import { StudentStatus } from '@prisma/client';
import { validateEcuadorianId, validateEcuadorianPhone } from '@/lib/ecuador-validators';

interface EditStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: SerializedStudent | null;
  classes: SerializedClass[];
}

export function EditStudentModal({ isOpen, onClose, student, classes }: EditStudentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [ci, setCi] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [guardianPhone1, setGuardianPhone1] = useState('');
  const [guardianPhone2, setGuardianPhone2] = useState('');
  const [age, setAge] = useState<number | string>(18);
  const [gender, setGender] = useState('Masculino');
  const [address, setAddress] = useState('');
  const [monthlyFee, setMonthlyFee] = useState<number | string>(65);
  const [status, setStatus] = useState<StudentStatus>(StudentStatus.ACTIVE);
  const [currentClassId, setCurrentClassId] = useState('');

  // Discapacidad y Notas
  const [hasDisability, setHasDisability] = useState(false);
  const [disabilityDescription, setDisabilityDescription] = useState('');
  const [notes, setNotes] = useState('');

  // Datos para Facturación SRI
  const [invoiceIdType, setInvoiceIdType] = useState('CEDULA');
  const [invoiceIdNumber, setInvoiceIdNumber] = useState('');
  const [invoiceName, setInvoiceName] = useState('');
  const [invoiceEmail, setInvoiceEmail] = useState('');
  const [invoiceAddress, setInvoiceAddress] = useState('');
  const [invoicePhone, setInvoicePhone] = useState('');
  const [copiedInvoiceFeedback, setCopiedInvoiceFeedback] = useState(false);

  const handleCopyStudentDataToInvoice = () => {
    if (ci.trim()) setInvoiceIdNumber(ci.trim());
    const fullName = `${firstName.trim()} ${lastName.trim()}`.trim();
    if (fullName) setInvoiceName(fullName);
    if (email.trim()) setInvoiceEmail(email.trim());
    if (address.trim()) setInvoiceAddress(address.trim());
    if (phone.trim()) setInvoicePhone(phone.trim());
    setCopiedInvoiceFeedback(true);
    setTimeout(() => setCopiedInvoiceFeedback(false), 2000);
  };

  useEffect(() => {
    if (student) {
      setCi(student.ci || '');
      setFirstName(student.firstName || '');
      setLastName(student.lastName || '');
      setEmail(student.email || '');
      setPhone(student.phone || '');
      setGuardianPhone1(student.guardianPhone1 || '');
      setGuardianPhone2(student.guardianPhone2 || '');
      setAge(student.age || 18);
      setGender(student.gender || 'Masculino');
      setAddress(student.address || '');
      setMonthlyFee(student.monthlyFee ?? 65);
      setStatus(student.status as StudentStatus);
      setCurrentClassId(student.currentClassId || '');
      setHasDisability(Boolean(student.hasDisability));
      setDisabilityDescription(student.disabilityDescription || '');
      setNotes(student.notes || '');
      setInvoiceIdType(student.invoiceIdType || 'CEDULA');
      setInvoiceIdNumber(student.invoiceIdNumber || '');
      setInvoiceName(student.invoiceName || '');
      setInvoiceEmail(student.invoiceEmail || '');
      setInvoiceAddress(student.invoiceAddress || '');
      setInvoicePhone(student.invoicePhone || '');
      setError(null);
      setSuccessMsg(null);
    }
  }, [student]);

  // Validaciones en vivo
  const ciValidation = useMemo(() => {
    if (!ci.trim()) return { isValid: true };
    return validateEcuadorianId(ci);
  }, [ci]);

  const phoneValidation = useMemo(() => {
    if (!phone.trim()) return { isValid: false, error: 'Requerido' };
    return validateEcuadorianPhone(phone);
  }, [phone]);

  const guardian1Validation = useMemo(() => {
    return validateEcuadorianPhone(guardianPhone1);
  }, [guardianPhone1]);

  const guardian2Validation = useMemo(() => {
    return validateEcuadorianPhone(guardianPhone2);
  }, [guardianPhone2]);

  const isFormValid = useMemo(() => {
    if (ci.trim() && !ciValidation.isValid) return false;
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return false;
    if (!phoneValidation.isValid) return false;
    if (guardianPhone1 && !guardian1Validation.isValid) return false;
    if (guardianPhone2 && !guardian2Validation.isValid) return false;
    if (hasDisability && !disabilityDescription.trim()) return false;
    if (Number(monthlyFee) < 0 || isNaN(Number(monthlyFee))) return false;
    return true;
  }, [
    ci,
    ciValidation,
    firstName,
    lastName,
    email,
    phoneValidation,
    guardianPhone1,
    guardian1Validation,
    guardianPhone2,
    guardian2Validation,
    hasDisability,
    disabilityDescription,
    monthlyFee,
  ]);

  if (!isOpen || !student) return null;

  // Manejadores con restricciones en tiempo real
  const handleNameChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const cleaned = e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g, '');
    setter(cleaned);
  };

  const handleCiChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value.replace(/\D/g, '').slice(0, 10);
    setCi(cleaned);
  };

  const handlePhoneChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const cleaned = e.target.value.replace(/[^\d+]/g, '').slice(0, 15);
    setter(cleaned);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!isFormValid) {
      setError('Por favor revisa los campos señalados con error antes de continuar.');
      return;
    }

    startTransition(async () => {
      const res = await updateStudentAction(student.id, {
        ci: ci.trim() ? ci.trim() : null,
        firstName,
        lastName,
        email,
        phone,
        guardianPhone1: guardianPhone1.trim() || null,
        guardianPhone2: guardianPhone2.trim() || null,
        age: Number(age) || 18,
        gender,
        address: address.trim() || null,
        status,
        monthlyFee: Number(monthlyFee) || 0,
        hasDisability,
        disabilityDescription: hasDisability ? disabilityDescription.trim() : null,
        notes: notes.trim() || null,
        invoiceIdType,
        invoiceIdNumber: invoiceIdNumber.trim() || null,
        invoiceName: invoiceName.trim() || null,
        invoiceEmail: invoiceEmail.trim() || null,
        invoiceAddress: invoiceAddress.trim() || null,
        invoicePhone: invoicePhone.trim() || null,
        currentClassId: currentClassId || null,
      });

      if (res.success) {
        setSuccessMsg(res.message);
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
        }, 1200);
      } else {
        setError(res.message);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
              <Edit3 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Editar Estudiante: {student.firstName} {student.lastName}
              </h3>
              <p className="text-xs text-slate-500">
                Actualización de matrícula, arancel acordado y adaptaciones
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

          {/* 1. Datos Personales */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              Datos Personales
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Cédula Ecuatoriana con Validación en Vivo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Cédula de Identidad (Opcional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={ci}
                    onChange={handleCiChange}
                    placeholder="Ej. 1712345678 (Opcional)"
                    maxLength={10}
                    className={`w-full rounded-xl border py-2 pl-3 pr-8 text-xs font-mono font-bold text-slate-900 focus:outline-none focus:ring-4 ${
                      ci.length === 0
                        ? 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                        : ciValidation.isValid
                        ? 'border-emerald-400 bg-emerald-50/20 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-500/10'
                        : 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-500/10'
                    }`}
                  />
                  {ci.length > 0 && (
                    <div className="absolute right-2.5 top-1/2 -translate-y-1/2">
                      {ciValidation.isValid ? (
                        <Check className="h-4 w-4 text-emerald-600 font-bold" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-rose-500" />
                      )}
                    </div>
                  )}
                </div>
                {ci.length > 0 && !ciValidation.isValid && (
                  <p className="text-[10px] text-rose-600 font-semibold mt-1">
                    {ciValidation.error}
                  </p>
                )}
                {ci.length === 10 && ciValidation.isValid && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-1 flex items-center gap-1">
                    ✓ Cédula ecuatoriana válida
                  </p>
                )}
              </div>

              {/* Nombres (Solo Letras) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nombres *
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={handleNameChange(setFirstName)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              {/* Apellidos (Solo Letras) */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Apellidos *
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={handleNameChange(setLastName)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Correo */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Correo Electrónico *
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value.toLowerCase())}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              {/* Edad */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Edad *
                </label>
                <input
                  type="number"
                  min="5"
                  max="99"
                  required
                  value={age}
                  onChange={(e) => setAge(e.target.value.replace(/\D/g, ''))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                />
              </div>

              {/* Género */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Género *
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="Masculino">Masculino</option>
                  <option value="Femenino">Femenino</option>
                  <option value="Otro">Otro / Prefiero no decir</option>
                </select>
              </div>
            </div>
          </div>

          {/* 2. Contacto y Tutores */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              Teléfonos y Contactos (Ecuador)
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Celular Alumno */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Celular Alumno (WhatsApp) *
                </label>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={handlePhoneChange(setPhone)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:ring-4 ${
                    phone.length === 0
                      ? 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                      : phoneValidation.isValid
                      ? 'border-emerald-400 bg-emerald-50/20 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-500/10'
                      : 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-500/10'
                  }`}
                />
                {phone.length > 0 && !phoneValidation.isValid && (
                  <p className="text-[10px] text-rose-600 font-semibold mt-1">
                    {phoneValidation.error}
                  </p>
                )}
              </div>

              {/* Celular Tutor 1 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Celular Tutor 1 (Opcional)
                </label>
                <input
                  type="tel"
                  value={guardianPhone1}
                  onChange={handlePhoneChange(setGuardianPhone1)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:ring-4 ${
                    !guardianPhone1
                      ? 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                      : guardian1Validation.isValid
                      ? 'border-emerald-400 bg-emerald-50/20 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-500/10'
                      : 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-500/10'
                  }`}
                />
                {guardianPhone1 && !guardian1Validation.isValid && (
                  <p className="text-[10px] text-rose-600 font-semibold mt-1">
                    {guardian1Validation.error}
                  </p>
                )}
              </div>

              {/* Celular Tutor 2 */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Celular Tutor 2 (Opcional)
                </label>
                <input
                  type="tel"
                  value={guardianPhone2}
                  onChange={handlePhoneChange(setGuardianPhone2)}
                  className={`w-full rounded-xl border px-3 py-2 text-xs font-mono font-medium focus:outline-none focus:ring-4 ${
                    !guardianPhone2
                      ? 'border-slate-200 focus:border-indigo-500 focus:ring-indigo-500/10'
                      : guardian2Validation.isValid
                      ? 'border-emerald-400 bg-emerald-50/20 text-emerald-900 focus:border-emerald-500 focus:ring-emerald-500/10'
                      : 'border-rose-400 bg-rose-50/20 text-rose-900 focus:border-rose-500 focus:ring-rose-500/10'
                  }`}
                />
                {guardianPhone2 && !guardian2Validation.isValid && (
                  <p className="text-[10px] text-rose-600 font-semibold mt-1">
                    {guardian2Validation.error}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dirección Domiciliaria (Opcional)
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          {/* 3. Asignación Académica, Estado y Arancel */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1">
              Asignación Académica & Arancel Acordado
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Curso / Grupo Asignado
                </label>
                <select
                  value={currentClassId}
                  onChange={(e) => setCurrentClassId(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value="">-- Sin asignar / Pendiente --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.code} - {cls.name} ({cls.level}) {cls.status === 'IN_RECESS' ? '(En Receso)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Estado del Alumno *
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StudentStatus)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                >
                  <option value={StudentStatus.ACTIVE}>Activo</option>
                  <option value={StudentStatus.INACTIVE}>Inactivo</option>
                  <option value={StudentStatus.GRADUATED}>Graduado</option>
                  <option value={StudentStatus.DROPPED}>Retirado</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mensualidad Individual ($ USD) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={monthlyFee}
                    onChange={(e) => setMonthlyFee(e.target.value.replace(/[^0-9.]/g, ''))}
                    className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-black text-emerald-700 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 4. Apartado de Facturación SRI (Manual) */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-slate-100 pb-1">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Landmark className="h-4 w-4 text-indigo-600" />
                <span>Datos de Facturación SRI (Opcional)</span>
              </h4>
              <button
                type="button"
                onClick={handleCopyStudentDataToInvoice}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200/70 transition-colors"
                title="Copiar cédula, nombre, correo y dirección del estudiante a los datos de factura"
              >
                {copiedInvoiceFeedback ? (
                  <>
                    <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">¡Datos copiados!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copiar datos del estudiante</span>
                  </>
                )}
              </button>
            </div>

            <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-200 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tipo de Documento */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Tipo de Identificación
                  </label>
                  <select
                    value={invoiceIdType}
                    onChange={(e) => setInvoiceIdType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  >
                    <option value="CEDULA">Cédula (10 dígitos)</option>
                    <option value="RUC">R.U.C. (13 dígitos)</option>
                    <option value="PASAPORTE">Pasaporte</option>
                    <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                  </select>
                </div>

                {/* Número de Identificación (Cédula / RUC) */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número de Cédula / RUC
                  </label>
                  <input
                    type="text"
                    value={invoiceIdNumber}
                    onChange={(e) => setInvoiceIdNumber(e.target.value)}
                    placeholder="Ej. 1712345678 o 1712345678001"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Razón Social / Nombre Completo */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Razón Social / Nombres y Apellidos
                  </label>
                  <input
                    type="text"
                    value={invoiceName}
                    onChange={(e) => setInvoiceName(e.target.value)}
                    placeholder="Nombre que saldrá en la factura"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {/* Correo Electrónico Fiscal */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Correo para Factura Electrónica
                  </label>
                  <input
                    type="email"
                    value={invoiceEmail}
                    onChange={(e) => setInvoiceEmail(e.target.value)}
                    placeholder="correo.factura@ejemplo.com"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Dirección Fiscal */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Dirección Fiscal / Domicilio
                  </label>
                  <input
                    type="text"
                    value={invoiceAddress}
                    onChange={(e) => setInvoiceAddress(e.target.value)}
                    placeholder="Ej. Av. Amazonas y República, Quito"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>

                {/* Teléfono Fiscal (opcional) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Teléfono Fiscal (Opcional)
                  </label>
                  <input
                    type="text"
                    value={invoicePhone}
                    onChange={(e) => setInvoicePhone(e.target.value)}
                    placeholder="099..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
                  />
                </div>
              </div>

              <p className="text-[10px] text-slate-400 italic">
                Estos datos se mostrarán directamente en el modal de cobro para facilitar su copiado rápido al portal del SRI en línea.
              </p>
            </div>
          </div>

          {/* 5. Apartado de Discapacidad / Adaptaciones Pedagógicas */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <HeartPulse className="h-4 w-4 text-rose-500" />
              Condición Especial / Discapacidad
            </h4>

            <div className="rounded-2xl bg-slate-50/80 p-4 border border-slate-200 space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  ¿El estudiante tiene alguna discapacidad o condición médica especial?
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setHasDisability(false);
                      setDisabilityDescription('');
                    }}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                      !hasDisability
                        ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    No
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasDisability(true)}
                    className={`flex-1 rounded-xl py-2 text-xs font-bold transition-all ${
                      hasDisability
                        ? 'bg-rose-50 text-rose-800 border border-rose-300 shadow-xs'
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                  >
                    ♿ Sí, requiere adaptaciones pedagógicas
                  </button>
                </div>
              </div>

              {hasDisability && (
                <div className="animate-in fade-in zoom-in-95 duration-150 pt-1">
                  <label className="block text-xs font-bold text-rose-900 mb-1">
                    Descripción de la Discapacidad / Recomendaciones Pedagógicas *
                  </label>
                  <textarea
                    required={hasDisability}
                    value={disabilityDescription}
                    onChange={(e) => setDisabilityDescription(e.target.value)}
                    rows={3}
                    placeholder="Detalla la condición, tipo de discapacidad, adaptaciones en el aula o recomendaciones para los profesores..."
                    className="w-full rounded-xl border border-rose-300 bg-white p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-rose-500 focus:outline-none focus:ring-4 focus:ring-rose-500/10"
                  />
                </div>
              )}
            </div>
          </div>

          {/* 5. Apartado de Notas / Observaciones Generales */}
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 pb-1 flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-500" />
              Observaciones Internas
            </h4>

            <div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Información relevante sobre el estudiante, acuerdos de pago, horarios especiales, etc..."
                className="w-full rounded-xl border border-slate-200 p-3 text-xs text-slate-800 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-4 focus:ring-indigo-500/10"
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
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
              disabled={isPending || !isFormValid}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando cambios...
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
