"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { signOut } from "next-auth/react";
import { Role } from "@prisma/client";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  User,
  LogOut,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: Role;
  };
  apartments: { id: string; name: string }[];
  onClose?: () => void;
}

const adminLinks = [
  { href: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard, keepApt: true },
  { href: "/odemeler", label: "Ödemeler", icon: CreditCard, keepApt: true },
  { href: "/apartments", label: "Apartmanlarım", icon: Building2, keepApt: true },
  { href: "/profile", label: "Profil", icon: User, keepApt: true },
];

const residentLinks = [
  { href: "/my-payments", label: "Ödemelerim", icon: CreditCard, keepApt: false },
  { href: "/profile", label: "Profil", icon: User, keepApt: false },
];

export function Sidebar({ user, apartments, onClose }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const links = user.role === "ADMIN" ? adminLinks : residentLinks;

  const currentApt = searchParams.get("apt") ?? (apartments[0]?.id ?? "");

  function handleAptChange(aptId: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("apt", aptId);
    params.delete("month");
    params.delete("year");
    router.replace(`${pathname}?${params.toString()}`);
  }

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="w-64 min-h-screen bg-slate-900 text-white flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-slate-700 flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold">KolayAidat</h1>
          <p className="text-slate-400 text-sm mt-0.5">
            {user.role === "ADMIN" ? "Yönetici Paneli" : "Sakin Paneli"}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded"
            aria-label="Menüyü kapat"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Apartment selector (ADMIN only) */}
      {user.role === "ADMIN" && (
        <div className="px-4 py-3 border-b border-slate-700">
          {apartments.length === 0 ? (
            <p className="text-slate-400 text-sm">Henüz apartman yok</p>
          ) : apartments.length === 1 ? (
            <div>
              <p className="text-slate-400 text-xs mb-1">Apartman</p>
              <p className="text-white font-medium text-sm truncate">{apartments[0].name}</p>
            </div>
          ) : (
            <div>
              <p className="text-slate-400 text-xs mb-1.5">Apartman Seçin</p>
              <Select value={currentApt || undefined} onValueChange={handleAptChange}>
                <SelectTrigger className="bg-slate-800 border-slate-600 text-white text-sm h-10 focus:ring-0 focus:ring-offset-0">
                  <SelectValue placeholder="Apartman seçin" />
                </SelectTrigger>
                <SelectContent>
                  {apartments.map((apt) => (
                    <SelectItem key={apt.id} value={apt.id}>
                      {apt.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ href, label, icon: Icon, keepApt }) => {
          // Apt parametresini taşıması gereken linklere ekle
          const linkHref =
            keepApt && currentApt ? `${href}?apt=${currentApt}` : href;

          return (
            <Link
              key={href}
              href={linkHref}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 rounded-lg text-base font-medium transition-colors min-h-[44px]",
                pathname === href || pathname.startsWith(href + "/")
                  ? "bg-slate-700 text-white"
                  : "text-slate-400 hover:text-white hover:bg-slate-800"
              )}
            >
              <Icon className="w-5 h-5 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-10 h-10">
            <AvatarFallback className="bg-slate-600 text-white text-sm">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user.name}</p>
            <p className="text-xs text-slate-400 truncate">{user.email}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800 min-h-[44px] text-base"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Çıkış Yap
        </Button>
      </div>
    </aside>
  );
}
