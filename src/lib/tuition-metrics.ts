import type { SerializedTuitionFee } from '@/actions/finance';

export function summarizeTuitionFees(fees: readonly Pick<SerializedTuitionFee, 'studentId' | 'amount' | 'status'>[]) {
  let paidCount = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  let paidCents = 0;
  let pendingCents = 0;
  let overdueCents = 0;
  const students = new Set<string>();
  const overdueStudents = new Set<string>();

  for (const fee of fees) {
    students.add(fee.studentId);
    const cents = Math.round(fee.amount * 100);

    switch (fee.status) {
      case 'PAID':
        paidCount++;
        paidCents += cents;
        break;
      case 'PENDING':
        pendingCount++;
        pendingCents += cents;
        break;
      case 'OVERDUE':
        overdueCount++;
        overdueCents += cents;
        overdueStudents.add(fee.studentId);
        break;
    }
  }

  const issuedCents = paidCents + pendingCents + overdueCents;
  return {
    feeCount: fees.length,
    paidCount,
    pendingCount,
    overdueCount,
    totalPaid: paidCents / 100,
    totalPending: pendingCents / 100,
    totalOverdue: overdueCents / 100,
    issuedAmount: issuedCents / 100,
    outstandingAmount: (pendingCents + overdueCents) / 100,
    studentsCount: students.size,
    overdueStudentsCount: overdueStudents.size,
    studentsWithoutOverdueCount: students.size - overdueStudents.size,
    collectionRate: issuedCents > 0 ? Math.round(paidCents / issuedCents * 1000) / 10 : 0,
  };
}
