"use client";

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
  const max = Math.max(1, ...bars.map((b) => b.value));
  const hasData = bars.some((b) => b.value > 0);
  const dense = bars.length > 14;

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
      >
        {bars.map((b, i) => {
          const pct = Math.max((b.value / max) * 100, b.value > 0 ? 4 : 0);
          const showLabel =
            !dense ||
            b.emphasis ||
            i % Math.ceil(bars.length / 8) === 0 ||
            i === bars.length - 1;
          return (
            <div
              key={`${b.label}-${i}`}
              className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              title={b.hint ?? `${b.label}: ${b.value}`}
            >
              <div
                className="absolute inset-x-[12%] bottom-0 rounded-t-[6px]"
                style={{
                  height: "100%",
                  background: b.emphasis
                    ? "color-mix(in srgb, var(--signal) 18%, transparent)"
                    : "color-mix(in srgb, var(--ink) 8%, transparent)",
                }}
              />
              <div
                className="relative z-[1] rounded-t-[6px] transition-[height] duration-300"
                style={{
                  width: b.emphasis ? "82%" : "76%",
                  height: `${pct}%`,
                  opacity: b.value > 0 ? (b.emphasis ? 1 : 0.62) : 0,
                  minHeight: b.value > 0 ? 4 : 0,
                  background: "var(--signal)",
                }}
              />
              {showLabel && (
                <span
                  className={`pointer-events-none absolute -bottom-5 text-[10px] sm:text-[11px] ${
                    b.emphasis
                      ? "font-semibold text-[var(--signal)]"
                      : "font-medium opacity-45"
                  }`}
                >
                  {b.label}
                </span>
              )}
            </div>
          );
        })}
      </div>
      <div className="h-5" aria-hidden />
    </div>
  );
}
