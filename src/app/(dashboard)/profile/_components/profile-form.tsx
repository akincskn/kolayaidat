"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface ProfileFormProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
  };
}

export function ProfileForm({ user }: ProfileFormProps) {
  const [isSaving, setIsSaving] = useState(false);
  const [isChangingPw, setIsChangingPw] = useState(false);
  const [profile, setProfile] = useState({ name: user.name, phone: user.phone ?? "" });
  const [passwords, setPasswords] = useState({ current: "", next: "", confirm: "" });

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profile),
      });
      if (res.ok) toast.success("Profil güncellendi.");
      else toast.error("Güncelleme başarısız.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (passwords.next !== passwords.confirm) {
      toast.error("Yeni şifreler eşleşmiyor.");
      return;
    }
    if (passwords.next.length < 6) {
      toast.error("Şifre en az 6 karakter olmalı.");
      return;
    }
    setIsChangingPw(true);
    try {
      const res = await fetch("/api/profile/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.next }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Şifre değiştirildi.");
        setPasswords({ current: "", next: "", confirm: "" });
      } else {
        toast.error(data.error || "Şifre değiştirilemedi.");
      }
    } finally {
      setIsChangingPw(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Kişisel Bilgiler</CardTitle>
            <Badge variant="outline">
              {user.role === "ADMIN" ? "Yönetici" : "Ev Sakini"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleProfileSave} className="space-y-4">
            <div className="space-y-2">
              <Label>E-posta</Label>
              <Input value={user.email} disabled className="bg-slate-50" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Ad Soyad</Label>
              <Input
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                placeholder="0555 123 45 67"
              />
            </div>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : "Kaydet"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Şifre Değiştir</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="current">Mevcut Şifre</Label>
              <Input
                id="current"
                type="password"
                value={passwords.current}
                onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
                required
              />
            </div>
            <Separator />
            <div className="space-y-2">
              <Label htmlFor="next">Yeni Şifre</Label>
              <Input
                id="next"
                type="password"
                value={passwords.next}
                onChange={(e) => setPasswords({ ...passwords, next: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Yeni Şifre (Tekrar)</Label>
              <Input
                id="confirm"
                type="password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                required
              />
            </div>
            <Button type="submit" variant="outline" disabled={isChangingPw}>
              {isChangingPw ? "Değiştiriliyor..." : "Şifreyi Değiştir"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
