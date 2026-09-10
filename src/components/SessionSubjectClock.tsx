"use client";

import { useStudyFlow } from "@/components/StudyFlowProvider";
import { useTimerRuntime } from "@/components/TimerRuntimeProvider";

function formatTime(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Countdown da matéria atual — só com sessão em play ou pause. */
export function SessionSubjectClock({
  subjectId,
  compact,
}: {
  subjectId: string;
  compact?: boolean;
}) {
  const { phase, currentSubjectId } = useStudyFlow();
  const { secondsForSubject, runtime, subjectTimerKey } = useTimerRuntime();

  if (
    (phase !== "running" && phase !== "paused") ||
    currentSubjectId !== subjectId
  ) {
    return null;
  }

  const seconds = secondsForSubject(subjectId);
  const running = Boolean(runtime[subjectTimerKey(subjectId)]?.running);

  return (
    <span
      className={`font-mono-num shrink-0 tabular-nums ${
        compact ? "text-sm" : "text-[15px]"
      } ${
        running
          ? "text-[var(--signal)]"
          : "timer-paused text-[color-mix(in_srgb,var(--ink)_65%,transparent)]"
      }`}
      aria-label={`Tempo restante ${formatTime(seconds)}`}
    >
      {formatTime(seconds)}
    </span>
  );
}
