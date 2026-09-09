import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sortPeriodsByRelevance } from "@/lib/period";
import { redirect, notFound } from "next/navigation";
import { DuesManager } from "./_components/dues-manager";

export default async function DuesPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const apartment = await prisma.apartment.findFirst({
    where: { id: params.id, managerId: session.user.id },
    include: {
      dues: {
        include: {
          payments: { select: { status: true } },
        },
        orderBy: [{ year: "desc" }, { month: "desc" }],
      },
      _count: { select: { units: true } },
    },
  });

  if (!apartment) notFound();

  const occupiedUnits = await prisma.unit.count({
    where: { apartmentId: params.id, residentId: { not: null } },
  });

  // Dönem sırası: güncel ay üstte, gelecek aylar sonda (bkz. lib/period).
  const sortedApartment = { ...apartment, dues: sortPeriodsByRelevance(apartment.dues) };

  return (
    <DuesManager
      apartment={sortedApartment}
      occupiedUnits={occupiedUnits}
    />
  );
}
