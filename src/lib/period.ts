/**
 * Dönem (yıl + ay) sıralaması.
 *
 * Kira borçları sözleşme oluşturulurken tüm dönem için peşin üretildiğinden
 * listelerde gelecek aylar da bulunur. Saf "yıl/ay azalan" sıralamada en ileri
 * tarih (ör. Mart 2027) en üste çıkıyor ve kullanıcının asıl ilgilendiği
 * içinde bulunulan ay listenin ortasında kayboluyordu.
 *
 * Uygulanan sıra:
 *   1. İçinde bulunulan ay ve geçmiş aylar — yeniden eskiye
 *   2. Gelecek aylar — yakından uzağa, listenin sonunda
 *
 * Böylece ödenmesi gereken/gecikmiş dönemler her zaman üstte toplanır.
 */

export type Period = { year: number; month: number };

/** Yıl/ay çiftini karşılaştırılabilir tek bir sayıya çevirir. `month` 1 tabanlıdır. */
export function periodIndex(year: number, month: number): number {
  return year * 12 + (month - 1);
}

/**
 * İçinde bulunulan ayın indeksi. Kira borçları UTC'ye göre üretildiği için
 * (bkz. generateChargeSchedule) burada da UTC kullanılır; böylece sunucunun
 * saat dilimi sıralamayı kaydırmaz.
 */
export function currentPeriodIndex(now: Date = new Date()): number {
  return periodIndex(now.getUTCFullYear(), now.getUTCMonth() + 1);
}

/** Sıralama karşılaştırıcısı: güncel/geçmiş aylar önce, gelecek aylar sonda. */
export function comparePeriodByRelevance(
  a: Period,
  b: Period,
  now: Date = new Date()
): number {
  const current = currentPeriodIndex(now);
  const ai = periodIndex(a.year, a.month);
  const bi = periodIndex(b.year, b.month);

  const aFuture = ai > current;
  const bFuture = bi > current;

  // Gelecek dönemler her zaman geçmiş/güncel dönemlerin altında.
  if (aFuture !== bFuture) return aFuture ? 1 : -1;

  // Gelecek: yakından uzağa (artan). Güncel/geçmiş: yeniden eskiye (azalan).
  return aFuture ? ai - bi : bi - ai;
}

/** `comparePeriodByRelevance` ile sıralanmış yeni bir dizi döndürür. */
export function sortPeriodsByRelevance<T extends Period>(
  items: readonly T[],
  now: Date = new Date()
): T[] {
  return [...items].sort((a, b) => comparePeriodByRelevance(a, b, now));
}
