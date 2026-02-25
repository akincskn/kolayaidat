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
        },
        orderBy: { unitNumber: "asc" },
      },
    },
  });

  if (!apartment) notFound();

  return <ApartmentDetail apartment={apartment} />;
}
