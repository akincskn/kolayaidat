import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

// Resident: kendi ödemelerini getirir
export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "RESIDENT") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const unit = await prisma.unit.findFirst({
    where: { residentId: session.user.id },
    include: { apartment: true },
  });

  if (!unit) return NextResponse.json({ unit: null, payments: [], dues: [] });

  const dues = await prisma.due.findMany({
    where: { apartmentId: unit.apartmentId },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  const payments = await prisma.payment.findMany({
    where: { unitId: unit.id },
    include: { due: true },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json({ unit, dues, payments });
}

// Resident: dekont yükle (yeni payment oluştur)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "RESIDENT") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { dueId, receiptUrl, receiptKey } = await req.json();
  if (!dueId || !receiptUrl) {
    return NextResponse.json({ error: "Aidat ve dekont zorunludur." }, { status: 400 });
  }

  const unit = await prisma.unit.findFirst({
    where: { residentId: session.user.id },
  });
  if (!unit) return NextResponse.json({ error: "Daire bulunamadı." }, { status: 404 });

  const due = await prisma.due.findUnique({ where: { id: dueId } });
  if (!due || due.apartmentId !== unit.apartmentId) {
    return NextResponse.json({ error: "Aidat bulunamadı." }, { status: 404 });
  }

  // Check existing payment
  const existing = await prisma.payment.findUnique({
    where: { dueId_unitId: { dueId, unitId: unit.id } },
  });

  if (existing) {
    if (existing.status === "APPROVED") {
      return NextResponse.json({ error: "Bu aidat zaten onaylanmış." }, { status: 400 });
    }
    if (existing.status === "PENDING") {
      return NextResponse.json({ error: "Dekontunuz inceleniyor, bekleyiniz." }, { status: 400 });
    }
    // REJECTED: replace
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
      include: { due: true },
    });
    return NextResponse.json(updated);
  }

  const payment = await prisma.payment.create({
    data: {
      dueId,
      unitId: unit.id,
      residentId: session.user.id,
      receiptUrl,
      receiptKey: receiptKey || null,
      status: "PENDING",
    },
    include: { due: true },
  });

  return NextResponse.json(payment, { status: 201 });
}
