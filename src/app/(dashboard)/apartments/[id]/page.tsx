import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { ApartmentDetail } from "./_components/apartment-detail";

export default async function ApartmentDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const apartment = await prisma.apartment.findFirst({
    where: { id: params.id, managerId: session.user.id },
    include: {
      units: {
        include: {
          resident: { select: { id: true, name: true, email: true, phone: true } },
          invites: {
            where: { usedAt: null, expiresAt: { gt: new Date() } },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
          // Daire satırında kira rozetini göstermek için yürürlükteki sözleşme.
          leases: {
            where: { status: "ACTIVE" },
            select: { id: true, monthlyRent: true, endDate: true, status: true },
            orderBy: { startDate: "desc" },
            take: 1,
          },
        },
        orderBy: { unitNumber: "asc" },
      },
    },
  });

  if (!apartment) notFound();

  const rawLeases = await prisma.lease.findMany({
    where: { unit: { apartmentId: params.id } },
    include: {
      unit: { select: { id: true, unitNumber: true } },
      tenant: { select: { name: true } },
      charges: { select: { payments: { select: { status: true } } } },
    },
    // Aktif sözleşmeler önce, sonra en yeni başlayan.
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });

  const leases = rawLeases.map((lease) => {
    const payments = lease.charges.flatMap((c) => c.payments);
    return {
      id: lease.id,
      unitId: lease.unit.id,
      unitNumber: lease.unit.unitNumber,
      tenantName: lease.tenant?.name ?? null,
      monthlyRent: lease.monthlyRent,
      startDate: lease.startDate.toISOString(),
      endDate: lease.endDate.toISOString(),
      depositAmount: lease.depositAmount,
      depositStatus: lease.depositStatus,
      status: lease.status,
      chargeCount: lease.charges.length,
      approvedCount: payments.filter((p) => p.status === "APPROVED").length,
      pendingCount: payments.filter((p) => p.status === "PENDING").length,
    };
  });

  const units = apartment.units.map((unit) => ({
    id: unit.id,
    unitNumber: unit.unitNumber,
    floor: unit.floor,
    resident: unit.resident,
    invites: unit.invites,
    activeLease: unit.leases[0]
      ? {
          id: unit.leases[0].id,
          monthlyRent: unit.leases[0].monthlyRent,
          endDate: unit.leases[0].endDate.toISOString(),
          status: unit.leases[0].status,
        }
      : null,
  }));

  return (
    <ApartmentDetail
      apartment={{
        id: apartment.id,
        name: apartment.name,
        address: apartment.address,
        units,
      }}
      leases={leases}
    />
  );
}
