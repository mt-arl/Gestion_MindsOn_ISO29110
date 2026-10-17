'use client';

import React, { useState, useMemo } from 'react';
import { 
  BookOpen, 
  Users, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  MessageCircle, 
  Filter, 
  Search, 
  Layers, 
  MapPin, 
  Globe, 
  Sparkles, 
  ChevronDown, 
  ChevronUp,
  CreditCard,
  Percent,
  TrendingUp,
  AlertCircle,
  Check,
  Receipt,
  PauseCircle
} from 'lucide-react';
import { 
  CourseFinanceBreakdownResponse, 
  CourseFinanceBreakdownItem, 
  StudentBreakdownInCourse,
  SerializedTuitionFee 
} from '@/actions/finance';
import { formatCurrency, formatDate, getMonthName } from '@/lib/utils';
import { buildWhatsAppUrl } from '@/lib/ecuador-validators';
import { PaymentModal } from './PaymentModal';
import { PaymentReceiptModal } from './PaymentReceiptModal';

interface CourseFinanceBreakdownProps {
  initialData: CourseFinanceBreakdownResponse;
}

export function CourseFinanceBreakdown({ initialData }: CourseFinanceBreakdownProps) {
  const [selectedBookFilter, setSelectedBookFilter] = useState<string>('ALL');
  const [selectedClassroomFilter, setSelectedClassroomFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedFeeForPayment, setSelectedFeeForPayment] = useState<SerializedTuitionFee | null>(null);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);

  // Filtrado reactivo de cursos
  const filteredCourses = useMemo(() => {
    return initialData.courses.filter((course) => {
      // Filtro de libro
      if (selectedBookFilter !== 'ALL' && course.book !== selectedBookFilter) {
        return false;
      }

      // Filtro de aula
      if (selectedClassroomFilter !== 'ALL' && course.classroom !== selectedClassroomFilter) {
        return false;
      }

      // Filtro de búsqueda textual
      if (!searchTerm.trim()) return true;
      const query = searchTerm.toLowerCase();

      const matchCourse = 
        course.name.toLowerCase().includes(query) ||
        course.code.toLowerCase().includes(query) ||
        course.unitTeacher.name.toLowerCase().includes(query) ||
        (course.speakingTeacher?.name.toLowerCase().includes(query) ?? false);

      const matchStudent = course.students.some(
        (st) =>
          st.firstName.toLowerCase().includes(query) ||
          st.lastName.toLowerCase().includes(query) ||
          (st.ci?.toLowerCase().includes(query) ?? false) ||
          st.email.toLowerCase().includes(query)
      );

      return matchCourse || matchStudent;
    });
  }, [initialData.courses, selectedBookFilter, selectedClassroomFilter, searchTerm]);

  // Cálculos consolidados del filtro actual
  const currentFilteredTotals = useMemo(() => {
    let projected = 0;
    let collected = 0;
    let pendingOrOverdue = 0;
    let students = 0;

    for (const c of filteredCourses) {
      projected += c.totals.totalProjected;
      collected += c.totals.totalCollected;
      pendingOrOverdue += c.totals.totalPendingOrOverdue;
      students += c.totals.activeStudentsCount;
    }

    const rate = projected > 0 ? Math.round(((collected / projected) * 100) * 10) / 10 : 0;

    return { projected, collected, pendingOrOverdue, students, rate };
  }, [filteredCourses]);

  const monthName = getMonthName(initialData.month);

  return (
    <div className="space-y-6">
      {/* 1. Global KPIs Bar for this Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Proyectado */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Proyección {monthName}
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-100">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-slate-900">
            {formatCurrency(currentFilteredTotals.projected)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            {currentFilteredTotals.students} alumnos en {filteredCourses.length} cursos
          </p>
        </div>

        {/* Total Recaudado */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-600">
              Efectivo Recaudado
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-emerald-700">
            {formatCurrency(currentFilteredTotals.collected)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-emerald-600">
            Pagos validados en el sistema
          </p>
        </div>

        {/* Por Cobrar / En Mora */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-rose-500">
              Pendiente / Mora
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-50 text-rose-700 border border-rose-100">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <p className="mt-2 text-2xl font-black text-rose-700">
            {formatCurrency(currentFilteredTotals.pendingOrOverdue)}
          </p>
          <p className="mt-1 text-[11px] font-semibold text-rose-600">
            Saldo por cobrar este periodo
          </p>
        </div>

        {/* Tasa de Cumplimiento */}
        <div className="rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Tasa de Cobro
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
              <Percent className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">
              {currentFilteredTotals.rate}%
            </span>
            <span className="text-xs font-bold text-slate-400">recaudado</span>
          </div>
          {/* Progress Bar */}
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div 
              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, currentFilteredTotals.rate))}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Filtros y Búsqueda */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm border border-slate-200/80">
        
        {/* Filtros Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Libro */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">Libro:</span>
            <select
              value={selectedBookFilter}
              onChange={(e) => setSelectedBookFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">Todos los Libros</option>
              <option value="AMARILLO">🟡 Libro Amarillo</option>
              <option value="ROJO">🔴 Libro Rojo</option>
              <option value="AZUL">🔵 Libro Azul</option>
            </select>
          </div>

          {/* Aula */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-400">Aula:</span>
            <select
              value={selectedClassroomFilter}
              onChange={(e) => setSelectedClassroomFilter(e.target.value)}
              className="rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 text-xs font-bold text-slate-700 focus:border-indigo-500 focus:bg-white focus:outline-none"
            >
              <option value="ALL">Todas las Aulas</option>
              <option value="BRAZIL">Aula Brazil</option>
              <option value="JAPAN">Aula Japan</option>
              <option value="LEARNINGLAND">Aula Learningland</option>
              <option value="VIRTUAL">Aula Virtual</option>
            </select>
          </div>
        </div>

        {/* Buscador */}
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por curso, docente o alumno..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/70 py-1.5 pl-9 pr-4 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all"
          />
        </div>
      </div>

      {/* 3. Lista de Cursos con Desglose */}
      {filteredCourses.length === 0 ? (
        <div className="rounded-2xl bg-white p-12 text-center border border-slate-200 shadow-sm">
          <AlertCircle className="mx-auto h-8 w-8 mb-2 text-slate-300" />
          <p className="text-sm font-bold text-slate-700">No se encontraron cursos con los filtros seleccionados</p>
          <p className="text-xs text-slate-400 mt-0.5">Intenta modificar los parámetros de libro, aula o búsqueda.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredCourses.map((course) => {
            const isAmarillo = course.book === 'AMARILLO';
            const isRojo = course.book === 'ROJO';
            const isAzul = course.book === 'AZUL';
            const isInRecess = course.status === 'IN_RECESS';

            const bookBadgeStyles = isAmarillo
              ? 'bg-amber-50 text-amber-900 border-amber-300'
              : isRojo
              ? 'bg-rose-50 text-rose-900 border-rose-300'
              : 'bg-sky-50 text-sky-900 border-sky-300';

            const cardBorder = isInRecess
              ? 'border-slate-300 border-dashed bg-slate-50/40'
              : isAmarillo
              ? 'border-amber-200/90'
              : isRojo
              ? 'border-rose-200/90'
              : 'border-sky-200/90';

            return (
              <div 
                key={course.id}
                className={`overflow-hidden rounded-2xl bg-white shadow-sm border-2 transition-all ${cardBorder}`}
              >
                {/* Cabecera del Curso con Resumen Financiero */}
                <div className="bg-slate-50/80 p-5 border-b border-slate-200/80 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                  
                  {/* Info del Curso */}
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs font-black text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-200 shadow-xs">
                        {course.code}
                      </span>
                      <span className="rounded-lg bg-indigo-50 px-2 py-0.5 text-xs font-black text-indigo-700 border border-indigo-200">
                        Nivel {course.level}
                      </span>
                      <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-0.5 text-xs font-black border shadow-xs ${bookBadgeStyles}`}>
                        <span className={`h-2 w-2 rounded-full shrink-0 ${
                          isAmarillo ? 'bg-amber-500' : isRojo ? 'bg-rose-500' : 'bg-sky-500'
                        }`} />
                        {isAmarillo ? 'Libro Amarillo' : isRojo ? 'Libro Rojo' : 'Libro Azul'}
                      </span>
                      {isInRecess && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700 border border-slate-300 shadow-xs">
                          <PauseCircle className="h-3.5 w-3.5 text-slate-600 shrink-0" />
                          En Receso
                        </span>
                      )}
                    </div>

                    <h3 className="text-lg font-black text-slate-900 tracking-tight">
                      {course.name}
                    </h3>

                    {/* Aula, Modalidad y Profesores */}
                    <div className="flex items-center gap-3 text-xs text-slate-500 font-semibold flex-wrap pt-0.5">
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-slate-400" />
                        Aula {course.classroom} ({course.modality})
                      </span>
                      <span>•</span>
                      <span className="text-slate-700">
                        <strong>Unit:</strong> {course.unitTeacher.name}
                      </span>
                      {course.speakingTeacher && (
                        <>
                          <span>•</span>
                          <span className="text-slate-700">
                            <strong>Speaking:</strong> {course.speakingTeacher.name}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Resumen Financiero del Curso (Lado Derecho) */}
                  <div className="flex items-center gap-3 flex-wrap lg:justify-end bg-white/90 p-3 rounded-xl border border-slate-200/80 shadow-xs">
                    {/* Alumnos */}
                    <div className="px-2 text-left">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Alumnos</span>
                      <span className="text-sm font-black text-slate-800 flex items-center gap-1">
                        <Users className="h-3.5 w-3.5 text-indigo-600" />
                        {course.totals.activeStudentsCount}
                      </span>
                    </div>

                    <div className="h-8 w-px bg-slate-200" />

                    {/* Proyección */}
                    <div className="px-2 text-left">
                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Proyección</span>
                      <span className="text-sm font-black text-slate-900">
                        {formatCurrency(course.totals.totalProjected)}
                      </span>
                    </div>

                    <div className="h-8 w-px bg-slate-200" />

                    {/* Recaudado */}
                    <div className="px-2 text-left">
                      <span className="text-[10px] font-bold uppercase text-emerald-600 block">Recaudado</span>
                      <span className="text-sm font-black text-emerald-700">
                        {formatCurrency(course.totals.totalCollected)}
                      </span>
                    </div>

                    <div className="h-8 w-px bg-slate-200" />

                    {/* Pendiente / Mora */}
                    <div className="px-2 text-left">
                      <span className="text-[10px] font-bold uppercase text-rose-500 block">Pendiente</span>
                      <span className="text-sm font-black text-rose-700">
                        {formatCurrency(course.totals.totalPendingOrOverdue)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Tabla de Alumnos del Curso */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-600">
                    <thead className="bg-white border-b border-slate-100 text-[10px] uppercase font-black text-slate-400 tracking-wider">
                      <tr>
                        <th className="px-5 py-3">Estudiante</th>
                        <th className="px-5 py-3">Contacto / WhatsApp</th>
                        <th className="px-5 py-3">Estado / Próximo Cobro</th>
                        <th className="px-5 py-3 text-right">Arancel Individual</th>
                        <th className="px-5 py-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {course.students.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-5 py-6 text-center text-slate-400">
                            No hay estudiantes activos matriculados en este curso.
                          </td>
                        </tr>
                      ) : (
                        course.students.map((st) => {
                          const rawPhone = st.phone.replace(/[^0-9]/g, '');

                          return (
                            <tr key={st.id} className="hover:bg-slate-50/60 transition-colors">
                              {/* Estudiante */}
                              <td className="px-5 py-3.5">
                                <div className="flex items-center gap-2.5">
                                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-indigo-50 border border-indigo-100 font-bold text-xs text-indigo-700">
                                    {st.firstName[0]}{st.lastName[0]}
                                  </div>
                                  <div>
                                    <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                                      <span>{st.firstName} {st.lastName}</span>
                                      {st.hasDisability && (
                                        <span 
                                          title="Estudiante con adaptaciones pedagógicas" 
                                          className="inline-flex items-center gap-0.5 rounded-md bg-rose-50 px-1 py-0.2 text-[9px] font-bold text-rose-700 border border-rose-200 cursor-help"
                                        >
                                          ♿
                                        </span>
                                      )}
                                      {st.notes && (
                                        <span 
                                          title={`Observaciones: ${st.notes}`} 
                                          className="cursor-help text-xs"
                                        >
                                          📝
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      CI: {st.ci || 'N/A'}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* Contacto WhatsApp */}
                              <td className="px-5 py-3.5">
                                <a
                                  href={buildWhatsAppUrl(
                                    st.phone,
                                    `Hola ${st.firstName}, te escribimos de MindsOn respecto a tu mensualidad de ${monthName}.`
                                  )}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 border border-emerald-100/60 shadow-xs"
                                >
                                  <MessageCircle className="h-3 w-3 text-emerald-600" />
                                  {st.phone}
                                </a>
                              </td>

                              {/* Estado / Próximo Cobro */}
                              <td className="px-5 py-3.5">
                                {st.contextualStatus === 'PAUSED' ? (
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-300">
                                    <PauseCircle className="h-3 w-3 text-slate-600 shrink-0" />
                                    Curso en Receso
                                  </span>
                                ) : st.contextualStatus === 'OVERDUE' ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-0.5 text-[10px] font-black text-rose-700 border border-rose-200 shadow-xs animate-pulse">
                                    <AlertTriangle className="h-3 w-3 text-rose-600 shrink-0" />
                                    {st.statusLabel}
                                  </span>
                                ) : st.contextualStatus === 'PENDING' ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">
                                    <Clock className="h-3 w-3 text-amber-600 shrink-0" />
                                    {st.statusLabel}
                                  </span>
                                ) : st.contextualStatus === 'PAID' ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                                    <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                                    Al Día
                                  </span>
                                ) : st.contextualStatus === 'FUTURE_ENROLLMENT' ? (
                                  <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                                    {st.statusLabel}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200">
                                    Sin emitir
                                  </span>
                                )}
                              </td>

                              {/* Arancel Individual */}
                              <td className="px-5 py-3.5 text-right">
                                <span className="font-black text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100 inline-block shadow-xs">
                                  {formatCurrency(st.monthlyFee)}
                                </span>
                              </td>

                                {/* Acción */}
                                <td className="px-5 py-3.5 text-right">
                                  {st.rawFee && (st.contextualStatus === 'PENDING' || st.contextualStatus === 'OVERDUE') ? (
                                    <button
                                      onClick={() => setSelectedFeeForPayment(st.rawFee || null)}
                                      className="inline-flex items-center gap-1 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 text-xs font-bold shadow-xs transition-all active:scale-[0.98]"
                                      title="Registrar pago de mensualidad"
                                    >
                                      <CreditCard className="h-3.5 w-3.5" />
                                      Pagar
                                    </button>
                                  ) : st.contextualStatus === 'PAID' ? (
                                    <button
                                      onClick={() => setSelectedReceiptId(st.feeId || st.rawFee?.id || null)}
                                      className="inline-flex items-center gap-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1 text-xs font-bold border border-emerald-200/80 shadow-xs transition-all active:scale-[0.98]"
                                      title="Ver / Reimprimir Comprobante Oficial"
                                    >
                                      <Receipt className="h-3.5 w-3.5 text-emerald-600" />
                                      Recibo
                                    </button>
                                  ) : (
                                    <span className="text-[11px] font-medium text-slate-400">
                                      --
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>

                    {/* Fila de Totales por Curso */}
                    {course.students.length > 0 && (
                      <tfoot className="bg-slate-50/90 border-t-2 border-slate-200/90 font-bold text-xs">
                        <tr>
                          <td colSpan={3} className="px-5 py-3.5 text-slate-800">
                            Total Recaudación del Curso <span className="font-extrabold text-indigo-900">({course.name})</span> — {course.totals.activeStudentsCount} alumnos
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <span className="font-black text-sm text-slate-900 bg-white px-3 py-1 rounded-xl border border-slate-300 shadow-xs inline-block">
                              {formatCurrency(course.totals.totalProjected)}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right text-[11px] font-bold text-emerald-700">
                            {course.totals.collectionRate}% cobrado
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Registrar Pago */}
      <PaymentModal
        isOpen={!!selectedFeeForPayment}
        fee={selectedFeeForPayment}
        onClose={() => setSelectedFeeForPayment(null)}
      />

      {/* Modal Comprobante Digital Oficial */}
      <PaymentReceiptModal
        isOpen={!!selectedReceiptId}
        paymentIdOrFeeId={selectedReceiptId}
        onClose={() => setSelectedReceiptId(null)}
      />
    </div>
  );
}
