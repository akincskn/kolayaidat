"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Plus, CheckCircle, Clock, XCircle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MONTHS_TR = [
  "", "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
  "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
];

type Payment = { status: string };
type Due = {
  id: string;
  amount: number;
  month: number;
  year: number;
  dueDate: string | Date;
  description: string | null;
  payments: Payment[];
};
type Apartment = { id: string; name: string; _count: { units: number } };

function getDueStats(due: Due, occupiedUnits: number) {
  const approved = due.payments.filter((p) => p.status === "APPROVED").length;
  const pending = due.payments.filter((p) => p.status === "PENDING").length;
  const rejected = due.payments.filter((p) => p.status === "REJECTED").length;
  const unpaid = occupiedUnits - approved - pending - rejected;
  return { approved, pending, rejected, unpaid };
}

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 4 }, (_, i) => currentYear + 1 - i);

export function DuesManager({
  apartment,
  occupiedUnits,
}: {
  apartment: Apartment & { dues: Due[] };
  occupiedUnits: number;
}) {
  const router = useRouter();
  const [dues, setDues] = useState(apartment.dues);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const now = new Date();
  const [form, setForm] = useState({
    amount: "",
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    dueDate: "",
    description: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.amount || !form.dueDate) {
      toast.error("Tutar ve son ödeme tarihi zorunludur.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/apartments/${apartment.id}/dues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }

      setDues((prev) => [{ ...data, payments: [] }, ...prev]);
      setShowForm(false);
      setForm({ amount: "", month: String(now.getMonth() + 1), year: String(now.getFullYear()), dueDate: "", description: "" });
      toast.success(`${MONTHS_TR[data.month]} ${data.year} aidatı oluşturuldu.`);
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/apartments/${apartment.id}`}><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-800">Aidat Yönetimi</h1>
          <p className="text-slate-400 text-sm">{apartment.name}</p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" /> Aidat Tanımla
        </Button>
      </div>

      {dues.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center">
            <TrendingUp className="w-12 h-12 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Henüz aidat tanımlanmadı.</p>
            <p className="text-slate-400 text-sm mt-1 mb-5">
              Her ay için aidat tutarı ve son ödeme tarihi belirleyin.
            </p>
            <Button onClick={() => setShowForm(true)}>
              <Plus className="w-4 h-4 mr-2" /> İlk Aidatı Tanımla
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {dues.map((due) => {
            const stats = getDueStats(due, occupiedUnits);
            const isPast = new Date(due.dueDate as string) < new Date();
            return (
              <Card key={due.id}>
                <CardContent className="py-4 px-5">
                  <div className="flex flex-wrap items-start gap-3 justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-slate-800">
                          {MONTHS_TR[due.month]} {due.year}
                        </h3>
                        {isPast && occupiedUnits > 0 && stats.approved < occupiedUnits && (
                          <Badge variant="destructive" className="text-xs">Vadesi Geçti</Badge>
                        )}
                      </div>
                      <p className="text-lg font-bold text-slate-700 mt-0.5">
                        {due.amount.toLocaleString("tr-TR")} ₺
                      </p>
                      <p className="text-xs text-slate-400">
                        Son ödeme: {new Date(due.dueDate as string).toLocaleDateString("tr-TR")}
                      </p>
                      {due.description && (
                        <p className="text-xs text-slate-400 mt-1 italic">{due.description}</p>
                      )}
                    </div>

                    {occupiedUnits > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 px-2.5 py-1 rounded-full font-medium">
                          <CheckCircle className="w-3 h-3" /> {stats.approved} Onaylı
                        </span>
                        {stats.pending > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2.5 py-1 rounded-full font-medium">
                            <Clock className="w-3 h-3" /> {stats.pending} Bekliyor
                          </span>
                        )}
                        {stats.rejected > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-red-700 bg-red-50 px-2.5 py-1 rounded-full font-medium">
                            <XCircle className="w-3 h-3" /> {stats.rejected} Reddedildi
                          </span>
                        )}
                        {stats.unpaid > 0 && (
                          <span className="inline-flex items-center gap-1 text-xs text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full font-medium">
                            {stats.unpaid} Yüklenmedi
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Add Due Dialog */}
      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aidat Tanımla</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Ay</Label>
                <Select value={form.month} onValueChange={(v) => setForm({ ...form, month: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS_TR.slice(1).map((name, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Yıl</Label>
                <Select value={form.year} onValueChange={(v) => setForm({ ...form, year: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((y) => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">Aidat Tutarı (₺)</Label>
              <Input
                id="amount"
                type="number"
                min="1"
                step="0.01"
                placeholder="Örn: 500"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Son Ödeme Tarihi</Label>
              <Input
                id="dueDate"
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Açıklama (opsiyonel)</Label>
              <Textarea
                id="description"
                placeholder="Örn: Asansör bakımı dahil"
                rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>İptal</Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Oluşturuluyor..." : "Aidatı Oluştur"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
