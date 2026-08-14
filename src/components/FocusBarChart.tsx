"use client";

import { useEffect, useState } from "react";

type Bar = {
  label: string;
  value: number;
  hint?: string;
  /** Destaque do dia/hora/mês atual */
  emphasis?: boolean;
};

export function FocusBarChart({
  bars,
  height = 200,
}: {
  bars: Bar[];
  height?: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const max = Math.max(1, ...bars.map((b) => b.value));
  const hasData = bars.some((b) => b.value > 0);
  const dense = bars.length > 14;

  useEffect(() => {
    setSelected(null);
  }, [bars]);

  const active = selected != null ? bars[selected] : null;

  return (
    <div className="w-full">
      {!hasData && (
        <p className="mb-3 text-xs opacity-50">
          Ainda sem tempo registrado neste período. Coloque a Sessão ou o
          Cronômetro em play para preencher o gráfico.
        </p>
      )}
      <div
        className="flex items-end gap-1 border-b border-[var(--line)] pb-1 sm:gap-1.5"
        style={{ height }}
        role="list"
        aria-label="Gráfico de foco"
      >
        {bars.map((b, i) => {
          const pct = Math.max((b.value / max) * 100, b.value > 0 ? 4 : 0);
          const showLabel =
            !dense ||
            b.emphasis ||
            i % Math.ceil(bars.length / 8) === 0 ||
            i === bars.length - 1;
          const isSelected = selected === i;
          return (
            <button
              key={`${b.label}-${i}`}
              type="button"
              role="listitem"
              aria-pressed={isSelected}
              aria-label={b.hint ?? `${b.label}: ${b.value}`}
              className={`relative flex h-full min-w-0 flex-1 cursor-pointer flex-col items-center justify-end rounded-t-[6px] border-0 bg-transparent p-0 outline-none transition [-webkit-tap-highlight-color:transparent] focus-visible:ring-2 focus-visible:ring-[var(--signal)] focus-visible:ring-offset-2 ${
                isSelected ? "bg-[color-mix(in_srgb,var(--signal)_10%,transparent)]" : ""
              }`}
              onClick={() => setSelected((cur) => (cur === i ? null : i))}
            >
              <div
                className="absolute inset-x-[12%] bottom-0 rounded-t-[6px]"
                style={{
                  height: "100%",
                  background: b.emphasis || isSelected
                    ? "color-mix(in srgb, var(--signal) 18%, transparent)"
                    : "color-mix(in srgb, var(--ink) 8%, transparent)",
                }}
              />
              <div
                className="relative z-[1] rounded-t-[6px] transition-[height,opacity] duration-300"
                style={{
                  width: b.emphasis || isSelected ? "82%" : "76%",
                  height: `${pct}%`,
                  opacity: b.value > 0 ? (b.emphasis || isSelected ? 1 : 0.62) : 0,
                  minHeight: b.value > 0 ? 4 : 0,
                  background: "var(--signal)",
                }}
              />
              {showLabel && (
                <span
                  className={`pointer-events-none absolute -bottom-5 text-[10px] sm:text-[11px] ${
                    b.emphasis || isSelected
                      ? "font-semibold text-[var(--signal)]"
                      : "font-medium opacity-45"
                  }`}
                >
                  {b.label}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="h-5" aria-hidden />
      <p
        className={`min-h-[1.25rem] text-center text-sm transition ${
          active
            ? "font-medium text-[var(--ink)]"
            : "text-[color-mix(in_srgb,var(--ink)_45%,transparent)]"
        }`}
        aria-live="polite"
      >
        {active
          ? (active.hint ?? `${active.label}: ${active.value}`)
          : "Toque ou clique em uma barra para ver o tempo"}
      </p>
    </div>
  );
}
