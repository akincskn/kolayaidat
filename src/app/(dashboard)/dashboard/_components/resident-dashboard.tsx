import Link from "next/link";
import { Building2, CreditCard, CheckCircle, Clock, XCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PaymentStatus } from "@prisma/client";

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

type Unit = {
  id: string;
  unitNumber: string;
  apartment: { name: string; address: string };
  payments: {
    id: string;
    status: PaymentStatus;
    uploadedAt: Date;
    due: { month: number; year: number; amount: number };
  }[];
} | null;

function StatusBadge({ status }: { status: PaymentStatus }) {
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

export function ResidentDashboard({ unit, userName }: { unit: Unit; userName: string }) {
  if (!unit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Merhaba, {userName}</h1>
          <p className="text-slate-500 text-base">Hoş geldiniz</p>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium text-xl">Henüz bir daireye atanmadınız.</p>
            <p className="text-slate-400 text-base mt-2">
              Apartman yöneticinizden davet bağlantısı isteyin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const latestPayment = unit.payments[0];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Merhaba, {userName}</h1>
        <p className="text-slate-500 text-base">Ödeme durumunuza genel bakış</p>
      </div>

      {/* Unit info card */}
      <Card>
        <CardContent className="py-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <Building2 className="w-8 h-8 text-slate-500" />
            </div>
            <div>
              <p className="text-xl font-bold text-slate-800">
                {unit.apartment.name} — Daire {unit.unitNumber}
              </p>
              <p className="text-slate-400 text-base">{unit.apartment.address}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Latest payment status */}
      {latestPayment ? (
        <Card>
          <CardContent className="py-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500 mb-1">Son Ödeme</p>
                <p className="text-xl font-bold text-slate-800">
                  {MONTHS_TR[latestPayment.due.month]} {latestPayment.due.year}
                </p>
                <p className="text-2xl font-bold text-slate-700 mt-1">
                  {latestPayment.due.amount.toLocaleString("tr-TR")} ₺
                </p>
              </div>
              <StatusBadge status={latestPayment.status} />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <CreditCard className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 text-base">Henüz ödeme kaydı yok.</p>
          </CardContent>
        </Card>
      )}

      {/* CTA */}
      <Button asChild size="lg" className="w-full sm:w-auto min-h-[52px] text-base">
        <Link href="/my-payments">
          <CreditCard className="w-5 h-5 mr-2" /> Ödemelerime Git <ArrowRight className="w-5 h-5 ml-2" />
        </Link>
      </Button>
    </div>
  );
}
