import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function getOwnedUnit(unitId: string, apartmentId: string, userId: string) {
  return prisma.unit.findFirst({
    where: {
      id: unitId,
      apartmentId,
      apartment: { managerId: userId },
    },
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const unit = await getOwnedUnit(params.unitId, params.id, session.user.id);
  if (!unit) return NextResponse.json({ error: "Daire bulunamadı." }, { status: 404 });

  if (unit.residentId) {
    return NextResponse.json(
      { error: "Sakin atanmış daireyi silemezsiniz. Önce sakini kaldırın." },
      { status: 400 }
    );
  }

  await prisma.unit.delete({ where: { id: params.unitId } });
  return NextResponse.json({ success: true });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; unitId: string } }
) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const unit = await getOwnedUnit(params.unitId, params.id, session.user.id);
  if (!unit) return NextResponse.json({ error: "Daire bulunamadı." }, { status: 404 });

  const { action } = await req.json();

  // Remove resident from unit
  if (action === "remove_resident") {
    if (!unit.residentId) {
      return NextResponse.json({ error: "Bu dairede sakin yok." }, { status: 400 });
    }
    const updated = await prisma.unit.update({
      where: { id: params.unitId },
      data: { residentId: null },
    });
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: "Geçersiz işlem." }, { status: 400 });
}
