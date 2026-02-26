"use client";

import { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle, Clock, XCircle, ExternalLink, Check, X as XIcon, Plus } from "lucide-react";
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

const MONTHS_TR = [
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
];

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

interface PaymentTableProps {
  apartment: { id: string; name: string };
  dues: Due[];
  selectedDue: Due | null;
  payments: Payment[];
  units: Unit[];
}

export function PaymentTable({
  apartment,
  dues,
  selectedDue,
  payments: initialPayments,
  units,
}: PaymentTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [payments, setPayments] = useState(initialPayments);
  const [processing, setProcessing] = useState<string | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{ paymentId: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [receiptModal, setReceiptModal] = useState<string | null>(null);

  function selectMonth(due: Due) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("apt", apartment.id);
    params.set("month", String(due.month));
    params.set("year", String(due.year));
    router.push(`${pathname}?${params.toString()}`);
  }

  async function handleApprove(paymentId: string) {
    setProcessing(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      if (!res.ok) throw new Error();
      setPayments((prev) =>
        prev.map((p) => (p.id === paymentId ? { ...p, status: "APPROVED" } : p))
      );
      toast.success("Ödeme onaylandı.");
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setProcessing(null);
    }
  }

  async function handleReject(paymentId: string) {
    if (!rejectReason.trim()) {
      toast.error("Red sebebi giriniz.");
      return;
    }
    setProcessing(paymentId);
    try {
      const res = await fetch(`/api/payments/${paymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason: rejectReason }),
      });
      if (!res.ok) throw new Error();
      const reason = rejectReason;
      setPayments((prev) =>
        prev.map((p) =>
          p.id === paymentId ? { ...p, status: "REJECTED", rejectionReason: reason } : p
        )
      );
      toast.success("Ödeme reddedildi.");
      setRejectDialog(null);
      setRejectReason("");
    } catch {
      toast.error("İşlem başarısız.");
    } finally {
      setProcessing(null);
    }
  }

  const paymentMap = new Map(payments.map((p) => [p.unitId, p]));

  const approvedCount = payments.filter((p) => p.status === "APPROVED").length;
  const pendingCount = payments.filter((p) => p.status === "PENDING").length;
  const unpaidCount = units.filter((u) => u.resident && !paymentMap.has(u.id)).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Ödemeler</h1>
          <p className="text-slate-500 text-base mt-1">{apartment.name}</p>
        </div>
        <Button asChild size="lg" variant="outline">
          <Link href={`/apartments/${apartment.id}/dues`}>
            <Plus className="w-5 h-5 mr-2" /> Yeni Aidat Tanımla
          </Link>
        </Button>
      </div>

      {dues.length === 0 ? (
        <div className="bg-white rounded-xl p-10 text-center text-slate-400 border text-base">
          Bu apartman için henüz aidat tanımlanmadı.
        </div>
      ) : (
        <>
          {/* Month tabs */}
          <div className="flex flex-wrap gap-2">
            {dues.map((due) => {
              const isSelected =
                selectedDue?.month === due.month && selectedDue?.year === due.year;
              return (
                <button
                  key={due.id}
                  onClick={() => selectMonth(due)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-base font-medium transition-colors min-h-[44px] border",
                    isSelected
                      ? "bg-slate-800 text-white border-slate-800"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  )}
                >
                  {MONTHS_TR[due.month]} {due.year}
                </button>
              );
            })}
          </div>

          {/* Due info + stats */}
          {selectedDue && (
            <div className="bg-white rounded-xl border p-5">
              <div className="flex flex-wrap gap-6 items-start">
                <div>
                  <p className="text-sm text-slate-500">Aidat Tutarı</p>
                  <p className="text-2xl font-bold text-slate-800">
                    {selectedDue.amount.toLocaleString("tr-TR")} ₺
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
                    <p className="text-base text-slate-700">{selectedDue.description}</p>
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
          )}

          {/* Table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">
                      Daire
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">
                      Sakin
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">
                      Durum
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">
                      Dekont
                    </th>
                    <th className="text-left px-5 py-3 text-sm font-semibold text-slate-600">
                      İşlem
                    </th>
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
                          {payment?.status === "REJECTED" && payment.rejectionReason && (
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
                          {payment?.receiptUrl ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="min-h-[40px] text-sm gap-1.5"
                              onClick={() => setReceiptModal(payment.receiptUrl!)}
                            >
                              <ExternalLink className="w-4 h-4" /> Görüntüle
                            </Button>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-5 py-3">
                          {payment?.status === "PENDING" ? (
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                className="min-h-[40px] bg-green-600 hover:bg-green-700 text-white gap-1.5"
                                disabled={processing === payment.id}
                                onClick={() => handleApprove(payment.id)}
                              >
                                <Check className="w-4 h-4" /> Onayla
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="min-h-[40px] text-red-600 border-red-200 hover:bg-red-50 gap-1.5"
                                disabled={processing === payment.id}
                                onClick={() => {
                                  setRejectDialog({ paymentId: payment.id });
                                  setRejectReason("");
                                }}
                              >
                                <XIcon className="w-4 h-4" /> Reddet
                              </Button>
                            </div>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}

                  {units.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-5 py-10 text-center text-slate-400 text-base"
                      >
                        Bu apartmanda henüz daire yok.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
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
      <Dialog
        open={!!rejectDialog}
        onOpenChange={(o) => {
          if (!o) setRejectDialog(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ödemeyi Reddet</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-base text-slate-600">Red sebebi sakinle paylaşılacaktır.</p>
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
              onClick={() => rejectDialog && handleReject(rejectDialog.paymentId)}
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

function StatusBadge({ payment, unit }: { payment?: Payment; unit: Unit }) {
  if (!unit.resident) {
    return (
      <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-semibold text-slate-400 bg-slate-100">
        — Boş Daire
      </span>
    );
  }
  if (!payment) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-red-700 bg-red-50">
        <XCircle className="w-4 h-4" /> Yüklenmedi
      </span>
    );
  }
  if (payment.status === "APPROVED") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-green-700 bg-green-50">
        <CheckCircle className="w-4 h-4" /> Onaylandı
      </span>
    );
  }
  if (payment.status === "PENDING") {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-amber-700 bg-amber-50">
        <Clock className="w-4 h-4" /> Beklemede
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-red-700 bg-red-50">
      <XCircle className="w-4 h-4" /> Reddedildi
    </span>
  );
}
