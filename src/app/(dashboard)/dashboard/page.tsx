import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminDashboard, type RentSummary } from "./_components/admin-dashboard";
import { ResidentDashboard } from "./_components/resident-dashboard";
import { LEASE_EXPIRY_WARNING_DAYS } from "@/lib/constants";

interface PageProps {
  searchParams: Promise<{ apt?: string }>;
}

export default async function DashboardPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role === "ADMIN") {
    const { apt } = await searchParams;

    const allApartments = await prisma.apartment.findMany({
      where: { managerId: session.user.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });

    const selectedId = allApartments.find((a) => a.id === apt)?.id ?? allApartments[0]?.id;

    const apartment = selectedId
      ? await prisma.apartment.findUnique({
          where: { id: selectedId },
          include: {
            units: {
              include: {
                resident: { select: { id: true, name: true } },
                payments: {
                  // Aidat özeti yalnızca aidat ödemelerinden hesaplanır; kira
                  // ödemeleri bu sayaçları kirletmesin.
                  where: { type: "AIDAT" },
                  include: { due: true },
                  orderBy: { uploadedAt: "desc" },
                },
              },
              orderBy: { unitNumber: "asc" },
            },
            dues: { orderBy: [{ year: "desc" }, { month: "desc" }] },
          },
        })
      : null;

    const rent = selectedId ? await getRentSummary(selectedId) : null;

    return <AdminDashboard apartment={apartment} rent={rent} />;
  }

  // RESIDENT dashboard
  const unit = await prisma.unit.findFirst({
    where: { residentId: session.user.id },
    include: {
      apartment: true,
      payments: {
        include: { due: true, rentCharge: true },
        orderBy: { uploadedAt: "desc" },
        take: 5,
      },
      leases: {
        where: { status: "ACTIVE", tenantId: session.user.id },
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
  });

  return <ResidentDashboard unit={unit} userName={session.user.name ?? ""} />;
}

/**
 * Apartmanın kira özetini hesaplar.
 *
 * "Bu ay" içinde bulunulan takvim ayıdır; aidat özetinin aksine kira borçları
 * her daire için ayrı olduğundan toplamlar tutar bazında verilir (adet değil).
 */
async function getRentSummary(apartmentId: string): Promise<RentSummary> {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  const expiryThreshold = new Date(now);
  expiryThreshold.setDate(expiryThreshold.getDate() + LEASE_EXPIRY_WARNING_DAYS);

  const [activeLeases, monthCharges, expiring] = await Promise.all([
    prisma.lease.findMany({
      where: { status: "ACTIVE", unit: { apartmentId } },
      select: { id: true, monthlyRent: true, depositAmount: true, depositStatus: true },
    }),
    prisma.rentCharge.findMany({
      where: { unit: { apartmentId }, month, year },
      select: { amount: true, payments: { select: { status: true } } },
    }),
    prisma.lease.findMany({
      where: {
        status: "ACTIVE",
        unit: { apartmentId },
        endDate: { lte: expiryThreshold },
      },
      select: {
        id: true,
        endDate: true,
        unit: { select: { unitNumber: true } },
        tenant: { select: { name: true } },
      },
      orderBy: { endDate: "asc" },
      take: 5,
    }),
  ]);

  let expected = 0;
  let collected = 0;
  let pendingCount = 0;

  for (const charge of monthCharges) {
    expected += charge.amount;
    const status = charge.payments[0]?.status;
    if (status === "APPROVED") collected += charge.amount;
    else if (status === "PENDING") pendingCount += 1;
  }

  return {
    activeLeaseCount: activeLeases.length,
    monthlyRentTotal: activeLeases.reduce((sum, l) => sum + l.monthlyRent, 0),
    heldDepositTotal: activeLeases
      .filter((l) => l.depositStatus === "PAID")
      .reduce((sum, l) => sum + l.depositAmount, 0),
    month,
    year,
    expected,
    collected,
    pendingCount,
    expiringLeases: expiring.map((l) => ({
      id: l.id,
      unitNumber: l.unit.unitNumber,
      tenantName: l.tenant?.name ?? null,
      endDate: l.endDate.toISOString(),
    })),
  };
}
