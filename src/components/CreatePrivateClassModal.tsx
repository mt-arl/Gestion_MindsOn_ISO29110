'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { 
  Calendar, 
  X, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  User, 
  MapPin, 
  DollarSign, 
  Clock, 
  BookOpen, 
  Sparkles 
} from 'lucide-react';
import { createPrivateClassAction } from '@/actions/schedule';
import { SerializedTeacher, SerializedStudent } from '@/actions/academic';
import { getClassroomsAction, SerializedClassroom } from '@/actions/classrooms';
import { getBooksAction, SerializedBook } from '@/actions/books';

interface CreatePrivateClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  teachers: SerializedTeacher[];
  students: SerializedStudent[];
}

export function CreatePrivateClassModal({
  isOpen,
  onClose,
  teachers,
  students,
}: CreatePrivateClassModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [classrooms, setClassrooms] = useState<SerializedClassroom[]>([]);
  const [books, setBooks] = useState<SerializedBook[]>([]);
  const [selectedBookId, setSelectedBookId] = useState<string>('');
  const [selectedStudentType, setSelectedStudentType] = useState<'EXISTING' | 'CUSTOM'>('EXISTING');

  const [formData, setFormData] = useState({
    studentId: students[0]?.id || '',
    studentName: students[0] ? `${students[0].firstName} ${students[0].lastName}` : '',
    teacherId: teachers[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    startTime: '15:00',
    endTime: '16:00',
    classroom: 'Aula BRAZIL',
    classroomId: '',
    topic: 'Nivelación / Preparación TOEFL / Speaking intensivo',
    chargeAmount: 25.00,
  });

  useEffect(() => {
    if (isOpen) {
      getClassroomsAction(false).then((data) => {
        setClassrooms(data);
        if (data.length > 0) {
          setFormData((prev) => ({
            ...prev,
            classroomId: prev.classroomId || data[0].id,
            classroom: prev.classroom || data[0].name,
          }));
        }
      });
      getBooksAction(false).then((data) => {
        setBooks(data);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStudentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const studentId = e.target.value;
    const found = students.find((s) => s.id === studentId);
    setFormData((prev) => ({
      ...prev,
      studentId: studentId,
      studentName: found ? `${found.firstName} ${found.lastName}` : '',
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const studentFinalName = selectedStudentType === 'EXISTING' ? formData.studentName : formData.studentName.trim();
    if (!studentFinalName) {
      setError('Debes indicar el nombre del estudiante.');
      return;
    }

    startTransition(async () => {
      const res = await createPrivateClassAction({
        studentName: studentFinalName,
        studentId: selectedStudentType === 'EXISTING' ? formData.studentId : null,
        teacherId: formData.teacherId,
        bookId: selectedBookId || null,
        date: formData.date,
        startTime: formData.startTime,
        endTime: formData.endTime,
        classroomId: formData.classroomId || undefined,
        classroom: formData.classroom,
        topic: formData.topic,
        chargeAmount: Number(formData.chargeAmount) || 0,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-150">
        
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-100 text-purple-700">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Agendar Clase Privada / Extra
              </h3>
              <p className="text-xs text-slate-500">
                Sesión 1 a 1, nivelación intensiva o preparación especial
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

          {/* Student selection tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Estudiante Solicitante *
            </label>
            <div className="flex rounded-xl bg-slate-100 p-1 mb-2">
              <button
                type="button"
                onClick={() => setSelectedStudentType('EXISTING')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  selectedStudentType === 'EXISTING'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Alumno Registrado
              </button>
              <button
                type="button"
                onClick={() => setSelectedStudentType('CUSTOM')}
                className={`flex-1 rounded-lg py-1.5 text-xs font-bold transition-all ${
                  selectedStudentType === 'CUSTOM'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Estudiante Externo / Particular
              </button>
            </div>

            {selectedStudentType === 'EXISTING' ? (
              <select
                value={formData.studentId}
                onChange={handleStudentSelect}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.firstName} {s.lastName} (CI: {s.ci})
                  </option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                name="studentName"
                value={formData.studentName}
                onChange={handleChange}
                placeholder="Nombre completo del estudiante"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              />
            )}
          </div>

          {/* Teacher and Classroom */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Docente Asignado *
              </label>
              <select
                name="teacherId"
                required
                value={formData.teacherId}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              >
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Aula / Espacio *
              </label>
              <select
                name="classroomId"
                value={formData.classroomId}
                onChange={(e) => {
                  const sel = classrooms.find((c) => c.id === e.target.value);
                  setFormData((prev) => ({
                    ...prev,
                    classroomId: e.target.value,
                    classroom: sel ? sel.name : prev.classroom,
                  }));
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              >
                {classrooms.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.isVirtual ? '(Virtual)' : `(Cap: ${c.capacity})`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Libro / Material de Trabajo (Opcional) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Libro / Material de Trabajo (Opcional)
            </label>
            <select
              value={selectedBookId}
              onChange={(e) => setSelectedBookId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
            >
              <option value="">-- Sin libro específico / General --</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} {b.levelsLabel ? `(${b.levelsLabel})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Date, Start Time and End Time */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fecha *
              </label>
              <input
                type="date"
                name="date"
                required
                value={formData.date}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hora Inicio *
              </label>
              <input
                type="time"
                name="startTime"
                required
                value={formData.startTime}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hora Fin *
              </label>
              <input
                type="time"
                name="endTime"
                required
                value={formData.endTime}
                onChange={handleChange}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-800 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              />
            </div>
          </div>

          {/* Topic and Charge Amount */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tema / Objetivo de la Sesión *
              </label>
              <input
                type="text"
                name="topic"
                required
                value={formData.topic}
                onChange={handleChange}
                placeholder="Ej. Preparación examen TOEFL / Speaking intensivo"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Monto Acordado ($ USD) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="chargeAmount"
                  required
                  value={formData.chargeAmount}
                  onChange={handleChange}
                  className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-xs font-black text-purple-700 focus:border-purple-500 focus:outline-none focus:ring-4 focus:ring-purple-500/10"
                />
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
              className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-purple-600/20 hover:bg-purple-700 transition-all disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Agendando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Confirmar y Agendar
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
