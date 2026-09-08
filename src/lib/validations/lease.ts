import { z } from "zod";
import { MAX_LEASE_MONTHS, MAX_PAYMENT_DAY } from "@/lib/lease";

/**
 * Kira sözleşmesi doğrulama şemaları.
 *
 * Tarihler "YYYY-MM-DD" olarak gelir (HTML date input). UTC gün başına
 * normalize edilir ki sunucu saat dilimi ay hesabını kaydırmasın.
 */
const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Tarih YYYY-AA-GG biçiminde olmalıdır.")
  .transform((value, ctx) => {
    const [y, m, d] = value.split("-").map(Number);
    const date = new Date(Date.UTC(y, m - 1, d));
    if (
      Number.isNaN(date.getTime()) ||
      date.getUTCFullYear() !== y ||
      date.getUTCMonth() !== m - 1 ||
      date.getUTCDate() !== d
    ) {
      ctx.addIssue({ code: "custom", message: "Geçersiz tarih." });
      return z.NEVER;
    }
    return date;
  });

/** Form alanları number veya numeric-string olarak gelebilir. */
const numeric = (message: string) =>
  z.union([z.number(), z.string()]).transform((value, ctx) => {
    const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
    if (!Number.isFinite(n)) {
      ctx.addIssue({ code: "custom", message });
      return z.NEVER;
    }
    return n;
  });

const leaseBaseShape = {
  unitId: z.string().min(1, "Daire seçilmelidir."),
  tenantId: z.string().min(1).nullable().optional(),
  monthlyRent: numeric("Kira tutarı sayı olmalıdır.").pipe(
    z.number().positive("Kira tutarı 0'dan büyük olmalıdır.").max(10_000_000)
  ),
  startDate: dateString,
  endDate: dateString,
  paymentDay: numeric("Ödeme günü sayı olmalıdır.").pipe(
    z
      .number()
      .int("Ödeme günü tam sayı olmalıdır.")
      .min(1, "Ödeme günü 1-28 arasında olmalıdır.")
      .max(MAX_PAYMENT_DAY, `Ödeme günü en fazla ${MAX_PAYMENT_DAY} olabilir.`)
  ),
  depositAmount: numeric("Depozito tutarı sayı olmalıdır.")
    .pipe(z.number().min(0, "Depozito negatif olamaz.").max(10_000_000))
    .optional()
    .default(0),
  rentIncreaseRate: z
    .union([z.number(), z.string(), z.null()])
    .optional()
    .transform((value, ctx) => {
      if (value === null || value === undefined || value === "") return null;
      const n = typeof value === "number" ? value : Number(String(value).replace(",", "."));
      if (!Number.isFinite(n) || n < 0 || n > 500) {
        ctx.addIssue({ code: "custom", message: "Artış oranı 0-500 arasında olmalıdır." });
        return z.NEVER;
      }
      return n;
    }),
  notes: z.string().trim().max(500, "Not en fazla 500 karakter olabilir.").nullish(),
};

/** Sözleşme dönemi tutarlı ve makul uzunlukta mı? */
function refinePeriod<T extends { startDate: Date; endDate: Date }>(
  schema: z.ZodType<T>
) {
  return schema
    .refine((v) => v.endDate > v.startDate, {
      message: "Bitiş tarihi başlangıç tarihinden sonra olmalıdır.",
      path: ["endDate"],
    })
    .refine(
      (v) => {
        const months =
          (v.endDate.getUTCFullYear() - v.startDate.getUTCFullYear()) * 12 +
          (v.endDate.getUTCMonth() - v.startDate.getUTCMonth()) +
          1;
        return months <= MAX_LEASE_MONTHS;
      },
      {
        message: `Sözleşme süresi en fazla ${MAX_LEASE_MONTHS / 12} yıl olabilir.`,
        path: ["endDate"],
      }
    );
}

export const createLeaseSchema = refinePeriod(z.object(leaseBaseShape));

/**
 * Güncellemede daire değiştirilemez — daire değişimi yeni sözleşme demektir.
 * Bu kısıt, mevcut kira borçlarının başka bir daireye kaymasını engeller.
 */
export const updateLeaseSchema = refinePeriod(
  z.object({
    ...leaseBaseShape,
    unitId: z.string().min(1).optional(),
    status: z.enum(["ACTIVE", "ENDED", "CANCELLED"]).optional(),
  })
);

export const depositActionSchema = z.object({
  action: z.enum(["mark_paid", "mark_refunded", "reset"], {
    message: "Geçersiz depozito işlemi.",
  }),
});

export type CreateLeaseInput = z.infer<typeof createLeaseSchema>;
export type UpdateLeaseInput = z.infer<typeof updateLeaseSchema>;

/** Zod hatasını kullanıcıya gösterilecek tek satırlık mesaja indirger. */
export function firstZodError(error: z.ZodError): string {
  return error.issues[0]?.message ?? "Geçersiz veri.";
}
