import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: IP başına 10 deneme/saat
  const ip = getClientIp(req);
  const { success, resetAt } = checkRateLimit(`invite-accept:${ip}`, 10, 60 * 60 * 1000);
  if (!success) {
    return NextResponse.json(
      { error: "Çok fazla deneme. Lütfen bir saat sonra tekrar deneyin." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
      }
    );
  }

  try {
    const { token, name, password } = await req.json();

    if (!token || !name || !password) {
      return NextResponse.json(
        { error: "Tüm alanlar zorunludur." },
        { status: 400 }
      );
    }

    const invite = await prisma.invite.findUnique({
      where: { token },
      include: { unit: true },
    });

    if (!invite) {
      return NextResponse.json(
        { error: "Geçersiz davet bağlantısı." },
        { status: 404 }
      );
    }

    if (invite.usedAt) {
      return NextResponse.json(
        { error: "Bu davet bağlantısı daha önce kullanılmış." },
        { status: 400 }
      );
    }

    if (new Date() > invite.expiresAt) {
      return NextResponse.json(
        { error: "Davet bağlantısının süresi dolmuş." },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: invite.email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Bu e-posta adresi zaten kullanılıyor." },
        { status: 409 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: invite.email,
          password: hashed,
          role: "RESIDENT",
        },
      });

      await tx.unit.update({
        where: { id: invite.unitId },
        data: { residentId: user.id },
      });

      await tx.invite.update({
        where: { id: invite.id },
        data: { usedAt: new Date(), invitedUser: user.id },
      });
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("[INVITE_ACCEPT]", error);
    return NextResponse.json(
      { error: "Sunucu hatası oluştu." },
      { status: 500 }
    );
  }
}
