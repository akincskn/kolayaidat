"use client";

import { useState } from "react";
import Link from "next/link";
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

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [email, setEmail] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        const data = await res.json();
        toast.error(data.error);
        return;
      }

      // Her durumda başarı göster (email enumeration önleme)
      setSent(true);
    } catch {
      toast.error("Bir hata oluştu. Lütfen tekrar deneyin.");
    } finally {
      setIsLoading(false);
    }
  }

  if (sent) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>E-posta Gönderildi</CardTitle>
          <CardDescription>
            Şifre sıfırlama talimatları e-posta adresinize gönderildi.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-500">
            <strong>{email}</strong> adresine bir e-posta gönderdik. Gelen
            kutunuzu (ve spam klasörünü) kontrol edin. Bağlantı{" "}
            <strong>1 saat</strong> geçerlidir.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              Giriş sayfasına dön
            </Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Şifremi Unuttum</CardTitle>
        <CardDescription>
          E-posta adresinizi girin, şifre sıfırlama bağlantısı gönderelim.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-posta</Label>
            <Input
              id="email"
              type="email"
              placeholder="ornek@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? "Gönderiliyor..." : "Sıfırlama Bağlantısı Gönder"}
          </Button>
          <Link href="/login" className="text-sm text-slate-500 hover:underline">
            Giriş sayfasına dön
          </Link>
        </CardFooter>
      </form>
    </Card>
  );
}
