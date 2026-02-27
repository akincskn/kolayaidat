"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, CheckCircle, XCircle, FileText, ExternalLink, Filter,
  TrendingUp, Wallet, Clock, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

const MONTHS_TR = [
  "", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

// -------------------------------------------------------
// Tipler
// -------------------------------------------------------
type Payment = {
  id: string;
  status: string;
  receiptUrl: string | null;
  rejectionReason: string | null;
  uploadedAt: string | Date;
  reviewedAt: string | Date | null;
  due: { id: string; month: number; year: number; amount: number };
  unit: { id: string; unitNumber: string };
  resident: { name: string; email: string };
};

type Unit = {
  id: string;
  unitNumber: string;
  floor: number | null;
  resident: { id: string; name: string; email: string } | null;
};

type Due = { id: string; month: number; year: number; amount: number };
type Apartment = { id: string; name: string; dues: Due[] };

// -------------------------------------------------------
// Badge yardımcıları
// -------------------------------------------------------
function statusBadge(status: string) {
  if (status === "APPROVED")
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Ödendi</Badge>;
  if (status === "REJECTED")
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Reddedildi</Badge>;
  if (status === "PENDING")
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">İnceleniyor</Badge>;
  return <Badge className="bg-slate-100 text-slate-500 hover:bg-slate-100">Ödenmedi</Badge>;
}

// -------------------------------------------------------
// Ana bileşen
// -------------------------------------------------------
export function PaymentsManager({
  apartment,
  initialPayments,
  units,
}: {
  apartment: Apartment;
  initialPayments: Payment[];
  units: Unit[];
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [filterDue, setFilterDue] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  const [reviewPayment, setReviewPayment] = useState<Payment | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  // -------------------------------------------------------
  // Onay / Red
  // -------------------------------------------------------
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
        prev.map((p) =>
          p.id === data.id
            ? { ...p, status: data.status, rejectionReason: data.rejectionReason, reviewedAt: data.reviewedAt }
            : p
        )
      );
      toast.success(action === "approve" ? "Dekont onaylandı." : "Dekont reddedildi.");
      setReviewPayment(null);
      setRejectionReason("");
    } catch {
      toast.error("Bağlantı hatası oluştu.");
    } finally {
      setProcessing(false);
    }
  }

  // -------------------------------------------------------
  // Türetilen veriler
  // -------------------------------------------------------
  const selectedDue = apartment.dues.find((d) => d.id === filterDue) ?? null;
  const isMonthView = filterDue !== "all" && selectedDue !== null;

  // Sakinli daireler (sıralı)
  const occupiedUnits = units.filter((u) => u.resident !== null);

  // Seçili aya ait tüm ödemeler (filtre uygulanmamış) — summary için
  const monthPayments = isMonthView
    ? payments.filter((p) => p.due.id === filterDue)
    : payments;

  // Ay seçiliyse: her unit için payment eşleştir
  const unitRows = isMonthView
    ? occupiedUnits
        .map((unit) => ({
          unit,
          payment: payments.find((p) => p.unit.id === unit.id && p.due.id === filterDue) ?? null,
        }))
        .filter((row) => {
          if (filterStatus === "all") return true;
          if (filterStatus === "NOT_PAID") return row.payment === null;
          return row.payment?.status === filterStatus;
        })
    : [];

  // Ay seçili değilse: sadece gönderilmiş ödemeler
  const filteredPayments = !isMonthView
    ? payments.filter((p) => filterStatus === "all" || p.status === filterStatus)
    : [];

  // -------------------------------------------------------
  // Summary hesapla
  // -------------------------------------------------------
  const totalAmount = isMonthView
    ? selectedDue!.amount * occupiedUnits.length          // o ayda tüm sakinlerin borcu
    : monthPayments.reduce((s, p) => s + p.due.amount, 0); // sadece gönderilenlerin toplamı

  const paidAmount = monthPayments
    .filter((p) => p.status === "APPROVED")
    .reduce((s, p) => s + p.due.amount, 0);

  const pendingCount = monthPayments.filter((p) => p.status === "PENDING").length;
  const rejectedCount = monthPayments.filter((p) => p.status === "REJECTED").length;

  const fmt = (n: number) => n.toLocaleString("tr-TR") + " ₺";

  // -------------------------------------------------------
  // Filtre değişince status sıfırla
  // -------------------------------------------------------
  function handleDueChange(val: string) {
    setFilterDue(val);
    setFilterStatus("all");
  }

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Başlık */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/apartments/${apartment.id}`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Dekontlar</h1>
          <p className="text-slate-400 text-sm">{apartment.name}</p>
        </div>
      </div>

      {/* Summary kartlar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <TrendingUp className="w-5 h-5 text-slate-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-base font-bold leading-none truncate">{fmt(totalAmount)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Toplam Tutar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Wallet className="w-5 h-5 text-green-500 shrink-0" />
            <div className="min-w-0">
              <p className="text-base font-bold text-green-600 leading-none truncate">{fmt(paidAmount)}</p>
              <p className="text-xs text-slate-500 mt-0.5">Ödenen Tutar</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Clock className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <p className="text-base font-bold text-amber-600 leading-none">{pendingCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Bekleyen</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            <div>
              <p className="text-base font-bold text-red-500 leading-none">{rejectedCount}</p>
              <p className="text-xs text-slate-500 mt-0.5">Reddedilen</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtreler */}
      <div className="flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-slate-400" />
        <Select value={filterDue} onValueChange={handleDueChange}>
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
            <SelectItem value="APPROVED">Ödendi</SelectItem>
            <SelectItem value="REJECTED">Reddedildi</SelectItem>
            {isMonthView && (
              <SelectItem value="NOT_PAID">Ödenmedi</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      {/* ==================== AY SEÇİLİ: tüm sakinler görünümü ==================== */}
      {isMonthView && (
        <>
          {unitRows.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-400 text-sm">
                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                {occupiedUnits.length === 0
                  ? "Bu apartmanda henüz sakin yok."
                  : "Seçilen filtreye uygun kayıt bulunamadı."}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Daire</TableHead>
                      <TableHead>Sakin</TableHead>
                      <TableHead>Ödenecek Tutar</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Dekont</TableHead>
                      <TableHead className="text-right">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {unitRows.map(({ unit, payment }) => (
                      <TableRow
                        key={unit.id}
                        className={payment?.status === "PENDING" ? "bg-amber-50/50" : ""}
                      >
                        {/* Daire */}
                        <TableCell>
                          <p className="font-medium text-sm">Daire {unit.unitNumber}</p>
                          {unit.floor !== null && (
                            <p className="text-xs text-slate-400">{unit.floor}. kat</p>
                          )}
                        </TableCell>

                        {/* Sakin */}
                        <TableCell>
                          <p className="text-sm">{unit.resident!.name}</p>
                          <p className="text-xs text-slate-400">{unit.resident!.email}</p>
                        </TableCell>

                        {/* Ödenecek Tutar */}
                        <TableCell>
                          <span className="font-semibold text-sm">
                            {selectedDue!.amount.toLocaleString("tr-TR")} ₺
                          </span>
                        </TableCell>

                        {/* Durum */}
                        <TableCell>
                          <div className="space-y-0.5">
                            {statusBadge(payment?.status ?? "NOT_PAID")}
                            {payment?.status === "REJECTED" && payment.rejectionReason && (
                              <p className="text-xs text-red-500">{payment.rejectionReason}</p>
                            )}
                          </div>
                        </TableCell>

                        {/* Dekont */}
                        <TableCell>
                          {payment?.receiptUrl ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                              <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3" /> Görüntüle
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>

                        {/* İşlem */}
                        <TableCell className="text-right">
                          {payment?.status === "PENDING" ? (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setReviewPayment(payment); setRejectionReason(""); }}
                            >
                              İncele
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ==================== AY SEÇİLMEDİ: gönderilmiş ödemeler ==================== */}
      {!isMonthView && (
        <>
          {filteredPayments.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-slate-400 text-sm">
                <FileText className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                Dekont bulunamadı.
              </CardContent>
            </Card>
          ) : (
            <Card>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Daire</TableHead>
                      <TableHead>Sakin</TableHead>
                      <TableHead>Ödenecek Tutar</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Dekont</TableHead>
                      <TableHead className="text-right">İşlem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow
                        key={payment.id}
                        className={payment.status === "PENDING" ? "bg-amber-50/50" : ""}
                      >
                        <TableCell>
                          <p className="font-medium text-sm">Daire {payment.unit.unitNumber}</p>
                          <p className="text-xs text-slate-400">
                            {MONTHS_TR[payment.due.month]} {payment.due.year}
                          </p>
                        </TableCell>
                        <TableCell>
                          <p className="text-sm">{payment.resident.name}</p>
                          <p className="text-xs text-slate-400">{payment.resident.email}</p>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-sm">
                            {payment.due.amount.toLocaleString("tr-TR")} ₺
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            {statusBadge(payment.status)}
                            {payment.status === "REJECTED" && payment.rejectionReason && (
                              <p className="text-xs text-red-500">{payment.rejectionReason}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {payment.receiptUrl ? (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" asChild>
                              <a href={payment.receiptUrl} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="w-3 h-3" /> Görüntüle
                              </a>
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {payment.status === "PENDING" ? (
                            <Button
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => { setReviewPayment(payment); setRejectionReason(""); }}
                            >
                              İncele
                            </Button>
                          ) : (
                            <span className="text-xs text-slate-400">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>
          )}
        </>
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
                <p>
                  <span className="text-slate-500">Ay:</span>{" "}
                  <strong>{MONTHS_TR[reviewPayment.due.month]} {reviewPayment.due.year}</strong>
                </p>
                <p>
                  <span className="text-slate-500">Tutar:</span>{" "}
                  <strong>{reviewPayment.due.amount.toLocaleString("tr-TR")} ₺</strong>
                </p>
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
