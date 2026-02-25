import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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
      dues: { orderBy: { year: "desc", month: "desc" }, take: 6 },
    },
  });

  if (!apartment) return NextResponse.json({ error: "Apartman bulunamadı." }, { status: 404 });

  return NextResponse.json(apartment);
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

  await prisma.apartment.delete({ where: { id: params.id } });

  return NextResponse.json({ success: true });
}
