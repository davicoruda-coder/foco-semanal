"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  CalendarDays,
  Home,
  Settings,
  Target,
  ChartColumn,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";

const NAV = [
  { href: "/hoje", label: "Hoje", icon: Home },
  { href: "/semana", label: "Semana", icon: CalendarDays },
  { href: "/materias", label: "Matérias", icon: BookOpen },
  { href: "/estatisticas", label: "Estatísticas", icon: ChartColumn },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useApp();
  const onConfig = pathname.startsWith("/configuracoes");

  if (!ready || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
        Carregando…
      </div>
    );
  }

  return (
    <div className="relative z-0 min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-5 md:px-8">
          <Link
            href="/hoje"
            className="flex min-w-0 shrink-0 items-center gap-2.5"
            title="Foco Semanal"
          >
            <div
              className="grid h-8 w-8 shrink-0 place-items-center rounded-xl text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--signal), var(--accent-2))",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <Target size={16} strokeWidth={2.25} />
            </div>
            <span className="font-display hidden truncate text-base font-semibold tracking-tight sm:inline">
              Foco
            </span>
          </Link>

          <nav className="ml-auto flex max-w-[calc(100%-2.5rem)] items-center gap-0.5 overflow-x-auto sm:max-w-none sm:gap-1">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = pathname.startsWith(href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`grid h-9 w-9 place-items-center rounded-[var(--radius-btn)] transition sm:h-10 sm:w-10 ${
                    active
                      ? "bg-[var(--signal-soft)] text-[var(--signal)]"
                      : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)]"
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                </Link>
              );
            })}
            <Link
              href="/configuracoes"
              title="Configurações"
              aria-label="Configurações"
              aria-current={onConfig ? "page" : undefined}
              className={`grid h-9 w-9 place-items-center rounded-[var(--radius-btn)] transition sm:h-10 sm:w-10 ${
                onConfig
                  ? "bg-[var(--signal-soft)] text-[var(--signal)]"
                  : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)]"
              }`}
            >
              <Settings size={18} strokeWidth={onConfig ? 2.25 : 1.75} />
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 pb-10 pt-5 sm:px-5 md:px-8 md:pt-6">
        {children}
      </main>
    </div>
  );
}
