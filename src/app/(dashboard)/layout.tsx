import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  let apartments: { id: string; name: string }[] = [];
  if (session.user.role === "ADMIN") {
    apartments = await prisma.apartment.findMany({
      where: { managerId: session.user.id },
      select: { id: true, name: true },
      orderBy: { createdAt: "asc" },
    });
  }

  return (
    <DashboardShell
      user={{
        name: session.user.name ?? "",
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      apartments={apartments}
    >
      {children}
    </DashboardShell>
  );
}
