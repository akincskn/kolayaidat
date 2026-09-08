import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MyPaymentsClient, type ChargeItem } from "./_components/my-payments-client";

export default async function MyPaymentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "RESIDENT") redirect("/dashboard");

  const unit = await prisma.unit.findFirst({
    where: { residentId: session.user.id },
    include: { apartment: true },
  });

  if (!unit) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Ödemelerim</h1>
        <div className="bg-slate-50 rounded-xl p-10 text-center text-slate-400">
          Henüz bir daireye atanmadınız. Yöneticinizden davet isteyin.
        </div>
      </div>
    );
  }

  const [dues, rentCharges, payments, lease] = await Promise.all([
    prisma.due.findMany({
      where: { apartmentId: unit.apartmentId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    // Yalnızca bu sakinin kiracı olduğu sözleşmenin borçları.
    prisma.rentCharge.findMany({
      where: {
        unitId: unit.id,
        lease: { tenantId: session.user.id, status: { not: "CANCELLED" } },
      },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.payment.findMany({
      where: { unitId: unit.id },
      orderBy: { uploadedAt: "desc" },
    }),
    prisma.lease.findFirst({
      where: { unitId: unit.id, tenantId: session.user.id, status: "ACTIVE" },
      orderBy: { startDate: "desc" },
    }),
  ]);

  // Aidat ve kira borçları tek bir "ödenecek kalem" biçimine indirgenir; böylece
  // istemci tarafındaki kart/yükleme mantığı tek kopyada kalır (DRY).
  const paymentByDue = new Map(payments.filter((p) => p.dueId).map((p) => [p.dueId!, p]));
  const paymentByCharge = new Map(
    payments.filter((p) => p.rentChargeId).map((p) => [p.rentChargeId!, p])
  );

  const toItem = (
    source: { id: string; month: number; year: number; amount: number; dueDate: Date; description: string | null },
    type: "AIDAT" | "KIRA",
    payment: (typeof payments)[number] | undefined
  ): ChargeItem => ({
    id: source.id,
    type,
    month: source.month,
    year: source.year,
    amount: source.amount,
    dueDate: source.dueDate.toISOString(),
    description: source.description,
    payment: payment
      ? {
          id: payment.id,
          status: payment.status,
          receiptUrl: payment.receiptUrl,
          rejectionReason: payment.rejectionReason,
        }
      : null,
  });

  const items: ChargeItem[] = [
    ...dues.map((d) => toItem(d, "AIDAT", paymentByDue.get(d.id))),
    ...rentCharges.map((c) => toItem(c, "KIRA", paymentByCharge.get(c.id))),
  ].sort((a, b) => b.year * 100 + b.month - (a.year * 100 + a.month));

  return (
    <MyPaymentsClient
      apartmentName={unit.apartment.name}
      unitNumber={unit.unitNumber}
      items={items}
      lease={
        lease
          ? {
              monthlyRent: lease.monthlyRent,
              startDate: lease.startDate.toISOString(),
              endDate: lease.endDate.toISOString(),
              paymentDay: lease.paymentDay,
              depositAmount: lease.depositAmount,
              depositStatus: lease.depositStatus,
              status: lease.status,
            }
          : null
      }
    />
  );
}
