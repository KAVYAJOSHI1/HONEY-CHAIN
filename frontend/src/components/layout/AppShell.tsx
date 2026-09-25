"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ExternalLink, Menu, QrCode, X } from "lucide-react";
import { Logo } from "@/components/Logo";
import { NAV } from "./nav";
import { Topbar } from "./Topbar";

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));

  return (
    <nav className="flex h-full flex-col" aria-label="Main">
      <div className="flex h-14 items-center border-b border-line px-4">
        <Link href="/" onClick={onNavigate}><Logo /></Link>
      </div>
      <div className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV.map((group) => (
          <div key={group.label}>
            <p className="label mb-2 px-2">{group.label}</p>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const active = isActive(item.href, item.exact) || (item.href === "/beekeeper" && pathname.startsWith("/beekeeper/hives"));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      aria-current={active ? "page" : undefined}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors ${
                        active ? "bg-surface-2 font-medium text-ink" : "text-ink-2 hover:bg-surface-2/60 hover:text-ink"
                      }`}
                    >
                      <item.icon className={`h-4 w-4 ${active ? "text-brand" : "text-ink-3"}`} aria-hidden />
                      {item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-line p-3">
        <Link
          href="/verify"
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-lg border border-line bg-surface-2/50 px-3 py-2 text-sm text-ink-2 hover:text-ink"
        >
          <QrCode className="h-4 w-4 text-brand" aria-hidden />
          Consumer verification
          <ExternalLink className="ml-auto h-3.5 w-3.5 text-ink-3" aria-hidden />
        </Link>
      </div>
    </nav>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="min-h-screen lg:pl-60">
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 border-r border-line bg-surface lg:block">
        <Sidebar />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/30" onClick={() => setMobileOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 animate-fade-in border-r border-line bg-surface">
            <button className="absolute right-3 top-4 rounded p-1 text-ink-3 hover:text-ink" onClick={() => setMobileOpen(false)} aria-label="Close menu">
              <X className="h-4 w-4" />
            </button>
            <Sidebar onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      <Topbar
        menuButton={
          <button className="rounded-md p-1.5 text-ink-2 hover:bg-surface-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open menu">
            <Menu className="h-5 w-5" />
          </button>
        }
      />
      <main className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
