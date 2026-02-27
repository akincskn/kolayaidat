import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: IP başına 10 deneme/saat
  const ip = getClientIp(req);
  const { success, resetAt } = checkRateLimit(`reset-password:${ip}`, 10, 60 * 60 * 1000);
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
    const { token, password } = await req.json();

    if (!token || !password) {
      return NextResponse.json({ error: "Token ve şifre zorunludur." }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Şifre en az 6 karakter olmalıdır." },
        { status: 400 }
      );
    }

    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { token },
    });

    if (!resetToken) {
      return NextResponse.json({ error: "Geçersiz şifre sıfırlama bağlantısı." }, { status: 400 });
    }

    if (resetToken.usedAt) {
      return NextResponse.json(
        { error: "Bu bağlantı daha önce kullanılmış." },
        { status: 400 }
      );
    }

    if (new Date() > resetToken.expiresAt) {
      return NextResponse.json(
        { error: "Şifre sıfırlama bağlantısının süresi dolmuş." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: resetToken.email } });

    if (!user) {
      return NextResponse.json({ error: "Kullanıcı bulunamadı." }, { status: 404 });
    }

    const hashed = await bcrypt.hash(password, 10);

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { password: hashed },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[RESET_PASSWORD]", error);
    return NextResponse.json({ error: "Sunucu hatası oluştu." }, { status: 500 });
  }
}
