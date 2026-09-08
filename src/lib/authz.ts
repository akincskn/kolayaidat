import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

/**
 * API route'ları için paylaşılan yetkilendirme yardımcıları.
 *
 * Mevcut route'lardaki "session al → rol kontrol et → apartman sahipliğini
 * doğrula" üçlüsü her dosyada tekrar ediyordu. Kira endpoint'leri aynı kuralı
 * bir seviye daha derinde (sözleşme → daire → apartman → yönetici) uyguladığı
 * için kontrol tek yerde toplandı.
 */

export type SessionUser = {
  id: string;
  role: "ADMIN" | "RESIDENT";
  name?: string | null;
  email?: string | null;
};

type Guard<T> = { error: NextResponse; data?: never } | { error?: never; data: T };

const unauthorized = () =>
  NextResponse.json({ error: "Yetkisiz." }, { status: 401 });

const notFound = (message: string) =>
  NextResponse.json({ error: message }, { status: 404 });

/** Oturumu doğrular ve rolün ADMIN olmasını şart koşar. */
export async function requireAdmin(): Promise<Guard<SessionUser>> {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return { error: unauthorized() };
  }
  return { data: session.user as SessionUser };
}

/** Oturumu doğrular ve rolün RESIDENT olmasını şart koşar. */
export async function requireResident(): Promise<Guard<SessionUser>> {
  const session = await auth();
  if (!session?.user || session.user.role !== "RESIDENT") {
    return { error: unauthorized() };
  }
  return { data: session.user as SessionUser };
}

/**
 * Yöneticinin gerçekten yönettiği apartmanı döndürür.
 * Sahibi olmadığı apartman için 404 döner (varlığını sızdırmamak için 403 değil).
 */
export async function requireManagedApartment(
  apartmentId: string,
  managerId: string
): Promise<Guard<{ id: string; name: string; address: string }>> {
  const apartment = await prisma.apartment.findFirst({
    where: { id: apartmentId, managerId },
    select: { id: true, name: true, address: true },
  });
  if (!apartment) return { error: notFound("Apartman bulunamadı.") };
  return { data: apartment };
}

const leaseInclude = {
  unit: {
    select: {
      id: true,
      unitNumber: true,
      apartmentId: true,
      residentId: true,
      apartment: { select: { id: true, name: true, managerId: true } },
    },
  },
  tenant: { select: { id: true, name: true, email: true } },
} as const;

export type ManagedLease = NonNullable<
  Awaited<ReturnType<typeof findLeaseWithUnit>>
>;

function findLeaseWithUnit(leaseId: string) {
  return prisma.lease.findUnique({
    where: { id: leaseId },
    include: leaseInclude,
  });
}

/** Sözleşmeyi, yalnızca bağlı apartmanın yöneticisi ise döndürür. */
export async function requireManagedLease(
  leaseId: string,
  managerId: string
): Promise<Guard<ManagedLease>> {
  const lease = await findLeaseWithUnit(leaseId);
  if (!lease || lease.unit.apartment.managerId !== managerId) {
    return { error: notFound("Sözleşme bulunamadı.") };
  }
  return { data: lease };
}
