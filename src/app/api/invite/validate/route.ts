import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  // Rate limit: IP başına 20 sorgu/dakika
  const ip = getClientIp(req);
  const { success, resetAt } = checkRateLimit(`invite-validate:${ip}`, 100, 60 * 1000);
  if (!success) {
    return NextResponse.json(
      { error: "Çok fazla istek. Lütfen bir dakika bekleyin." },
      {
        status: 429,
        headers: { "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)) },
      }
    );
  }

  const token = req.nextUrl.searchParams.get("token");

  if (!token) {
    return NextResponse.json({ error: "Token gereklidir." }, { status: 400 });
  }

  const invite = await prisma.invite.findUnique({
    where: { token },
    include: {
      unit: { include: { apartment: true } },
    },
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
      { error: "Bu davet bağlantısının süresi dolmuş." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    email: invite.email,
    unitNumber: invite.unit.unitNumber,
    apartmentName: invite.unit.apartment.name,
  });
}
