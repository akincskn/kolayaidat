import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
// Admin: apartmandaki tüm ödemeleri getirir
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const apartment = await prisma.apartment.findFirst({
    where: { id: params.id, managerId: session.user.id },
  });
  if (!apartment) return NextResponse.json({ error: "Apartman bulunamadı." }, { status: 404 });

  const { searchParams } = new URL(req.url);
  const dueId = searchParams.get("dueId");

  const payments = await prisma.payment.findMany({
    where: {
      unit: { apartmentId: params.id },
      ...(dueId ? { dueId } : {}),
    },
    include: {
      due: true,
      unit: true,
      resident: { select: { name: true, email: true } },
    },
    orderBy: { uploadedAt: "desc" },
  });

  return NextResponse.json(payments);
}
