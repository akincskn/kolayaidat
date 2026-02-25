"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle, XCircle, FileText, ExternalLink, Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";

const MONTHS_TR = [
  "", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

type Payment = {
  id: string;
  status: string;
  receiptUrl: string | null;
  rejectionReason: string | null;
  uploadedAt: string | Date;
  reviewedAt: string | Date | null;
  due: { id: string; month: number; year: number; amount: number };
  unit: { unitNumber: string };
  resident: { name: string; email: string };
};
type Due = { id: string; month: number; year: number };
type Apartment = { id: string; name: string; dues: Due[] };

function statusBadge(status: string) {
  if (status === "APPROVED") return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Onaylandı</Badge>;
  if (status === "REJECTED") return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Reddedildi</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">İnceleniyor</Badge>;
}

export function PaymentsManager({
  apartment,
  initialPayments,
}: {
  apartment: Apartment;
  initialPayments: Payment[];
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [filterDue, setFilterDue] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Review dialog
  const [reviewPayment, setReviewPayment] = useState<Payment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  async function handleAction(action: "approve" | "reject") {
    if (!reviewPayment) return;
    if (action === "reject" && !rejectionReason.trim()) {
      toast.error("Red sebebi yazınız.");
      return;
    }
    setProcessing(true);
    try {
      const res = await fetch(`/api/payments/${reviewPayment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, rejectionReason }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }

      setPayments((prev) =>
        prev.map((p) => p.id === data.id ? { ...p, status: data.status, rejectionReason: data.rejectionReason, reviewedAt: data.reviewedAt } : p)
      );
      toast.success(action === "approve" ? "Dekont onaylandı." : "Dekont reddedildi.");
      setReviewPayment(null);
      setRejectionReason("");
    } finally {
      setProcessing(false);
    }
  }

  const filtered = payments.filter((p) => {
    if (filterDue !== "all" && p.due.id !== filterDue) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  const pendingCount = payments.filter((p) => p.status === "PENDING").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/apartments/${apartment.id}`}><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800">Dekontlar</h1>
            {pendingCount > 0 && (
              <Badge className="bg-amber-100 text-amber-700">{pendingCount} bekliyor</Badge>
            )}
          </div>
          <p className="text-slate-400 text-sm">{apartment.name}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <Select value={filterDue} onValueChange={setFilterDue}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Tüm Aylar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Aylar</SelectItem>
            {apartment.dues.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {MONTHS_TR[d.month]} {d.year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Tüm Durumlar" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tüm Durumlar</SelectItem>
            <SelectItem value="PENDING">İnceleniyor</SelectItem>
            <SelectItem value="APPROVED">Onaylandı</SelectItem>
            <SelectItem value="REJECTED">Reddedildi</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-400 text-sm">
            <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            Dekont bulunamadı.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((payment) => (
            <Card key={payment.id} className={payment.status === "PENDING" ? "border-amber-200" : ""}>
              <CardContent className="py-3 px-4">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">Daire {payment.unit.unitNumber}</span>
                      <span className="text-slate-400 text-xs">—</span>
                      <span className="text-sm text-slate-600">{payment.resident.name}</span>
                      <span className="text-slate-400 text-xs">
                        {MONTHS_TR[payment.due.month]} {payment.due.year}
                      </span>
                      <span className="font-medium text-sm">
                        {payment.due.amount.toLocaleString("tr-TR")} ₺
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Yüklendi: {new Date(payment.uploadedAt as string).toLocaleDateString("tr-TR", {
                        day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                    {payment.status === "REJECTED" && payment.rejectionReason && (
                      <p className="text-xs text-red-500 mt-0.5">Red: {payment.rejectionReason}</p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {statusBadge(payment.status)}
                    {payment.receiptUrl && (
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                        <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="w-3 h-3" /> Dekont
                        </a>
                      </Button>
                    )}
                    {payment.status === "PENDING" && (
                      <Button
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setReviewPayment(payment); setRejectionReason(""); }}
                      >
                        İncele
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={!!reviewPayment} onOpenChange={(o) => !o && setReviewPayment(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dekontu İncele</DialogTitle>
          </DialogHeader>
          {reviewPayment && (
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-sm">
                <p><span className="text-slate-500">Daire:</span> <strong>{reviewPayment.unit.unitNumber}</strong></p>
                <p><span className="text-slate-500">Sakin:</span> <strong>{reviewPayment.resident.name}</strong></p>
                <p><span className="text-slate-500">Ay:</span> <strong>{MONTHS_TR[reviewPayment.due.month]} {reviewPayment.due.year}</strong></p>
                <p><span className="text-slate-500">Tutar:</span> <strong>{reviewPayment.due.amount.toLocaleString("tr-TR")} ₺</strong></p>
              </div>

              {reviewPayment.receiptUrl && (
                <Button variant="outline" className="w-full gap-2" asChild>
                  <a href={reviewPayment.receiptUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" /> Dekontu Görüntüle
                  </a>
                </Button>
              )}

              <Separator />

              <div className="space-y-2">
                <Label>Red sebebi (reddetmek için zorunlu)</Label>
                <Textarea
                  placeholder="Örn: Dekont okunaklı değil, yanlış hesap..."
                  rows={2}
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setReviewPayment(null)}>İptal</Button>
            <Button
              variant="destructive"
              onClick={() => handleAction("reject")}
              disabled={processing}
            >
              <XCircle className="w-4 h-4 mr-1" /> Reddet
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => handleAction("approve")}
              disabled={processing}
            >
              <CheckCircle className="w-4 h-4 mr-1" /> Onayla
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
