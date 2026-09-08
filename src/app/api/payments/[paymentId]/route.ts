import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/authz";
import { firstZodError } from "@/lib/validations/lease";
import { sendPaymentStatusEmail } from "@/lib/email";

const reviewSchema = z
  .object({
    action: z.enum(["approve", "reject"], { message: "Geçersiz işlem." }),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .refine((v) => v.action !== "reject" || !!v.rejectionReason, {
    message: "Red sebebi zorunludur.",
    path: ["rejectionReason"],
  });

/**
 * Admin: ödeme onay / red.
 *
 * Aidat ve kira aynı akışı paylaşır. Dönem bilgisi (ay/yıl/tutar) hangi borç
 * kaydına bağlıysa oradan okunur; bildirim e-postası da türe göre metinlenir.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const parsed = reviewSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }
  const { action, rejectionReason } = parsed.data;

  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
    include: {
      unit: { include: { apartment: true } },
      due: true,
      rentCharge: true,
      resident: { select: { name: true, email: true } },
    },
  });

  if (!payment) return NextResponse.json({ error: "Ödeme bulunamadı." }, { status: 404 });

  if (payment.unit.apartment.managerId !== admin.data.id) {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 403 });
  }

  const newStatus = action === "approve" ? "APPROVED" : "REJECTED";

  const updated = await prisma.payment.update({
    where: { id: params.paymentId },
    data: {
      status: newStatus,
      rejectionReason: action === "reject" ? rejectionReason : null,
      reviewedAt: new Date(),
    },
    include: {
      due: true,
      rentCharge: true,
      unit: true,
      resident: { select: { name: true, email: true } },
    },
  });

  // Dönem bilgisi türe göre ilgili borç kaydından okunur.
  const charge = payment.due ?? payment.rentCharge;

  // Bildirim e-postası akışı bloklamaz (mevcut davranış korunuyor).
  if (charge) {
    try {
      await sendPaymentStatusEmail({
        to: payment.resident.email,
        residentName: payment.resident.name,
        status: newStatus,
        type: payment.type,
        month: charge.month,
        year: charge.year,
        amount: charge.amount,
        rejectionReason,
      });
    } catch (err) {
      console.error("[PAYMENT_EMAIL]", err);
    }
  }

  return NextResponse.json(updated);
}
