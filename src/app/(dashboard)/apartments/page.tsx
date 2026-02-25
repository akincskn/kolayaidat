import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Building2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default async function ApartmentsPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") redirect("/dashboard");

  const apartments = await prisma.apartment.findMany({
    where: { managerId: session.user.id },
    include: {
      _count: { select: { units: true } },
      units: { where: { residentId: { not: null } }, select: { id: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Apartmanlar</h1>
          <p className="text-slate-500 text-sm">Yönettiğiniz apartmanlar</p>
        </div>
        <Button asChild>
          <Link href="/apartments/new">
            <Plus className="w-4 h-4 mr-2" /> Apartman Ekle
          </Link>
        </Button>
      </div>

      {apartments.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Building2 className="w-14 h-14 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-500 font-medium text-lg">Henüz apartman yok</p>
            <p className="text-slate-400 text-sm mt-1 mb-6">
              Başlamak için ilk apartmanınızı ekleyin.
            </p>
            <Button asChild>
              <Link href="/apartments/new">
                <Plus className="w-4 h-4 mr-2" /> İlk Apartmanı Ekle
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {apartments.map((apt) => (
            <Link key={apt.id} href={`/apartments/${apt.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base truncate">{apt.name}</CardTitle>
                      <p className="text-slate-400 text-xs mt-0.5 truncate">{apt.address}</p>
                    </div>
                    <Building2 className="w-5 h-5 text-slate-300 shrink-0 mt-0.5" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <span className="text-sm text-slate-600">
                      {apt._count.units} daire
                    </span>
                    <Badge variant="secondary" className="ml-auto text-xs">
                      {apt.units.length} sakin
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
