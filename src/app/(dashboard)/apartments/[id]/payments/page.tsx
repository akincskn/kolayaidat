import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import { PaymentsManager } from "./_components/payments-manager";

export default async function PaymentsPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const apartment = await prisma.apartment.findFirst({
    where: { id: params.id, managerId: session.user.id },
    include: {
      dues: { orderBy: [{ year: "desc" }, { month: "desc" }] },
    },
  });
  if (!apartment) notFound();

  const payments = await prisma.payment.findMany({
    where: { unit: { apartmentId: params.id } },
    include: {
      due: true,
      unit: true,
      resident: { select: { name: true, email: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return <PaymentsManager apartment={apartment} initialPayments={payments} />;
}
