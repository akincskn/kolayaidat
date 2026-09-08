import type { PrismaClient } from "@prisma/client";

/**
 * Sözleşmeyi, yalnızca istekte bulunan yönetici o apartmanı yönetiyorsa
 * yükler. Detay ve düzenleme sayfaları aynı sorguyu paylaşsın diye ayrıldı;
 * `apartmentId` filtresi URL'deki apartmanla sözleşmenin gerçekten eşleşmesini
 * de garanti eder (başka apartmanın sözleşme id'siyle gezinme engellenir).
 */
export function loadManagedLease(
  prisma: PrismaClient,
  apartmentId: string,
  leaseId: string,
  managerId: string
) {
  return prisma.lease.findFirst({
    where: {
      id: leaseId,
      unit: { apartmentId, apartment: { managerId } },
    },
    include: {
      unit: {
        select: {
          id: true,
          unitNumber: true,
          residentId: true,
          apartment: { select: { id: true, name: true } },
        },
      },
      tenant: { select: { id: true, name: true, email: true } },
      charges: {
        include: { payments: true },
        orderBy: [{ year: "asc" }, { month: "asc" }],
      },
    },
  });
}
