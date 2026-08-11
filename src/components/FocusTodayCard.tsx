"use client";

import { useEffect, useMemo, useState } from "react";
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

/** Mini-card "Foco hoje": total do dia + sparkline por hora, leva às Estatísticas. */
export function FocusTodayCard() {
  const { data } = useApp();
  const { runtime, stopwatch } = useTimerRuntime();
  const [log, setLog] = useState<FocusLog>({ version: 1, days: {} });

  useEffect(() => {
    const refresh = () => setLog(loadFocusLog());
    refresh();
    window.addEventListener("foco-focus-log", refresh);
    const id = window.setInterval(refresh, 5000);
    return () => {
      window.removeEventListener("foco-focus-log", refresh);
      window.clearInterval(id);
    };
  }, []);

  const session = useMemo(
    () =>
      [...(data.timers ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0] ??
      null,
    [data.timers],
  );
  const tracking =
    Boolean(session && runtime[session.id]?.running) || stopwatch.running;

  const today = getDay(log, dateKey());
  const max = Math.max(1, ...today.byHour);

  return (
    <Link
      href="/estatisticas"
      className="surface group block p-4 transition hover:border-[color-mix(in_srgb,var(--signal)_45%,var(--line))]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider opacity-50">
          Foco hoje
        </p>
        <span
          className={`inline-flex h-2 w-2 rounded-full ${
            tracking
              ? "bg-[var(--ok)]"
              : "bg-[color-mix(in_srgb,var(--ink)_20%,transparent)]"
          }`}
          title={tracking ? "Registrando agora" : "Pausado"}
        />
      </div>
      <p className="font-mono-num mt-1 text-xl font-medium tracking-tight">
        {formatFocusDuration(today.seconds)}
      </p>
      <div className="mt-3 flex h-8 items-end gap-[3px]" aria-hidden>
        {today.byHour.map((seconds, h) => (
          <span
            key={h}
            className="min-h-[2px] flex-1 rounded-sm"
            style={{
              height: `${Math.round((seconds / max) * 100)}%`,
              background:
                seconds > 0
                  ? "var(--signal)"
                  : "color-mix(in srgb, var(--ink) 10%, transparent)",
            }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between text-[10px] opacity-45">
        <span>0h</span>
        <span>12h</span>
        <span>23h</span>
      </div>
      <p className="mt-2 text-[11px] font-medium text-[color-mix(in_srgb,var(--signal)_75%,var(--ink))] opacity-0 transition group-hover:opacity-100">
        Ver estatísticas →
      </p>
    </Link>
  );
}
