"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Pause, Play, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { useTimerRuntime } from "@/components/TimerRuntimeProvider";
import { sanitizeCssColor } from "@/lib/utils";

type FlashKind = "play" | "pause";
type ClockLayout = "row" | "stack";

type RingProps = {
  display: string;
  label?: string;
  size: number;
  stroke: number;
  progress: number;
  accent: string;
  active: boolean;
  paused: boolean;
  flash: FlashKind | null;
  flashKey?: number;
  onToggle: () => void;
  onReset: () => void;
  dense?: boolean;
};

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function MiniRing({
  display,
  label,
  size,
  stroke,
  progress,
  accent,
  active,
  paused,
  flash,
  flashKey,
  onToggle,
  onReset,
  dense,
}: RingProps) {
  const safeAccent = sanitizeCssColor(accent, "var(--signal)");
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - Math.min(1, Math.max(0, progress)));
  const iconSize = dense ? 18 : 26;

  if (dense) {
    return (
      <div
        className={`flex items-center gap-3 rounded-[var(--radius)] px-2.5 py-2.5 transition ${
          active || paused
            ? "bg-[color-mix(in_srgb,var(--mist)_80%,transparent)]"
            : ""
        }`}
        style={
          active
            ? {
                boxShadow: `inset 3px 0 0 ${safeAccent}`,
              }
            : undefined
        }
      >
        <button
          type="button"
          onClick={onToggle}
          title={paused ? "Continuar" : active ? "Pausar" : "Iniciar"}
          aria-label={
            paused
              ? `Continuar ${label ?? "cronômetro"}`
              : active
                ? `Pausar ${label ?? "cronômetro"}`
                : `Iniciar ${label ?? "cronômetro"}`
          }
          className="relative grid shrink-0 place-items-center rounded-full transition"
          style={{ width: size, height: size }}
        >
          <svg
            width={size}
            height={size}
            className="pointer-events-none absolute inset-0 -rotate-90"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="color-mix(in srgb, var(--ink) 8%, transparent)"
              strokeWidth={stroke}
            />
            <circle
              className="timer-ring"
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={safeAccent}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={dash}
            />
          </svg>
          <span
            className="relative z-[1] grid place-items-center"
            style={{ color: safeAccent }}
          >
            {active ? (
              <Pause size={20} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play
                size={20}
                fill="currentColor"
                strokeWidth={0}
                className="translate-x-px"
              />
            )}
          </span>
          {flash && (
            <span
              key={flashKey}
              className="timer-flash absolute inset-0 z-[2] grid place-items-center"
              style={{ color: safeAccent }}
            >
              <span className="grid place-items-center rounded-full bg-[var(--surface)]/85 p-1 shadow-sm">
                {flash === "pause" ? (
                  <Pause size={iconSize} fill="currentColor" strokeWidth={0} />
                ) : (
                  <Play
                    size={iconSize}
                    fill="currentColor"
                    strokeWidth={0}
                    className="translate-x-px"
                  />
                )}
              </span>
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          {label ? (
            <p
              className="truncate text-xs font-medium"
              style={{
                color: active
                  ? safeAccent
                  : "color-mix(in srgb, var(--ink) 60%, transparent)",
              }}
            >
              {label}
            </p>
          ) : null}
          <p
            className={`font-mono-num text-xl font-medium leading-none ${
              paused ? "timer-paused" : ""
            }`}
          >
            {display}
          </p>
        </div>

        <button
          type="button"
          onClick={onReset}
          title={`Resetar ${label ?? "cronômetro"}`}
          aria-label={`Resetar ${label ?? "cronômetro"}`}
          className="shrink-0 rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_40%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
        >
          <RotateCcw size={14} strokeWidth={1.75} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        title={paused ? "Continuar" : active ? "Pausar" : "Iniciar"}
        aria-label={
          paused
            ? `Continuar ${label ?? "cronômetro"}`
            : active
              ? `Pausar ${label ?? "cronômetro"}`
              : `Iniciar ${label ?? "cronômetro"}`
        }
        className={`relative grid place-items-center rounded-full transition ${
          active || paused ? "opacity-100" : "opacity-80 hover:opacity-100"
        }`}
        style={{ width: size, height: size }}
      >
        <svg
          width={size}
          height={size}
          className="pointer-events-none absolute inset-0 -rotate-90"
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="color-mix(in srgb, var(--ink) 8%, transparent)"
            strokeWidth={stroke}
          />
          <circle
            className="timer-ring"
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={safeAccent}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dash}
          />
        </svg>

        <span
          className={`font-mono-num relative z-[1] grid h-full w-full place-items-center font-medium leading-none ${
            paused ? "timer-paused" : ""
          }`}
          style={{
            fontSize:
              size > 120 ? "1.9rem" : size > 90 ? "1.35rem" : "1.15rem",
          }}
        >
          {display}
        </span>

        {flash && (
          <span
            key={flashKey}
            className="timer-flash absolute inset-0 z-[2] grid place-items-center"
            style={{ color: safeAccent }}
          >
            <span className="grid place-items-center rounded-full bg-[var(--surface)]/85 p-2 shadow-sm">
              {flash === "pause" ? (
                <Pause size={iconSize} fill="currentColor" strokeWidth={0} />
              ) : (
                <Play
                  size={iconSize}
                  fill="currentColor"
                  strokeWidth={0}
                  className="translate-x-px"
                />
              )}
            </span>
          </span>
        )}
      </button>

      <div className="flex items-center justify-center gap-1.5">
        {label ? (
          <p
            className="text-sm font-medium"
            style={{
              color: active
                ? safeAccent
                : "color-mix(in srgb, var(--ink) 65%, transparent)",
            }}
          >
            {label}
          </p>
        ) : null}
        <button
          type="button"
          onClick={onReset}
          title={`Resetar ${label ?? "cronômetro"}`}
          aria-label={`Resetar ${label ?? "cronômetro"}`}
          className="rounded-full p-1 text-[color-mix(in_srgb,var(--ink)_40%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
        >
          <RotateCcw size={13} strokeWidth={1.75} />
        </button>
      </div>
    </div>
  );
}

export function SessionClock({
  layout = "row",
}: {
  layout?: ClockLayout;
}) {
  const { data } = useApp();
  const {
    mode,
    setMode,
    runtime,
    flash,
    toggleTimer,
    resetTimer,
    secondsFor,
    stopwatch,
    stopwatchSeconds,
    toggleStopwatch,
    resetStopwatch,
  } = useTimerRuntime();

  const timers = useMemo(
    () => [...(data.timers ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [data.timers],
  );

  const stack = layout === "stack";
  const size = stack
    ? 64
    : timers.length <= 3
      ? 100
      : timers.length === 4
        ? 88
        : 76;
  const swPaused = !stopwatch.running && stopwatch.accumulatedMs > 0;

  return (
    <div className="surface overflow-hidden p-0">
      <div
        className={`flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] ${
          stack ? "px-3 py-2" : "px-3 py-2.5 md:px-5"
        }`}
      >
        <div className="flex items-center rounded-full bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] p-0.5">
          {(
            [
              ["timers", stack ? "Timers" : "Temporizadores"],
              ["stopwatch", "Cronômetro"],
            ] as const
          ).map(([value, label]) => {
            const active = mode === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition sm:px-3 sm:py-1.5 ${
                  active
                    ? "bg-[var(--surface)] text-[var(--signal)] shadow-sm"
                    : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
        {mode === "timers" ? (
          <Link
            href="/temporizadores"
            title="Gerenciar temporizadores"
            aria-label="Gerenciar temporizadores"
            className="shrink-0 rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)]"
          >
            <SlidersHorizontal size={16} strokeWidth={1.75} />
          </Link>
        ) : null}
      </div>

      {mode === "stopwatch" ? (
        <div className={`flex justify-center ${stack ? "px-3 py-6" : "px-3 py-6"}`}>
          <MiniRing
            display={formatTime(stopwatchSeconds)}
            size={stack ? 170 : 128}
            stroke={stack ? 10 : 8}
            progress={
              stopwatchSeconds > 0 || stopwatch.running
                ? (stopwatchSeconds % 60) / 60
                : 0
            }
            accent="var(--signal)"
            active={stopwatch.running}
            paused={swPaused}
            flash={flash?.id === "stopwatch" ? flash.kind : null}
            flashKey={flash?.id === "stopwatch" ? flash.key : undefined}
            onToggle={toggleStopwatch}
            onReset={resetStopwatch}
          />
        </div>
      ) : timers.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm opacity-60">
          Nenhum temporizador.{" "}
          <Link href="/temporizadores" className="text-[var(--signal)]">
            Adicionar
          </Link>
        </div>
      ) : stack ? (
        <div className="flex flex-col gap-1 px-2 py-2">
          {timers.map((t) => {
            const r = runtime[t.id];
            const seconds = secondsFor(t.id);
            const total = Math.max(1, t.minutes) * 60;
            const running = Boolean(r?.running);
            const paused =
              !running &&
              seconds > 0 &&
              seconds < total &&
              Boolean(r?.startedAt);
            return (
              <MiniRing
                key={t.id}
                display={formatTime(seconds)}
                label={t.name}
                size={size}
                stroke={5}
                progress={1 - seconds / total}
                accent={t.accent}
                active={running}
                paused={paused}
                dense
                flash={flash?.id === t.id ? flash.kind : null}
                flashKey={flash?.id === t.id ? flash.key : undefined}
                onToggle={() => toggleTimer(t.id)}
                onReset={() => resetTimer(t.id)}
              />
            );
          })}
        </div>
      ) : (
        <div
          className={`grid items-start gap-3 px-3 py-5 sm:gap-4 sm:px-6 md:px-8 ${
            timers.length === 1
              ? "grid-cols-1"
              : timers.length === 2
                ? "grid-cols-2"
                : "grid-cols-3"
          }`}
        >
          {timers.map((t) => {
            const r = runtime[t.id];
            const seconds = secondsFor(t.id);
            const total = Math.max(1, t.minutes) * 60;
            const running = Boolean(r?.running);
            const paused =
              !running &&
              seconds > 0 &&
              seconds < total &&
              Boolean(r?.startedAt);
            return (
              <MiniRing
                key={t.id}
                display={formatTime(seconds)}
                label={t.name}
                size={size}
                stroke={7}
                progress={1 - seconds / total}
                accent={t.accent}
                active={running}
                paused={paused}
                flash={flash?.id === t.id ? flash.kind : null}
                flashKey={flash?.id === t.id ? flash.key : undefined}
                onToggle={() => toggleTimer(t.id)}
                onReset={() => resetTimer(t.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
