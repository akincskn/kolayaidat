import { AlertTriangle, CheckCircle, Clock, RotateCcw, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DEPOSIT_STATUS_LABELS,
  LEASE_STATUS_LABELS,
  LEASE_EXPIRY_WARNING_DAYS,
} from "@/lib/constants";
import { daysUntil } from "@/lib/lease";

/**
 * Kira ekranlarında tekrar eden rozetler. Aidat tarafındaki rozet dili
 * (yuvarlak hap, ikon + metin) birebir korunur ki iki modül aynı görünsün.
 */

const pill =
  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap";

export function LeaseStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ACTIVE: "text-green-700 bg-green-50",
    ENDED: "text-slate-600 bg-slate-100",
    CANCELLED: "text-red-700 bg-red-50",
  };
  const label =
    LEASE_STATUS_LABELS[status as keyof typeof LEASE_STATUS_LABELS] ?? status;
  return <span className={cn(pill, styles[status] ?? styles.ENDED)}>{label}</span>;
}

export function DepositStatusBadge({ status }: { status: string }) {
  const config: Record<string, { className: string; icon: typeof CheckCircle }> = {
    PENDING: { className: "text-slate-600 bg-slate-100", icon: Clock },
    PAID: { className: "text-green-700 bg-green-50", icon: CheckCircle },
    REFUNDED: { className: "text-blue-700 bg-blue-50", icon: RotateCcw },
  };
  const { className, icon: Icon } = config[status] ?? config.PENDING;
  const label =
    DEPOSIT_STATUS_LABELS[status as keyof typeof DEPOSIT_STATUS_LABELS] ?? status;
  return (
    <span className={cn(pill, className)}>
      <Icon className="w-4 h-4" /> {label}
    </span>
  );
}

/**
 * Sözleşme bitişine kalan süre uyarısı.
 * 30 günden az kalınca sarı, süre dolmuşsa kırmızı gösterilir; aksi halde
 * hiçbir şey render etmez (gereksiz görsel gürültü yaratmamak için).
 */
export function LeaseExpiryWarning({
  endDate,
  status,
  className,
}: {
  endDate: Date | string;
  status: string;
  className?: string;
}) {
  if (status !== "ACTIVE") return null;

  const remaining = daysUntil(endDate);
  if (remaining > LEASE_EXPIRY_WARNING_DAYS) return null;

  const expired = remaining < 0;
  return (
    <span
      className={cn(
        pill,
        expired ? "text-red-700 bg-red-50" : "text-amber-700 bg-amber-50",
        className
      )}
    >
      {expired ? <XCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
      {expired
        ? `Süresi ${Math.abs(remaining)} gün önce doldu`
        : remaining === 0
          ? "Bugün sona eriyor"
          : `Bitmesine ${remaining} gün kaldı`}
    </span>
  );
}
