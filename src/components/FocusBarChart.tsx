"use client";

type Bar = {
  label: string;
  value: number;
  hint?: string;
};

export function FocusBarChart({
  bars,
  height = 180,
}: {
  bars: Bar[];
  height?: number;
}) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  const gap = 6;
  const n = Math.max(1, bars.length);
  const barW = Math.max(4, Math.min(28, (100 - gap) / n - 0.5));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 100 ${height}`}
        className="h-auto w-full"
        role="img"
        aria-label="Gráfico de tempo de foco"
      >
        {bars.map((b, i) => {
          const h = (b.value / max) * (height - 28);
          const x = (i / n) * 100 + gap / n;
          const y = height - 18 - h;
          return (
            <g key={`${b.label}-${i}`}>
              <title>{b.hint ?? `${b.label}: ${b.value}`}</title>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, b.value > 0 ? 2 : 0)}
                rx={1.2}
                fill="var(--signal)"
                opacity={b.value > 0 ? 0.9 : 0.15}
              />
              {n <= 12 || i % Math.ceil(n / 8) === 0 ? (
                <text
                  x={x + barW / 2}
                  y={height - 4}
                  textAnchor="middle"
                  fontSize="3.2"
                  fill="currentColor"
                  opacity={0.45}
                >
                  {b.label}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
