"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle,
  Clock,
  ExternalLink,
  Pencil,
  RotateCcw,
  Trash2,
  User,
  Wallet,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { formatTRY, MONTHS_TR } from "@/lib/constants";
import {
  DepositStatusBadge,
  LeaseExpiryWarning,
  LeaseStatusBadge,
} from "@/components/lease-status-badges";

export type LeaseCharge = {
  id: string;
  month: number;
  year: number;
  amount: number;
  dueDate: string;
  payment: {
    id: string;
    status: string;
    receiptUrl: string | null;
    rejectionReason: string | null;
    uploadedAt: string;
  } | null;
};

export type LeaseDetailData = {
  id: string;
  unitNumber: string;
  apartmentId: string;
  apartmentName: string;
  tenant: { id: string; name: string; email: string } | null;
  monthlyRent: number;
  startDate: string;
  endDate: string;
  paymentDay: number;
  depositAmount: number;
  depositStatus: string;
  depositPaidAt: string | null;
  depositRefundedAt: string | null;
  rentIncreaseRate: number | null;
  notes: string | null;
  status: string;
  charges: LeaseCharge[];
};

const trDate = (iso: string) => new Date(iso).toLocaleDateString("tr-TR");

export function LeaseDetail({ lease: initial }: { lease: LeaseDetailData }) {
  const router = useRouter();
  const [lease, setLease] = useState(initial);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ paymentId: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [receiptModal, setReceiptModal] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const approvedTotal = lease.charges
    .filter((c) => c.payment?.status === "APPROVED")
    .reduce((sum, c) => sum + c.amount, 0);
  const totalContract = lease.charges.reduce((sum, c) => sum + c.amount, 0);
  const pendingCount = lease.charges.filter((c) => c.payment?.status === "PENDING").length;

  /** Dekont onay/red — aidatla aynı /api/payments/[id] endpoint'i kullanılır. */
  async function reviewPayment(paymentId: string, action: "approve" | "reject") {
    if (action === "reject" && !rejectReason.trim()) {
      toast.error("Red sebebi giriniz.");
      return;
    }
    setProcessing(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          ...(action === "reject" ? { rejectionReason: rejectReason } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "İşlem başarısız.");
        return;
      }
      const reason = rejectReason;
      setLease((prev) => ({
        ...prev,
        charges: prev.charges.map((c) =>
          c.payment?.id === paymentId
            ? {
                ...c,
                payment: {
                  ...c.payment,
                  status: action === "approve" ? "APPROVED" : "REJECTED",
                  rejectionReason: action === "reject" ? reason : null,
                },
              }
            : c
        ),
      }));
      toast.success(action === "approve" ? "Kira ödemesi onaylandı." : "Ödeme reddedildi.");
      setRejectDialog(null);
      setRejectReason("");
      router.refresh();
    } catch {
      toast.error("Bağlantı hatası oluştu.");
    } finally {
      setProcessing(null);
    }
  }

  async function depositAction(action: "mark_paid" | "mark_refunded" | "reset") {
    setProcessing("deposit");
    try {
      const res = await fetch(`/api/leases/${lease.id}/deposit`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "İşlem başarısız.");
        return;
      }
      setLease((prev) => ({
        ...prev,
        depositStatus: data.depositStatus,
        depositPaidAt: data.depositPaidAt,
        depositRefundedAt: data.depositRefundedAt,
      }));
      toast.success(
        action === "mark_paid"
          ? "Depozito ödendi olarak işaretlendi."
          : action === "mark_refunded"
            ? "Depozito iade edildi olarak işaretlendi."
            : "Depozito durumu sıfırlandı."
      );
      router.refresh();
    } catch {
      toast.error("Bağlantı hatası oluştu.");
    } finally {
      setProcessing(null);
    }
  }

  async function deleteLease() {
    if (!confirm("Bu kira sözleşmesi ve tüm kira borçları silinsin mi?")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/leases/${lease.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Silinemedi.");
        return;
      }
      toast.success("Sözleşme silindi.");
      router.push(`/apartments/${lease.apartmentId}?tab=kira`);
      router.refresh();
    } catch {
      toast.error("Bağlantı hatası oluştu.");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3 flex-wrap">
        <Button variant="ghost" size="sm" asChild className="mt-1">
          <Link href={`/apartments/${lease.apartmentId}?tab=kira`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-800">
              Daire {lease.unitNumber} — Kira Sözleşmesi
            </h1>
            <LeaseStatusBadge status={lease.status} />
            <LeaseExpiryWarning endDate={lease.endDate} status={lease.status} />
          </div>
          <p className="text-slate-400 text-sm">{lease.apartmentName}</p>
        </div>
        <Button variant="outline" asChild className="min-h-[44px]">
          <Link href={`/apartments/${lease.apartmentId}/leases/${lease.id}/edit`}>
            <Pencil className="w-4 h-4 mr-2" /> Düzenle
          </Link>
        </Button>
      </div>

      {/* Sözleşme özeti */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          icon={<Wallet className="w-5 h-5 text-slate-400" />}
          label="Aylık Kira"
          value={formatTRY(lease.monthlyRent)}
        />
        <SummaryCard
          icon={<CalendarDays className="w-5 h-5 text-slate-400" />}
          label="Sözleşme Dönemi"
          value={`${trDate(lease.startDate)} – ${trDate(lease.endDate)}`}
          small
        />
        <SummaryCard
          icon={<Clock className="w-5 h-5 text-slate-400" />}
          label="Ödeme Günü"
          value={`Her ayın ${lease.paymentDay}. günü`}
          small
        />
        <SummaryCard
          icon={<CheckCircle className="w-5 h-5 text-green-500" />}
          label="Tahsil Edilen"
          value={formatTRY(approvedTotal)}
          hint={`Toplam ${formatTRY(totalContract)}`}
        />
      </div>

      {/* Kiracı */}
      <Card>
        <CardContent className="py-4 px-5 flex items-center gap-3 flex-wrap">
          <User className="w-5 h-5 text-slate-400" />
          {lease.tenant ? (
            <div>
              <p className="font-semibold text-slate-800">{lease.tenant.name}</p>
              <p className="text-sm text-slate-400">{lease.tenant.email}</p>
            </div>
          ) : (
            <p className="text-slate-500 text-sm">
              Kiracı atanmamış — daireye sakin davet edildiğinde otomatik atanır.
            </p>
          )}
          {lease.rentIncreaseRate ? (
            <span className="ml-auto text-sm text-slate-500">
              Yıllık artış: <strong>%{lease.rentIncreaseRate}</strong>
            </span>
          ) : null}
        </CardContent>
      </Card>

      {lease.notes && (
        <Card>
          <CardContent className="py-4 px-5">
            <p className="text-sm text-slate-500 mb-1">Not</p>
            <p className="text-base text-slate-700">{lease.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Depozito */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Depozito</h2>
        <Card>
          <CardContent className="py-5 px-5">
            {lease.depositAmount > 0 ? (
              <div className="flex flex-wrap items-center gap-4 justify-between">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-slate-800">
                    {formatTRY(lease.depositAmount)}
                  </p>
                  {lease.depositPaidAt && (
                    <p className="text-sm text-slate-400">
                      Tahsil: {trDate(lease.depositPaidAt)}
                    </p>
                  )}
                  {lease.depositRefundedAt && (
                    <p className="text-sm text-slate-400">
                      İade: {trDate(lease.depositRefundedAt)}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <DepositStatusBadge status={lease.depositStatus} />
                  {lease.depositStatus === "PENDING" && (
                    <Button
                      className="min-h-[44px] bg-green-600 hover:bg-green-700 text-white"
                      disabled={processing === "deposit"}
                      onClick={() => depositAction("mark_paid")}
                    >
                      <CheckCircle className="w-4 h-4 mr-2" /> Ödendi İşaretle
                    </Button>
                  )}
                  {lease.depositStatus === "PAID" && (
                    <>
                      <Button
                        variant="outline"
                        className="min-h-[44px]"
                        disabled={processing === "deposit"}
                        onClick={() => depositAction("mark_refunded")}
                      >
                        <RotateCcw className="w-4 h-4 mr-2" /> İade Et
                      </Button>
                      <Button
                        variant="ghost"
                        className="min-h-[44px] text-slate-500"
                        disabled={processing === "deposit"}
                        onClick={() => depositAction("reset")}
                      >
                        Geri Al
                      </Button>
                    </>
                  )}
                  {lease.depositStatus === "REFUNDED" && (
                    <Button
                      variant="ghost"
                      className="min-h-[44px] text-slate-500"
                      disabled={processing === "deposit"}
                      onClick={() => depositAction("mark_paid")}
                    >
                      İadeyi Geri Al
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-slate-400 text-base">
                Bu sözleşmede depozito tanımlanmamış.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Kira borçları */}
      <div>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-slate-700">
            Kira Borçları ({lease.charges.length} ay)
          </h2>
          {pendingCount > 0 && (
            <span className="text-sm font-medium text-amber-700 bg-amber-50 px-3 py-1.5 rounded-full">
              ⏳ {pendingCount} dekont onay bekliyor
            </span>
          )}
        </div>

        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b bg-slate-50">
                  <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">Dönem</th>
                  <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">Tutar</th>
                  <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">Son Ödeme</th>
                  <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">Durum</th>
                  <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">Dekont</th>
                  <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {lease.charges.map((charge) => (
                  <tr key={charge.id} className="border-b last:border-0 h-14">
                    <td className="px-5 py-3 font-semibold text-slate-800 text-base whitespace-nowrap">
                      {MONTHS_TR[charge.month]} {charge.year}
                    </td>
                    <td className="px-5 py-3 text-base text-slate-700 whitespace-nowrap">
                      {formatTRY(charge.amount)}
                    </td>
                    <td className="px-5 py-3 text-sm text-slate-500 whitespace-nowrap">
                      {trDate(charge.dueDate)}
                    </td>
                    <td className="px-5 py-3">
                      <ChargeStatusBadge charge={charge} />
                      {charge.payment?.status === "REJECTED" &&
                        charge.payment.rejectionReason && (
                          <p className="text-xs text-red-500 mt-1 max-w-[180px]">
                            {charge.payment.rejectionReason}
                          </p>
                        )}
                    </td>
                    <td className="px-5 py-3">
                      {charge.payment?.receiptUrl ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="min-h-[40px] text-sm gap-1.5"
                          onClick={() => setReceiptModal(charge.payment!.receiptUrl!)}
                        >
                          <ExternalLink className="w-4 h-4" /> Görüntüle
                        </Button>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      {charge.payment?.status === "PENDING" ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="min-h-[40px] bg-green-600 hover:bg-green-700 text-white gap-1.5"
                            disabled={processing === charge.payment.id}
                            onClick={() => reviewPayment(charge.payment!.id, "approve")}
                          >
                            <CheckCircle className="w-4 h-4" /> Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[40px] text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                            disabled={processing === charge.payment.id}
                            onClick={() => {
                              setRejectDialog({ paymentId: charge.payment!.id });
                              setRejectReason("");
                            }}
                          >
                            <XCircle className="w-4 h-4" /> Reddet
                          </Button>
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                ))}

                {lease.charges.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate-400 text-base">
                      Bu sözleşme için kira borcu üretilmedi.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      <div className="border-t pt-4">
        <Button variant="destructive" size="sm" onClick={deleteLease} disabled={deleting}>
          <Trash2 className="w-4 h-4 mr-2" />
          {deleting ? "Siliniyor..." : "Sözleşmeyi Sil"}
        </Button>
        <p className="text-xs text-slate-400 mt-1">
          Ödeme kaydı bulunan sözleşmeler silinemez; bunun yerine durumunu
          &quot;Sona Erdi&quot; yapın.
        </p>
      </div>

      {/* Dekont önizleme */}
      <Dialog open={!!receiptModal} onOpenChange={(o) => !o && setReceiptModal(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Kira Dekontu</DialogTitle>
          </DialogHeader>
          {receiptModal && (
            <div className="w-full">
              {/\.pdf$/i.test(receiptModal) ? (
                <iframe src={receiptModal} className="w-full h-[500px] rounded" title="Dekont" />
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

      {/* Red dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={(o) => !o && setRejectDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kira Ödemesini Reddet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-base text-slate-600">Red sebebi kiracıyla paylaşılacaktır.</p>
            <Textarea
              placeholder="Red sebebini yazın..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="text-base"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialog(null)} disabled={!!processing}>
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={() => rejectDialog && reviewPayment(rejectDialog.paymentId, "reject")}
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

function SummaryCard({
  icon,
  label,
  value,
  hint,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint?: string;
  small?: boolean;
}) {
  return (
    <Card>
      <CardContent className="py-4 px-4">
        <div className="flex items-center gap-2 mb-1">
          {icon}
          <p className="text-sm text-slate-500">{label}</p>
        </div>
        <p className={small ? "text-base font-semibold text-slate-800" : "text-xl font-bold text-slate-800"}>
          {value}
        </p>
        {hint && <p className="text-xs text-slate-400 mt-0.5">{hint}</p>}
      </CardContent>
    </Card>
  );
}

/** Kira borcunun ödeme durumu — aidat rozetleriyle aynı görsel dil. */
export function ChargeStatusBadge({ charge }: { charge: LeaseCharge }) {
  const base = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold";
  if (!charge.payment) {
    const overdue = new Date(charge.dueDate) < new Date();
    return (
      <span className={`${base} ${overdue ? "text-red-700 bg-red-50" : "text-slate-500 bg-slate-100"}`}>
        <XCircle className="w-4 h-4" /> {overdue ? "Vadesi Geçti" : "Ödenmedi"}
      </span>
    );
  }
  if (charge.payment.status === "APPROVED")
    return (
      <span className={`${base} text-green-700 bg-green-50`}>
        <CheckCircle className="w-4 h-4" /> Onaylandı
      </span>
    );
  if (charge.payment.status === "PENDING")
    return (
      <span className={`${base} text-amber-700 bg-amber-50`}>
        <Clock className="w-4 h-4" /> Beklemede
      </span>
    );
  return (
    <span className={`${base} text-red-700 bg-red-50`}>
      <XCircle className="w-4 h-4" /> Reddedildi
    </span>
  );
}
