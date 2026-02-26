import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./_components/admin-dashboard";
import { ResidentDashboard } from "./_components/resident-dashboard";

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

    return <AdminDashboard apartment={apartment} />;
  }

  // RESIDENT dashboard
  const unit = await prisma.unit.findFirst({
    where: { residentId: session.user.id },
    include: {
      apartment: true,
      payments: {
        include: { due: true },
        orderBy: { uploadedAt: "desc" },
        take: 5,
      },
    },
  });

  return <ResidentDashboard unit={unit} userName={session.user.name ?? ""} />;
}
