"use client";

import { Pause, Play, RotateCcw } from "lucide-react";
import { useStudyFlow } from "@/components/StudyFlowProvider";
import { useTimerRuntime } from "@/components/TimerRuntimeProvider";

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

type Props = {
  subjectId: string;
  studyMinutes: number;
  /** Nome só para aria-label */
  name?: string;
  compact?: boolean;
  /** Matéria Livre: cronômetro que sobe (sem meta). */
  isFree?: boolean;
};

export function SubjectTimerControls({
  subjectId,
  studyMinutes,
  name = "matéria",
  compact,
  isFree = false,
}: Props) {
  const {
    runtime,
    flash,
    subjectTimerKey,
    toggleSubjectTimer,
    resetSubjectTimer,
    secondsForSubject,
    subjectStopwatches,
  } = useTimerRuntime();
  const { allowSubjectPlay, sessionActive } = useStudyFlow();

  const key = subjectTimerKey(subjectId);
  const seconds = secondsForSubject(subjectId);
  const playAllowed = isFree ? !sessionActive : allowSubjectPlay(subjectId);

  const running = isFree
    ? Boolean(subjectStopwatches[subjectId]?.running)
    : Boolean(runtime[key]?.running);

  const paused = isFree
    ? !running && seconds > 0
    : (() => {
        const r = runtime[key];
        const total = Math.max(1, studyMinutes) * 60;
        return (
          !running &&
          seconds > 0 &&
          seconds < total &&
          Boolean(r?.startedAt)
        );
      })();

  /** Cronômetro só com play ou pause — some no idle (e no 00:00 das com tempo). */
  const showClock = running || paused;
  /** Reset só no pause, para poder zerar e recomeçar. */
  const showReset = paused && playAllowed;
  const flashHere = flash?.id === key ? flash.kind : null;

  return (
    <div
      className={`inline-flex items-center ${
        compact ? "gap-1" : "gap-1.5"
      }`}
    >
      <button
        type="button"
        disabled={!playAllowed}
        onClick={() => {
          if (!playAllowed) return;
          toggleSubjectTimer(subjectId);
        }}
        title={
          !playAllowed
            ? "Pause a sessão ou use só a matéria atual"
            : paused
              ? "Continuar"
              : running
                ? "Pausar"
                : "Iniciar"
        }
        aria-label={
          !playAllowed
            ? `Play bloqueado durante a sessão (${name})`
            : paused
              ? `Continuar ${name}`
              : running
                ? `Pausar ${name}`
                : `Iniciar ${name}`
        }
        className={`relative grid place-items-center rounded-full transition ${
          compact ? "size-8" : "size-9"
        } ${
          !playAllowed
            ? "cursor-not-allowed bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_35%,transparent)]"
            : running
              ? "bg-[var(--signal)] text-white shadow-sm"
              : paused
                ? "bg-[color-mix(in_srgb,var(--signal)_22%,transparent)] text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)]"
                : "bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_50%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--ink)_12%,transparent)] hover:bg-[color-mix(in_srgb,var(--ink)_10%,var(--mist))] hover:text-[var(--ink)]"
        }`}
      >
        {running ? (
          <Pause size={compact ? 14 : 15} fill="currentColor" strokeWidth={0} />
        ) : (
          <Play
            size={compact ? 14 : 15}
            fill="currentColor"
            strokeWidth={0}
            className="translate-x-px"
          />
        )}
        {flashHere && playAllowed && (
          <span
            key={flash?.key}
            className="timer-flash absolute inset-0 grid place-items-center rounded-full bg-[var(--surface)]/80"
            style={{ color: "var(--signal)" }}
          >
            {flashHere === "pause" ? (
              <Pause size={14} fill="currentColor" strokeWidth={0} />
            ) : (
              <Play
                size={14}
                fill="currentColor"
                strokeWidth={0}
                className="translate-x-px"
              />
            )}
          </span>
        )}
      </button>

      {showClock && (
        <span
          className={`font-mono-num tabular-nums ${
            compact ? "text-sm" : "text-[15px]"
          } ${paused ? "timer-paused" : ""} ${
            running ? "text-[var(--signal)]" : ""
          }`}
        >
          {formatTime(seconds)}
        </span>
      )}

      {showReset && (
        <button
          type="button"
          onClick={() => resetSubjectTimer(subjectId)}
          title={`Resetar ${name}`}
          aria-label={`Resetar tempo de ${name}`}
          className={`rounded-full text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)] ${
            compact ? "p-1.5" : "p-1.5"
          }`}
        >
          <RotateCcw size={compact ? 14 : 15} strokeWidth={2} />
        </button>
      )}
    </div>
  );
}
