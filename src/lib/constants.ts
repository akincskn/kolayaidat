/**
 * Uygulama genelinde paylaşılan sabitler.
 *
 * MONTHS_TR daha önce 5 ayrı bileşende kopyalanmıştı; tek kaynağa taşındı.
 * 1 tabanlı indeks kullanılır (MONTHS_TR[1] === "Ocak"), çünkü Due.month ve
 * RentCharge.month alanları da 1-12 aralığındadır.
 */
export const MONTHS_TR = [
  "",
  "Ocak",
  "Şubat",
  "Mart",
  "Nisan",
  "Mayıs",
  "Haziran",
  "Temmuz",
  "Ağustos",
  "Eylül",
  "Ekim",
  "Kasım",
  "Aralık",
] as const;

/** Türkçe para formatı: 1.234,5 ₺ */
export function formatTRY(amount: number): string {
  return `${amount.toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ₺`;
}

/** Ödeme türlerinin kullanıcıya gösterilen Türkçe karşılıkları. */
export const PAYMENT_TYPE_LABELS = {
  AIDAT: "Aidat",
  KIRA: "Kira",
} as const;

/** Sözleşme durumlarının Türkçe karşılıkları. */
export const LEASE_STATUS_LABELS = {
  ACTIVE: "Aktif",
  ENDED: "Sona Erdi",
  CANCELLED: "İptal Edildi",
} as const;

/** Depozito durumlarının Türkçe karşılıkları. */
export const DEPOSIT_STATUS_LABELS = {
  PENDING: "Alınmadı",
  PAID: "Ödendi",
  REFUNDED: "İade Edildi",
} as const;

/** Sözleşme bitişine bu kadar gün kalınca dashboard'da uyarı gösterilir. */
export const LEASE_EXPIRY_WARNING_DAYS = 30;
