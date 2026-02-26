"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CheckCircle, Clock, XCircle, Upload, FileText, ExternalLink } from "lucide-react";
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
  dueDate: string | Date;
  description: string | null;
};
type Payment = {
  id: string;
  dueId: string;
  status: string;
  receiptUrl: string | null;
  rejectionReason: string | null;
  uploadedAt: string | Date;
  due: Due;
};
type Unit = { id: string; unitNumber: string; dueDate: string };

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
  unit,
  dues,
  initialPayments,
}: {
  unit: Unit;
  dues: Due[];
  initialPayments: Payment[];
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [uploadDue, setUploadDue] = useState<Due | null>(null);
  const [uploading, setUploading] = useState(false);

  const paymentMap = new Map(payments.map((p) => [p.dueId, p]));

  async function submitPayment(dueId: string, receiptUrl: string, receiptKey: string) {
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dueId, receiptUrl, receiptKey }),
    });
    const data = await res.json();
    if (!res.ok) {
      toast.error(data.error || "Yükleme başarısız.");
      return;
    }
    setPayments((prev) => {
      const exists = prev.find((p) => p.dueId === dueId);
      if (exists) return prev.map((p) => (p.dueId === dueId ? { ...data } : p));
      return [data, ...prev];
    });
    toast.success("Dekontunuz yüklendi, incelemeye alındı.");
    setUploadDue(null);
  }

  const canUpload = (payment?: Payment) => {
    if (!payment) return true;
    if (payment.status === "REJECTED") return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ödemelerim</h1>
        <p className="text-slate-400 text-base">
          Daire {unit.unitNumber} — {unit.dueDate}
        </p>
      </div>

      {dues.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-slate-400 text-base">
            Henüz aidat tanımlanmadı. Yöneticinizin aidat oluşturmasını bekleyin.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {dues.map((due) => {
            const payment = paymentMap.get(due.id);
            const now = new Date();
            const dueMonthStart = new Date(due.year, due.month - 1, 1);
            const isPast =
              dueMonthStart <= now && new Date(due.dueDate as string) < now;
            const uploadable = canUpload(payment);

            return (
              <Card
                key={due.id}
                className={
                  payment?.status === "REJECTED"
                    ? "border-red-200"
                    : payment?.status === "APPROVED"
                      ? "border-green-200"
                      : ""
                }
              >
                <CardContent className="py-5 px-6">
                  <div className="flex flex-wrap items-start gap-4 justify-between">
                    {/* Left: info */}
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xl font-bold text-slate-800">
                          {MONTHS_TR[due.month]} {due.year}
                        </h3>
                        {isPast && !payment && (
                          <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                            Vadesi Geçti
                          </span>
                        )}
                        {!payment && !isPast && (
                          <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                            Ödenmedi
                          </span>
                        )}
                      </div>

                      <p className="text-2xl font-bold text-slate-700">
                        {due.amount.toLocaleString("tr-TR")} ₺
                      </p>

                      <p className="text-sm text-slate-400">
                        Son ödeme:{" "}
                        {new Date(due.dueDate as string).toLocaleDateString("tr-TR")}
                      </p>

                      {due.description && (
                        <p className="text-sm text-slate-400 italic">{due.description}</p>
                      )}

                      {payment?.status === "REJECTED" && payment.rejectionReason && (
                        <div className="mt-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                          <p className="text-sm font-semibold text-red-700 mb-0.5">Red Sebebi:</p>
                          <p className="text-sm text-red-600">{payment.rejectionReason}</p>
                        </div>
                      )}
                    </div>

                    {/* Right: status + actions */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      {payment && <PaymentStatusBadge status={payment.status} />}

                      <div className="flex items-center gap-2 flex-wrap justify-end">
                        {payment?.receiptUrl && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="min-h-[44px] text-sm gap-2"
                            asChild
                          >
                            <a
                              href={payment.receiptUrl}
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
                            onClick={() => setUploadDue(due)}
                            className="min-h-[52px] px-6 text-base gap-2"
                          >
                            <Upload className="w-5 h-5" />
                            {payment?.status === "REJECTED" ? "Tekrar Yükle" : "📎 Dekont Yükle"}
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
      <Dialog open={!!uploadDue} onOpenChange={(o) => !o && setUploadDue(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Dekont Yükle —{" "}
              {uploadDue && `${MONTHS_TR[uploadDue.month]} ${uploadDue.year}`}
            </DialogTitle>
          </DialogHeader>
          {uploadDue && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 text-base">
                <p className="text-slate-600">
                  <strong className="text-slate-800">
                    {uploadDue.amount.toLocaleString("tr-TR")} ₺
                  </strong>{" "}
                  tutarındaki aidat için dekont yükleyin.
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
                      submitPayment(uploadDue.id, res[0].url, res[0].key);
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
              onClick={() => setUploadDue(null)}
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
