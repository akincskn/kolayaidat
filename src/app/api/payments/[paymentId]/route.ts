import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendPaymentStatusEmail } from "@/lib/email";

// Admin: ödeme onay / red
export async function PATCH(
  req: NextRequest,
  { params }: { params: { paymentId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { action, rejectionReason } = await req.json();

  if (!["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
  }

  if (action === "reject" && !rejectionReason?.trim()) {
    return NextResponse.json({ error: "Red sebebi zorunludur." }, { status: 400 });
  }

  const payment = await prisma.payment.findUnique({
    where: { id: params.paymentId },
    include: {
      unit: { include: { apartment: true } },
      due: true,
      resident: { select: { name: true, email: true } },
    },
  });

  if (!payment) return NextResponse.json({ error: "Ödeme bulunamadı." }, { status: 404 });

  // Ensure admin owns the apartment
  if (payment.unit.apartment.managerId !== session.user.id) {
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
      unit: true,
      resident: { select: { name: true, email: true } },
    },
  });

  // Send email notification (non-blocking)
  try {
    await sendPaymentStatusEmail({
      to: payment.resident.email,
      residentName: payment.resident.name,
      status: newStatus,
      month: payment.due.month,
      year: payment.due.year,
      amount: payment.due.amount,
      rejectionReason: rejectionReason,
    });
  } catch (err) {
    console.error("[PAYMENT_EMAIL]", err);
  }

  return NextResponse.json(updated);
}
