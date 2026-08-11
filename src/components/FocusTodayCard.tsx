"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppProvider";
import { useTimerRuntime } from "@/components/TimerRuntimeProvider";
import {
  dateKey,
  formatFocusDuration,
  getDay,
  loadFocusLog,
  type FocusLog,
} from "@/lib/focus-log";

/** Mini-card "Foco hoje": total consolidado (só atualiza ao pausar/finalizar). */
export function FocusTodayCard() {
  const { data } = useApp();
  const { runtime, stopwatch } = useTimerRuntime();
  const [log, setLog] = useState<FocusLog>({ version: 1, days: {} });
  const wasTracking = useRef(false);

  const session = useMemo(
    () =>
      [...(data.timers ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0] ??
      null,
    [data.timers],
  );
  const tracking =
    Boolean(session && runtime[session.id]?.running) || stopwatch.running;

  useEffect(() => {
    setLog(loadFocusLog());
  }, []);

  // Congela enquanto Sessão/Cronômetro rodam; atualiza só ao pausar ou finalizar.
  useEffect(() => {
    if (wasTracking.current && !tracking) {
      setLog(loadFocusLog());
    }
    wasTracking.current = tracking;
  }, [tracking]);

  const today = getDay(log, dateKey());
  const max = Math.max(1, ...today.byHour);

  return (
    <Link
      href="/estatisticas"
      className="surface group block px-3 py-2.5 transition hover:border-[color-mix(in_srgb,var(--signal)_45%,var(--line))]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider opacity-50">
          Foco hoje
        </p>
        <p className="font-mono-num text-sm font-medium tracking-tight">
          {formatFocusDuration(today.seconds)}
        </p>
      </div>
      <div className="mt-1.5 flex h-4 items-end gap-px" aria-hidden>
        {today.byHour.map((seconds, h) => (
          <span
            key={h}
            className="min-h-px flex-1 rounded-[1px]"
            style={{
              height:
                seconds > 0
                  ? `${Math.max(18, Math.round((seconds / max) * 100))}%`
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
        <p className="mt-1 text-[10px] opacity-40">em andamento · ver estatísticas</p>
      ) : (
        <p className="mt-1 text-[10px] font-medium text-[color-mix(in_srgb,var(--signal)_70%,var(--ink))] opacity-0 transition group-hover:opacity-100">
          Ver estatísticas →
        </p>
      )}
    </Link>
  );
}
