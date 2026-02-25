import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const apartment = await prisma.apartment.findFirst({
    where: { id: params.id, managerId: session.user.id },
  });
  if (!apartment) return NextResponse.json({ error: "Apartman bulunamadı." }, { status: 404 });

  const { unitNumber, floor } = await req.json();
  if (!unitNumber) {
    return NextResponse.json({ error: "Daire numarası zorunludur." }, { status: 400 });
  }

  try {
    const unit = await prisma.unit.create({
      data: {
        apartmentId: params.id,
        unitNumber: String(unitNumber),
        floor: floor ? Number(floor) : null,
      },
    });
    return NextResponse.json(unit, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Bu daire numarası zaten mevcut." }, { status: 409 });
  }
}
