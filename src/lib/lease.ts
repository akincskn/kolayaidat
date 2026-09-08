import type { Prisma, PrismaClient } from "@prisma/client";
import { LEASE_EXPIRY_WARNING_DAYS } from "@/lib/constants";

/** Sözleşme başına üretilebilecek azami taksit sayısı (10 yıl). */
export const MAX_LEASE_MONTHS = 120;

/** Ödeme günü üst sınırı — 29-31 her ayda bulunmadığı için 28'de kesilir. */
export const MAX_PAYMENT_DAY = 28;

export type ChargeDraft = {
  amount: number;
  month: number;
  year: number;
  dueDate: Date;
};

/**
 * Sözleşme dönemindeki her ay için kira borcu taslağı üretir.
 *
 * Neden peşin üretim? Projede cron/scheduler yok (Vercel Hobby). Borçları
 * sözleşme oluşturulurken deterministik olarak üretmek, "her ay otomatik borç"
 * gereksinimini harici bir zamanlayıcıya bağımlı olmadan karşılar. Fonksiyon
 * saf (pure) olduğu için sözleşme güncellendiğinde yeniden çalıştırılıp
 * mevcut kayıtlarla karşılaştırılabilir.
 *
 * Kira artışı: `rentIncreaseRate` verilirse her 12 aylık dilimde bileşik
 * olarak uygulanır (Türkiye'deki yıllık kira artışı pratiğine uygun).
 */
export function generateChargeSchedule({
  monthlyRent,
  startDate,
  endDate,
  paymentDay,
  rentIncreaseRate,
}: {
  monthlyRent: number;
  startDate: Date;
  endDate: Date;
  paymentDay: number;
  rentIncreaseRate?: number | null;
}): ChargeDraft[] {
  const charges: ChargeDraft[] = [];

  const day = clampPaymentDay(paymentDay);
  const rate = rentIncreaseRate && rentIncreaseRate > 0 ? rentIncreaseRate / 100 : 0;

  // UTC ile ilerlenir: sunucu saat dilimi ay sınırlarını kaydırmasın.
  let year = startDate.getUTCFullYear();
  let month = startDate.getUTCMonth(); // 0 tabanlı

  const endYear = endDate.getUTCFullYear();
  const endMonth = endDate.getUTCMonth();

  let index = 0;
  while (
    (year < endYear || (year === endYear && month <= endMonth)) &&
    index < MAX_LEASE_MONTHS
  ) {
    const yearsElapsed = Math.floor(index / 12);
    const amount = round2(monthlyRent * Math.pow(1 + rate, yearsElapsed));

    charges.push({
      amount,
      month: month + 1, // şemada 1 tabanlı
      year,
      dueDate: new Date(Date.UTC(year, month, day)),
    });

    index += 1;
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return charges;
}

/** Ödeme gününü her ayda geçerli olacak şekilde 1-28 aralığına sıkıştırır. */
export function clampPaymentDay(day: number): number {
  if (!Number.isFinite(day)) return 1;
  return Math.min(Math.max(Math.trunc(day), 1), MAX_PAYMENT_DAY);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

type TxClient = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Sözleşmenin kira borçlarını şema ile senkronlar. İdempotenttir:
 * - eksik aylar oluşturulur,
 * - artık dönem dışında kalan ve HENÜZ ÖDEMESİ OLMAYAN aylar silinir,
 * - ödemesi bulunan aylar asla silinmez (veri kaybı olmaz), sadece tutarı
 *   değişmişse ve ödeme reddedilmişse güncellenir.
 *
 * Aynı transaction içinde çağrılabilsin diye Prisma client dışarıdan alınır.
 */
export async function syncLeaseCharges(
  tx: TxClient,
  lease: {
    id: string;
    unitId: string;
    monthlyRent: number;
    startDate: Date;
    endDate: Date;
    paymentDay: number;
    rentIncreaseRate: number | null;
  }
): Promise<{ created: number; updated: number; removed: number }> {
  const schedule = generateChargeSchedule(lease);
  const scheduleKey = (c: { month: number; year: number }) => `${c.year}-${c.month}`;
  const wanted = new Map(schedule.map((c) => [scheduleKey(c), c]));

  const existing = await tx.rentCharge.findMany({
    where: { leaseId: lease.id },
    include: { payments: { select: { id: true, status: true } } },
  });

  let created = 0;
  let updated = 0;
  let removed = 0;

  for (const charge of existing) {
    const key = scheduleKey(charge);
    const target = wanted.get(key);

    if (!target) {
      // Dönem dışında kaldı. Ödemesi varsa dokunma — geçmiş kayıt korunur.
      if (charge.payments.length === 0) {
        await tx.rentCharge.delete({ where: { id: charge.id } });
        removed += 1;
      }
      continue;
    }

    wanted.delete(key);

    const hasSettledPayment = charge.payments.some(
      (p) => p.status === "APPROVED" || p.status === "PENDING"
    );
    const needsUpdate =
      !hasSettledPayment &&
      (charge.amount !== target.amount ||
        charge.dueDate.getTime() !== target.dueDate.getTime());

    if (needsUpdate) {
      await tx.rentCharge.update({
        where: { id: charge.id },
        data: { amount: target.amount, dueDate: target.dueDate },
      });
      updated += 1;
    }
  }

  const toCreate = Array.from(wanted.values());
  if (toCreate.length > 0) {
    const result = await tx.rentCharge.createMany({
      data: toCreate.map((c) => ({
        leaseId: lease.id,
        unitId: lease.unitId,
        amount: c.amount,
        month: c.month,
        year: c.year,
        dueDate: c.dueDate,
      })),
      skipDuplicates: true,
    });
    created = result.count;
  }

  return { created, updated, removed };
}

/** Bugünden sözleşme bitişine kalan gün sayısı (geçmişse negatif). */
export function daysUntil(date: Date | string): number {
  const target = typeof date === "string" ? new Date(date) : date;
  const startOfDay = (d: Date) =>
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const diffMs = startOfDay(target) - startOfDay(new Date());
  return Math.round(diffMs / 86_400_000);
}

/** Sözleşme uyarı eşiğinde mi? (aktif ve bitişine <= 30 gün kaldıysa) */
export function isLeaseExpiringSoon(lease: {
  status: string;
  endDate: Date | string;
}): boolean {
  if (lease.status !== "ACTIVE") return false;
  const remaining = daysUntil(lease.endDate);
  return remaining >= 0 && remaining <= LEASE_EXPIRY_WARNING_DAYS;
}

/** Sözleşme süresi dolmuş mu? */
export function isLeaseExpired(lease: {
  status: string;
  endDate: Date | string;
}): boolean {
  return lease.status === "ACTIVE" && daysUntil(lease.endDate) < 0;
}

/**
 * Aynı dairede çakışan bir ACTIVE sözleşme olup olmadığını kontrol eder.
 * Veritabanı partial unique index'i Prisma 5 şemasında ifade edilemediği için
 * bu kural transaction içinde uygulama katmanında zorlanır.
 */
export async function findConflictingActiveLease(
  tx: TxClient,
  unitId: string,
  excludeLeaseId?: string
): Promise<{ id: string } | null> {
  const where: Prisma.LeaseWhereInput = {
    unitId,
    status: "ACTIVE",
    ...(excludeLeaseId ? { id: { not: excludeLeaseId } } : {}),
  };
  return tx.lease.findFirst({ where, select: { id: true } });
}
