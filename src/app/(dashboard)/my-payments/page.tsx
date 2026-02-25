import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { MyPaymentsClient } from "./_components/my-payments-client";

export default async function MyPaymentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "RESIDENT") redirect("/dashboard");

  const unit = await prisma.unit.findFirst({
    where: { residentId: session.user.id },
    include: { apartment: true },
  });

  if (!unit) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-slate-800">Ödemelerim</h1>
        <div className="bg-slate-50 rounded-xl p-10 text-center text-slate-400">
          Henüz bir daireye atanmadınız. Yöneticinizden davet isteyin.
        </div>
      </div>
    );
  }

  const dues = await prisma.due.findMany({
    where: { apartmentId: unit.apartmentId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const payments = await prisma.payment.findMany({
    where: { unitId: unit.id },
    include: { due: true },
    orderBy: { uploadedAt: "desc" },
  });

  return (
    <MyPaymentsClient
      unit={{ ...unit, dueDate: unit.apartment.name }}
      dues={dues}
      initialPayments={payments}
    />
  );
}
