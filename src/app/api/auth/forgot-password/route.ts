import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: IP başına 5 talep/saat
  const ip = getClientIp(req);
  const { success, resetAt } = checkRateLimit(`forgot-password:${ip}`, 5, 60 * 60 * 1000);
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
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "E-posta adresi zorunludur." }, { status: 400 });
    }

    // Email varsa token oluştur — yoksa da başarı döndür (email enumeration önleme)
    const user = await prisma.user.findUnique({ where: { email } });

    if (user) {
      // Mevcut kullanılmamış tokenları iptal et
      await prisma.passwordResetToken.deleteMany({
        where: { email, usedAt: null },
      });

      // 1 saatlik token oluştur
      const token = await prisma.passwordResetToken.create({
        data: {
          email,
          expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        },
      });

      const resetUrl = `${process.env.NEXTAUTH_URL}/reset-password?token=${token.token}`;

      // Non-blocking email gönderimi
      try {
        await sendPasswordResetEmail({ to: email, resetUrl });
      } catch (err) {
        console.error("[FORGOT_PASSWORD_EMAIL]", err);
      }
    }

    // Her durumda aynı başarı mesajı döndür
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[FORGOT_PASSWORD]", error);
    return NextResponse.json({ error: "Sunucu hatası oluştu." }, { status: 500 });
  }
}
