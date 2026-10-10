"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookMarked,
  CalendarDays,
  ChartColumn,
  Sparkles,
} from "lucide-react";
import { BrandIcon } from "@/components/BrandIcon";
import { useApp } from "@/components/AppProvider";
import { LoginScreen } from "@/components/LoginScreen";
import { UserAccountMenu } from "@/components/UserAccountMenu";
import { ReminderWatcher } from "@/components/ReminderWatcher";
import { getFlashcardsCountDoDia } from "@/lib/revisao/revisao-store";

/** Desktop: navegação central de trabalho (workflow diário). */
const DESKTOP_PRIMARY_TABS = [
  { href: "/hoje", label: "Hoje", icon: BookMarked },
  { href: "/revisao", label: "Fixar", icon: Sparkles },
  { href: "/estatisticas", label: "Métricas", icon: ChartColumn },
];

/** Mobile: 3 abas principais (a 4ª é o Perfil). */
const MOBILE_PRIMARY = [
  { href: "/agenda", label: "Hoje", icon: CalendarDays },
  { href: "/hoje", label: "Estudo", icon: BookMarked },
  { href: "/revisao", label: "Fixar", icon: Sparkles },
];

function isRouteActive(pathname: string, href: string, isDesktop = false) {
  if (href === "/agenda") {
    return (
      pathname.startsWith("/agenda") ||
      pathname.startsWith("/semana") ||
      pathname.startsWith("/lembretes")
    );
  }
  if (href === "/hoje") {
    return (
      pathname.startsWith("/hoje") ||
      pathname.startsWith("/materias") ||
      (isDesktop &&
        (pathname.startsWith("/semana") ||
          pathname.startsWith("/agenda") ||
          pathname.startsWith("/lembretes")))
    );
  }
  return pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, ready, cloudSync } = useApp();
  const [revisaoActive, setRevisaoActive] = useState(true);
  const [semanaActive, setSemanaActive] = useState(true);
  const [pendingFlashcardsCount, setPendingFlashcardsCount] = useState(0);

  useEffect(() => {
    if (!ready || !user || !revisaoActive) {
      setPendingFlashcardsCount(0);
      return;
    }

    let isMounted = true;
    const fetchCount = async () => {
      try {
        const count = await getFlashcardsCountDoDia();
        if (isMounted) setPendingFlashcardsCount(count);
      } catch (err) {
        console.warn("[AppShell] erro ao buscar contagem de flashcards:", err);
      }
    };

    fetchCount();

    const handleCountEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ count: number }>;
      if (typeof customEvent.detail?.count === "number") {
        setPendingFlashcardsCount(customEvent.detail.count);
      } else {
        fetchCount();
      }
    };

    window.addEventListener("foco-flashcards-count-changed", handleCountEvent);
    window.addEventListener("focus", fetchCount);

    return () => {
      isMounted = false;
      window.removeEventListener(
        "foco-flashcards-count-changed",
        handleCountEvent,
      );
      window.removeEventListener("focus", fetchCount);
    };
  }, [ready, user, revisaoActive]);

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

  const desktopPrimary = DESKTOP_PRIMARY_TABS.filter((item) => {
    if (item.href === "/revisao") return revisaoActive;
    return true;
  });

  const mobilePrimary = MOBILE_PRIMARY.filter((item) => {
    if (item.href === "/revisao") return revisaoActive;
    if (item.href === "/agenda" && !semanaActive) return false;
    return true;
  });

  const isProfileActive =
    pathname.startsWith("/estatisticas") ||
    pathname.startsWith("/ajustes") ||
    pathname.startsWith("/configuracoes") ||
    pathname.startsWith("/ajuda") ||
    pathname.startsWith("/privacidade") ||
    pathname.startsWith("/termos");

  return (
    <div className="relative min-h-screen w-full max-w-full overflow-x-clip pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] lg:pb-0">
      {/* Alertas sonoros e notificações de lembretes ativos globalmente */}
      <ReminderWatcher />

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

      {/* Header Mobile: Limpo, apenas a identidade da marca, sem avatar duplicado */}
      <header className="sticky top-0 z-30 border-b border-[color-mix(in_srgb,var(--line)_80%,transparent)] bg-[color-mix(in_srgb,var(--surface)_90%,var(--paper))]/90 pt-[env(safe-area-inset-top,0px)] backdrop-blur-md lg:hidden transition-colors">
        <div className="mx-auto flex h-12 max-w-lg items-center px-3">
          <Link
            href="/agenda"
            className="flex min-w-0 items-center gap-2"
            title="FocoHub"
          >
            <BrandIcon size={28} />
            <span className="font-display truncate text-[15px] font-semibold tracking-tight text-[var(--ink)]">
              FocoHub
            </span>
          </Link>
        </div>
      </header>

      {/* Header Desktop: Marca + Navegação Central Segmentada + Menu do Usuário */}
      <header className="sticky top-0 z-30 hidden border-b border-[color-mix(in_srgb,var(--line)_80%,transparent)] bg-[color-mix(in_srgb,var(--surface)_88%,var(--paper))]/85 backdrop-blur-md lg:block transition-colors">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-5 md:px-8">
          {/* Logo / Marca */}
          <div className="flex items-center justify-start min-w-0">
            <Link
              href="/hoje"
              className="flex min-w-0 shrink-0 items-center gap-2.5 transition hover:opacity-90"
              title="FocoHub"
            >
              <BrandIcon size={32} />
              <span className="font-display truncate text-[17px] font-bold tracking-tight text-[var(--ink)]">
                FocoHub
              </span>
            </Link>
          </div>

          {/* Controle Central Segmentado (Hoje | Fixar | Estatísticas) */}
          <nav
            aria-label="Modos de trabalho"
            className="flex items-center justify-self-center rounded-xl border border-[color-mix(in_srgb,var(--line)_70%,transparent)] bg-[var(--mist)]/90 p-1 shadow-2xs backdrop-blur-xs"
          >
            {desktopPrimary.map(({ href, label, icon: Icon }) => {
              const active = isRouteActive(pathname, href, true);
              return (
                <Link
                  key={href}
                  href={href}
                  title={label}
                  aria-label={label}
                  aria-current={active ? "page" : undefined}
                  className={`group relative inline-flex h-9 min-w-[96px] items-center justify-center gap-2 rounded-lg px-3.5 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "bg-[var(--surface)] text-[var(--ink)] shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                      : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)] hover:bg-[var(--surface)]/50"
                  }`}
                >
                  <Icon
                    size={16}
                    strokeWidth={active ? 2.25 : 1.85}
                    className={
                      active
                        ? "text-[var(--signal)]"
                        : "text-[color-mix(in_srgb,var(--ink)_50%,transparent)] transition-colors group-hover:text-[var(--signal)]"
                    }
                  />
                  <span>{label}</span>
                  {href === "/revisao" && pendingFlashcardsCount > 0 && (
                    <span
                      title={`${pendingFlashcardsCount} flashcard${pendingFlashcardsCount > 1 ? "s" : ""} para revisar hoje`}
                      className="rounded-full bg-[var(--warn)] px-1.5 py-0.5 text-[10px] font-bold text-white dark:text-neutral-950 font-mono-num leading-none shadow-2xs"
                    >
                      {pendingFlashcardsCount > 99 ? "99+" : pendingFlashcardsCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Perfil e Conta do Usuário no Desktop */}
          <div className="flex items-center justify-end min-w-0">
            <UserAccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl min-w-0 px-2.5 pb-28 pt-3 sm:px-5 sm:pb-24 sm:pt-4 md:px-8 lg:pb-10 lg:pt-6">
        {children}
      </main>

      {/* Barra de Navegação Inferior (Mobile): 5 abas ergonômicas */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 w-full border-t border-[var(--line)] bg-[var(--surface)] pb-[env(safe-area-inset-bottom,0px)] shadow-[0_-2px_10px_rgba(0,0,0,0.06)] lg:hidden after:absolute after:inset-x-0 after:top-full after:h-4 after:bg-[var(--surface)]"
        aria-label="Navegação principal"
      >
        <div className="mx-auto flex h-[4.5rem] w-full max-w-lg">
          {mobilePrimary.map(({ href, label, icon: Icon }) => {
            const active = isRouteActive(pathname, href);
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
                  className={`relative grid size-9 place-items-center rounded-xl transition-colors ${
                    active ? "nav-tab-active-chip" : "bg-transparent"
                  }`}
                >
                  <Icon size={24} strokeWidth={1.85} />
                  {href === "/revisao" && pendingFlashcardsCount > 0 && (
                    <span
                      title={`${pendingFlashcardsCount} flashcard${pendingFlashcardsCount > 1 ? "s" : ""} para revisar hoje`}
                      className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--warn)] px-1 text-[10px] font-bold text-white dark:text-neutral-950 font-mono-num shadow-xs ring-2 ring-[var(--surface)]"
                    >
                      {pendingFlashcardsCount > 99 ? "99+" : pendingFlashcardsCount}
                    </span>
                  )}
                </span>
                <span className="max-w-full truncate px-0.5 leading-none">
                  {label}
                </span>
              </Link>
            );
          })}

          {/* 5ª aba: Perfil do Usuário com avatar circular */}
          <UserAccountMenu
            variant="bottom-nav"
            isActive={isProfileActive}
          />
        </div>
      </nav>
    </div>
  );
}

