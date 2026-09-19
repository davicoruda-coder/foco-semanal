"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  CalendarDays,
  CircleHelp,
  Ellipsis,
  Home,
  Settings,
  StickyNote,
  ChartColumn,
} from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { FlashcardsIcon } from "@/components/FlashcardsIcon";
import { useApp } from "@/components/AppProvider";
import { LoginScreen } from "@/components/LoginScreen";
import { useOpenTransition } from "@/lib/use-open-transition";

/** Desktop: navegação central de trabalho (workflow diário). */
const DESKTOP_PRIMARY_TABS = [
  { href: "/hoje", label: "Hoje", icon: Home },
  { href: "/semana", label: "Semana", icon: CalendarDays },
  { href: "/revisao", label: "Revisão", icon: FlashcardsIcon },
];

/** Mobile: abas principais. */
const MOBILE_PRIMARY = [
  { href: "/hoje", label: "Estudo", icon: BookMarked },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/revisao", label: "Revisão", icon: FlashcardsIcon },
  { href: "/lembretes", label: "Lembretes", icon: StickyNote },
];

/** Mobile: opções dentro do ⋯ */
const MOBILE_MORE = [
  { href: "/estatisticas", label: "Estatísticas", icon: ChartColumn },
  { href: "/ajuda", label: "Ajuda & Guia", icon: CircleHelp },
  { href: "/ajustes", label: "Ajustes", icon: Settings },
];

function mobilePrimaryActive(pathname: string, href: string) {
  if (href === "/agenda") {
    return (
      pathname.startsWith("/agenda") || pathname.startsWith("/semana")
    );
  }
  if (href === "/hoje") {
    return pathname.startsWith("/hoje") || pathname.startsWith("/materias");
  }
  return pathname.startsWith(href);
}

function desktopNavActive(pathname: string, href: string) {
  if (href === "/ajustes") {
    return (
      pathname.startsWith("/ajustes") || pathname.startsWith("/configuracoes")
    );
  }
  if (href === "/hoje") {
    return pathname.startsWith("/hoje") || pathname.startsWith("/materias");
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
  revisaoActive = true,
}: {
  open: boolean;
  onClose: () => void;
  pathname: string;
  revisaoActive?: boolean;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { shown, leaving } = useOpenTransition(open, 160);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!shown) return null;

  return (
    <div className="fixed inset-0 z-40 lg:hidden" role="presentation">
      <button
        type="button"
        className={`absolute inset-0 bg-[color-mix(in_srgb,var(--ink)_28%,transparent)] scrim-fade ${
          leaving ? "is-leaving" : ""
        }`}
        aria-label="Fechar menu"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mx-auto w-full max-w-lg px-2 pb-2 sheet-up ${
          leaving ? "is-leaving" : ""
        }`}
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
                    className={`flex min-h-12 items-center gap-3 px-4 text-[15px] font-medium transition-colors ${
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
  const [revisaoActive, setRevisaoActive] = useState(true);
  const [semanaActive, setSemanaActive] = useState(true);

  useEffect(() => {
    const fetchAdminModules = async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_my_modules");
      let adminAllowed = { revisao: true, semana: true };
      if (!error && data) {
        adminAllowed = typeof data === "string" ? JSON.parse(data) : data;
      }
      
      const checkLocal = () => {
        if (typeof window !== "undefined") {
          const valRev = localStorage.getItem("foco_modulo_revisao");
          const localRev = valRev !== "false";
          setRevisaoActive(adminAllowed.revisao !== false && localRev);
          
          const valSem = localStorage.getItem("foco_modulo_semana");
          const localSem = valSem !== "false";
          setSemanaActive(adminAllowed.semana !== false && localSem);
        }
      };
      
      checkLocal();
      window.addEventListener("foco-modulo-changed", checkLocal);
      window.addEventListener("storage", checkLocal);
      return () => {
        window.removeEventListener("foco-modulo-changed", checkLocal);
        window.removeEventListener("storage", checkLocal);
      };
    };
    
    let cleanup: (() => void) | undefined;
    fetchAdminModules().then((fn) => { cleanup = fn; });
    return () => { if (cleanup) cleanup(); };
  }, []);

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);

  if (!ready) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 text-sm text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
        <BrandIcon size={36} />
        Carregando…
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  const moreActive = mobileMoreActive(pathname);
  const desktopPrimary = DESKTOP_PRIMARY_TABS.filter((item) => {
    if (item.href === "/revisao") return revisaoActive;
    if (item.href === "/semana") return semanaActive;
    return true;
  });
  const mobilePrimary = MOBILE_PRIMARY.filter((item) => {
    if (item.href === "/revisao") return revisaoActive;
    if (item.href === "/semana") return semanaActive;
    return true;
  });

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
      <header className="sticky top-0 z-20 border-b border-[var(--line)] bg-[var(--surface)]/95 pt-[env(safe-area-inset-top)] backdrop-blur-md lg:hidden">
        <div className="mx-auto flex h-12 max-w-lg items-center px-3">
          <Link
            href="/hoje"
            className="flex min-w-0 items-center gap-2"
            title="FocoHub"
          >
            <BrandIcon size={28} />
            <span className="font-display truncate text-[15px] font-semibold tracking-tight">
              FocoHub
            </span>
          </Link>
        </div>
      </header>

      <header className="sticky top-0 z-20 hidden border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur-md lg:block">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-5 md:px-8">
          {/* Logo / Marca */}
          <Link
            href="/hoje"
            className="flex min-w-0 shrink-0 items-center gap-2.5 transition hover:opacity-90"
            title="FocoHub"
          >
            <BrandIcon size={30} />
            <span className="font-display truncate text-base font-semibold tracking-tight text-[var(--ink)]">
              FocoHub
            </span>
          </Link>

          {/* Controle Central Segmentado (Hoje | Semana | Revisão) */}
          <nav
            aria-label="Modos de trabalho"
            className="flex items-center rounded-xl bg-[color-mix(in_srgb,var(--ink)_5%,var(--surface))] p-1 border border-[var(--line)]/60 shadow-[inset_0_1px_1px_rgba(0,0,0,0.03)]"
          >
            {desktopPrimary.map(({ href, label, icon: Icon }) => {
              const active = desktopNavActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`relative inline-flex h-8 items-center gap-1.5 rounded-lg px-3.5 text-xs font-semibold transition-all duration-150 ${
                    active
                      ? "bg-[var(--surface)] text-[var(--ink)] shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_1px_rgba(0,0,0,0.04)] ring-1 ring-black/5"
                      : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)] hover:bg-black/[0.03]"
                  }`}
                >
                  <Icon
                    size={15}
                    strokeWidth={active ? 2.25 : 1.75}
                    className={active ? "text-[var(--signal)]" : "opacity-70"}
                  />
                  <span>{label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Utilidades e Ações Secundárias à Direita */}
          <div className="flex items-center gap-1.5">
            <Link
              href="/estatisticas"
              title="Estatísticas de Foco"
              aria-label="Estatísticas"
              aria-current={desktopNavActive(pathname, "/estatisticas") ? "page" : undefined}
              className={`inline-flex h-8.5 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition ${
                desktopNavActive(pathname, "/estatisticas")
                  ? "bg-[var(--signal-soft)] text-[var(--signal)] font-semibold"
                  : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)]"
              }`}
            >
              <ChartColumn size={16} strokeWidth={1.8} />
              <span className="hidden xl:inline">Estatísticas</span>
            </Link>

            <div className="h-4 w-[1px] bg-[var(--line)] mx-1" aria-hidden="true" />

            <Link
              href="/ajuda"
              title="Ajuda & Guia"
              aria-label="Ajuda"
              aria-current={desktopNavActive(pathname, "/ajuda") ? "page" : undefined}
              className={`inline-flex h-8.5 w-8.5 items-center justify-center rounded-lg text-[color-mix(in_srgb,var(--ink)_60%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)] ${
                desktopNavActive(pathname, "/ajuda")
                  ? "bg-[var(--signal-soft)] text-[var(--signal)]"
                  : ""
              }`}
            >
              <CircleHelp size={18} strokeWidth={1.8} />
            </Link>

            <Link
              href="/ajustes"
              title="Ajustes e Configurações"
              aria-label="Ajustes"
              aria-current={desktopNavActive(pathname, "/ajustes") ? "page" : undefined}
              className={`inline-flex h-8.5 w-8.5 items-center justify-center rounded-lg text-[color-mix(in_srgb,var(--ink)_60%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)] ${
                desktopNavActive(pathname, "/ajustes")
                  ? "bg-[var(--signal-soft)] text-[var(--signal)]"
                  : ""
              }`}
            >
              <Settings size={18} strokeWidth={1.8} />
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-2.5 pb-5 pt-3 sm:px-5 sm:pb-6 sm:pt-4 md:px-8 lg:pb-10 lg:pt-6">
        {children}
      </main>

      <MobileMoreMenu
        open={moreOpen}
        onClose={() => setMoreOpen(false)}
        pathname={pathname}
        revisaoActive={revisaoActive}
      />

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--line)] bg-[var(--surface)]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
        aria-label="Navegação principal"
      >
        <div className="mx-auto flex h-[4.5rem] w-full max-w-lg">
          {mobilePrimary.map(({ href, label, icon: Icon }) => {
            const active = mobilePrimaryActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-label={label}
                aria-current={active ? "page" : undefined}
                className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
                  active
                    ? "font-semibold text-[var(--signal)]"
                    : "font-medium text-[color-mix(in_srgb,var(--ink)_45%,transparent)]"
                }`}
              >
                <span
                  className={`grid size-9 place-items-center rounded-xl transition-colors ${
                    active ? "nav-tab-active-chip" : "bg-transparent"
                  }`}
                >
                  <Icon size={24} strokeWidth={1.85} />
                </span>
                <span className="max-w-full truncate px-0.5 leading-none">
                  {label}
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
            className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 text-[11px] transition-colors ${
              moreOpen || moreActive
                ? "font-semibold text-[var(--signal)]"
                : "font-medium text-[color-mix(in_srgb,var(--ink)_45%,transparent)]"
            }`}
          >
            <span
              className={`grid size-9 place-items-center rounded-xl transition-colors ${
                moreOpen || moreActive
                  ? "nav-tab-active-chip"
                  : "bg-transparent"
              }`}
            >
              <Ellipsis size={24} strokeWidth={1.85} />
            </span>
            <span className="max-w-full truncate px-0.5 leading-none">
              Mais
            </span>
          </button>
        </div>
      </nav>
    </div>
  );
}
