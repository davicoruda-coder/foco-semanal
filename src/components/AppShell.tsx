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
import { LoginScreen } from "@/components/LoginScreen";

const NAV = [
  { href: "/hoje", label: "Hoje", icon: Home },
  { href: "/semana", label: "Semana", icon: CalendarDays },
  { href: "/materias", label: "Matérias", icon: BookOpen },
  { href: "/estatisticas", label: "Estatísticas", icon: ChartColumn },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

function navActive(pathname: string, href: string) {
  if (href === "/ajustes") {
    return pathname.startsWith("/ajustes") || pathname.startsWith("/configuracoes");
  }
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready } = useApp();

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
        Carregando…
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return (
    <div className="relative z-0 min-h-screen pb-[calc(4.25rem+env(safe-area-inset-bottom))] lg:pb-0">
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]/80 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
        <div className="mx-auto flex h-12 max-w-7xl items-center gap-2 px-3 sm:gap-3 sm:px-5 md:px-8 lg:h-14">
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
            <span className="font-display hidden truncate text-base font-semibold tracking-tight lg:inline">
              Foco
            </span>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 lg:flex">
            {NAV.map(({ href, label, icon: Icon }) => {
              const active = navActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`grid h-10 w-10 place-items-center rounded-[var(--radius-btn)] transition ${
                    active
                      ? "bg-[var(--signal-soft)] text-[var(--signal)]"
                      : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)]"
                  }`}
                >
                  <Icon size={18} strokeWidth={active ? 2.25 : 1.75} />
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-3 pb-6 pt-4 sm:px-5 sm:pt-5 md:px-8 md:pt-6 lg:pb-10">
        {children}
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Navegação principal"
      >
        <div className="mx-auto grid h-[4.25rem] max-w-lg grid-cols-5 px-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = navActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-[var(--radius-btn)] text-[10px] font-medium ${
                  active
                    ? "text-[var(--signal)]"
                    : "text-[color-mix(in_srgb,var(--ink)_50%,transparent)]"
                }`}
              >
                <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                <span className="max-w-full truncate px-0.5 leading-none">
                  {label === "Estatísticas" ? "Estat." : label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
