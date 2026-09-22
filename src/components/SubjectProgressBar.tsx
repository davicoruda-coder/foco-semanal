"use client";

import { Minus, Plus } from "lucide-react";
import type { ProgressTracker } from "@/lib/types";
import { progressPercent } from "@/lib/utils";

interface SubjectProgressBarProps {
  progress: ProgressTracker;
  onChange?: (updated: ProgressTracker) => void;
  compact?: boolean;
  className?: string;
}

export function SubjectProgressBar({
  progress,
  onChange,
  compact = false,
  className = "",
}: SubjectProgressBarProps) {
  const pct = progressPercent(progress);
  const isDone = pct >= 100;

  return (
    <div
      className={`group/prog flex flex-col gap-1 ${
        compact ? "mt-1.5" : "mt-2"
      } ${className}`}
    >
      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)] truncate text-[11px] sm:text-xs">
            {progress.unit_label}
          </span>
          <span className="font-mono-num font-semibold text-[var(--ink)] text-[11px] sm:text-xs">
            {progress.current}/{progress.total}
          </span>
          {onChange && (
            <div className="flex items-center gap-0.5 ml-1 opacity-70 group-hover/prog:opacity-100 transition-opacity">
              <button
                type="button"
                className="size-4 sm:size-5 rounded flex items-center justify-center text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] hover:text-[var(--ink)] active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                disabled={progress.current <= 0}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({
                    ...progress,
                    current: Math.max(0, progress.current - 1),
                  });
                }}
                title={`Diminuir 1 ${progress.unit_label.toLowerCase()}`}
                aria-label={`Diminuir 1 ${progress.unit_label.toLowerCase()}`}
              >
                <Minus size={11} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                className="size-4 sm:size-5 rounded flex items-center justify-center text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--ink)_10%,transparent)] hover:text-[var(--ink)] active:scale-95 disabled:opacity-30 disabled:pointer-events-none"
                disabled={progress.current >= progress.total}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange({
                    ...progress,
                    current: Math.min(progress.total, progress.current + 1),
                  });
                }}
                title={`Avançar 1 ${progress.unit_label.toLowerCase()}`}
                aria-label={`Avançar 1 ${progress.unit_label.toLowerCase()}`}
              >
                <Plus size={11} strokeWidth={2.5} />
              </button>
            </div>
          )}
        </div>
        <span
          className={`font-mono-num font-semibold text-[11px] shrink-0 ${
            isDone
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-[var(--signal)]"
          }`}
        >
          {pct}%
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_10%,transparent)]">
        <div
          className={`h-full rounded-full transition-all duration-500 ease-out ${
            isDone
              ? "bg-gradient-to-r from-emerald-500 to-teal-400"
              : "bg-gradient-to-r from-[var(--signal)] to-[color-mix(in_srgb,var(--signal)_70%,#6dd5ed)]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
