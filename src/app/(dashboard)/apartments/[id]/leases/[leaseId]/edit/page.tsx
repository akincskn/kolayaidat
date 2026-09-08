import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LeaseForm, type LeaseFormUnit } from "../../_components/lease-form";
import { loadManagedLease } from "../../_lib/load-lease";

export default async function EditLeasePage({
  params,
}: {
  params: { id: string; leaseId: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const lease = await loadManagedLease(prisma, params.id, params.leaseId, session.user.id);
  if (!lease) notFound();

  const resident = lease.unit.residentId
    ? await prisma.user.findUnique({
        where: { id: lease.unit.residentId },
        select: { id: true, name: true, email: true },
      })
    : null;

  // Düzenlemede daire değiştirilemediği için tek elemanlı liste yeterli.
  const units: LeaseFormUnit[] = [
    {
      id: lease.unit.id,
      unitNumber: lease.unit.unitNumber,
      resident,
      hasActiveLease: true,
    },
  ];

  const toInput = (d: Date) => d.toISOString().slice(0, 10);

  return (
    <LeaseForm
      mode="edit"
      apartmentId={params.id}
      apartmentName={lease.unit.apartment.name}
      units={units}
      initialValues={{
        id: lease.id,
        unitId: lease.unit.id,
        monthlyRent: String(lease.monthlyRent),
        startDate: toInput(lease.startDate),
        endDate: toInput(lease.endDate),
        paymentDay: String(lease.paymentDay),
        depositAmount: lease.depositAmount ? String(lease.depositAmount) : "",
        rentIncreaseRate: lease.rentIncreaseRate ? String(lease.rentIncreaseRate) : "",
        notes: lease.notes ?? "",
        status: lease.status,
      }}
    />
  );
}
