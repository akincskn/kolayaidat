import { redirect, notFound } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { LeaseForm, type LeaseFormUnit } from "../_components/lease-form";
import { defaultLeaseValues } from "../_lib/lease-form-defaults";

export default async function NewLeasePage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { unit?: string };
}) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const apartment = await prisma.apartment.findFirst({
    where: { id: params.id, managerId: session.user.id },
    select: {
      id: true,
      name: true,
      units: {
        select: {
          id: true,
          unitNumber: true,
          resident: { select: { id: true, name: true, email: true } },
          leases: { where: { status: "ACTIVE" }, select: { id: true } },
        },
        orderBy: { unitNumber: "asc" },
      },
    },
  });
  if (!apartment) notFound();

  const units: LeaseFormUnit[] = apartment.units.map((u) => ({
    id: u.id,
    unitNumber: u.unitNumber,
    resident: u.resident,
    hasActiveLease: u.leases.length > 0,
  }));

  // ?unit= ile gelinmişse (daire listesindeki "Kira Sözleşmesi Ekle") önceden seç.
  const preselected = units.find((u) => u.id === searchParams.unit && !u.hasActiveLease);

  return (
    <LeaseForm
      mode="create"
      apartmentId={apartment.id}
      apartmentName={apartment.name}
      units={units}
      initialValues={defaultLeaseValues(preselected?.id ?? "")}
    />
  );
}
