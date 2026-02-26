import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PaymentTable } from "./_components/payment-table";

interface PageProps {
  searchParams: Promise<{ apt?: string; month?: string; year?: string }>;
}

export default async function OdemelerPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const { apt, month, year } = await searchParams;

  // Get all admin apartments
  const allApartments = await prisma.apartment.findMany({
    where: { managerId: session.user.id },
    select: { id: true, name: true },
    orderBy: { createdAt: "asc" },
  });

  if (allApartments.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-slate-800">Ödemeler</h1>
        <div className="bg-white rounded-xl p-10 text-center text-slate-400 border">
          Henüz apartman eklenmedi.{" "}
          <a href="/apartments/new" className="text-blue-600 underline">
            Apartman ekle
          </a>
        </div>
      </div>
    );
  }

  // Find selected apartment
  const apartment = allApartments.find((a) => a.id === apt) ?? allApartments[0];

  // Get all dues for this apartment (for month tabs)
  const dues = await prisma.due.findMany({
    where: { apartmentId: apartment.id },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  // Determine selected due — URL param > mevcut ay > en son due
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();

  let selectedMonth: number;
  let selectedYear: number;

  if (month && year) {
    // Explicit URL param
    selectedMonth = parseInt(month);
    selectedYear = parseInt(year);
  } else {
    // Önce mevcut ayı ara, yoksa en son due'ya düş
    const currentMonthDue = dues.find(
      (d) => d.month === thisMonth && d.year === thisYear
    );
    const fallback = currentMonthDue ?? dues[0];
    selectedMonth = fallback?.month ?? thisMonth;
    selectedYear = fallback?.year ?? thisYear;
  }

  const selectedDue =
    dues.find((d) => d.month === selectedMonth && d.year === selectedYear) ?? null;

  // Get payments for selected due
  const rawPayments = selectedDue
    ? await prisma.payment.findMany({
        where: { dueId: selectedDue.id },
        include: {
          unit: true,
          resident: { select: { id: true, name: true, email: true } },
        },
        orderBy: { uploadedAt: "desc" },
      })
    : [];

  // Get all units for this apartment (with resident)
  const rawUnits = await prisma.unit.findMany({
    where: { apartmentId: apartment.id },
    include: {
      resident: { select: { id: true, name: true, email: true } },
    },
    orderBy: { unitNumber: "asc" },
  });

  // Serialize dates
  const payments = rawPayments.map((p) => ({
    id: p.id,
    dueId: p.dueId,
    unitId: p.unitId,
    residentId: p.residentId,
    status: p.status as string,
    receiptUrl: p.receiptUrl,
    rejectionReason: p.rejectionReason,
    uploadedAt: p.uploadedAt.toISOString(),
    reviewedAt: p.reviewedAt?.toISOString() ?? null,
    resident: p.resident,
  }));

  const units = rawUnits.map((u) => ({
    id: u.id,
    unitNumber: u.unitNumber,
    resident: u.resident,
  }));

  const serializedDues = dues.map((d) => ({
    id: d.id,
    month: d.month,
    year: d.year,
    amount: d.amount,
    dueDate: d.dueDate.toISOString(),
    description: d.description,
  }));

  const serializedSelectedDue = selectedDue
    ? {
        id: selectedDue.id,
        month: selectedDue.month,
        year: selectedDue.year,
        amount: selectedDue.amount,
        dueDate: selectedDue.dueDate.toISOString(),
        description: selectedDue.description,
      }
    : null;

  return (
    <PaymentTable
      key={`${apartment.id}-${serializedSelectedDue?.id ?? "no-due"}`}
      apartment={apartment}
      dues={serializedDues}
      selectedDue={serializedSelectedDue}
      payments={payments}
      units={units}
    />
  );
}
