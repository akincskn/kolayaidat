import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { AdminDashboard } from "./_components/admin-dashboard";
import { ResidentDashboard } from "./_components/resident-dashboard";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (session.user.role === "ADMIN") {
    const apartments = await prisma.apartment.findMany({
      where: { managerId: session.user.id },
      include: {
        units: {
          include: {
            resident: true,
            payments: {
              include: { due: true },
              orderBy: { uploadedAt: "desc" },
            },
          },
        },
        dues: { orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    });

    return <AdminDashboard apartments={apartments} />;
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
