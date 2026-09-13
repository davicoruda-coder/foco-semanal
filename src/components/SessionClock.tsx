"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Pause, Play, RotateCcw, SlidersHorizontal } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { SIDEBAR_TIMER_ID, useTimerRuntime } from "@/components/TimerRuntimeProvider";
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
    const longDisplay = display.length > 5;
    const timeSize =
      size >= 160
        ? longDisplay
          ? "1.35rem"
          : "1.55rem"
        : size >= 120
          ? longDisplay
            ? "1.15rem"
            : "1.25rem"
          : size >= 100
            ? longDisplay
              ? "1.05rem"
              : "1.15rem"
            : longDisplay
              ? "0.92rem"
              : "1rem";

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
              className={`font-mono-num font-medium leading-none tracking-tight tabular-nums ${
                paused ? "timer-paused" : ""
              }`}
              style={{
                fontSize: timeSize,
                maxWidth: size * 0.58,
                textAlign: "center",
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
  variant = "full",
  compact = false,
}: {
  layout?: ClockLayout;
  /** No Hoje: temporizador da lateral + cronômetro (sessão do ciclo fica no CTA). */
  variant?: "full" | "livre";
  /** Faixa horizontal densa (mobile). */
  compact?: boolean;
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
    toggleSidebarTimer,
    resetSidebarTimer,
    secondsForSidebar,
    sidebarTimerName,
    sidebarTimerMinutes,
  } = useTimerRuntime();

  const timers = useMemo(
    () => [...(data.timers ?? [])].sort((a, b) => a.sort_order - b.sort_order),
    [data.timers],
  );
  /** Só o Bloco (sort_order 0) na aba Sessão — matérias têm timer na lista. */
  const sessionTimers = useMemo(
    () => timers.filter((t) => t.sort_order === 0),
    [timers],
  );

  const stack = layout === "stack";
  const size = stack ? 64 : 100;
  const swPaused = !stopwatch.running && stopwatch.accumulatedMs > 0;
  const anySessionRunning = sessionTimers.some((t) => runtime[t.id]?.running);
  const livreOnly = variant === "livre";
  const showStopwatch = mode === "stopwatch";
  const sidebar = runtime[SIDEBAR_TIMER_ID];
  const sidebarTotal = Math.max(1, sidebarTimerMinutes) * 60;
  const sidebarRunning = Boolean(sidebar?.running);
  const sidebarPaused =
    !sidebarRunning &&
    secondsForSidebar > 0 &&
    secondsForSidebar < sidebarTotal &&
    Boolean(sidebar?.startedAt);

  function renderSidebarRing(
    ringSize: number,
    stroke: number,
    dense?: boolean,
    soft = false,
  ) {
    return (
      <MiniRing
        display={formatTime(secondsForSidebar)}
        label={sidebarTimerName}
        size={ringSize}
        stroke={stroke}
        progress={1 - secondsForSidebar / sidebarTotal}
        accent="var(--signal)"
        softRing={soft}
        active={sidebarRunning}
        paused={sidebarPaused}
        dense={dense}
        flash={flash?.id === SIDEBAR_TIMER_ID ? flash.kind : null}
        flashKey={
          flash?.id === SIDEBAR_TIMER_ID ? flash.key : undefined
        }
        onToggle={toggleSidebarTimer}
        onReset={resetSidebarTimer}
      />
    );
  }

  function renderStopwatchRing(
    ringSize: number,
    stroke: number,
    dense?: boolean,
    soft = true,
  ) {
    return (
      <MiniRing
        display={formatTime(stopwatchSeconds)}
        label="Cronômetro"
        size={ringSize}
        stroke={stroke}
        progress={1}
        accent="var(--signal)"
        softRing={soft}
        dense={dense}
        active={stopwatch.running}
        paused={swPaused}
        flash={flash?.id === "stopwatch" ? flash.kind : null}
        flashKey={flash?.id === "stopwatch" ? flash.key : undefined}
        onToggle={toggleStopwatch}
        onReset={resetStopwatch}
      />
    );
  }

  const livreTabs = (
    <>
      <div className="flex items-center rounded-full bg-[color-mix(in_srgb,var(--ink)_7%,transparent)] p-0.5">
        {(
          [
            ["timers", "Temporizador"],
            ["stopwatch", "Cronômetro"],
          ] as const
        ).map(([value, label]) => {
          const active = mode === value;
          const runningHidden =
            !active &&
            ((value === "stopwatch" && stopwatch.running) ||
              (value === "timers" && sidebarRunning));
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
                    ? "Cronômetro em andamento"
                    : "Temporizador em andamento"
                  : undefined
              }
            >
              {label}
            </button>
          );
        })}
      </div>
      <Link
        href="/ajustes#temporizador"
        title="Ajustes do temporizador"
        aria-label="Ajustes do temporizador"
        className="shrink-0 rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)]"
      >
        <SlidersHorizontal size={16} strokeWidth={1.75} />
      </Link>
    </>
  );

  if (livreOnly && compact) {
    return (
      <div className="px-2.5 py-2">
        <div className="mb-1.5 flex items-center justify-between gap-2">
          {livreTabs}
        </div>
        <p className="mb-2 text-[10px] leading-snug text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
          {showStopwatch
            ? "Sobe o tempo · conta em Foco hoje"
            : "Desce com alarme · não marca Concluída · conta em Foco hoje"}
        </p>
        {showStopwatch
          ? renderStopwatchRing(52, 4, true)
          : renderSidebarRing(52, 4, true, !sidebarRunning && !sidebarPaused)}
      </div>
    );
  }

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
        {livreOnly ? (
          livreTabs
        ) : (
          <>
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
                ((value === "stopwatch" && stopwatch.running) ||
                  (value === "timers" && anySessionRunning));
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
            href="/ajustes"
            title="Ajustes"
            aria-label="Ajustes"
            className="shrink-0 rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--signal)]"
          >
            <SlidersHorizontal size={16} strokeWidth={1.75} />
          </Link>
          </>
        )}
      </div>

      <div key={mode} className="fade-in">
      {livreOnly ? (
        <>
          <p className="border-b border-[var(--line)] px-3 py-1.5 text-[11px] leading-snug text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
            {showStopwatch
              ? "Sobe o tempo · conta em Foco hoje"
              : "Desce com alarme · não marca Concluída · conta em Foco hoje"}
          </p>
          {showStopwatch ? (
            <div
              className={`flex justify-center ${stack ? "px-3 py-3" : "px-3 py-4"}`}
            >
              {renderStopwatchRing(
                stack ? 124 : 112,
                stack ? 4.5 : 4.5,
                false,
                !stopwatch.running && !swPaused,
              )}
            </div>
          ) : (
            <div
              className={`flex flex-col items-center ${stack ? "px-3 py-3" : "px-3 py-4"}`}
            >
              {sidebarTimerName !== "Temporizador" && (
                <p className="mb-2 max-w-full truncate text-xs font-medium text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                  {sidebarTimerName}
                </p>
              )}
              {renderSidebarRing(
                stack ? 124 : 112,
                4.5,
                false,
                !sidebarRunning && !sidebarPaused,
              )}
            </div>
          )}
        </>
      ) : showStopwatch ? (
        <div
          className={`flex justify-center ${livreOnly ? (stack ? "px-3 py-3" : "px-3 py-4") : stack ? "px-3 py-5" : "px-3 py-6"}`}
        >
          <MiniRing
            display={formatTime(stopwatchSeconds)}
            size={livreOnly ? (stack ? 124 : 112) : stack ? 170 : 128}
            stroke={livreOnly ? 4.5 : stack ? 6 : 4.5}
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
      ) : sessionTimers.length === 0 ? (
        <div className="px-5 py-8 text-center text-sm opacity-60">
          Nenhum Bloco de sessão.{" "}
          <Link href="/ajustes" className="text-[var(--signal)]">
            Ver ajustes
          </Link>
        </div>
      ) : stack ? (
        <div className="flex flex-col gap-1 px-2 py-2">
          {sessionTimers.map((t) => renderTimerRing(t, size, 5, true))}
        </div>
      ) : (
        <div className="grid grid-cols-1 place-items-center gap-3 px-3 py-5 sm:px-6 md:px-8">
          {sessionTimers.map((t) => renderTimerRing(t, size, 7))}
        </div>
      )}
      </div>
    </div>
  );
}
