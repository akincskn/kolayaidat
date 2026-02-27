"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft, Plus, Trash2, UserMinus, Mail, Copy,
  UserCheck, Clock, Building2, ChevronRight, Pencil, User, X,
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

type InviteResult = { email: string; success: boolean; error?: string; inviteUrl?: string };

// -----------------------------------------------------------
// Tag input: Enter ile email ekle, max 4, × ile kaldır
// -----------------------------------------------------------
function EmailTagInput({
  tags,
  input,
  onInputChange,
  onAdd,
  onRemove,
  disabled,
}: {
  tags: string[];
  input: string;
  onInputChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (email: string) => void;
  disabled?: boolean;
}) {
  const maxReached = tags.length >= 4;

  return (
    <div className="space-y-2">
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((email) => (
            <span
              key={email}
              className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-full pl-3 pr-1.5 py-1 text-xs"
            >
              {email}
              <button
                type="button"
                onClick={() => onRemove(email)}
                className="text-slate-400 hover:text-slate-700 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        type="email"
        placeholder={maxReached ? "Maksimum 4 email eklendi" : "Email girin, Enter'a basın"}
        value={input}
        disabled={disabled || maxReached}
        onChange={(e) => onInputChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd();
          }
        }}
      />
      <p className="text-xs text-slate-400">{tags.length}/4 email</p>
    </div>
  );
}

function addEmailTag(
  input: string,
  tags: string[],
  setTags: (t: string[]) => void,
  setInput: (s: string) => void
) {
  const email = input.trim().toLowerCase();
  if (!email) return;
  if (!email.includes("@")) { toast.error("Geçerli bir email adresi girin."); return; }
  if (tags.length >= 4) { toast.error("En fazla 4 email ekleyebilirsiniz."); return; }
  if (tags.includes(email)) { toast.error("Bu email zaten eklendi."); return; }
  setTags([...tags, email]);
  setInput("");
}

// -----------------------------------------------------------
// Ana bileşen
// -----------------------------------------------------------
export function ApartmentDetail({ apartment: initial }: { apartment: Apartment }) {
  const router = useRouter();
  const [apartment, setApartment] = useState(initial);

  // Add unit
  const [showAddUnit, setShowAddUnit] = useState(false);
  const [newUnit, setNewUnit] = useState({ unitNumber: "", floor: "" });
  const [addingUnit, setAddingUnit] = useState(false);

  // Davet Et dialog (boş daireler)
  const [inviteDialog, setInviteDialog] = useState<Unit | null>(null);
  const [inviteTags, setInviteTags] = useState<string[]>([]);
  const [inviteTagInput, setInviteTagInput] = useState("");
  const [inviting, setInviting] = useState(false);
  const [inviteResults, setInviteResults] = useState<InviteResult[] | null>(null);

  // Düzenle dialog (sakinli daireler)
  const [residentDialog, setResidentDialog] = useState<Unit | null>(null);
  const [removingResident, setRemovingResident] = useState(false);
  const [residentInviteTags, setResidentInviteTags] = useState<string[]>([]);
  const [residentInviteTagInput, setResidentInviteTagInput] = useState("");
  const [residentInviting, setResidentInviting] = useState(false);
  const [residentInviteResults, setResidentInviteResults] = useState<InviteResult[] | null>(null);

  // Edit apartment
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({ name: apartment.name, address: apartment.address });
  const [saving, setSaving] = useState(false);

  // Delete apartment
  const [deleting, setDeleting] = useState(false);

  // ----------------------------------------------------------
  // Daire işlemleri
  // ----------------------------------------------------------
  async function addUnit() {
    if (!newUnit.unitNumber.trim()) { toast.error("Daire numarası zorunludur."); return; }
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
        const d = await res.json(); toast.error(d.error);
      }
    } catch { toast.error("Bağlantı hatası oluştu."); }
  }

  // ----------------------------------------------------------
  // Davet Et (boş daire dialog)
  // ----------------------------------------------------------
  async function sendInvite() {
    if (!inviteDialog) return;

    // Inputta yazılı ama eklenmemiş email varsa önce ekle
    let tags = inviteTags;
    if (inviteTagInput.trim()) {
      const email = inviteTagInput.trim().toLowerCase();
      if (email.includes("@") && !tags.includes(email) && tags.length < 4) {
        tags = [...tags, email];
        setInviteTags(tags);
        setInviteTagInput("");
      }
    }

    if (tags.length === 0) { toast.error("En az bir email adresi ekleyin."); return; }

    setInviting(true);
    try {
      const res = await fetch(`/api/apartments/${apartment.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: tags, unitId: inviteDialog.id }),
      });
      const data = await res.json();

      if (!res.ok && !data.results) { toast.error(data.error); return; }

      const results: InviteResult[] = data.results ?? [];
      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      if (errorCount === 0) {
        toast.success(successCount === 1 ? "Davet gönderildi!" : `${successCount} davet gönderildi!`);
        closeInviteDialog();
      } else {
        setInviteResults(results);
        if (successCount > 0) toast.warning(`${successCount} davet gönderildi, ${errorCount} hata.`);
        else toast.error("Hiçbir davet gönderilemedi.");
      }
    } catch { toast.error("Bağlantı hatası oluştu."); }
    finally { setInviting(false); }
  }

  function closeInviteDialog() {
    setInviteDialog(null);
    setInviteTags([]);
    setInviteTagInput("");
    setInviteResults(null);
  }

  // ----------------------------------------------------------
  // Düzenle dialog — sakin kaldır + davet gönder
  // ----------------------------------------------------------
  async function removeResidentInDialog() {
    if (!residentDialog?.resident) return;
    if (!confirm(`${residentDialog.resident.name} daireden çıkarılsın mı?`)) return;
    setRemovingResident(true);
    try {
      const res = await fetch(`/api/apartments/${apartment.id}/units/${residentDialog.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "remove_resident" }),
      });
      if (res.ok) {
        setApartment((prev) => ({
          ...prev,
          units: prev.units.map((u) => u.id === residentDialog.id ? { ...u, resident: null } : u),
        }));
        // Dialog açık kalsın, resident: null yap → davet bölümü açılır
        setResidentDialog((prev) => prev ? { ...prev, resident: null } : null);
        toast.success("Sakin kaldırıldı. Yeni davet gönderebilirsiniz.");
      } else {
        const d = await res.json(); toast.error(d.error);
      }
    } catch { toast.error("Bağlantı hatası oluştu."); }
    finally { setRemovingResident(false); }
  }

  async function sendResidentInvite() {
    if (!residentDialog) return;

    let tags = residentInviteTags;
    if (residentInviteTagInput.trim()) {
      const email = residentInviteTagInput.trim().toLowerCase();
      if (email.includes("@") && !tags.includes(email) && tags.length < 4) {
        tags = [...tags, email];
        setResidentInviteTags(tags);
        setResidentInviteTagInput("");
      }
    }

    if (tags.length === 0) { toast.error("En az bir email adresi ekleyin."); return; }

    setResidentInviting(true);
    try {
      const res = await fetch(`/api/apartments/${apartment.id}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emails: tags, unitId: residentDialog.id }),
      });
      const data = await res.json();

      if (!res.ok && !data.results) { toast.error(data.error); return; }

      const results: InviteResult[] = data.results ?? [];
      const successCount = results.filter((r) => r.success).length;
      const errorCount = results.filter((r) => !r.success).length;

      if (errorCount === 0) {
        toast.success(successCount === 1 ? "Davet gönderildi!" : `${successCount} davet gönderildi!`);
        closeResidentDialog();
      } else {
        setResidentInviteResults(results);
        if (successCount > 0) toast.warning(`${successCount} davet gönderildi, ${errorCount} hata.`);
        else toast.error("Hiçbir davet gönderilemedi.");
      }
    } catch { toast.error("Bağlantı hatası oluştu."); }
    finally { setResidentInviting(false); }
  }

  function closeResidentDialog() {
    setResidentDialog(null);
    setResidentInviteTags([]);
    setResidentInviteTagInput("");
    setResidentInviteResults(null);
  }

  // ----------------------------------------------------------
  // Apartman düzenle / sil
  // ----------------------------------------------------------
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
      } else { const d = await res.json(); toast.error(d.error); }
    } finally { setSaving(false); }
  }

  async function deleteApartment() {
    if (!confirm(`"${apartment.name}" silinsin mi? Bu işlem geri alınamaz.`)) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/apartments/${apartment.id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Apartman silindi."); router.push("/apartments"); }
      else { const d = await res.json(); toast.error(d.error); }
    } finally { setDeleting(false); }
  }

  const occupiedCount = apartment.units.filter((u) => u.resident).length;

  // ----------------------------------------------------------
  // Render
  // ----------------------------------------------------------
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
                      <div className="w-14 shrink-0">
                        <p className="font-semibold text-slate-800 text-sm">Daire {unit.unitNumber}</p>
                        {unit.floor !== null && (
                          <p className="text-xs text-slate-400">{unit.floor}. kat</p>
                        )}
                      </div>

                      <Separator orientation="vertical" className="h-8" />

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

                      <div className="flex items-center gap-1 shrink-0">
                        {unit.resident ? (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => setResidentDialog(unit)}
                            >
                              <User className="w-3 h-3 mr-1" />
                              Düzenle
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setResidentDialog(unit);
                                // Confirm kısmı dialog içinde
                              }}
                            >
                              <UserMinus className="w-3 h-3 mr-1" />
                              Kaldır
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => {
                                setInviteDialog(unit);
                                if (pendingInvite?.email) {
                                  setInviteTags([pendingInvite.email]);
                                }
                              }}
                            >
                              <Mail className="w-3 h-3 mr-1" />
                              {pendingInvite ? "Tekrar Gönder" : "Davet Et"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-red-500 hover:text-red-700"
                              onClick={() => deleteUnit(unit)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          </>
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
        <p className="text-xs text-slate-400 mt-1">Bu işlem tüm daire ve aidat kayıtlarını siler.</p>
      </div>

      {/* ---- Davet Et Dialog (boş daireler) ---- */}
      <Dialog open={!!inviteDialog} onOpenChange={(o) => !o && closeInviteDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daire {inviteDialog?.unitNumber} — Sakin Davet Et</DialogTitle>
          </DialogHeader>

          {inviteResults ? (
            <>
              <div className="space-y-2">
                {inviteResults.map((r) => (
                  <div
                    key={r.email}
                    className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                      r.success
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    <span className="font-medium shrink-0">{r.success ? "✓" : "✗"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{r.email}</p>
                      {r.error && <p className="text-xs opacity-80">{r.error}</p>}
                    </div>
                    {r.success && r.inviteUrl && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(r.inviteUrl!);
                          toast.success("Bağlantı kopyalandı!");
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={closeInviteDialog}>Kapat</Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Sakin E-posta Adresleri</Label>
                <EmailTagInput
                  tags={inviteTags}
                  input={inviteTagInput}
                  onInputChange={setInviteTagInput}
                  onAdd={() => addEmailTag(inviteTagInput, inviteTags, setInviteTags, setInviteTagInput)}
                  onRemove={(email) => setInviteTags(inviteTags.filter((t) => t !== email))}
                  disabled={inviting}
                />
                <p className="text-xs text-slate-500">48 saat geçerlidir.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeInviteDialog}>İptal</Button>
                <Button
                  onClick={sendInvite}
                  disabled={inviting || (inviteTags.length === 0 && !inviteTagInput.trim())}
                >
                  {inviting ? "Gönderiliyor..." : inviteTags.length > 1 ? `${inviteTags.length} Davet Gönder` : "Davet Gönder"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---- Düzenle Dialog (sakinli daireler) ---- */}
      <Dialog open={!!residentDialog} onOpenChange={(o) => !o && closeResidentDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Daire {residentDialog?.unitNumber} — Düzenle</DialogTitle>
          </DialogHeader>

          {residentDialog?.resident ? (
            /* Sakin mevcut: bilgi + kaldır */
            <div className="space-y-4">
              <div className="bg-slate-50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex gap-2">
                  <span className="text-slate-500 w-16 shrink-0">Ad:</span>
                  <span className="font-medium">{residentDialog.resident.name}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-slate-500 w-16 shrink-0">E-posta:</span>
                  <span className="font-medium truncate">{residentDialog.resident.email}</span>
                </div>
                {residentDialog.resident.phone && (
                  <div className="flex gap-2">
                    <span className="text-slate-500 w-16 shrink-0">Telefon:</span>
                    <span className="font-medium">{residentDialog.resident.phone}</span>
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Yeni bir sakin davet etmek için önce mevcut sakini kaldırın.
              </p>
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={closeResidentDialog}>Kapat</Button>
                <Button
                  variant="destructive"
                  onClick={removeResidentInDialog}
                  disabled={removingResident}
                >
                  <UserMinus className="w-4 h-4 mr-1" />
                  {removingResident ? "Kaldırılıyor..." : "Sakini Kaldır"}
                </Button>
              </DialogFooter>
            </div>
          ) : residentInviteResults ? (
            /* Davet sonuçları */
            <>
              <div className="space-y-2">
                {residentInviteResults.map((r) => (
                  <div
                    key={r.email}
                    className={`flex items-start gap-2 rounded-lg px-3 py-2 text-sm ${
                      r.success
                        ? "bg-green-50 border border-green-200 text-green-700"
                        : "bg-red-50 border border-red-200 text-red-700"
                    }`}
                  >
                    <span className="font-medium shrink-0">{r.success ? "✓" : "✗"}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate">{r.email}</p>
                      {r.error && <p className="text-xs opacity-80">{r.error}</p>}
                    </div>
                    {r.success && r.inviteUrl && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-6 w-6 shrink-0"
                        onClick={() => {
                          navigator.clipboard.writeText(r.inviteUrl!);
                          toast.success("Bağlantı kopyalandı!");
                        }}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <DialogFooter>
                <Button onClick={closeResidentDialog}>Kapat</Button>
              </DialogFooter>
            </>
          ) : (
            /* Sakin kaldırıldı: davet gönder */
            <>
              <div className="space-y-2">
                <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                  Daire boş. Yeni sakin davet edebilirsiniz.
                </div>
                <Label>Davet Gönderilecek E-postalar</Label>
                <EmailTagInput
                  tags={residentInviteTags}
                  input={residentInviteTagInput}
                  onInputChange={setResidentInviteTagInput}
                  onAdd={() => addEmailTag(residentInviteTagInput, residentInviteTags, setResidentInviteTags, setResidentInviteTagInput)}
                  onRemove={(email) => setResidentInviteTags(residentInviteTags.filter((t) => t !== email))}
                  disabled={residentInviting}
                />
                <p className="text-xs text-slate-500">48 saat geçerlidir.</p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={closeResidentDialog}>İptal</Button>
                <Button
                  onClick={sendResidentInvite}
                  disabled={residentInviting || (residentInviteTags.length === 0 && !residentInviteTagInput.trim())}
                >
                  {residentInviting ? "Gönderiliyor..." : residentInviteTags.length > 1 ? `${residentInviteTags.length} Davet Gönder` : "Davet Gönder"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ---- Apartman Düzenle Dialog ---- */}
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
