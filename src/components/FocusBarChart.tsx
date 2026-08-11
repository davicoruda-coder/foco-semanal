"use client";

type Bar = {
  label: string;
  value: number;
  hint?: string;
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
            !dense || i % Math.ceil(bars.length / 8) === 0 || i === bars.length - 1;
          return (
            <div
              key={`${b.label}-${i}`}
              className="relative flex h-full min-w-0 flex-1 flex-col items-center justify-end"
              title={b.hint ?? `${b.label}: ${b.value}`}
            >
              {/* trilha de fundo — sempre visível */}
              <div
                className="absolute inset-x-[12%] bottom-0 rounded-t-[6px] bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]"
                style={{ height: "100%" }}
              />
              <div
                className="relative z-[1] w-[76%] rounded-t-[6px] bg-[var(--signal)] transition-[height] duration-300"
                style={{
                  height: `${pct}%`,
                  opacity: b.value > 0 ? 1 : 0,
                  minHeight: b.value > 0 ? 4 : 0,
                }}
              />
              {showLabel && (
                <span className="pointer-events-none absolute -bottom-5 text-[10px] font-medium opacity-45 sm:text-[11px]">
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
