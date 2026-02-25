"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  CheckCircle, Clock, XCircle, Upload, FileText, ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

const MONTHS_TR = [
  "", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

type Due = { id: string; month: number; year: number; amount: number; dueDate: string | Date; description: string | null };
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
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1"><CheckCircle className="w-3 h-3" /> Onaylandı</Badge>;
  if (status === "REJECTED")
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100 gap-1"><XCircle className="w-3 h-3" /> Reddedildi</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 gap-1"><Clock className="w-3 h-3" /> İnceleniyor</Badge>;
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
      if (exists) return prev.map((p) => p.dueId === dueId ? { ...data } : p);
      return [data, ...prev];
    });
    toast.success("Dekontunuz yüklendi, incelemeye alındı.");
    setUploadDue(null);
  }

  const canUpload = (due: Due, payment?: Payment) => {
    if (!payment) return true;
    if (payment.status === "REJECTED") return true;
    return false;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Ödemelerim</h1>
        <p className="text-slate-400 text-sm">Daire {unit.unitNumber} — {unit.dueDate}</p>
      </div>

      {dues.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400 text-sm">
            Henüz aidat tanımlanmadı. Yöneticinizin aidat oluşturmasını bekleyin.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {dues.map((due) => {
            const payment = paymentMap.get(due.id);
            const isPast = new Date(due.dueDate as string) < new Date();

            return (
              <Card key={due.id} className={
                payment?.status === "REJECTED" ? "border-red-200" :
                payment?.status === "APPROVED" ? "border-green-200" : ""
              }>
                <CardContent className="py-4 px-5">
                  <div className="flex flex-wrap items-center gap-3 justify-between">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold text-slate-800">
                          {MONTHS_TR[due.month]} {due.year}
                        </h3>
                        {isPast && !payment && (
                          <Badge variant="destructive" className="text-xs">Vadesi Geçti</Badge>
                        )}
                        {!payment && !isPast && (
                          <Badge variant="outline" className="text-xs text-slate-400">Ödenmedi</Badge>
                        )}
                      </div>
                      <p className="text-xl font-bold text-slate-700">
                        {due.amount.toLocaleString("tr-TR")} ₺
                      </p>
                      <p className="text-xs text-slate-400">
                        Son ödeme: {new Date(due.dueDate as string).toLocaleDateString("tr-TR")}
                      </p>
                      {due.description && (
                        <p className="text-xs text-slate-400 italic">{due.description}</p>
                      )}
                      {payment?.status === "REJECTED" && payment.rejectionReason && (
                        <p className="text-xs text-red-500 mt-1">
                          <strong>Red sebebi:</strong> {payment.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {payment && <PaymentStatusBadge status={payment.status} />}

                      {payment?.receiptUrl && (
                        <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                          <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="w-3 h-3" /> Dekont
                          </a>
                        </Button>
                      )}

                      {canUpload(due, payment) && (
                        <Button
                          size="sm"
                          onClick={() => setUploadDue(due)}
                          className="gap-1"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          {payment?.status === "REJECTED" ? "Tekrar Yükle" : "Dekont Yükle"}
                        </Button>
                      )}
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
              Dekont Yükle — {uploadDue && `${MONTHS_TR[uploadDue.month]} ${uploadDue.year}`}
            </DialogTitle>
          </DialogHeader>
          {uploadDue && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 text-sm">
                <p className="text-slate-500">
                  <strong className="text-slate-700">{uploadDue.amount.toLocaleString("tr-TR")} ₺</strong> tutarındaki
                  aidat için dekont yükleyin.
                </p>
                <p className="text-slate-400 text-xs mt-1">
                  PDF veya fotoğraf (maks. 8MB)
                </p>
              </div>

              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-6 gap-3">
                <FileText className="w-10 h-10 text-slate-300" />
                <p className="text-sm text-slate-500">Dekontunuzu seçin veya sürükleyin</p>
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
                    button: "bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors",
                    allowedContent: "text-slate-400 text-xs",
                  }}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadDue(null)} disabled={uploading}>
              İptal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
