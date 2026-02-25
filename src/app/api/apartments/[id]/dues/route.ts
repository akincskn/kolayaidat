import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const apartment = await prisma.apartment.findFirst({
    where: { id: params.id, managerId: session.user.id },
  });
  if (!apartment) return NextResponse.json({ error: "Apartman bulunamadı." }, { status: 404 });

  const dues = await prisma.due.findMany({
    where: { apartmentId: params.id },
    include: {
      _count: { select: { payments: true } },
      payments: {
        select: { status: true },
      },
    },
    orderBy: [{ year: "desc" }, { month: "desc" }],
  });

  return NextResponse.json(dues);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const apartment = await prisma.apartment.findFirst({
    where: { id: params.id, managerId: session.user.id },
  });
  if (!apartment) return NextResponse.json({ error: "Apartman bulunamadı." }, { status: 404 });

  const { amount, month, year, dueDate, description } = await req.json();

  if (!amount || !month || !year || !dueDate) {
    return NextResponse.json(
      { error: "Tutar, ay, yıl ve son ödeme tarihi zorunludur." },
      { status: 400 }
    );
  }

  if (month < 1 || month > 12) {
    return NextResponse.json({ error: "Geçersiz ay." }, { status: 400 });
  }

  try {
    const due = await prisma.due.create({
      data: {
        apartmentId: params.id,
        amount: parseFloat(amount),
        month: parseInt(month),
        year: parseInt(year),
        dueDate: new Date(dueDate),
        description: description || null,
      },
    });
    return NextResponse.json(due, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Bu ay için zaten aidat tanımlanmış." },
      { status: 409 }
    );
  }
}
