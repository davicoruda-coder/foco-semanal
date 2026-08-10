"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  StickyNote,
  Home,
  LogOut,
  Bell,
  Settings,
  Target,
  History,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { useEffect } from "react";

const NAV = [
  { href: "/hoje", label: "Hoje", icon: Home },
  { href: "/semana", label: "Semana", icon: CalendarDays },
  { href: "/materias", label: "Matérias", icon: BookOpen },
  { href: "/lembretes", label: "Lembretes", icon: Bell },
  { href: "/notas", label: "Notas", icon: StickyNote },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, ready, logout } = useApp();
  const onHome = pathname.startsWith("/hoje");
  const onConfig = pathname.startsWith("/configuracoes");

  useEffect(() => {
    if (ready && !user) router.replace("/login");
  }, [ready, user, router]);

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
        Carregando…
      </div>
    );
  }

  const initial = (user.name || user.email || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="relative z-0 min-h-screen">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 flex-col gap-6 border-r border-[var(--line)] bg-[var(--surface)]/75 p-5 backdrop-blur-xl md:flex">
        <div className="flex items-center gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--signal), var(--accent-2))",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <Target size={20} strokeWidth={2.25} />
          </div>
          <div className="min-w-0">
            <p className="font-display text-lg font-semibold leading-tight tracking-tight">
              Foco Semanal
            </p>
            <p className="truncate text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
              Uma semana, um ritmo.
            </p>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 rounded-[var(--radius-btn)] px-3 py-2.5 text-sm transition ${
                  active
                    ? "bg-[var(--signal-soft)] font-semibold text-[var(--signal)]"
                    : "text-[color-mix(in_srgb,var(--ink)_75%,transparent)] hover:bg-[var(--mist)]"
                }`}
              >
                <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 border-t border-[var(--line)] pt-4">
          <div
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-semibold"
            style={{ background: "var(--signal-soft)", color: "var(--signal)" }}
          >
            {initial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
              {user.email}
            </p>
          </div>
          <button
            type="button"
            title="Sair"
            aria-label="Sair"
            className="shrink-0 rounded-[var(--radius-btn)] p-2 text-[color-mix(in_srgb,var(--ink)_55%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--warn)]"
            onClick={() => {
              logout();
              router.push("/login");
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </aside>

      <main className="min-h-screen px-4 pb-8 pt-6 md:ml-64 md:px-8">
        {/* Mobile: voltar + config quando não está na home */}
        {!onHome && (
          <div className="mb-4 flex items-center justify-between md:hidden">
            <Link
              href="/hoje"
              className="text-sm font-medium text-[var(--signal)]"
            >
              ← Hoje
            </Link>
            {!onConfig && (
              <Link
                href="/configuracoes"
                title="Configurações"
                aria-label="Configurações"
                className="rounded-full p-2 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)]"
              >
                <Settings size={20} strokeWidth={1.75} />
              </Link>
            )}
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
