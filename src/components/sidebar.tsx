"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: Role;
  };
  onClose?: () => void;
}

const adminLinks = [
  { href: "/dashboard", label: "Genel Bakış", icon: LayoutDashboard },
  { href: "/apartments", label: "Apartmanlar", icon: Building2 },
];

const residentLinks = [
  { href: "/dashboard", label: "Ana Sayfa", icon: LayoutDashboard },
  { href: "/my-payments", label: "Ödemelerim", icon: CreditCard },
];

export function Sidebar({ user, onClose }: SidebarProps) {
  const pathname = usePathname();
  const links = user.role === "ADMIN" ? adminLinks : residentLinks;

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
          <p className="text-slate-400 text-xs mt-0.5">
            {user.role === "ADMIN" ? "Yönetici Paneli" : "Sakin Paneli"}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded"
            aria-label="Menüyü kapat"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
              pathname === href || pathname.startsWith(href + "/")
                ? "bg-slate-700 text-white"
                : "text-slate-400 hover:text-white hover:bg-slate-800"
            )}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}

        <Link
          href="/profile"
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
            pathname === "/profile"
              ? "bg-slate-700 text-white"
              : "text-slate-400 hover:text-white hover:bg-slate-800"
          )}
        >
          <User className="w-5 h-5" />
          Profil
        </Link>
      </nav>

      {/* User + Logout */}
      <div className="p-4 border-t border-slate-700">
        <div className="flex items-center gap-3 mb-3">
          <Avatar className="w-9 h-9">
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
          size="sm"
          className="w-full justify-start text-slate-400 hover:text-white hover:bg-slate-800"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Çıkış Yap
        </Button>
      </div>
    </aside>
  );
}
