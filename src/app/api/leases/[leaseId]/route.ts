import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireManagedLease } from "@/lib/authz";
import { firstZodError, updateLeaseSchema } from "@/lib/validations/lease";
import { findConflictingActiveLease, syncLeaseCharges } from "@/lib/lease";
import { sortPeriodsByRelevance } from "@/lib/period";

/** Admin: sözleşme detayı (borçlar ve ödemeleriyle). */
export async function GET(
  _req: NextRequest,
  { params }: { params: { leaseId: string } }
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const guard = await requireManagedLease(params.leaseId, admin.data.id);
  if (guard.error) return guard.error;

  const charges = await prisma.rentCharge.findMany({
    where: { leaseId: params.leaseId },
    include: { payments: true },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json({ ...guard.data, charges: sortPeriodsByRelevance(charges) });
}

/**
 * Admin: sözleşmeyi günceller.
 *
 * Tutar/tarih değişirse kira borçları yeniden senkronlanır. Ödemesi bulunan
 * borçlara dokunulmaz — geçmiş tahsilat kayıtları korunur (bkz. syncLeaseCharges).
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: { leaseId: string } }
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const guard = await requireManagedLease(params.leaseId, admin.data.id);
  if (guard.error) return guard.error;
  const lease = guard.data;

  const parsed = updateLeaseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  // Daire değişimi yeni sözleşme demektir; mevcut borçların başka daireye
  // kaymasını engellemek için sessizce yok sayılmaz, açıkça reddedilir.
  if (input.unitId && input.unitId !== lease.unitId) {
    return NextResponse.json(
      { error: "Sözleşmenin dairesi değiştirilemez. Yeni sözleşme oluşturun." },
      { status: 400 }
    );
  }

  const nextStatus = input.status ?? lease.status;
  const tenantId = input.tenantId ?? lease.unit.residentId ?? null;
  if (tenantId && tenantId !== lease.unit.residentId) {
    return NextResponse.json(
      { error: "Kiracı, dairenin mevcut sakini olmalıdır." },
      { status: 400 }
    );
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      if (nextStatus === "ACTIVE") {
        const conflict = await findConflictingActiveLease(tx, lease.unitId, lease.id);
        if (conflict) {
          throw new LeaseConflictError(
            `Daire ${lease.unit.unitNumber} için zaten başka bir aktif sözleşme var.`
          );
        }
      }

      const result = await tx.lease.update({
        where: { id: lease.id },
        data: {
          tenantId,
          monthlyRent: input.monthlyRent,
          startDate: input.startDate,
          endDate: input.endDate,
          paymentDay: input.paymentDay,
          depositAmount: input.depositAmount,
          rentIncreaseRate: input.rentIncreaseRate,
          notes: input.notes?.trim() || null,
          status: nextStatus,
        },
      });

      await syncLeaseCharges(tx, result);
      return result;
    });

    return NextResponse.json(updated);
  } catch (err) {
    if (err instanceof LeaseConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[LEASE_UPDATE]", err);
    return NextResponse.json({ error: "Sözleşme güncellenemedi." }, { status: 500 });
  }
}

/**
 * Admin: sözleşmeyi siler.
 *
 * Onaylanmış/incelemedeki bir kira ödemesi varsa silme reddedilir; bunun yerine
 * sözleşme "Sona Erdi"/"İptal Edildi" durumuna alınmalıdır. Amaç, tahsilat
 * geçmişinin cascade ile sessizce yok olmasını engellemek.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: { leaseId: string } }
) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const guard = await requireManagedLease(params.leaseId, admin.data.id);
  if (guard.error) return guard.error;

  const paymentCount = await prisma.payment.count({
    where: { rentCharge: { leaseId: params.leaseId } },
  });

  if (paymentCount > 0) {
    return NextResponse.json(
      {
        error:
          "Bu sözleşmede ödeme kaydı var, silinemez. Sözleşmeyi 'Sona Erdi' olarak işaretleyin.",
      },
      { status: 409 }
    );
  }

  await prisma.lease.delete({ where: { id: params.leaseId } });
  return NextResponse.json({ success: true });
}

class LeaseConflictError extends Error {}
