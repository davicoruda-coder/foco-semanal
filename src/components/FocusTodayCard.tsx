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
export function FocusTodayCard() {
  const { runtime } = useTimerRuntime();
  const [log, setLog] = useState<FocusLog>({ version: 1, days: {} });
  const wasTracking = useRef(false);

  // Mesma regra do provider: só matéria em play conta (não Sessão/Livre).
  const tracking = useMemo(
    () =>
      Object.entries(runtime).some(
        ([id, r]) => id.startsWith("sub:") && r.running,
      ),
    [runtime],
  );

  // Sempre lê o snapshot — não o log ao vivo (evita update ao voltar de Semana/Matérias).
  useEffect(() => {
    setLog(loadFocusDisplaySnapshot());
  }, []);

  // Ao pausar/finalizar a matéria, o provider commitou o snapshot; recarrega.
  useEffect(() => {
    if (wasTracking.current && !tracking) {
      setLog(loadFocusDisplaySnapshot());
    }
    wasTracking.current = tracking;
  }, [tracking]);

  useEffect(() => {
    const onLog = () => {
      // Enquanto conta, ignora ticks; após pause/fim (ou commit via Estatísticas) atualiza.
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
      className="surface group block px-3 py-2.5 transition hover:border-[color-mix(in_srgb,var(--signal)_45%,var(--line))]"
    >
      <div className="flex items-baseline justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
          Foco hoje
        </p>
        <p className="font-mono-num text-base font-medium tracking-tight">
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
        <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
          em andamento · ver estatísticas
        </p>
      ) : (
        <p className="mt-1 text-xs font-medium text-[color-mix(in_srgb,var(--signal)_70%,var(--ink))] opacity-0 transition group-hover:opacity-100">
          Ver estatísticas →
        </p>
      )}
    </Link>
  );
}
