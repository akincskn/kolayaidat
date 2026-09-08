import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { PaymentTable } from "./_components/payment-table";

interface PageProps {
  searchParams: Promise<{
    apt?: string;
    month?: string;
    year?: string;
    tur?: string;
  }>;
}

const isPaymentTypeFilter = (v?: string): v is "ALL" | "AIDAT" | "KIRA" =>
  v === "ALL" || v === "AIDAT" || v === "KIRA";

export default async function OdemelerPage({ searchParams }: PageProps) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const { apt, month, year, tur } = await searchParams;
  const typeFilter = isPaymentTypeFilter(tur) ? tur : "ALL";

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

  const apartment = allApartments.find((a) => a.id === apt) ?? allApartments[0];

  // Aidat dönemleri (mevcut davranış korunuyor)
  const dues = await prisma.due.findMany({
    where: { apartmentId: apartment.id },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  // Kira dönemleri — aidattan bağımsız olarak kendi aylarına sahiptir.
  const rentPeriods = await prisma.rentCharge.groupBy({
    by: ["year", "month"],
    where: { unit: { apartmentId: apartment.id } },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  // Ay seçici iki türün ortak dönem kümesi üzerinden çalışır: tek seçim,
  // iki bölüm. Böylece "Tümü" filtresinde aynı ayın aidat ve kirası yan yana gelir.
  const periodKey = (y: number, m: number) => y * 100 + m;
  const periodMap = new Map<number, { month: number; year: number }>();
  for (const d of dues) periodMap.set(periodKey(d.year, d.month), { month: d.month, year: d.year });
  for (const r of rentPeriods)
    periodMap.set(periodKey(r.year, r.month), { month: r.month, year: r.year });

  const periods = Array.from(periodMap.values()).sort(
    (a, b) => periodKey(b.year, b.month) - periodKey(a.year, a.month)
  );

  // Seçili dönem — URL param > mevcut ay > en son dönem (mevcut mantık korunuyor)
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();

  let selectedMonth: number;
  let selectedYear: number;

  if (month && year) {
    selectedMonth = parseInt(month);
    selectedYear = parseInt(year);
  } else {
    const currentPeriod = periods.find((p) => p.month === thisMonth && p.year === thisYear);
    const fallback = currentPeriod ?? periods[0];
    selectedMonth = fallback?.month ?? thisMonth;
    selectedYear = fallback?.year ?? thisYear;
  }

  const selectedDue =
    dues.find((d) => d.month === selectedMonth && d.year === selectedYear) ?? null;

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

  const rawUnits = await prisma.unit.findMany({
    where: { apartmentId: apartment.id },
    include: { resident: { select: { id: true, name: true, email: true } } },
    orderBy: { unitNumber: "asc" },
  });

  // Seçili aya ait kira borçları + dekontları
  const rawRentCharges = await prisma.rentCharge.findMany({
    where: {
      unit: { apartmentId: apartment.id },
      month: selectedMonth,
      year: selectedYear,
    },
    include: {
      unit: { select: { id: true, unitNumber: true } },
      lease: {
        select: {
          id: true,
          status: true,
          tenant: { select: { id: true, name: true, email: true } },
        },
      },
      payments: true,
    },
    orderBy: { unit: { unitNumber: "asc" } },
  });

  const payments = rawPayments.map((p) => ({
    id: p.id,
    dueId: p.dueId!,
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

  const rentCharges = rawRentCharges.map((c) => {
    const payment = c.payments[0];
    return {
      id: c.id,
      leaseId: c.lease.id,
      leaseStatus: c.lease.status as string,
      unitNumber: c.unit.unitNumber,
      tenant: c.lease.tenant,
      amount: c.amount,
      month: c.month,
      year: c.year,
      dueDate: c.dueDate.toISOString(),
      payment: payment
        ? {
            id: payment.id,
            status: payment.status as string,
            receiptUrl: payment.receiptUrl,
            rejectionReason: payment.rejectionReason,
          }
        : null,
    };
  });

  return (
    <PaymentTable
      key={`${apartment.id}-${selectedYear}-${selectedMonth}`}
      apartment={apartment}
      periods={periods}
      selectedPeriod={{ month: selectedMonth, year: selectedYear }}
      selectedDue={serializedSelectedDue}
      payments={payments}
      units={units}
      rentCharges={rentCharges}
      typeFilter={typeFilter}
    />
  );
}
