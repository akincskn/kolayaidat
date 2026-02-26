"use client";

import { useState } from "react";
import { Menu } from "lucide-react";
import { Sidebar } from "./sidebar";
import { Role } from "@prisma/client";

interface DashboardShellProps {
  user: { name: string; email: string; role: Role };
  apartments: { id: string; name: string }[];
  children: React.ReactNode;
}

export function DashboardShell({ user, apartments, children }: DashboardShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar user={user} apartments={apartments} />
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative z-10 h-full w-64">
            <Sidebar user={user} apartments={apartments} onClose={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex flex-col flex-1 min-w-0">
        {/* Mobile header */}
        <header className="md:hidden flex items-center gap-3 px-4 h-14 border-b bg-white sticky top-0 z-40">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-md text-slate-600 hover:bg-slate-100"
            aria-label="Menüyü aç"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="font-semibold text-slate-800 text-lg">KolayAidat</span>
        </header>

        <main className="flex-1 bg-slate-50 overflow-auto">
          <div className="p-4 md:p-6 max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
