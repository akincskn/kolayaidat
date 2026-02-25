import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

  const { name, phone } = await req.json();
  if (!name) return NextResponse.json({ error: "Ad zorunludur." }, { status: 400 });

  await prisma.user.update({
    where: { id: session.user.id },
    data: { name, phone: phone || null },
  });

  return NextResponse.json({ success: true });
}
