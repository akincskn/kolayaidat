import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const apartments = await prisma.apartment.findMany({
    where: { managerId: session.user.id },
    include: {
      _count: { select: { units: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(apartments);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const { name, address } = await req.json();
  if (!name || !address) {
    return NextResponse.json({ error: "Ad ve adres zorunludur." }, { status: 400 });
  }

  const apartment = await prisma.apartment.create({
    data: { name, address, managerId: session.user.id },
  });

  return NextResponse.json(apartment, { status: 201 });
}
