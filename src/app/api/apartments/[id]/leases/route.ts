import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, requireManagedApartment } from "@/lib/authz";
import { createLeaseSchema, firstZodError } from "@/lib/validations/lease";
import { findConflictingActiveLease, syncLeaseCharges } from "@/lib/lease";

/** Admin: apartmandaki kira sözleşmelerini listeler. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const apartment = await requireManagedApartment(params.id, admin.data.id);
  if (apartment.error) return apartment.error;

  const leases = await prisma.lease.findMany({
    where: { unit: { apartmentId: params.id } },
    include: {
      unit: { select: { id: true, unitNumber: true } },
      tenant: { select: { id: true, name: true, email: true } },
      _count: { select: { charges: true } },
    },
    orderBy: [{ status: "asc" }, { startDate: "desc" }],
  });

  return NextResponse.json(leases);
}

/** Admin: yeni kira sözleşmesi oluşturur ve aylık kira borçlarını üretir. */
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (admin.error) return admin.error;

  const apartment = await requireManagedApartment(params.id, admin.data.id);
  if (apartment.error) return apartment.error;

  const parsed = createLeaseSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: firstZodError(parsed.error) }, { status: 400 });
  }
  const input = parsed.data;

  // Daire gerçekten bu apartmana mı ait?
  const unit = await prisma.unit.findFirst({
    where: { id: input.unitId, apartmentId: params.id },
    select: { id: true, unitNumber: true, residentId: true },
  });
  if (!unit) {
    return NextResponse.json({ error: "Daire bulunamadı." }, { status: 404 });
  }

  // Kiracı, dairenin mevcut sakini olmalıdır. Böylece davet/kayıt akışı tek
  // yerde kalır ve kiracı kendi kira borcunu /my-payments üzerinden görebilir.
  const tenantId = input.tenantId ?? unit.residentId ?? null;
  if (tenantId && tenantId !== unit.residentId) {
    return NextResponse.json(
      { error: "Kiracı, dairenin mevcut sakini olmalıdır. Önce sakini davet edin." },
      { status: 400 }
    );
  }

  try {
    const lease = await prisma.$transaction(async (tx) => {
      const conflict = await findConflictingActiveLease(tx, unit.id);
      if (conflict) {
        throw new LeaseConflictError(
          `Daire ${unit.unitNumber} için zaten aktif bir kira sözleşmesi var.`
        );
      }

      const created = await tx.lease.create({
        data: {
          unitId: unit.id,
          tenantId,
          monthlyRent: input.monthlyRent,
          startDate: input.startDate,
          endDate: input.endDate,
          paymentDay: input.paymentDay,
          depositAmount: input.depositAmount,
          rentIncreaseRate: input.rentIncreaseRate,
          notes: input.notes?.trim() || null,
        },
      });

      await syncLeaseCharges(tx, created);
      return created;
    });

    const chargeCount = await prisma.rentCharge.count({ where: { leaseId: lease.id } });
    return NextResponse.json({ ...lease, chargeCount }, { status: 201 });
  } catch (err) {
    if (err instanceof LeaseConflictError) {
      return NextResponse.json({ error: err.message }, { status: 409 });
    }
    console.error("[LEASE_CREATE]", err);
    return NextResponse.json({ error: "Sözleşme oluşturulamadı." }, { status: 500 });
  }
}

class LeaseConflictError extends Error {}
