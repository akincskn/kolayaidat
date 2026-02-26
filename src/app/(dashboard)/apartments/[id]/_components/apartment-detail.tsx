"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, UserMinus, Mail, Copy,
  UserCheck, Clock, Building2, ChevronRight, Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

type Unit = {
  id: string;
  unitNumber: string;
  floor: number | null;
  resident: { id: string; name: string; email: string; phone: string | null } | null;
  invites: { token: string; email: string }[];
};

type Apartment = {
  id: string;
  name: string;
  address: string;
  units: Unit[];
};

export function ApartmentDetail({ apartment: initial }: { apartment: Apartment }) {
  const router = useRouter();
  const [apartment, setApartment] = useState(initial);

  // Add unit state
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState({ unitNumber: "", floor: "" });
  const [addingUnit, setAddingUnit] = useState(false);

  // Invite state
  const [inviteDialog, setInviteDialog] = useState<Unit | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  // Edit apartment state
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({ name: apartment.name, address: apartment.address });
  const [saving, setSaving] = useState(false);

  // Delete apartment
  const [deleting, setDeleting] = useState(false);

  async function addUnit() {
    if (!newUnit.unitNumber.trim()) {
      toast.error("Daire numarası zorunludur.");
      return;
    }
    setAddingUnit(true);
    try {
      const res = await fetch(`/api/apartments/${apartment.id}/units`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ unitNumber: newUnit.unitNumber, floor: newUnit.floor || null }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }

      setApartment((prev) => ({
        ...prev,
        units: [...prev.units, { ...data, resident: null, invites: [] }].sort((a, b) =>
          a.unitNumber.localeCompare(b.unitNumber, "tr", { numeric: true })
        ),
      }));
      setNewUnit({ unitNumber: "", floor: "" });
      setShowAddUnit(false);
      toast.success(`Daire ${data.unitNumber} eklendi.`);
    } finally {
      setAddingUnit(false);
    }
  }

  async function deleteUnit(unit: Unit) {
    if (unit.resident) { toast.error("Sakin atanmış daireyi silemezsiniz."); return; }
    if (!confirm(`Daire ${unit.unitNumber} silinsin mi?`)) return;

    try {
      const res = await fetch(`/api/apartments/${apartment.id}/units/${unit.id}`, { method: "DELETE" });
      if (res.ok) {
        setApartment((prev) => ({ ...prev, units: prev.units.filter((u) => u.id !== unit.id) }));
        toast.success("Daire silindi.");
      } else {
        const d = await res.json();
        toast.error(d.error);
      }
    } catch {
      toast.error("Bağlantı hatası oluştu.");
    }
  }

  async function removeResident(unit: Unit) {
    if (!confirm(`${unit.resident?.name} daireden çıkarılsın mı?`)) return;

    try {
      const res = await fetch(`/api/apartments/${apartment.id}/units/${unit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_resident" }),
      });
      if (res.ok) {
        setApartment((prev) => ({
          ...prev,
          units: prev.units.map((u) => u.id === unit.id ? { ...u, resident: null } : u),
        }));
        toast.success("Sakin daireden çıkarıldı.");
      } else {
        const d = await res.json();
        toast.error(d.error);
      }
    } catch {
      toast.error("Bağlantı hatası oluştu.");
    }
  }

  async function sendInvite() {
    if (!inviteDialog || !inviteEmail.trim()) { toast.error("Email zorunludur."); return; }
    setInviting(true);
    try {
      const res = await fetch(`/api/apartments/${apartment.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, unitId: inviteDialog.id }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error); return; }
      setInviteLink(data.inviteUrl);
      toast.success("Davet gönderildi!");
    } finally {
      setInviting(false);
    }
  }

  function closeInviteDialog() {
    setInviteDialog(null);
    setInviteEmail("");
    setInviteLink(null);
  }

  async function saveEdit() {
    if (!editData.name || !editData.address) { toast.error("Ad ve adres zorunludur."); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/apartments/${apartment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        setApartment((prev) => ({ ...prev, name: editData.name, address: editData.address }));
        setShowEdit(false);
        toast.success("Apartman güncellendi.");
      } else {
        const d = await res.json(); toast.error(d.error);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteApartment() {
    if (!confirm(`"${apartment.name}" silinsin mi? Bu işlem geri alınamaz.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/apartments/${apartment.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Apartman silindi.");
        router.push("/apartments");
      } else {
        const d = await res.json(); toast.error(d.error);
      }
    } finally {
      setDeleting(false);
    }
  }

  const occupiedCount = apartment.units.filter((u) => u.resident).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="sm" asChild className="mt-1">
          <Link href="/apartments"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-800 truncate">{apartment.name}</h1>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => setShowEdit(true)}>
              <Pencil className="w-3.5 h-3.5 text-slate-400" />
            </Button>
          </div>
          <p className="text-slate-400 text-sm">{apartment.address}</p>
        </div>
      </div>

      {/* Stats + Nav */}
      <div className="flex flex-wrap gap-3">
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <Building2 className="w-5 h-5 text-slate-400" />
            <div>
              <p className="text-xl font-bold leading-none">{apartment.units.length}</p>
              <p className="text-xs text-slate-500">Toplam Daire</p>
            </div>
          </CardContent>
        </Card>
        <Card className="flex-1 min-w-[140px]">
          <CardContent className="py-3 px-4 flex items-center gap-3">
            <UserCheck className="w-5 h-5 text-green-500" />
            <div>
              <p className="text-xl font-bold leading-none">{occupiedCount}</p>
              <p className="text-xs text-slate-500">Dolu Daire</p>
            </div>
          </CardContent>
        </Card>
        <Button variant="outline" asChild className="self-center">
          <Link href={`/apartments/${apartment.id}/dues`}>
            Aidat Yönetimi <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
        <Button variant="outline" asChild className="self-center">
          <Link href={`/apartments/${apartment.id}/payments`}>
            Dekontlar <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>

      {/* Units */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-700">Daireler</h2>
          <Button size="sm" onClick={() => setShowAddUnit(!showAddUnit)}>
            <Plus className="w-4 h-4 mr-1" /> Daire Ekle
          </Button>
        </div>

        {/* Add unit inline form */}
        {showAddUnit && (
          <Card className="mb-3 border-dashed border-2">
            <CardContent className="py-4">
              <div className="flex flex-wrap gap-3 items-end">
                <div className="space-y-1">
                  <Label className="text-xs">Daire No *</Label>
                  <Input
                    placeholder="Örn: 1, 2A, Zemin"
                    className="w-32"
                    value={newUnit.unitNumber}
                    onChange={(e) => setNewUnit({ ...newUnit, unitNumber: e.target.value })}
                    onKeyDown={(e) => e.key === "Enter" && addUnit()}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Kat (opsiyonel)</Label>
                  <Input
                    type="number"
                    placeholder="1"
                    className="w-24"
                    value={newUnit.floor}
                    onChange={(e) => setNewUnit({ ...newUnit, floor: e.target.value })}
                  />
                </div>
                <Button onClick={addUnit} disabled={addingUnit}>
                  {addingUnit ? "Ekleniyor..." : "Ekle"}
                </Button>
                <Button variant="ghost" onClick={() => setShowAddUnit(false)}>İptal</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {apartment.units.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-slate-400 text-sm">
              Henüz daire eklenmedi. Yukarıdan daire ekleyin.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {apartment.units.map((unit) => {
              const pendingInvite = unit.invites[0];
              return (
                <Card key={unit.id}>
                  <CardContent className="py-3 px-4">
                    <div className="flex items-center gap-3">
                      {/* Daire no */}
                      <div className="w-14 shrink-0">
                        <p className="font-semibold text-slate-800 text-sm">
                          Daire {unit.unitNumber}
                        </p>
                        {unit.floor !== null && (
                          <p className="text-xs text-slate-400">{unit.floor}. kat</p>
                        )}
                      </div>

                      <Separator orientation="vertical" className="h-8" />

                      {/* Resident info */}
                      <div className="flex-1 min-w-0">
                        {unit.resident ? (
                          <div>
                            <div className="flex items-center gap-1.5">
                              <UserCheck className="w-3.5 h-3.5 text-green-500 shrink-0" />
                              <span className="text-sm font-medium truncate">{unit.resident.name}</span>
                            </div>
                            <p className="text-xs text-slate-400 truncate">{unit.resident.email}</p>
                          </div>
                        ) : pendingInvite ? (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-xs text-amber-600 font-medium">Davet bekliyor</span>
                              <p className="text-xs text-slate-400 truncate">{pendingInvite.email}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400 italic">Boş daire</span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        {!unit.resident && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => {
                              setInviteDialog(unit);
                              setInviteEmail(pendingInvite?.email ?? "");
                            }}
                          >
                            <Mail className="w-3 h-3 mr-1" />
                            {pendingInvite ? "Tekrar Gönder" : "Davet Et"}
                          </Button>
                        )}
                        {unit.resident && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs text-red-500 hover:text-red-700"
                            onClick={() => removeResident(unit)}
                          >
                            <UserMinus className="w-3 h-3" />
                          </Button>
                        )}
                        {!unit.resident && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-red-500 hover:text-red-700"
                            onClick={() => deleteUnit(unit)}
                          >
                            <Trash2 className="w-3 h-3" />
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
      </div>

      {/* Danger zone */}
      <div className="border-t pt-4">
        <Button variant="destructive" size="sm" onClick={deleteApartment} disabled={deleting}>
          {deleting ? "Siliniyor..." : "Apartmanı Sil"}
        </Button>
        <p className="text-xs text-slate-400 mt-1">
          Bu işlem tüm daire ve aidat kayıtlarını siler.
        </p>
      </div>

      {/* Invite Dialog */}
      <Dialog open={!!inviteDialog} onOpenChange={(o) => !o && closeInviteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Daire {inviteDialog?.unitNumber} — Sakin Davet Et
            </DialogTitle>
          </DialogHeader>

          {!inviteLink ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="inviteEmail">Sakin E-posta Adresi</Label>
                <Input
                  id="inviteEmail"
                  type="email"
                  placeholder="sakin@email.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendInvite()}
                />
                <p className="text-xs text-slate-500">
                  Davet e-postası gönderilecek. 48 saat geçerlidir.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeInviteDialog}>İptal</Button>
                <Button onClick={sendInvite} disabled={inviting}>
                  {inviting ? "Gönderiliyor..." : "Davet Gönder"}
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700">
                  Davet e-postası gönderildi!
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Davet Bağlantısı (yedek)</Label>
                  <div className="flex gap-2">
                    <Input readOnly value={inviteLink} className="text-xs" />
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(inviteLink);
                        toast.success("Kopyalandı!");
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={closeInviteDialog}>Kapat</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apartmanı Düzenle</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Apartman Adı</Label>
              <Input
                value={editData.name}
                onChange={(e) => setEditData({ ...editData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Adres</Label>
              <Input
                value={editData.address}
                onChange={(e) => setEditData({ ...editData, address: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>İptal</Button>
            <Button onClick={saveEdit} disabled={saving}>{saving ? "Kaydediliyor..." : "Kaydet"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
