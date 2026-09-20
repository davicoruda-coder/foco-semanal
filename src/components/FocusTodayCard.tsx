"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Target } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { SIDEBAR_TIMER_ID, useTimerRuntime } from "@/components/TimerRuntimeProvider";
import {
  dateKey,
  formatFocusDuration,
  getDay,
  loadFocusDisplaySnapshot,
  type FocusLog,
} from "@/lib/focus-log";
import { syncFocusLogWithCloud } from "@/lib/supabase/focus-sync";

/** Mini-card "Foco hoje": total consolidado (pause/fim da matéria ou sync nuvem). */
export function FocusTodayCard({
  compact = false,
  embedded = false,
}: {
  /** Layout mais baixo, para faixa mobile. */
  compact?: boolean;
  /** Sem borda/surface própria (já está dentro de outro card). */
  embedded?: boolean;
}) {
  const { user, cloud } = useApp();
  const { runtime, subjectStopwatches, stopwatch } = useTimerRuntime();
  const [log, setLog] = useState<FocusLog>({ version: 1, days: {} });
  const [syncing, setSyncing] = useState(false);
  const wasTracking = useRef(false);
  const syncingRef = useRef(false);

  // Mesma regra do provider: matéria em play (sessão) ou cronômetro.
  const tracking = useMemo(
    () =>
      Object.entries(runtime).some(
        ([id, r]) => id.startsWith("sub:") && r.running,
      ) ||
      Object.values(subjectStopwatches).some((s) => s.running) ||
      stopwatch.running ||
      Boolean(runtime[SIDEBAR_TIMER_ID]?.running),
    [runtime, subjectStopwatches, stopwatch.running],
  );

  const refreshFocus = useCallback(async () => {
    if (syncingRef.current) return;
    if (!cloud || !user) {
      setLog(loadFocusDisplaySnapshot());
      return;
    }
    syncingRef.current = true;
    setSyncing(true);
    try {
      const merged = await syncFocusLogWithCloud();
      setLog(merged);
    } catch {
      setLog(loadFocusDisplaySnapshot());
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [cloud, user]);

  // Abre Hoje / pull-to-refresh (reload) / volta do app: puxa da nuvem.
  useEffect(() => {
    void refreshFocus();
  }, [refreshFocus]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === "visible") void refreshFocus();
    };
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) void refreshFocus();
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("pageshow", onPageShow);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("pageshow", onPageShow);
    };
  }, [refreshFocus]);

  useEffect(() => {
    if (wasTracking.current && !tracking) {
      setLog(loadFocusDisplaySnapshot());
    }
    wasTracking.current = tracking;
  }, [tracking]);

  useEffect(() => {
    const onLog = () => {
      if (!wasTracking.current) setLog(loadFocusDisplaySnapshot());
    };
    window.addEventListener("foco-focus-log", onLog);
    return () => window.removeEventListener("foco-focus-log", onLog);
  }, []);

  const today = getDay(log, dateKey());
  const max = Math.max(1, ...today.byHour);
  // Barra só visual (densidade do dia), sem meta nem “X de Y sessões”.
  const softFill = Math.min(
    100,
    Math.round((today.seconds / (2 * 60 * 60)) * 100),
  );

  return (
    <Link
      href="/estatisticas"
      className={`group block transition ${
        embedded
          ? "px-3.5 py-3 hover:bg-[color-mix(in_srgb,var(--mist)_70%,transparent)]"
          : "surface px-3.5 py-2.5 hover:border-[color-mix(in_srgb,var(--signal)_45%,var(--line))]"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
          <Target
            size={14}
            strokeWidth={2.25}
            className="text-[var(--signal)]"
            aria-hidden
          />
          Foco hoje
        </p>
        <p
          className={`font-mono-num font-semibold tracking-tight ${
            today.seconds === 0 && !tracking
              ? "text-[color-mix(in_srgb,var(--ink)_45%,transparent)]"
              : "text-[var(--ink)]"
          } ${compact ? "text-[15px]" : "text-base"}`}
        >
          {syncing && today.seconds === 0 && !tracking
            ? "…"
            : today.seconds === 0 && !tracking
              ? "—"
              : formatFocusDuration(today.seconds)}
        </p>
      </div>
      {!compact ? (
        <div
          className="mt-2.5 h-2 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
          aria-hidden
        >
          <div
            className="h-full rounded-full bg-[var(--signal)] transition-[width] duration-500 ease-out"
            style={{ width: `${softFill}%` }}
          />
        </div>
      ) : null}
      <div
        className={`mt-2 flex items-end gap-px ${compact ? "h-3" : "h-3.5"}`}
        aria-hidden
      >
        {today.byHour.map((seconds, h) => (
          <span
            key={h}
            className="min-h-px flex-1 rounded-[1px]"
            style={{
              height:
                seconds > 0
                  ? `${Math.max(compact ? 14 : 16, Math.round((seconds / max) * 100))}%`
                  : "2px",
              background:
                seconds > 0
                  ? "var(--signal)"
                  : "color-mix(in srgb, var(--ink) 10%, transparent)",
            }}
          />
        ))}
      </div>
      {tracking ? (
        <p className="mt-1.5 text-xs text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
          em andamento
        </p>
      ) : syncing ? (
        <p className="mt-1.5 text-xs text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
          atualizando…
        </p>
      ) : today.seconds === 0 ? (
        <p className="mt-1.5 text-xs text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
          ainda sem foco registrado
        </p>
      ) : !compact ? (
        <p className="mt-1.5 text-xs font-medium text-[color-mix(in_srgb,var(--signal)_70%,var(--ink))] opacity-0 transition group-hover:opacity-100">
          Ver estatísticas →
        </p>
      ) : null}
    </Link>
  );
}
