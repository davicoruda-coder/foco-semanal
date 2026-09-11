"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useTimerRuntime } from "@/components/TimerRuntimeProvider";
import {
  dateKey,
  formatFocusDuration,
  getDay,
  loadFocusDisplaySnapshot,
  type FocusLog,
} from "@/lib/focus-log";

/** Mini-card "Foco hoje": total consolidado (pause/fim da matéria ou ao abrir Estatísticas). */
export function FocusTodayCard({
  compact = false,
  embedded = false,
}: {
  /** Layout mais baixo, para faixa mobile. */
  compact?: boolean;
  /** Sem borda/surface própria (já está dentro de outro card). */
  embedded?: boolean;
}) {
  const { runtime, subjectStopwatches, stopwatch } = useTimerRuntime();
  const [log, setLog] = useState<FocusLog>({ version: 1, days: {} });
  const wasTracking = useRef(false);

  // Mesma regra do provider: matéria em play (sessão) ou cronômetro.
  const tracking = useMemo(
    () =>
      Object.entries(runtime).some(
        ([id, r]) => id.startsWith("sub:") && r.running,
      ) ||
      Object.values(subjectStopwatches).some((s) => s.running) ||
      stopwatch.running,
    [runtime, subjectStopwatches, stopwatch.running],
  );

  useEffect(() => {
    setLog(loadFocusDisplaySnapshot());
  }, []);

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

  return (
    <Link
      href="/estatisticas?from=hoje"
      className={`group block transition ${
        embedded
          ? "px-3.5 py-3 hover:bg-[color-mix(in_srgb,var(--mist)_70%,transparent)]"
          : "surface px-3 py-2.5 hover:border-[color-mix(in_srgb,var(--signal)_45%,var(--line))]"
      }`}
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
          Foco hoje
        </p>
        <p
          className={`font-mono-num font-medium tracking-tight ${
            compact ? "text-[15px]" : "text-base"
          }`}
        >
          {formatFocusDuration(today.seconds)}
        </p>
      </div>
      <div
        className={`mt-1.5 flex items-end gap-px ${compact ? "h-3" : "h-4"}`}
        aria-hidden
      >
        {today.byHour.map((seconds, h) => (
          <span
            key={h}
            className="min-h-px flex-1 rounded-[1px]"
            style={{
              height:
                seconds > 0
                  ? `${Math.max(compact ? 14 : 18, Math.round((seconds / max) * 100))}%`
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
        <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
          em andamento
        </p>
      ) : !compact ? (
        <p className="mt-1 text-xs font-medium text-[color-mix(in_srgb,var(--signal)_70%,var(--ink))] opacity-0 transition group-hover:opacity-100">
          Ver estatísticas →
        </p>
      ) : null}
    </Link>
  );
}
