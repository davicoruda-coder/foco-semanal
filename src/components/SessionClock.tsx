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
  /** Anel mais suave (cronômetro); cor controlada internamente. */
  softRing?: boolean;
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
  softRing,
}: RingProps) {
  const safeAccent = sanitizeCssColor(accent, "var(--signal)");
  // color-mix não passa no sanitize; valor fixo e seguro para o cronômetro
  const ringStroke = softRing
    ? "color-mix(in srgb, var(--signal) 68%, var(--surface))"
    : safeAccent;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * (1 - Math.min(1, Math.max(0, progress)));
  const iconSize = dense ? 18 : 26;
  const controlIcon = size > 140 ? 20 : 17;

  if (dense) {
    return (
      <div
        className={`flex items-center gap-3 rounded-[var(--radius)] px-2.5 py-2.5 transition ${
          active || paused
            ? "bg-[color-mix(in_srgb,var(--mist)_90%,var(--surface))]"
            : "bg-[var(--mist)]"
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
              stroke={ringStroke}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={dash}
            />
          </svg>
          <span
            className="relative z-[1] grid place-items-center"
            style={{ color: softRing ? ringStroke : safeAccent }}
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
              className="truncate text-sm font-medium"
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
          className="shrink-0 rounded-full p-2 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] transition hover:bg-[var(--surface)] hover:text-[var(--ink)]"
        >
          <RotateCcw size={17} strokeWidth={2} />
        </button>
      </div>
    );
  }

  const ringSvg = (
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
        stroke={ringStroke}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={dash}
      />
    </svg>
  );

  // Cronômetro: tempo + play/pause e reset dentro do círculo
  if (softRing) {
    return (
      <div
        className={`relative ${
          active || paused ? "opacity-100" : "opacity-90"
        }`}
        style={{ width: size, height: size }}
      >
        {ringSvg}
        {/* Absolute + leve translate: centro óptico do conjunto no meio do anel */}
        <div className="absolute inset-0 z-[1] flex items-center justify-center">
          <div className="flex translate-y-1 flex-col items-center gap-1">
            <span
              className={`font-mono-num font-medium leading-none tracking-tight ${
                paused ? "timer-paused" : ""
              }`}
              style={{
                fontSize: size > 140 ? "1.75rem" : "1.45rem",
              }}
            >
              {display}
            </span>
            <div className="grid w-[4.75rem] grid-cols-2 place-items-center">
              <button
                type="button"
                onClick={onToggle}
                title={paused ? "Continuar" : active ? "Pausar" : "Iniciar"}
                aria-label={
                  paused
                    ? "Continuar cronômetro"
                    : active
                      ? "Pausar cronômetro"
                      : "Iniciar cronômetro"
                }
                className="grid size-8 place-items-center rounded-full text-[var(--signal)] transition hover:bg-[color-mix(in_srgb,var(--signal)_10%,transparent)]"
              >
                {active ? (
                  <Pause
                    size={controlIcon}
                    fill="currentColor"
                    strokeWidth={0}
                  />
                ) : (
                  <Play
                    size={controlIcon}
                    fill="currentColor"
                    strokeWidth={0}
                    className="translate-x-px"
                  />
                )}
              </button>
              <button
                type="button"
                onClick={onReset}
                title="Resetar cronômetro"
                aria-label="Resetar cronômetro"
                className="grid size-8 place-items-center rounded-full text-[color-mix(in_srgb,var(--ink)_48%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
              >
                <RotateCcw size={controlIcon - 1} strokeWidth={2} />
              </button>
            </div>
          </div>
        </div>
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
        {ringSvg}

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
          className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
        >
          <RotateCcw size={18} strokeWidth={2} />
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
  /** Timers além do Bloco principal — visíveis na aba Livre. */
  const quickTimers = useMemo(
    () => timers.filter((t) => t.sort_order !== 0),
    [timers],
  );

  const stack = layout === "stack";
  const size = stack
    ? 64
    : timers.length <= 3
      ? 100
      : timers.length === 4
        ? 88
        : 76;
  const quickSize = stack ? 64 : quickTimers.length <= 2 ? 88 : 76;
  const swPaused = !stopwatch.running && stopwatch.accumulatedMs > 0;
  const anyTimerRunning = Object.values(runtime).some((r) => r.running);
  const anyQuickTimerRunning = quickTimers.some(
    (t) => runtime[t.id]?.running,
  );

  function renderTimerRing(
    t: (typeof timers)[number],
    ringSize: number,
    stroke: number,
    dense?: boolean,
  ) {
    const r = runtime[t.id];
    const seconds = secondsFor(t.id);
    const total = Math.max(1, t.minutes) * 60;
    const running = Boolean(r?.running);
    const paused =
      !running && seconds > 0 && seconds < total && Boolean(r?.startedAt);
    return (
      <MiniRing
        key={t.id}
        display={formatTime(seconds)}
        label={t.name}
        size={ringSize}
        stroke={stroke}
        progress={1 - seconds / total}
        accent={t.accent}
        active={running}
        paused={paused}
        dense={dense}
        flash={flash?.id === t.id ? flash.kind : null}
        flashKey={flash?.id === t.id ? flash.key : undefined}
        onToggle={() => toggleTimer(t.id)}
        onReset={() => resetTimer(t.id)}
      />
    );
  }

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
              ["timers", "Sessão"],
              ["stopwatch", "Livre"],
            ] as const
          ).map(([value, label]) => {
            const active = mode === value;
            const runningHidden =
              !active &&
              ((value === "stopwatch" &&
                (stopwatch.running || anyQuickTimerRunning)) ||
                (value === "timers" && anyTimerRunning));
            return (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-full px-2.5 py-1 text-xs font-medium transition sm:px-3 sm:py-1.5 ${
                  active
                    ? "bg-[var(--surface)] text-[var(--signal)] shadow-sm"
                    : runningHidden
                      ? "tab-running-hint"
                      : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
                }`}
                title={
                  runningHidden
                    ? value === "stopwatch"
                      ? "Livre em andamento"
                      : "Sessão em andamento"
                    : undefined
                }
              >
                {label}
              </button>
            );
          })}
        </div>
        <Link
          href="/temporizadores?from=hoje"
          title="Gerenciar temporizadores"
          aria-label="Gerenciar temporizadores"
          className="shrink-0 rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)]"
        >
          <SlidersHorizontal size={16} strokeWidth={1.75} />
        </Link>
      </div>

      <div key={mode} className="fade-in">
      {mode === "stopwatch" ? (
        <div className="flex flex-col">
          <div
            className={`flex justify-center ${stack ? "px-3 py-5" : "px-3 py-6"}`}
          >
            <MiniRing
              display={formatTime(stopwatchSeconds)}
              size={stack ? 170 : 128}
              stroke={stack ? 6 : 4.5}
              progress={1}
              accent="var(--signal)"
              softRing
              active={stopwatch.running}
              paused={swPaused}
              flash={flash?.id === "stopwatch" ? flash.kind : null}
              flashKey={flash?.id === "stopwatch" ? flash.key : undefined}
              onToggle={toggleStopwatch}
              onReset={resetStopwatch}
            />
          </div>
          <div className="border-t border-[var(--line)]">
            {quickTimers.length > 0 ? (
              stack ? (
                <div className="flex flex-col gap-1 px-2 py-2">
                  {quickTimers.map((t) => renderTimerRing(t, quickSize, 5, true))}
                </div>
              ) : (
                <div
                  className={`grid items-start gap-3 px-3 py-4 sm:gap-4 sm:px-6 ${
                    quickTimers.length === 1
                      ? "grid-cols-1 place-items-center"
                      : quickTimers.length === 2
                        ? "grid-cols-2"
                        : "grid-cols-3 max-sm:flex max-sm:snap-x max-sm:overflow-x-auto max-sm:pb-1"
                  }`}
                >
                  {quickTimers.map((t) => (
                    <div
                      key={t.id}
                      className={
                        quickTimers.length >= 3
                          ? "max-sm:snap-start max-sm:shrink-0 max-sm:px-1"
                          : undefined
                      }
                    >
                      {renderTimerRing(t, quickSize, 7)}
                    </div>
                  ))}
                </div>
              )
            ) : (
              <p className="px-4 py-3 text-center text-xs opacity-55">
                Nenhum timer rápido.{" "}
                <Link
                  href="/temporizadores?from=hoje"
                  className="text-[var(--signal)]"
                >
                  Adicionar
                </Link>
              </p>
            )}
          </div>
        </div>
      ) : timers.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm opacity-60">
          Nenhum temporizador.{" "}
          <Link href="/temporizadores?from=hoje" className="text-[var(--signal)]">
            Adicionar
          </Link>
        </div>
      ) : stack ? (
        <div className="flex flex-col gap-1 px-2 py-2">
          {timers.map((t) => renderTimerRing(t, size, 5, true))}
        </div>
      ) : (
        <div
          className={`grid items-start gap-3 px-3 py-5 sm:gap-4 sm:px-6 md:px-8 ${
            timers.length === 1
              ? "grid-cols-1 place-items-center"
              : timers.length === 2
                ? "grid-cols-2"
                : "grid-cols-3 max-sm:flex max-sm:snap-x max-sm:overflow-x-auto max-sm:pb-1"
          }`}
        >
          {timers.map((t) => (
            <div
              key={t.id}
              className={
                timers.length >= 3
                  ? "max-sm:snap-start max-sm:shrink-0 max-sm:px-1"
                  : undefined
              }
            >
              {renderTimerRing(t, size, 7)}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
