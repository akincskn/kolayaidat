import type { LeaseFormValues } from "../_components/lease-form";

/**
 * Yeni sözleşme formunun başlangıç değerleri.
 *
 * Server component'ten çağrıldığı için bilerek `"use client"` modülünün DIŞINDA
 * tutulur: client modüllerinden dışa verilen fonksiyonlar sunucuda çağrılamayan
 * client referanslarına dönüşür.
 *
 * Varsayılan dönem: içinde bulunulan ayın 1'i ile 12 ay sonrasının son günü —
 * Türkiye'deki standart 1 yıllık konut kirası sözleşmesi.
 */
export function defaultLeaseValues(unitId = ""): LeaseFormValues {
  const today = new Date();
  const start = new Date(Date.UTC(today.getFullYear(), today.getMonth(), 1));
  const end = new Date(Date.UTC(today.getFullYear() + 1, today.getMonth(), 0));

  return {
    unitId,
    monthlyRent: "",
    startDate: start.toISOString().slice(0, 10),
    endDate: end.toISOString().slice(0, 10),
    paymentDay: "5",
    depositAmount: "",
    rentIncreaseRate: "",
    notes: "",
  };
}
