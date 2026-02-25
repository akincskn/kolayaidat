import Link from "next/link";
import { Building2, CreditCard, CheckCircle, Clock, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PaymentStatus } from "@prisma/client";

const MONTHS_TR = [
  "", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

function statusBadge(status: PaymentStatus) {
  if (status === "APPROVED")
    return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Onaylandı</Badge>;
  if (status === "REJECTED")
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">Reddedildi</Badge>;
  return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">İnceleniyor</Badge>;
}

function statusIcon(status: PaymentStatus) {
  if (status === "APPROVED") return <CheckCircle className="w-4 h-4 text-green-500" />;
  if (status === "REJECTED") return <XCircle className="w-4 h-4 text-red-500" />;
  return <Clock className="w-4 h-4 text-amber-500" />;
}

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

export function ResidentDashboard({ unit, userName }: { unit: Unit; userName: string }) {
  if (!unit) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Merhaba, {userName}</h1>
          <p className="text-slate-500 text-sm">Hoş geldiniz</p>
        </div>
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Henüz bir daireye atanmadınız.</p>
            <p className="text-slate-400 text-sm mt-1">
              Apartman yöneticinizden davet bağlantısı isteyin.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const recentPayments = unit.payments.slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Merhaba, {userName}</h1>
        <p className="text-slate-500 text-sm">Ödeme durumunuza genel bakış</p>
      </div>

      {/* Unit info */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <Building2 className="w-8 h-8 text-slate-400" />
            <div>
              <p className="font-semibold">{unit.apartment.name} — Daire {unit.unitNumber}</p>
              <p className="text-slate-400 text-sm">{unit.apartment.address}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent payments */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-700">Son Ödemeler</h2>
          <Button variant="outline" size="sm" asChild>
            <Link href="/my-payments">
              <CreditCard className="w-4 h-4 mr-2" /> Tüm Ödemeler
            </Link>
          </Button>
        </div>

        {recentPayments.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-slate-400 text-sm">
              Henüz ödeme kaydı yok.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {recentPayments.map((payment) => (
              <Card key={payment.id}>
                <CardContent className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {statusIcon(payment.status)}
                      <div>
                        <p className="text-sm font-medium">
                          {MONTHS_TR[payment.due.month]} {payment.due.year}
                        </p>
                        <p className="text-xs text-slate-400">
                          {payment.due.amount.toLocaleString("tr-TR")} ₺
                        </p>
                      </div>
                    </div>
                    {statusBadge(payment.status)}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
