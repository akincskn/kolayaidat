"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface InviteInfo {
  email: string;
  unitNumber: string;
  apartmentName: string;
}

function InviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [inviteInfo, setInviteInfo] = useState<InviteInfo | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (!token) {
      toast.error("Geçersiz davet bağlantısı.");
      router.push("/login");
      return;
    }

    fetch(`/api/invite/validate?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          toast.error(data.error);
          router.push("/login");
        } else {
          setInviteInfo(data);
        }
      })
      .catch(() => {
        toast.error("Davet doğrulanamadı.");
        router.push("/login");
      })
      .finally(() => setIsValidating(false));
  }, [token, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error("Şifreler eşleşmiyor.");
      return;
    }

    if (formData.password.length < 6) {
      toast.error("Şifre en az 6 karakter olmalıdır.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/invite/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          name: formData.name,
          password: formData.password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Davet kabul edilirken hata oluştu.");
      } else {
        toast.success("Hesabınız oluşturuldu! Giriş yapabilirsiniz.");
        router.push("/login");
      }
    } catch {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isValidating) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-slate-500">
          Davet doğrulanıyor...
        </CardContent>
      </Card>
    );
  }

  if (!inviteInfo) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daveti Kabul Et</CardTitle>
        <CardDescription>
          <strong>{inviteInfo.apartmentName}</strong> apartmanı,{" "}
          <strong>Daire {inviteInfo.unitNumber}</strong> için davet aldınız.
          <br />
          <span className="text-slate-400 text-xs">{inviteInfo.email}</span>
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Ad Soyad</Label>
            <Input
              id="name"
              placeholder="Ahmet Yılmaz"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Şifre Belirle</Label>
            <Input
              id="password"
              type="password"
              placeholder="En az 6 karakter"
              required
              value={formData.password}
              onChange={(e) =>
                setFormData({ ...formData, password: e.target.value })
              }
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Şifre Tekrar</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              required
              value={formData.confirmPassword}
              onChange={(e) =>
                setFormData({ ...formData, confirmPassword: e.target.value })
              }
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Hesap oluşturuluyor..." : "Hesabımı Oluştur"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
}

export default function InvitePage() {
  return (
    <Suspense
      fallback={
        <Card>
          <CardContent className="py-8 text-center text-slate-500">
            Yükleniyor...
          </CardContent>
        </Card>
      }
    >
      <InviteForm />
    </Suspense>
  );
}
