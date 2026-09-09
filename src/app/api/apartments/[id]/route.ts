import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sortPeriodsByRelevance } from "@/lib/period";

async function getOwnedApartment(id: string, userId: string) {
  return prisma.apartment.findFirst({
    where: { id, managerId: userId },
  });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const apartment = await prisma.apartment.findFirst({
    where: { id: params.id, managerId: session.user.id },
    include: {
      units: {
        include: { resident: { select: { id: true, name: true, email: true, phone: true } } },
        orderBy: { unitNumber: "asc" },
      },
      dues: { orderBy: [{ year: "desc" }, { month: "desc" }] },
    },
  });

  if (!apartment) return NextResponse.json({ error: "Apartman bulunamadı." }, { status: 404 });

  // Son 6 dönem: güncel aydan geriye doğru, en uzak gelecek yerine (bkz. lib/period).
  return NextResponse.json({
    ...apartment,
    dues: sortPeriodsByRelevance(apartment.dues).slice(0, 6),
  });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const apartment = await getOwnedApartment(params.id, session.user.id);
  if (!apartment) return NextResponse.json({ error: "Apartman bulunamadı." }, { status: 404 });

  const { name, address } = await req.json();

  const updated = await prisma.apartment.update({
    where: { id: params.id },
    data: { name: name ?? apartment.name, address: address ?? apartment.address },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const apartment = await getOwnedApartment(params.id, session.user.id);
  if (!apartment) return NextResponse.json({ error: "Apartman bulunamadı." }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      const units = await tx.unit.findMany({
        where: { apartmentId: params.id },
        select: { id: true },
      });
      const unitIds = units.map((u) => u.id);
      if (unitIds.length > 0) {
        await tx.payment.deleteMany({ where: { unitId: { in: unitIds } } });
        await tx.invite.deleteMany({ where: { unitId: { in: unitIds } } });
      }
      await tx.apartment.delete({ where: { id: params.id } });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[APARTMENT_DELETE]", error);
    return NextResponse.json({ error: "Apartman silinemedi." }, { status: 500 });
  }
}
