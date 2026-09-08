"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import {
  CheckCircle,
  Clock,
  XCircle,
  ExternalLink,
  Check,
  X as XIcon,
  Plus,
  KeyRound,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { formatTRY, MONTHS_TR } from "@/lib/constants";

type Period = { month: number; year: number };

type Due = {
  id: string;
  month: number;
  year: number;
  amount: number;
  dueDate: string;
  description: string | null;
};

type Unit = {
  id: string;
  unitNumber: string;
  resident: { id: string; name: string; email: string } | null;
};

type Payment = {
  id: string;
  dueId: string;
  unitId: string;
  residentId: string;
  status: string;
  receiptUrl: string | null;
  rejectionReason: string | null;
  uploadedAt: string;
  reviewedAt: string | null;
  resident: { id: string; name: string; email: string };
};

type RentCharge = {
  id: string;
  leaseId: string;
  leaseStatus: string;
  unitNumber: string;
  tenant: { id: string; name: string; email: string } | null;
  amount: number;
  month: number;
  year: number;
  dueDate: string;
  payment: {
    id: string;
    status: string;
    receiptUrl: string | null;
    rejectionReason: string | null;
  } | null;
};

export type PaymentTypeFilter = "ALL" | "AIDAT" | "KIRA";

interface PaymentTableProps {
  apartment: { id: string; name: string };
  periods: Period[];
  selectedPeriod: Period;
  selectedDue: Due | null;
  payments: Payment[];
  units: Unit[];
  rentCharges: RentCharge[];
  typeFilter: PaymentTypeFilter;
}

export function PaymentTable({
  apartment,
  periods,
  selectedPeriod,
  selectedDue,
  payments: initialPayments,
  units,
  rentCharges: initialRentCharges,
  typeFilter,
}: PaymentTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [payments, setPayments] = useState(initialPayments);
  const [rentCharges, setRentCharges] = useState(initialRentCharges);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    paymentId: string;
    kind: "AIDAT" | "KIRA";
  } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [receiptModal, setReceiptModal] = useState<string | null>(null);

  function pushParams(next: Record<string, string>) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("apt", apartment.id);
    Object.entries(next).forEach(([k, v]) => params.set(k, v));
    router.push(`${pathname}?${params.toString()}`);
  }

  const selectPeriod = (p: Period) =>
    pushParams({ month: String(p.month), year: String(p.year) });

  const selectType = (t: PaymentTypeFilter) => pushParams({ tur: t });

  /** Aidat ve kira dekontları aynı endpoint üzerinden onaylanır/reddedilir. */
  async function review(
    paymentId: string,
    kind: "AIDAT" | "KIRA",
    action: "approve" | "reject",
    reason?: string
  ) {
    setProcessing(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "reject" ? { rejectionReason: reason } : {}),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error ?? "İşlem başarısız.");
        return;
      }

      const status = action === "approve" ? "APPROVED" : "REJECTED";
      const rejectionReason = action === "reject" ? (reason ?? null) : null;

      if (kind === "AIDAT") {
        setPayments((prev) =>
          prev.map((p) => (p.id === paymentId ? { ...p, status, rejectionReason } : p))
        );
      } else {
        setRentCharges((prev) =>
          prev.map((c) =>
            c.payment?.id === paymentId
              ? { ...c, payment: { ...c.payment, status, rejectionReason } }
              : c
          )
        );
      }

      toast.success(action === "approve" ? "Ödeme onaylandı." : "Ödeme reddedildi.");
      setRejectDialog(null);
      setRejectReason("");
    } catch {
      toast.error("Bağlantı hatası oluştu.");
    } finally {
      setProcessing(null);
    }
  }

  function openReject(paymentId: string, kind: "AIDAT" | "KIRA") {
    setRejectDialog({ paymentId, kind });
    setRejectReason("");
  }

  const paymentMap = new Map(payments.map((p) => [p.unitId, p]));

  const approvedCount = payments.filter((p) => p.status === "APPROVED").length;
  const pendingCount = payments.filter((p) => p.status === "PENDING").length;
  const unpaidCount = units.filter((u) => u.resident && !paymentMap.has(u.id)).length;

  const rentApproved = rentCharges.filter((c) => c.payment?.status === "APPROVED");
  const rentPending = rentCharges.filter((c) => c.payment?.status === "PENDING");
  const rentTotal = rentCharges.reduce((sum, c) => sum + c.amount, 0);
  const rentCollected = rentApproved.reduce((sum, c) => sum + c.amount, 0);

  const showAidat = typeFilter === "ALL" || typeFilter === "AIDAT";
  const showKira = typeFilter === "ALL" || typeFilter === "KIRA";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ödemeler</h1>
          <p className="text-slate-500 text-base mt-1">{apartment.name}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button asChild size="lg" variant="outline">
            <Link href={`/apartments/${apartment.id}/dues`}>
              <Plus className="w-5 h-5 mr-2" /> Yeni Aidat Tanımla
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href={`/apartments/${apartment.id}/leases/new`}>
              <KeyRound className="w-5 h-5 mr-2" /> Yeni Kira Sözleşmesi
            </Link>
          </Button>
        </div>
      </div>

      {/* Tür filtresi */}
      <SegmentedTabs
        ariaLabel="Ödeme türü filtresi"
        value={typeFilter}
        onChange={selectType}
        items={[
          { value: "ALL", label: "Tümü" },
          { value: "AIDAT", label: "Aidat", count: payments.length },
          { value: "KIRA", label: "Kira", count: rentCharges.length },
        ]}
      />

      {periods.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-slate-400 border text-base">
          Bu apartman için henüz aidat veya kira tanımlanmadı.
        </div>
      ) : (
        <>
          {/* Dönem sekmeleri (aidat + kira ortak) */}
          <div className="flex flex-wrap gap-2">
            {periods.map((period) => {
              const isSelected =
                selectedPeriod.month === period.month &&
                selectedPeriod.year === period.year;
              return (
                <button
                  key={`${period.year}-${period.month}`}
                  onClick={() => selectPeriod(period)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-base font-medium transition-colors min-h-[44px] border",
                    isSelected
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {MONTHS_TR[period.month]} {period.year}
                </button>
              );
            })}
          </div>

          {/* ---------------- AİDAT ---------------- */}
          {showAidat && (
            <section className="space-y-4">
              {typeFilter === "ALL" && (
                <h2 className="text-lg font-semibold text-slate-700">Aidat</h2>
              )}

              {!selectedDue ? (
                <div className="bg-white rounded-xl p-8 text-center text-slate-400 border text-base">
                  {MONTHS_TR[selectedPeriod.month]} {selectedPeriod.year} için aidat
                  tanımlanmadı.
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-xl border p-5">
                    <div className="flex flex-wrap gap-6 items-start">
                      <div>
                        <p className="text-sm text-slate-500">Aidat Tutarı</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {formatTRY(selectedDue.amount)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Son Ödeme Tarihi</p>
                        <p className="text-base font-semibold text-slate-700">
                          {new Date(selectedDue.dueDate).toLocaleDateString("tr-TR")}
                        </p>
                      </div>
                      {selectedDue.description && (
                        <div>
                          <p className="text-sm text-slate-500">Not</p>
                          <p className="text-base text-slate-700">
                            {selectedDue.description}
                          </p>
                        </div>
                      )}
                      <div className="ml-auto flex gap-2 flex-wrap items-center">
                        <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                          ✅ {approvedCount} Onaylı
                        </span>
                        <span className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                          ⏳ {pendingCount} Beklemede
                        </span>
                        <span className="text-sm font-medium text-red-700 bg-red-50 px-3 py-1.5 rounded-full">
                          ❌ {unpaidCount} Yüklenmedi
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <Th>Daire</Th>
                            <Th>Sakin</Th>
                            <Th>Durum</Th>
                            <Th>Dekont</Th>
                            <Th>İşlem</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {units.map((unit) => {
                            const payment = paymentMap.get(unit.id);
                            return (
                              <tr key={unit.id} className="border-b last:border-0 h-14">
                                <td className="px-5 py-3 font-semibold text-slate-800 text-base whitespace-nowrap">
                                  Daire {unit.unitNumber}
                                </td>
                                <td className="px-5 py-3 text-base text-slate-700">
                                  {unit.resident?.name ?? (
                                    <span className="text-slate-400 text-sm">—</span>
                                  )}
                                </td>
                                <td className="px-5 py-3">
                                  <StatusBadge payment={payment} unit={unit} />
                                  {payment?.status === "REJECTED" &&
                                    payment.rejectionReason && (
                                      <p
                                        className="text-xs text-red-500 mt-1 max-w-[180px]"
                                        title={payment.rejectionReason}
                                      >
                                        {payment.rejectionReason.length > 45
                                          ? payment.rejectionReason.slice(0, 45) + "…"
                                          : payment.rejectionReason}
                                      </p>
                                    )}
                                </td>
                                <td className="px-5 py-3">
                                  <ReceiptCell
                                    url={payment?.receiptUrl ?? null}
                                    onOpen={setReceiptModal}
                                  />
                                </td>
                                <td className="px-5 py-3">
                                  <ReviewCell
                                    paymentId={
                                      payment?.status === "PENDING" ? payment.id : null
                                    }
                                    disabled={!!processing}
                                    onApprove={(id) => review(id, "AIDAT", "approve")}
                                    onReject={(id) => openReject(id, "AIDAT")}
                                  />
                                </td>
                              </tr>
                            );
                          })}

                          {units.length === 0 && (
                            <EmptyRow colSpan={5}>
                              Bu apartmanda henüz daire yok.
                            </EmptyRow>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {/* ---------------- KİRA ---------------- */}
          {showKira && (
            <section className="space-y-4">
              {typeFilter === "ALL" && (
                <h2 className="text-lg font-semibold text-slate-700">Kira</h2>
              )}

              {rentCharges.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-slate-400 border text-base">
                  {MONTHS_TR[selectedPeriod.month]} {selectedPeriod.year} için kira borcu
                  yok.
                </div>
              ) : (
                <>
                  <div className="bg-white rounded-xl border p-5">
                    <div className="flex flex-wrap gap-6 items-start">
                      <div>
                        <p className="text-sm text-slate-500">Beklenen Kira</p>
                        <p className="text-2xl font-bold text-slate-800">
                          {formatTRY(rentTotal)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-slate-500">Tahsil Edilen</p>
                        <p className="text-2xl font-bold text-green-600">
                          {formatTRY(rentCollected)}
                        </p>
                      </div>
                      <div className="ml-auto flex gap-2 flex-wrap items-center">
                        <span className="text-sm font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-full">
                          ✅ {rentApproved.length} Onaylı
                        </span>
                        <span className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
                          ⏳ {rentPending.length} Beklemede
                        </span>
                        <span className="text-sm font-medium text-red-700 bg-red-50 px-3 py-1.5 rounded-full">
                          ❌ {rentCharges.length - rentApproved.length - rentPending.length}{" "}
                          Yüklenmedi
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white rounded-xl border overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b bg-slate-50">
                            <Th>Daire</Th>
                            <Th>Kiracı</Th>
                            <Th>Tutar</Th>
                            <Th>Durum</Th>
                            <Th>Dekont</Th>
                            <Th>İşlem</Th>
                          </tr>
                        </thead>
                        <tbody>
                          {rentCharges.map((charge) => (
                            <tr key={charge.id} className="border-b last:border-0 h-14">
                              <td className="px-5 py-3 font-semibold text-slate-800 text-base whitespace-nowrap">
                                <Link
                                  href={`/apartments/${apartment.id}/leases/${charge.leaseId}`}
                                  className="hover:underline inline-flex items-center"
                                >
                                  Daire {charge.unitNumber}
                                  <ChevronRight className="w-4 h-4 text-slate-400" />
                                </Link>
                              </td>
                              <td className="px-5 py-3 text-base text-slate-700">
                                {charge.tenant?.name ?? (
                                  <span className="text-slate-400 text-sm">—</span>
                                )}
                              </td>
                              <td className="px-5 py-3 text-base text-slate-700 whitespace-nowrap">
                                {formatTRY(charge.amount)}
                              </td>
                              <td className="px-5 py-3">
                                <RentStatusBadge charge={charge} />
                                {charge.payment?.status === "REJECTED" &&
                                  charge.payment.rejectionReason && (
                                    <p className="text-xs text-red-500 mt-1 max-w-[180px]">
                                      {charge.payment.rejectionReason}
                                    </p>
                                  )}
                              </td>
                              <td className="px-5 py-3">
                                <ReceiptCell
                                  url={charge.payment?.receiptUrl ?? null}
                                  onOpen={setReceiptModal}
                                />
                              </td>
                              <td className="px-5 py-3">
                                <ReviewCell
                                  paymentId={
                                    charge.payment?.status === "PENDING"
                                      ? charge.payment.id
                                      : null
                                  }
                                  disabled={!!processing}
                                  onApprove={(id) => review(id, "KIRA", "approve")}
                                  onReject={(id) => openReject(id, "KIRA")}
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </section>
          )}
        </>
      )}

      {/* Receipt modal */}
      <Dialog open={!!receiptModal} onOpenChange={(o) => !o && setReceiptModal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Dekont</DialogTitle>
          </DialogHeader>
          {receiptModal && (
            <div className="w-full">
              {/\.pdf$/i.test(receiptModal) ? (
                <iframe
                  src={receiptModal}
                  className="w-full h-[500px] rounded"
                  title="Dekont"
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={receiptModal}
                  alt="Dekont"
                  className="w-full max-h-[500px] object-contain rounded"
                />
              )}
              <div className="mt-3">
                <a
                  href={receiptModal}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 underline"
                >
                  Yeni sekmede aç
                </a>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {rejectDialog?.kind === "KIRA" ? "Kira Ödemesini" : "Aidat Ödemesini"}{" "}
              Reddet
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-base text-slate-600">
              Red sebebi ilgili kişiyle paylaşılacaktır.
            </p>
            <Textarea
              placeholder="Red sebebini yazın..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="text-base"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialog(null)}
              disabled={!!processing}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                rejectDialog &&
                review(rejectDialog.paymentId, rejectDialog.kind, "reject", rejectReason)
              }
              disabled={!!processing || !rejectReason.trim()}
            >
              Reddet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aidat ve kira tabloları aynı hücre bileşenlerini paylaşır (DRY).     */
/* ------------------------------------------------------------------ */

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">{children}</th>
  );
}

function EmptyRow({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-10 text-center text-slate-400 text-base">
        {children}
      </td>
    </tr>
  );
}

function ReceiptCell({
  url,
  onOpen,
}: {
  url: string | null;
  onOpen: (url: string) => void;
}) {
  if (!url) return <span className="text-slate-400 text-sm">—</span>;
  return (
    <Button
      size="sm"
      variant="outline"
      className="min-h-[40px] text-sm gap-1.5"
      onClick={() => onOpen(url)}
    >
      <ExternalLink className="w-4 h-4" /> Görüntüle
    </Button>
  );
}

function ReviewCell({
  paymentId,
  disabled,
  onApprove,
  onReject,
}: {
  paymentId: string | null;
  disabled: boolean;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
}) {
  if (!paymentId) return <span className="text-slate-400 text-sm">—</span>;
  return (
    <div className="flex gap-2">
      <Button
        size="sm"
        className="min-h-[40px] bg-green-600 hover:bg-green-700 text-white gap-1.5"
        disabled={disabled}
        onClick={() => onApprove(paymentId)}
      >
        <Check className="w-4 h-4" /> Onayla
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="min-h-[40px] text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
        disabled={disabled}
        onClick={() => onReject(paymentId)}
      >
        <XIcon className="w-4 h-4" /> Reddet
      </Button>
    </div>
  );
}

const badge = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold";

function StatusBadge({ payment, unit }: { payment?: Payment; unit: Unit }) {
  if (!unit.resident) {
    return (
      <span className={cn(badge, "text-slate-400 bg-slate-100")}>— Boş Daire</span>
    );
  }
  if (!payment) {
    return (
      <span className={cn(badge, "text-red-700 bg-red-50")}>
        <XCircle className="w-4 h-4" /> Yüklenmedi
      </span>
    );
  }
  if (payment.status === "APPROVED") {
    return (
      <span className={cn(badge, "text-green-700 bg-green-50")}>
        <CheckCircle className="w-4 h-4" /> Onaylandı
      </span>
    );
  }
  if (payment.status === "PENDING") {
    return (
      <span className={cn(badge, "text-amber-700 bg-amber-50")}>
        <Clock className="w-4 h-4" /> Beklemede
      </span>
    );
  }
  return (
    <span className={cn(badge, "text-red-700 bg-red-50")}>
      <XCircle className="w-4 h-4" /> Reddedildi
    </span>
  );
}

function RentStatusBadge({ charge }: { charge: RentCharge }) {
  if (!charge.payment) {
    const overdue = new Date(charge.dueDate) < new Date();
    return (
      <span
        className={cn(badge, overdue ? "text-red-700 bg-red-50" : "text-slate-500 bg-slate-100")}
      >
        <XCircle className="w-4 h-4" /> {overdue ? "Vadesi Geçti" : "Yüklenmedi"}
      </span>
    );
  }
  if (charge.payment.status === "APPROVED") {
    return (
      <span className={cn(badge, "text-green-700 bg-green-50")}>
        <CheckCircle className="w-4 h-4" /> Onaylandı
      </span>
    );
  }
  if (charge.payment.status === "PENDING") {
    return (
      <span className={cn(badge, "text-amber-700 bg-amber-50")}>
        <Clock className="w-4 h-4" /> Beklemede
      </span>
    );
  }
  return (
    <span className={cn(badge, "text-red-700 bg-red-50")}>
      <XCircle className="w-4 h-4" /> Reddedildi
    </span>
  );
}
