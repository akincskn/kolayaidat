import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireManagedLease } from "@/lib/authz";
import { depositActionSchema, firstZodError } from "@/lib/validations/lease";

/**
 * Admin: depozito durumunu değiştirir.
 *
 * İzin verilen geçişler (tek yönlü yaşam döngüsü):
 *   PENDING  -> PAID       (depozito tahsil edildi)
 *   PAID     -> REFUNDED   (kiracıya iade edildi)
 *   PAID     -> PENDING    (yanlış işaretleme geri alma)
 *   REFUNDED -> PAID       (yanlış iade geri alma)
 *
 * Geçiş matrisi açıkça tanımlıdır; keyfi durum atlaması (ör. PENDING -> REFUNDED)
 * tutarsız muhasebe kaydı yaratacağı için reddedilir.
 */
const TRANSITIONS: Record<string, Record<string, string>> = {
  PENDING: { mark_paid: "PAID" },
  PAID: { mark_refunded: "REFUNDED", reset: "PENDING" },
  REFUNDED: { mark_paid: "PAID" },
};

export async function PATCH(
  req: NextRequest,
  { params }: { params: { leaseId: string } }
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const guard = await requireManagedLease(params.leaseId, admin.data.id);
  if (guard.error) return guard.error;
  const lease = guard.data;

  const parsed = depositActionSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }

  if (lease.depositAmount <= 0) {
    return NextResponse.json(
      { error: "Bu sözleşmede depozito tanımlı değil." },
      { status: 400 }
    );
  }

  const nextStatus = TRANSITIONS[lease.depositStatus]?.[parsed.data.action];
  if (!nextStatus) {
    return NextResponse.json(
      { error: "Bu depozito durumunda bu işlem yapılamaz." },
      { status: 409 }
    );
  }

  const now = new Date();
  const updated = await prisma.lease.update({
    where: { id: lease.id },
    data: {
      depositStatus: nextStatus as "PENDING" | "PAID" | "REFUNDED",
      depositPaidAt: nextStatus === "PENDING" ? null : (lease.depositPaidAt ?? now),
      depositRefundedAt: nextStatus === "REFUNDED" ? now : null,
    },
    select: {
      id: true,
      depositAmount: true,
      depositStatus: true,
      depositPaidAt: true,
      depositRefundedAt: true,
    },
  });

  return NextResponse.json(updated);
}
