import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { sendInviteEmail } from "@/lib/email";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Yetkisiz." }, { status: 401 });
  }

  const apartment = await prisma.apartment.findFirst({
    where: { id: params.id, managerId: session.user.id },
  });
  if (!apartment) return NextResponse.json({ error: "Apartman bulunamadı." }, { status: 404 });

  const { email, unitId } = await req.json();
  if (!email || !unitId) {
    return NextResponse.json({ error: "Email ve daire zorunludur." }, { status: 400 });
  }

  // Check unit belongs to apartment
  const unit = await prisma.unit.findFirst({
    where: { id: unitId, apartmentId: params.id },
  });
  if (!unit) return NextResponse.json({ error: "Daire bulunamadı." }, { status: 404 });

  if (unit.residentId) {
    return NextResponse.json(
      { error: "Bu dairede zaten bir sakin var." },
      { status: 400 }
    );
  }

  // Check if email is already a user
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return NextResponse.json(
      { error: "Bu e-posta adresi zaten kayıtlı." },
      { status: 409 }
    );
  }

  // Cancel existing unused invites for this unit
  await prisma.invite.updateMany({
    where: { unitId, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  const invite = await prisma.invite.create({
    data: { email, unitId, invitedById: session.user.id, expiresAt },
  });

  const inviteUrl = `${process.env.NEXTAUTH_URL}/invite?token=${invite.token}`;

  try {
    await sendInviteEmail({
      to: email,
      inviteUrl,
      apartmentName: apartment.name,
      unitNumber: unit.unitNumber,
      invitedBy: session.user.name ?? "Yönetici",
    });
  } catch (err) {
    console.error("[INVITE_EMAIL]", err);
    // Silently fail email — invite is still created
  }

  return NextResponse.json({ success: true, inviteUrl }, { status: 201 });
}
