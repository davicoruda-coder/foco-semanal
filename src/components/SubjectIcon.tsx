"use client";

import { SUBJECT_ICON_PRESETS, subjectIconPresetId } from "@/lib/subject-icons";

export function SubjectIcon({
  name,
  icon,
  size = 28,
  className = "",
}: {
  name: string;
  icon: string | null | undefined;
  size?: number;
  className?: string;
}) {
  const presetId = subjectIconPresetId(icon);
  const preset = presetId
    ? SUBJECT_ICON_PRESETS.find((p) => p.id === presetId)
    : null;
  const initial = (name.trim().charAt(0) || "?").toUpperCase();

  if (icon?.startsWith("data:image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt=""
        width={size}
        height={size}
        className={`shrink-0 rounded-lg object-cover ring-1 ring-[var(--line)] ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (preset) {
    const Icon = preset.Icon;
    return (
      <span
        className={`grid shrink-0 place-items-center rounded-lg bg-[var(--signal-soft)] text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_25%,transparent)] ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <Icon size={Math.round(size * 0.55)} strokeWidth={2} />
      </span>
    );
  }

  return (
    <span
      className={`grid shrink-0 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] text-[11px] font-semibold text-[color-mix(in_srgb,var(--ink)_65%,transparent)] ring-1 ring-[var(--line)] ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
