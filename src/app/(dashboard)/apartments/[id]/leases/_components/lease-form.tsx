"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Info, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatTRY, MONTHS_TR } from "@/lib/constants";
import { generateChargeSchedule, MAX_PAYMENT_DAY } from "@/lib/lease";

export type LeaseFormUnit = {
  id: string;
  unitNumber: string;
  resident: { id: string; name: string; email: string } | null;
  /** Bu dairede halihazırda aktif bir sözleşme var mı? */
  hasActiveLease: boolean;
};

export type LeaseFormValues = {
  id?: string;
  unitId: string;
  monthlyRent: string;
  startDate: string;
  endDate: string;
  paymentDay: string;
  depositAmount: string;
  rentIncreaseRate: string;
  notes: string;
  status?: "ACTIVE" | "ENDED" | "CANCELLED";
};

/**
 * Kira sözleşmesi oluşturma/düzenleme formu.
 *
 * Aynı bileşen iki modda kullanılır (DRY): `lease` verilirse düzenleme,
 * verilmezse oluşturma. Form, kaydetmeden önce üretilecek kira borçlarının
 * bir önizlemesini gösterir — kullanıcı kaç taksit oluşacağını ve artış
 * oranının etkisini kaydetmeden görebilsin diye.
 */
export function LeaseForm({
  apartmentId,
  apartmentName,
  units,
  initialValues,
  mode,
}: {
  apartmentId: string;
  apartmentName: string;
  units: LeaseFormUnit[];
  initialValues: LeaseFormValues;
  mode: "create" | "edit";
}) {
  const router = useRouter();
  const [form, setForm] = useState<LeaseFormValues>(initialValues);
  const [saving, setSaving] = useState(false);

  const selectedUnit = units.find((u) => u.id === form.unitId) ?? null;

  const selectableUnits = useMemo(
    () =>
      mode === "edit"
        ? units
        : // Oluşturmada zaten aktif sözleşmesi olan daireler listelenmez —
          // sunucu da aynı kuralı 409 ile zorlar, bu sadece erken geri bildirim.
          units.filter((u) => !u.hasActiveLease),
    [units, mode]
  );

  // Kaydetmeden önce üretilecek taksitlerin önizlemesi.
  const preview = useMemo(() => {
    const rent = Number(form.monthlyRent.replace(",", "."));
    if (!rent || !form.startDate || !form.endDate) return null;
    const start = new Date(`${form.startDate}T00:00:00Z`);
    const end = new Date(`${form.endDate}T00:00:00Z`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
      return null;
    }
    const charges = generateChargeSchedule({
      monthlyRent: rent,
      startDate: start,
      endDate: end,
      paymentDay: Number(form.paymentDay) || 1,
      rentIncreaseRate: form.rentIncreaseRate
        ? Number(form.rentIncreaseRate.replace(",", "."))
        : null,
    });
    if (charges.length === 0) return null;
    const total = charges.reduce((sum, c) => sum + c.amount, 0);
    return { charges, total, first: charges[0], last: charges[charges.length - 1] };
  }, [form.monthlyRent, form.startDate, form.endDate, form.paymentDay, form.rentIncreaseRate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!form.unitId) {
      toast.error("Daire seçiniz.");
      return;
    }
    if (mode === "create" && !selectedUnit?.resident) {
      toast.error("Kiracı atanabilmesi için önce daireye sakin davet edin.");
      return;
    }
    if (!form.monthlyRent || !form.startDate || !form.endDate) {
      toast.error("Kira tutarı ve sözleşme tarihleri zorunludur.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        unitId: form.unitId,
        monthlyRent: form.monthlyRent,
        startDate: form.startDate,
        endDate: form.endDate,
        paymentDay: form.paymentDay,
        depositAmount: form.depositAmount || 0,
        rentIncreaseRate: form.rentIncreaseRate || null,
        notes: form.notes || null,
        ...(mode === "edit" ? { status: form.status } : {}),
      };

      const res = await fetch(
        mode === "create"
          ? `/api/apartments/${apartmentId}/leases`
          : `/api/leases/${form.id}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "İşlem başarısız.");
        return;
      }

      toast.success(
        mode === "create"
          ? `Sözleşme oluşturuldu, ${data.chargeCount} aylık kira borcu tanımlandı.`
          : "Sözleşme güncellendi."
      );
      router.push(`/apartments/${apartmentId}/leases/${data.id}`);
      router.refresh();
    } catch {
      toast.error("Bağlantı hatası oluştu.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" asChild className="mt-1">
          <Link href={`/apartments/${apartmentId}?tab=kira`}>
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">
            {mode === "create" ? "Yeni Kira Sözleşmesi" : "Sözleşmeyi Düzenle"}
          </h1>
          <p className="text-slate-400 text-sm">{apartmentName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardContent className="py-5 space-y-5">
            <h2 className="font-semibold text-slate-700">Daire ve Kiracı</h2>

            <div className="space-y-2">
              <Label>Daire *</Label>
              {mode === "edit" ? (
                <Input value={`Daire ${selectedUnit?.unitNumber ?? ""}`} disabled />
              ) : selectableUnits.length === 0 ? (
                <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
                  Sözleşme tanımlanabilecek boşta daire yok. Tüm dairelerde zaten aktif
                  bir sözleşme var ya da apartmanda hiç daire tanımlı değil.
                </p>
              ) : (
                <Select
                  value={form.unitId || undefined}
                  onValueChange={(v) => setForm({ ...form, unitId: v })}
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue placeholder="Daire seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectableUnits.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        Daire {u.unitNumber}
                        {u.resident ? ` — ${u.resident.name}` : " — (boş)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {mode === "edit" && (
                <p className="text-xs text-slate-400">
                  Sözleşmenin dairesi değiştirilemez; farklı daire için yeni sözleşme
                  oluşturun.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Kiracı</Label>
              {selectedUnit?.resident ? (
                <div className="bg-slate-50 border rounded-lg px-4 py-3 text-sm">
                  <p className="font-medium text-slate-800">
                    {selectedUnit.resident.name}
                  </p>
                  <p className="text-slate-400">{selectedUnit.resident.email}</p>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm space-y-2">
                  <p className="text-amber-800">
                    Bu dairede kayıtlı sakin yok. Kiracı, dairenin sakini olarak
                    atanır — önce davet gönderin.
                  </p>
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/apartments/${apartmentId}`}>Daireye Sakin Davet Et</Link>
                  </Button>
                </div>
              )}
              <p className="text-xs text-slate-400">
                Kiracı, dairenin mevcut sakinidir. Sakin değiştiğinde sözleşmedeki
                kiracı da güncellenir.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-5 space-y-5">
            <h2 className="font-semibold text-slate-700">Sözleşme Koşulları</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyRent">Aylık Kira Tutarı (₺) *</Label>
                <Input
                  id="monthlyRent"
                  type="number"
                  min="1"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Örn: 15000"
                  className="min-h-[44px]"
                  value={form.monthlyRent}
                  onChange={(e) => setForm({ ...form, monthlyRent: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentDay">Ödeme Günü (ayın kaçında) *</Label>
                <Input
                  id="paymentDay"
                  type="number"
                  min="1"
                  max={MAX_PAYMENT_DAY}
                  className="min-h-[44px]"
                  value={form.paymentDay}
                  onChange={(e) => setForm({ ...form, paymentDay: e.target.value })}
                  required
                />
                <p className="text-xs text-slate-400">
                  Her ayda geçerli olması için en fazla {MAX_PAYMENT_DAY}.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="startDate">Sözleşme Başlangıcı *</Label>
                <Input
                  id="startDate"
                  type="date"
                  className="min-h-[44px]"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endDate">Sözleşme Bitişi *</Label>
                <Input
                  id="endDate"
                  type="date"
                  className="min-h-[44px]"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="depositAmount">Depozito (₺)</Label>
                <Input
                  id="depositAmount"
                  type="number"
                  min="0"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Örn: 30000"
                  className="min-h-[44px]"
                  value={form.depositAmount}
                  onChange={(e) => setForm({ ...form, depositAmount: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="rentIncreaseRate">Yıllık Kira Artış Oranı (%)</Label>
                <Input
                  id="rentIncreaseRate"
                  type="number"
                  min="0"
                  max="500"
                  step="0.01"
                  inputMode="decimal"
                  placeholder="Örn: 25"
                  className="min-h-[44px]"
                  value={form.rentIncreaseRate}
                  onChange={(e) =>
                    setForm({ ...form, rentIncreaseRate: e.target.value })
                  }
                />
                <p className="text-xs text-slate-400">
                  Boş bırakılırsa kira sabit kalır. Girilirse her 12 ayda bir uygulanır.
                </p>
              </div>
            </div>

            {mode === "edit" && (
              <div className="space-y-2">
                <Label>Sözleşme Durumu</Label>
                <Select
                  value={form.status ?? "ACTIVE"}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v as LeaseFormValues["status"] })
                  }
                >
                  <SelectTrigger className="min-h-[44px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Aktif</SelectItem>
                    <SelectItem value="ENDED">Sona Erdi</SelectItem>
                    <SelectItem value="CANCELLED">İptal Edildi</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Not (opsiyonel)</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="Örn: Aidat kiracıya aittir."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        {preview && (
          <Card className="border-slate-300 bg-slate-50">
            <CardContent className="py-5 space-y-3">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-slate-500" />
                <h2 className="font-semibold text-slate-700">
                  Oluşturulacak Kira Borçları
                </h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Taksit Sayısı</p>
                  <p className="text-lg font-bold text-slate-800">
                    {preview.charges.length} ay
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">İlk Taksit</p>
                  <p className="text-lg font-bold text-slate-800">
                    {MONTHS_TR[preview.first.month]} {preview.first.year}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Son Taksit</p>
                  <p className="text-lg font-bold text-slate-800">
                    {MONTHS_TR[preview.last.month]} {preview.last.year}
                  </p>
                </div>
                <div>
                  <p className="text-slate-500">Toplam Kira</p>
                  <p className="text-lg font-bold text-slate-800">
                    {formatTRY(preview.total)}
                  </p>
                </div>
              </div>
              {preview.first.amount !== preview.last.amount && (
                <p className="text-xs text-slate-500">
                  Artış oranı uygulandı: ilk taksit {formatTRY(preview.first.amount)},
                  son taksit {formatTRY(preview.last.amount)}.
                </p>
              )}
              {mode === "edit" && (
                <p className="text-xs text-slate-500">
                  Güncelleme sırasında ödemesi bulunan aylara dokunulmaz; yalnızca
                  eksik aylar eklenir ve ödemesiz aylar güncellenir.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="flex flex-wrap gap-3">
          <Button
            type="submit"
            size="lg"
            className="min-h-[48px]"
            disabled={saving || (mode === "create" && selectableUnits.length === 0)}
          >
            <Save className="w-4 h-4 mr-2" />
            {saving
              ? "Kaydediliyor..."
              : mode === "create"
                ? "Sözleşmeyi Oluştur"
                : "Değişiklikleri Kaydet"}
          </Button>
          <Button type="button" variant="outline" size="lg" asChild className="min-h-[48px]">
            <Link
              href={
                mode === "edit" && form.id
                  ? `/apartments/${apartmentId}/leases/${form.id}`
                  : `/apartments/${apartmentId}?tab=kira`
              }
            >
              İptal
            </Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
