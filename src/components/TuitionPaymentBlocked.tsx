import { LockKeyhole } from 'lucide-react';
import type { TuitionPeriod } from '@/lib/tuition-dates';
import { getMonthName } from '@/lib/utils';

export function TuitionPaymentBlocked({ period }: { period: TuitionPeriod }) {
  return (
    <div className="inline-flex min-w-32 flex-col items-end gap-1">
      <button
        type="button"
        disabled
        className="inline-flex cursor-not-allowed items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-500"
      >
        <LockKeyhole className="h-3.5 w-3.5" aria-hidden="true" />
        Pago bloqueado
      </button>
      <span className="text-[11px] font-semibold text-slate-600">
        Primero paga {getMonthName(period.month)} {period.year}
      </span>
    </div>
  );
}
