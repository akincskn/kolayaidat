import Link from "next/link";
import { Building2, Users, CheckCircle, Clock, XCircle, Plus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type Apartment = {
  id: string;
  name: string;
  address: string;
  units: {
    id: string;
    unitNumber: string;
    resident: { name: string } | null;
    payments: {
      status: string;
      due: { month: number; year: number; amount: number };
    }[];
  }[];
  dues: { month: number; year: number; amount: number }[];
};

function getStats(apartment: Apartment) {
  const totalUnits = apartment.units.length;
  const occupiedUnits = apartment.units.filter((u) => u.resident).length;

  const latestDue = apartment.dues[0];
  if (!latestDue) return { totalUnits, occupiedUnits, approved: 0, pending: 0, rejected: 0, unpaid: 0, latestDue: null };

  let approved = 0, pending = 0, rejected = 0;
  for (const unit of apartment.units) {
    if (!unit.resident) continue;
    const payment = unit.payments.find(
      (p) => p.due.month === latestDue.month && p.due.year === latestDue.year
    );
    if (!payment) { }
    else if (payment.status === "APPROVED") approved++;
    else if (payment.status === "PENDING") pending++;
    else if (payment.status === "REJECTED") rejected++;
  }

  const unpaid = occupiedUnits - approved - pending - rejected;

  return { totalUnits, occupiedUnits, approved, pending, rejected, unpaid, latestDue };
}

export function AdminDashboard({ apartments }: { apartments: Apartment[] }) {
  const totalApartments = apartments.length;
  const totalUnits = apartments.reduce((s, a) => s + a.units.length, 0);
  const totalPending = apartments.reduce((s, a) => {
    const { pending } = getStats(a);
    return s + pending;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Genel Bakış</h1>
          <p className="text-slate-500 text-sm">Tüm apartmanlarınıza genel bakış</p>
        </div>
        <Button asChild>
          <Link href="/apartments/new">
            <Plus className="w-4 h-4 mr-2" /> Apartman Ekle
          </Link>
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Apartmanlar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-slate-400" />
              <span className="text-2xl font-bold">{totalApartments}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Toplam Daire</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-400" />
              <span className="text-2xl font-bold">{totalUnits}</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-500">Bekleyen Dekont</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-amber-400" />
              <span className="text-2xl font-bold text-amber-600">{totalPending}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Apartments list */}
      {apartments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Henüz apartman eklemediniz.</p>
            <p className="text-slate-400 text-sm mt-1">Başlamak için bir apartman ekleyin.</p>
            <Button asChild className="mt-4">
              <Link href="/apartments/new">
                <Plus className="w-4 h-4 mr-2" /> İlk Apartmanı Ekle
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {apartments.map((apartment) => {
            const stats = getStats(apartment);
            return (
              <Link key={apartment.id} href={`/apartments/${apartment.id}`}>
                <Card className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{apartment.name}</CardTitle>
                        <p className="text-slate-400 text-xs mt-0.5">{apartment.address}</p>
                      </div>
                      <Badge variant="secondary">
                        {stats.occupiedUnits}/{stats.totalUnits} daire
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {stats.latestDue ? (
                      <div>
                        <p className="text-xs text-slate-500 mb-2">
                          Son aidat: {stats.latestDue.month}/{stats.latestDue.year} —{" "}
                          <strong>{stats.latestDue.amount.toLocaleString("tr-TR")} ₺</strong>
                        </p>
                        <div className="flex gap-2 flex-wrap">
                          <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                            <CheckCircle className="w-3 h-3" /> {stats.approved} Onaylı
                          </span>
                          {stats.pending > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                              <Clock className="w-3 h-3" /> {stats.pending} Bekliyor
                            </span>
                          )}
                          {stats.rejected > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                              <XCircle className="w-3 h-3" /> {stats.rejected} Reddedildi
                            </span>
                          )}
                          {stats.unpaid > 0 && (
                            <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
                              {stats.unpaid} Yüklenmedi
                            </span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Henüz aidat tanımlanmadı.</p>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
