"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { SettingsProvider, useSettings } from "@/lib/settings-context";
import { initials } from "@/lib/format";
import { Icon, type IconName } from "./icons";
import { Spinner } from "./ui";

const NAV: { href: string; label: string; icon: IconName; hint: string }[] = [
  { href: "/pos", label: "Kasir", icon: "pos", hint: "Transaksi baru" },
  { href: "/orders", label: "Pesanan", icon: "orders", hint: "Status & pelunasan" },
  { href: "/customers", label: "Pelanggan", icon: "customers", hint: "Data pelanggan" },
  { href: "/services", label: "Layanan", icon: "services", hint: "Jenis & harga" },
  { href: "/reports", label: "Laporan", icon: "reports", hint: "Pendapatan" },
  { href: "/settings", label: "Pengaturan", icon: "settings", hint: "Toko & akun" },
];

export default function AppShell({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-blue-600">
        <Spinner className="h-7 w-7" />
      </div>
    );
  }

  return (
    <SettingsProvider>
      <Frame>{children}</Frame>
    </SettingsProvider>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // tutup menu mobile setiap pindah halaman
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="min-h-screen lg:pl-64">
      {/* Sidebar desktop */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        <Sidebar />
      </aside>

      {/* Sidebar mobile */}
      {open && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="animate-fade-in absolute inset-0 bg-slate-900/40" onClick={() => setOpen(false)} />
          <aside className="animate-slide-in-left absolute inset-y-0 left-0 w-72 bg-white shadow-xl">
            <Sidebar onClose={() => setOpen(false)} />
          </aside>
        </div>
      )}

      {/* Topbar mobile */}
      <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Buka menu"
          className="-ml-1 rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        >
          <Icon name="menu" />
        </button>
        <StoreName compact />
      </header>

      <main className="mx-auto w-full max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
    </div>
  );
}

function StoreName({ compact = false }: { compact?: boolean }) {
  const { settings } = useSettings();
  const name = settings?.store_name ?? "Kasir Laundry";
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span
        className={`flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-sm shadow-blue-600/30 ${compact ? "h-8 w-8" : "h-10 w-10"}`}
      >
        <Icon name="washer" className={compact ? "h-[18px] w-[18px]" : "h-5 w-5"} />
      </span>
      <div className="min-w-0">
        <p className={`truncate font-bold text-slate-900 ${compact ? "text-sm" : "text-[15px]"}`}>{name}</p>
        {!compact && <p className="text-xs text-slate-500">Kasir Laundry</p>}
      </div>
    </div>
  );
}

function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] items-center justify-between px-5">
        <StoreName />
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup menu"
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <Icon name="close" />
          </button>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-3">
        {NAV.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? "bg-blue-50 text-blue-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition ${
                  active ? "bg-blue-600 text-white shadow-sm shadow-blue-600/30" : "bg-slate-100 text-slate-500 group-hover:text-slate-700"
                }`}
              >
                <Icon name={item.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="flex-1">
                {item.label}
                <span className={`block text-[11px] font-normal ${active ? "text-blue-600/80" : "text-slate-400"}`}>
                  {item.hint}
                </span>
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-semibold text-white">
            {initials(user?.name ?? "O")}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-800">{user?.name}</p>
            <p className="text-xs text-slate-500">Owner</p>
          </div>
          <button
            type="button"
            onClick={logout}
            aria-label="Keluar"
            title="Keluar"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
          >
            <Icon name="logout" className="h-[18px] w-[18px]" />
          </button>
        </div>
      </div>
    </div>
  );
}
