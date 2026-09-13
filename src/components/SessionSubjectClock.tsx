"use client";

import { useApp } from "@/components/AppProvider";
import { useStudyFlow } from "@/components/StudyFlowProvider";
import { useTimerRuntime } from "@/components/TimerRuntimeProvider";
import { subjectUsesStopwatch, todayIndex } from "@/lib/utils";

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Relógio da matéria atual na sessão (countdown ou cronômetro Livre). */
export function SessionSubjectClock({
  subjectId,
  compact,
}: {
  subjectId: string;
  compact?: boolean;
}) {
  const { data } = useApp();
  const { phase, currentSubjectId } = useStudyFlow();
  const {
    secondsForSubject,
    runtime,
    subjectTimerKey,
    subjectStopwatches,
  } = useTimerRuntime();

  if (
    (phase !== "running" && phase !== "paused") ||
    currentSubjectId !== subjectId
  ) {
    return null;
  }

  const sub = (data.subjects ?? []).find((s) => s.id === subjectId);
  const stopwatch = sub
    ? subjectUsesStopwatch(sub, todayIndex(), data.subjects)
    : false;
  const seconds = secondsForSubject(subjectId);
  const running = stopwatch
    ? Boolean(subjectStopwatches[subjectId]?.running)
    : Boolean(runtime[subjectTimerKey(subjectId)]?.running);

  return (
    <span
      className={`font-mono-num shrink-0 tabular-nums ${
        compact ? "text-sm" : "text-[15px]"
      } ${
        running
          ? "text-[var(--signal)]"
          : "timer-paused text-[color-mix(in_srgb,var(--ink)_65%,transparent)]"
      }`}
      aria-label={
        stopwatch
          ? `Tempo decorrido ${formatTime(seconds)}`
          : `Tempo restante ${formatTime(seconds)}`
      }
    >
      {formatTime(seconds)}
    </span>
  );
}
