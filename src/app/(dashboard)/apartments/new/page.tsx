"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

export default function NewApartmentPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({ name: "", address: "" });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsLoading(true);

    try {
      const res = await fetch("/api/apartments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Apartman eklenemedi.");
      } else {
        toast.success("Apartman oluşturuldu!");
        router.push(`/apartments/${data.id}`);
      }
    } catch {
      toast.error("Bir hata oluştu.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-lg">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/apartments">
            <ArrowLeft className="w-4 h-4 mr-1" /> Geri
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Apartman Ekle</h1>
          <p className="text-slate-500 text-sm">Yeni bir apartman oluşturun</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apartman Bilgileri</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Apartman Adı</Label>
              <Input
                id="name"
                placeholder="Örn: Gül Apartmanı"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="address">Adres</Label>
              <Textarea
                id="address"
                placeholder="Örn: Atatürk Mah. Cumhuriyet Cad. No:5, Kadıköy / İstanbul"
                required
                rows={3}
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>
          </CardContent>
          <CardFooter className="flex gap-3">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Oluşturuluyor..." : "Apartmanı Oluştur"}
            </Button>
            <Button type="button" variant="outline" asChild>
              <Link href="/apartments">İptal</Link>
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
