"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle,
  Clock,
  XCircle,
  Upload,
  FileText,
  ExternalLink,
  KeyRound,
  Receipt,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { formatTRY, MONTHS_TR } from "@/lib/constants";
import { LeaseExpiryWarning } from "@/components/lease-status-badges";

/** Aidat ve kira borcunun ortak istemci temsili. */
export type ChargeItem = {
  id: string;
  type: "AIDAT" | "KIRA";
  month: number;
  year: number;
  amount: number;
  dueDate: string;
  description: string | null;
  payment: {
    id: string;
    status: string;
    receiptUrl: string | null;
    rejectionReason: string | null;
  } | null;
};

type LeaseInfo = {
  monthlyRent: number;
  startDate: string;
  endDate: string;
  paymentDay: number;
  depositAmount: number;
  depositStatus: string;
  status: string;
} | null;

type TypeFilter = "ALL" | "AIDAT" | "KIRA";

function PaymentStatusBadge({ status }: { status: string }) {
  if (status === "APPROVED")
    return (
      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-semibold text-green-700 bg-green-50 border border-green-200">
        <CheckCircle className="w-5 h-5" /> Onaylandı
      </span>
    );
  if (status === "REJECTED")
    return (
      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-semibold text-red-700 bg-red-50 border border-red-200">
        <XCircle className="w-5 h-5" /> Reddedildi
      </span>
    );
  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-base font-semibold text-amber-700 bg-amber-50 border border-amber-200">
      <Clock className="w-5 h-5" /> İnceleniyor
    </span>
  );
}

export function MyPaymentsClient({
  apartmentName,
  unitNumber,
  items: initialItems,
  lease,
}: {
  apartmentName: string;
  unitNumber: string;
  items: ChargeItem[];
  lease: LeaseInfo;
}) {
  const [items, setItems] = useState(initialItems);
  const [filter, setFilter] = useState<TypeFilter>("ALL");
  const [uploadItem, setUploadItem] = useState<ChargeItem | null>(null);
  const [uploading, setUploading] = useState(false);

  const counts = useMemo(
    () => ({
      aidat: items.filter((i) => i.type === "AIDAT").length,
      kira: items.filter((i) => i.type === "KIRA").length,
    }),
    [items]
  );

  const visible = useMemo(
    () => (filter === "ALL" ? items : items.filter((i) => i.type === filter)),
    [items, filter]
  );

  async function submitPayment(item: ChargeItem, receiptUrl: string, receiptKey: string) {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: item.type,
        ...(item.type === "AIDAT" ? { dueId: item.id } : { rentChargeId: item.id }),
        receiptUrl,
        receiptKey,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Yükleme başarısız.");
      return;
    }
    setItems((prev) =>
      prev.map((i) =>
        i.id === item.id && i.type === item.type
          ? {
              ...i,
              payment: {
                id: data.id,
                status: data.status,
                receiptUrl: data.receiptUrl,
                rejectionReason: data.rejectionReason,
              },
            }
          : i
      )
    );
    toast.success("Dekontunuz yüklendi, incelemeye alındı.");
    setUploadItem(null);
  }

  /** Yeni dekont yalnızca hiç ödeme yokken veya reddedilmişken yüklenebilir. */
  const canUpload = (item: ChargeItem) =>
    !item.payment || item.payment.status === "REJECTED";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ödemelerim</h1>
        <p className="text-slate-400 text-base">
          Daire {unitNumber} — {apartmentName}
        </p>
      </div>

      {/* Kira sözleşmesi özeti */}
      {lease && (
        <Card className="border-blue-200">
          <CardContent className="py-4 px-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <KeyRound className="w-5 h-5 text-blue-500 shrink-0" />
                <div>
                  <p className="text-sm text-slate-500">Kira Sözleşmeniz</p>
                  <p className="text-lg font-bold text-slate-800">
                    {formatTRY(lease.monthlyRent)} / ay · her ayın {lease.paymentDay}. günü
                  </p>
                  <p className="text-xs text-slate-400">
                    {new Date(lease.startDate).toLocaleDateString("tr-TR")} –{" "}
                    {new Date(lease.endDate).toLocaleDateString("tr-TR")}
                    {lease.depositAmount > 0 &&
                      ` · Depozito ${formatTRY(lease.depositAmount)} (${
                        lease.depositStatus === "PAID"
                          ? "Ödendi"
                          : lease.depositStatus === "REFUNDED"
                            ? "İade Edildi"
                            : "Alınmadı"
                      })`}
                  </p>
                </div>
              </div>
              <LeaseExpiryWarning endDate={lease.endDate} status={lease.status} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tür filtresi — kira borcu yoksa gösterilmez */}
      {counts.kira > 0 && (
        <SegmentedTabs
          ariaLabel="Ödeme türü filtresi"
          value={filter}
          onChange={setFilter}
          items={[
            { value: "ALL", label: "Tümü", count: items.length },
            { value: "AIDAT", label: "Aidat", count: counts.aidat },
            { value: "KIRA", label: "Kira", count: counts.kira },
          ]}
        />
      )}

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-400 text-base">
            {items.length === 0
              ? "Henüz borç tanımlanmadı. Yöneticinizin tanımlamasını bekleyin."
              : "Bu filtrede gösterilecek kayıt yok."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {visible.map((item) => {
            const isOverdue = !item.payment && new Date(item.dueDate) < new Date();
            const uploadable = canUpload(item);

            return (
              <Card
                key={`${item.type}-${item.id}`}
                className={
                  item.payment?.status === "REJECTED"
                    ? "border-red-200"
                    : item.payment?.status === "APPROVED"
                      ? "border-green-200"
                      : ""
                }
              >
                <CardContent className="py-5 px-6">
                  <div className="flex flex-wrap items-start gap-4 justify-between">
                    {/* Sol: bilgi */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full ${
                            item.type === "KIRA"
                              ? "text-blue-700 bg-blue-50 border border-blue-200"
                              : "text-slate-600 bg-slate-100 border border-slate-200"
                          }`}
                        >
                          {item.type === "KIRA" ? (
                            <KeyRound className="w-3 h-3" />
                          ) : (
                            <Receipt className="w-3 h-3" />
                          )}
                          {item.type === "KIRA" ? "Kira" : "Aidat"}
                        </span>
                        <h3 className="text-xl font-bold text-slate-800">
                          {MONTHS_TR[item.month]} {item.year}
                        </h3>
                        {isOverdue && (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            Vadesi Geçti
                          </span>
                        )}
                        {!item.payment && !isOverdue && (
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Ödenmedi
                          </span>
                        )}
                      </div>

                      <p className="text-2xl font-bold text-slate-700">
                        {formatTRY(item.amount)}
                      </p>

                      <p className="text-sm text-slate-400">
                        Son ödeme: {new Date(item.dueDate).toLocaleDateString("tr-TR")}
                      </p>

                      {item.description && (
                        <p className="text-sm text-slate-400 italic">{item.description}</p>
                      )}

                      {item.payment?.status === "REJECTED" &&
                        item.payment.rejectionReason && (
                          <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                            <p className="text-sm font-semibold text-red-700 mb-0.5">
                              Red Sebebi:
                            </p>
                            <p className="text-sm text-red-600">
                              {item.payment.rejectionReason}
                            </p>
                          </div>
                        )}
                    </div>

                    {/* Sağ: durum + işlemler */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      {item.payment && <PaymentStatusBadge status={item.payment.status} />}

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {item.payment?.receiptUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[44px] text-sm gap-2"
                            asChild
                          >
                            <a
                              href={item.payment.receiptUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="w-4 h-4" /> Dekontu Görüntüle
                            </a>
                          </Button>
                        )}

                        {uploadable && (
                          <Button
                            size="default"
                            onClick={() => setUploadItem(item)}
                            className="min-h-[52px] px-6 text-base gap-2"
                          >
                            <Upload className="w-5 h-5" />
                            {item.payment?.status === "REJECTED"
                              ? "Tekrar Yükle"
                              : "📎 Dekont Yükle"}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={!!uploadItem} onOpenChange={(o) => !o && setUploadItem(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Dekont Yükle —{" "}
              {uploadItem &&
                `${uploadItem.type === "KIRA" ? "Kira" : "Aidat"} · ${
                  MONTHS_TR[uploadItem.month]
                } ${uploadItem.year}`}
            </DialogTitle>
          </DialogHeader>
          {uploadItem && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 text-base">
                <p className="text-slate-600">
                  <strong className="text-slate-800">{formatTRY(uploadItem.amount)}</strong>{" "}
                  tutarındaki {uploadItem.type === "KIRA" ? "kira" : "aidat"} için dekont
                  yükleyin.
                </p>
                <p className="text-slate-400 text-sm mt-1">PDF veya fotoğraf (maks. 8MB)</p>
              </div>

              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 gap-4">
                <FileText className="w-12 h-12 text-slate-300" />
                <p className="text-base text-slate-500">Dekontunuzu seçin veya sürükleyin</p>
                <UploadButton<OurFileRouter, "receiptUploader">
                  endpoint="receiptUploader"
                  onUploadBegin={() => setUploading(true)}
                  onClientUploadComplete={(res) => {
                    setUploading(false);
                    if (res?.[0]) {
                      submitPayment(uploadItem, res[0].url, res[0].key);
                    }
                  }}
                  onUploadError={(err) => {
                    setUploading(false);
                    toast.error("Yükleme hatası: " + err.message);
                  }}
                  appearance={{
                    button:
                      "bg-slate-800 text-white px-6 py-3 rounded-lg text-base font-medium hover:bg-slate-700 transition-colors min-h-[48px]",
                    allowedContent: "text-slate-400 text-sm",
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              size="lg"
              onClick={() => setUploadItem(null)}
              disabled={uploading}
            >
              İptal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
