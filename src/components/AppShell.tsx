"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  BookOpen,
  CalendarDays,
  Ellipsis,
  Home,
  Settings,
  StickyNote,
  Target,
  ChartColumn,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { LoginScreen } from "@/components/LoginScreen";

/** Desktop: layout clássico. */
const DESKTOP_NAV = [
  { href: "/hoje", label: "Hoje", icon: Home },
  { href: "/semana", label: "Semana", icon: CalendarDays },
  { href: "/materias", label: "Matérias", icon: BookOpen },
  { href: "/estatisticas", label: "Estatísticas", icon: ChartColumn },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

/** Mobile: abas principais. */
const MOBILE_PRIMARY = [
  { href: "/hoje", label: "Estudo", icon: BookMarked },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/lembretes", label: "Lembretes", icon: StickyNote },
];

/** Mobile: opções dentro do ⋯ */
const MOBILE_MORE = [
  { href: "/materias", label: "Matérias", icon: BookOpen },
  { href: "/estatisticas", label: "Estatísticas", icon: ChartColumn },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

function desktopNavActive(pathname: string, href: string) {
  if (href === "/ajustes") {
    return (
      pathname.startsWith("/ajustes") || pathname.startsWith("/configuracoes")
    );
  }
  return pathname.startsWith(href);
}

function mobilePrimaryActive(pathname: string, href: string) {
  if (href === "/agenda") {
    return (
      pathname.startsWith("/agenda") || pathname.startsWith("/semana")
    );
  }
  return pathname.startsWith(href);
}

function mobileMoreActive(pathname: string) {
  return MOBILE_MORE.some(({ href }) => {
    if (href === "/ajustes") {
      return (
        pathname.startsWith("/ajustes") ||
        pathname.startsWith("/configuracoes")
      );
    }
    return pathname.startsWith(href);
  });
}

function MobileMoreMenu({
  open,
  onClose,
  pathname,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
      <button
        type="button"
        className="absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_28%,transparent)]"
        aria-label="Fechar menu"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mx-auto w-full max-w-lg px-2 pb-2"
      >
        <div className="overflow-hidden rounded-[18px] border border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow-md)]">
          <p
            id={titleId}
            className="border-b border-[var(--line)] px-4 py-2.5 text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_50%,transparent)]"
          >
            Mais
          </p>
          <ul className="py-1">
            {MOBILE_MORE.map(({ href, label, icon: Icon }) => {
              const active =
                href === "/ajustes"
                  ? pathname.startsWith("/ajustes") ||
                    pathname.startsWith("/configuracoes")
                  : pathname.startsWith(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onClose}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 px-4 text-[15px] font-medium transition ${
                      active
                        ? "bg-[var(--signal-soft)] text-[var(--signal)]"
                        : "text-[var(--ink)] active:bg-[var(--mist)]"
                    }`}
                  >
                    <Icon size={20} strokeWidth={active ? 2.25 : 1.75} />
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready, cloudSync } = useApp();
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

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

  const moreActive = mobileMoreActive(pathname);

  return (
    <div className="relative z-0 min-h-screen pb-[calc(4.5rem+env(safe-area-inset-bottom))] lg:pb-0">
      {cloudSync.message ? (
        <div
          className={`px-4 py-2 text-center text-xs font-medium ${
            cloudSync.status === "error" || cloudSync.status === "offline"
              ? "bg-[color-mix(in_srgb,var(--warn)_18%,var(--surface))] text-[var(--warn)]"
              : "bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_70%,transparent)]"
          }`}
          role="status"
        >
          {cloudSync.message}
        </div>
      ) : null}
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-xl lg:hidden">
        <div className="mx-auto flex h-12 max-w-lg items-center px-3">
          <Link
            href="/hoje"
            className="flex min-w-0 items-center gap-2"
            title="Foco Semanal"
          >
            <div
              className="grid h-7 w-7 shrink-0 place-items-center rounded-[10px] text-white"
              style={{
                background:
                  "linear-gradient(135deg, var(--signal), var(--accent-2))",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <Target size={14} strokeWidth={2.25} />
            </div>
            <span className="font-display truncate text-[15px] font-semibold tracking-tight">
              Foco
            </span>
          </Link>
        </div>
      </header>

      <header className="sticky top-0 z-20 hidden border-b border-[var(--line)] bg-[var(--surface)]/80 backdrop-blur-xl lg:block">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-5 md:px-8">
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
            <span className="font-display truncate text-base font-semibold tracking-tight">
              Foco
            </span>
          </Link>

          <nav className="ml-auto flex items-center gap-1">
            {DESKTOP_NAV.map(({ href, label, icon: Icon }) => {
              const active = desktopNavActive(pathname, href);
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

      <main className="mx-auto max-w-7xl px-2.5 pb-5 pt-3 sm:px-5 sm:pb-6 sm:pt-4 md:px-8 lg:pb-10 lg:pt-6">
        {children}
      </main>

      <MobileMoreMenu
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        pathname={pathname}
      />

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden"
        aria-label="Navegação principal"
      >
        <div className="mx-auto grid h-[4.5rem] max-w-lg grid-cols-4">
          {MOBILE_PRIMARY.map(({ href, label, icon: Icon }) => {
            const active = mobilePrimaryActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`flex flex-col items-center justify-center gap-1 rounded-[var(--radius-btn)] text-[11px] font-medium transition-colors ${
                  active
                    ? "text-[var(--signal)]"
                    : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)]"
                }`}
              >
                <Icon size={24} strokeWidth={active ? 2.25 : 1.85} />
                <span className="max-w-full truncate px-0.5 leading-none">
                  {label === "Lembretes" ? "Lembr." : label}
                </span>
              </Link>
            );
          })}
          <button
            type="button"
            aria-label="Mais opções"
            aria-expanded={moreOpen}
            aria-haspopup="dialog"
            title="Mais opções"
            onClick={() => setMoreOpen((v) => !v)}
            className={`flex flex-col items-center justify-center gap-1 rounded-[var(--radius-btn)] transition-colors ${
              moreOpen || moreActive
                ? "text-[var(--signal)]"
                : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)]"
            }`}
          >
            <Ellipsis
              size={26}
              strokeWidth={moreOpen || moreActive ? 2.5 : 2.15}
            />
            {/* Mesma altura do rótulo para alinhar o ⋯ aos ícones */}
            <span
              className="invisible max-w-full truncate px-0.5 text-[11px] font-medium leading-none"
              aria-hidden
            >
              Mais
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
