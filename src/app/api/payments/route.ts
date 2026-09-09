import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireResident } from "@/lib/authz";
import { firstZodError } from "@/lib/validations/lease";
import { sortPeriodsByRelevance } from "@/lib/period";

/**
 * Sakin: kendi aidat ve kira borçlarını + ödemelerini getirir.
 *
 * Kira borçları yalnızca sakinin kiracısı olduğu AKTİF sözleşmeden gelir;
 * başka bir dairenin ya da geçmiş kiracının verisi hiçbir koşulda dönmez.
 */
export async function GET() {
  const resident = await requireResident();
  if (resident.error) return resident.error;

  const unit = await prisma.unit.findFirst({
    where: { residentId: resident.data.id },
    include: { apartment: true },
  });

  if (!unit) {
    return NextResponse.json({ unit: null, dues: [], rentCharges: [], payments: [] });
  }

  const [dues, rentCharges, payments] = await Promise.all([
    prisma.due.findMany({
      where: { apartmentId: unit.apartmentId },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.rentCharge.findMany({
      where: { unitId: unit.id, lease: { tenantId: resident.data.id } },
      include: { lease: { select: { id: true, status: true, endDate: true } } },
      orderBy: [{ year: "desc" }, { month: "desc" }],
    }),
    prisma.payment.findMany({
      where: { unitId: unit.id },
      include: { due: true, rentCharge: true },
      orderBy: { uploadedAt: "desc" },
    }),
  ]);

  // Dönem listeleri: güncel ay üstte, gelecek aylar sonda (bkz. lib/period).
  return NextResponse.json({
    unit,
    dues: sortPeriodsByRelevance(dues),
    rentCharges: sortPeriodsByRelevance(rentCharges),
    payments,
  });
}

/**
 * Sakin: dekont yükler.
 *
 * Aidat ve kira aynı endpoint'i paylaşır — tek fark hangi borç kaydına
 * bağlandığıdır. Böylece dekont yükleme/tekrar yükleme mantığı tek kopyada kalır.
 */
const uploadSchema = z
  .object({
    type: z.enum(["AIDAT", "KIRA"]).default("AIDAT"),
    dueId: z.string().min(1).optional(),
    rentChargeId: z.string().min(1).optional(),
    receiptUrl: z.string().url("Geçersiz dekont bağlantısı."),
    receiptKey: z.string().nullish(),
  })
  .refine((v) => (v.type === "AIDAT" ? !!v.dueId : !!v.rentChargeId), {
    message: "Ödeme yapılacak borç kaydı belirtilmelidir.",
  });

export async function POST(req: NextRequest) {
  const resident = await requireResident();
  if (resident.error) return resident.error;

  const parsed = uploadSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }
  const { type, receiptUrl, receiptKey } = parsed.data;

  const unit = await prisma.unit.findFirst({
    where: { residentId: resident.data.id },
    select: { id: true, apartmentId: true },
  });
  if (!unit) return NextResponse.json({ error: "Daire bulunamadı." }, { status: 404 });

  // Borç kaydını doğrula ve mevcut ödemeyi bul — iki tür için de aynı sözleşme.
  let where: { dueId_unitId: { dueId: string; unitId: string } } | {
    rentChargeId_unitId: { rentChargeId: string; unitId: string };
  };
  let link: { dueId: string; rentChargeId: null } | { dueId: null; rentChargeId: string };

  if (type === "AIDAT") {
    const dueId = parsed.data.dueId!;
    const due = await prisma.due.findUnique({ where: { id: dueId } });
    if (!due || due.apartmentId !== unit.apartmentId) {
      return NextResponse.json({ error: "Aidat bulunamadı." }, { status: 404 });
    }
    where = { dueId_unitId: { dueId, unitId: unit.id } };
    link = { dueId, rentChargeId: null };
  } else {
    const rentChargeId = parsed.data.rentChargeId!;
    const charge = await prisma.rentCharge.findFirst({
      where: {
        id: rentChargeId,
        unitId: unit.id,
        lease: { tenantId: resident.data.id },
      },
      select: { id: true, lease: { select: { status: true } } },
    });
    if (!charge) {
      return NextResponse.json({ error: "Kira borcu bulunamadı." }, { status: 404 });
    }
    if (charge.lease.status === "CANCELLED") {
      return NextResponse.json(
        { error: "İptal edilmiş sözleşme için ödeme yapılamaz." },
        { status: 400 }
      );
    }
    where = { rentChargeId_unitId: { rentChargeId, unitId: unit.id } };
    link = { dueId: null, rentChargeId };
  }

  const label = type === "KIRA" ? "kira" : "aidat";
  const existing = await prisma.payment.findUnique({ where });

  if (existing) {
    if (existing.status === "APPROVED") {
      return NextResponse.json(
        { error: `Bu ${label} zaten onaylanmış.` },
        { status: 400 }
      );
    }
    if (existing.status === "PENDING") {
      return NextResponse.json(
        { error: "Dekontunuz inceleniyor, bekleyiniz." },
        { status: 400 }
      );
    }
    // REJECTED: aynı kayıt yeni dekontla tekrar incelemeye alınır.
    const updated = await prisma.payment.update({
      where: { id: existing.id },
      data: {
        receiptUrl,
        receiptKey: receiptKey || null,
        status: "PENDING",
        rejectionReason: null,
        uploadedAt: new Date(),
        reviewedAt: null,
      },
      include: { due: true, rentCharge: true },
    });
    return NextResponse.json(updated);
  }

  const payment = await prisma.payment.create({
    data: {
      type,
      ...link,
      unitId: unit.id,
      residentId: resident.data.id,
      receiptUrl,
      receiptKey: receiptKey || null,
      status: "PENDING",
    },
    include: { due: true, rentCharge: true },
  });

  return NextResponse.json(payment, { status: 201 });
}
