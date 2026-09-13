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
  const tile =
    "shrink-0 rounded-[10px] ring-1 ring-[color-mix(in_srgb,var(--ink)_10%,var(--line))]";

  if (icon?.startsWith("data:image/")) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={icon}
        alt=""
        width={size}
        height={size}
        className={`${tile} object-cover ${className}`}
        style={{ width: size, height: size }}
      />
    );
  }

  if (preset) {
    const Icon = preset.Icon;
    return (
      <span
        className={`grid place-items-center bg-[var(--signal-soft)] text-[var(--signal)] ${tile} ${className}`}
        style={{ width: size, height: size }}
        aria-hidden
      >
        <Icon size={Math.round(size * 0.52)} strokeWidth={2} />
      </span>
    );
  }

  return (
    <span
      className={`grid place-items-center bg-[color-mix(in_srgb,var(--ink)_7%,var(--mist))] text-[11px] font-semibold text-[color-mix(in_srgb,var(--ink)_62%,transparent)] ${tile} ${className}`}
      style={{ width: size, height: size }}
      aria-hidden
    >
      {initial}
    </span>
  );
}
