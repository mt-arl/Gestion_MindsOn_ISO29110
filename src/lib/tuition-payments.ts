import type { Prisma } from '@prisma/client';
import { financialMonthRange, type TuitionPeriod } from '@/lib/tuition-dates';

export function priorTuitionPaymentsWhere({ year, month }: TuitionPeriod, now: Date): Prisma.PaymentWhereInput {
  return {
    paymentDate: { ...financialMonthRange(year, month), lte: now },
    tuitionFee: {
      OR: [{ year: { lt: year } }, { year, month: { lt: month } }],
    },
  };
}
