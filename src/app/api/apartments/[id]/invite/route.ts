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

  const body = await req.json();
  const { unitId } = body;

  // Tek email (eski format) veya çoklu email (yeni format) desteği
  const rawEmails: string[] = Array.isArray(body.emails)
    ? body.emails.map((e: string) => String(e).trim()).filter(Boolean)
    : body.email
    ? [String(body.email).trim()]
    : [];

  if (!rawEmails.length || !unitId) {
    return NextResponse.json({ error: "Email ve daire zorunludur." }, { status: 400 });
  }

  // Tekrarlı emailleri temizle
  const emails = Array.from(new Set(rawEmails.map((e) => e.toLowerCase())));

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

  // Mevcut kullanılmamış davetleri iptal et
  await prisma.invite.updateMany({
    where: { unitId, usedAt: null },
    data: { expiresAt: new Date() },
  });

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 48);

  type InviteResult = { email: string; success: boolean; error?: string; inviteUrl?: string };
  const results: InviteResult[] = [];

  for (const email of emails) {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      results.push({ email, success: false, error: "Bu e-posta zaten kayıtlı." });
      continue;
    }

    try {
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
      }

      results.push({ email, success: true, inviteUrl });
    } catch (err) {
      console.error("[INVITE_CREATE]", err);
      results.push({ email, success: false, error: "Davet oluşturulamadı." });
    }
  }

  const firstSuccess = results.find((r) => r.success);
  return NextResponse.json(
    { success: results.some((r) => r.success), results, inviteUrl: firstSuccess?.inviteUrl },
    { status: 201 }
  );
}
