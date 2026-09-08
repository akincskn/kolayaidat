import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LeaseDetail, type LeaseDetailData } from "./_components/lease-detail";
import { loadManagedLease } from "../_lib/load-lease";

export default async function LeaseDetailPage({
  params,
}: {
  params: { id: string; leaseId: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const lease = await loadManagedLease(prisma, params.id, params.leaseId, session.user.id);
  if (!lease) notFound();

  const data: LeaseDetailData = {
    id: lease.id,
    unitNumber: lease.unit.unitNumber,
    apartmentId: params.id,
    apartmentName: lease.unit.apartment.name,
    tenant: lease.tenant,
    monthlyRent: lease.monthlyRent,
    startDate: lease.startDate.toISOString(),
    endDate: lease.endDate.toISOString(),
    paymentDay: lease.paymentDay,
    depositAmount: lease.depositAmount,
    depositStatus: lease.depositStatus,
    depositPaidAt: lease.depositPaidAt?.toISOString() ?? null,
    depositRefundedAt: lease.depositRefundedAt?.toISOString() ?? null,
    rentIncreaseRate: lease.rentIncreaseRate,
    notes: lease.notes,
    status: lease.status,
    charges: lease.charges.map((c) => {
      // Bir borca ait en fazla bir ödeme olabilir (@@unique[rentChargeId, unitId]).
      const payment = c.payments[0];
      return {
        id: c.id,
        month: c.month,
        year: c.year,
        amount: c.amount,
        dueDate: c.dueDate.toISOString(),
        payment: payment
          ? {
              id: payment.id,
              status: payment.status,
              receiptUrl: payment.receiptUrl,
              rejectionReason: payment.rejectionReason,
              uploadedAt: payment.uploadedAt.toISOString(),
            }
          : null,
      };
    }),
  };

  return <LeaseDetail lease={data} />;
}
