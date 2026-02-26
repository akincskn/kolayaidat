import Link from "next/link";
import { Building2, Users, CheckCircle, Clock, XCircle, Plus, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

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

type Apartment = {
  id: string;
  name: string;
  address: string;
  units: {
    id: string;
    unitNumber: string;
    resident: { id: string; name: string } | null;
    payments: {
      id: string;
      status: string;
      due: { month: number; year: number; amount: number };
    }[];
  }[];
  dues: { month: number; year: number; amount: number }[];
} | null;

function getStats(apartment: NonNullable<Apartment>) {
  const totalUnits = apartment.units.length;
  const occupiedUnits = apartment.units.filter((u) => u.resident).length;

  // Mevcut ayı öncelikli göster, yoksa geçmişe düş, yoksa ilk due
  const now = new Date();
  const thisMonth = now.getMonth() + 1;
  const thisYear = now.getFullYear();
  const latestDue =
    apartment.dues.find((d) => d.month === thisMonth && d.year === thisYear) ??
    apartment.dues.find(
      (d) => d.year < thisYear || (d.year === thisYear && d.month <= thisMonth)
    ) ??
    apartment.dues[0];

  if (!latestDue) {
    return { totalUnits, occupiedUnits, approved: 0, pending: 0, rejected: 0, unpaid: 0, latestDue: null };
  }

  let approved = 0, pending = 0, rejected = 0;
  for (const unit of apartment.units) {
    if (!unit.resident) continue;
    const payment = unit.payments.find(
      (p) => p.due.month === latestDue.month && p.due.year === latestDue.year
    );
    if (!payment) {
      // no payment
    } else if (payment.status === "APPROVED") approved++;
    else if (payment.status === "PENDING") pending++;
    else if (payment.status === "REJECTED") rejected++;
  }

  const unpaid = occupiedUnits - approved - pending - rejected;
  return { totalUnits, occupiedUnits, approved, pending, rejected, unpaid, latestDue };
}

export function AdminDashboard({ apartment }: { apartment: Apartment }) {
  if (!apartment) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Genel Bakış</h1>
            <p className="text-slate-500 text-base">Apartmanınıza genel bakış</p>
          </div>
          <Button asChild size="lg">
            <Link href="/apartments/new">
              <Plus className="w-5 h-5 mr-2" /> Apartman Ekle
            </Link>
          </Button>
        </div>
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-16 h-16 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium text-xl">Henüz apartman eklemediniz.</p>
            <p className="text-slate-400 text-base mt-2 mb-6">
              Başlamak için bir apartman ekleyin.
            </p>
            <Button asChild size="lg">
              <Link href="/apartments/new">
                <Plus className="w-5 h-5 mr-2" /> İlk Apartmanı Ekle
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stats = getStats(apartment);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Genel Bakış</h1>
          <p className="text-slate-500 text-base">{apartment.name}</p>
        </div>
        <Button asChild size="lg">
          <Link href="/apartments/new">
            <Plus className="w-5 h-5 mr-2" /> Apartman Ekle
          </Link>
        </Button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Toplam Daire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-slate-400" />
              <span className="text-3xl font-bold text-slate-800">{stats.totalUnits}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Onaylı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-6 h-6 text-green-500" />
              <span className="text-3xl font-bold text-green-600">{stats.approved}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Beklemede</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-6 h-6 text-amber-400" />
              <span className="text-3xl font-bold text-amber-600">{stats.pending}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Yüklenmedi</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <XCircle className="w-6 h-6 text-red-400" />
              <span className="text-3xl font-bold text-red-600">{stats.unpaid}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Current month due info */}
      {stats.latestDue && (
        <div className="bg-slate-800 text-white rounded-xl p-5 flex flex-wrap gap-4 items-center justify-between">
          <div>
            <p className="text-slate-400 text-sm">Güncel Aidat</p>
            <p className="text-xl font-bold">
              {MONTHS_TR[stats.latestDue.month]} {stats.latestDue.year} —{" "}
              {stats.latestDue.amount.toLocaleString("tr-TR")} ₺
            </p>
          </div>
          <Button asChild variant="secondary" size="lg">
            <Link
              href={`/odemeler?apt=${apartment.id}&month=${stats.latestDue.month}&year=${stats.latestDue.year}`}
            >
              Ödemeleri Yönet <ArrowRight className="w-5 h-5 ml-2" />
            </Link>
          </Button>
        </div>
      )}

      {/* Unit list */}
      <div>
        <h2 className="text-lg font-semibold text-slate-700 mb-3">Daire Durumları</h2>
        {apartment.units.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-slate-400 text-base">
              Bu apartmanda henüz daire yok.{" "}
              <Link href={`/apartments/${apartment.id}`} className="text-blue-600 underline">
                Daire ekle
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="bg-white rounded-xl border overflow-hidden">
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
                    Bu Ay Durumu
                  </th>
                </tr>
              </thead>
              <tbody>
                {apartment.units.map((unit) => {
                  const latestDue = stats.latestDue;
                  const payment = latestDue
                    ? unit.payments.find(
                        (p) =>
                          p.due.month === latestDue.month && p.due.year === latestDue.year
                      )
                    : undefined;

                  return (
                    <tr key={unit.id} className="border-b last:border-0 h-14">
                      <td className="px-5 py-3 font-semibold text-slate-800 text-base">
                        Daire {unit.unitNumber}
                      </td>
                      <td className="px-5 py-3 text-base text-slate-700">
                        {unit.resident?.name ?? (
                          <span className="text-slate-400 text-sm">Boş</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {!unit.resident ? (
                          <span className="text-slate-400 text-sm">—</span>
                        ) : !latestDue ? (
                          <span className="text-slate-400 text-sm">Aidat yok</span>
                        ) : !payment ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-red-700 bg-red-50">
                            <XCircle className="w-4 h-4" /> Yüklenmedi
                          </span>
                        ) : payment.status === "APPROVED" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-green-700 bg-green-50">
                            <CheckCircle className="w-4 h-4" /> Onaylandı
                          </span>
                        ) : payment.status === "PENDING" ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-amber-700 bg-amber-50">
                            <Clock className="w-4 h-4" /> Beklemede
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold text-red-700 bg-red-50">
                            <XCircle className="w-4 h-4" /> Reddedildi
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
