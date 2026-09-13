"use client";

import { useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { SubjectIcon } from "@/components/SubjectIcon";
import {
  SUBJECT_ICON_PRESETS,
  fileToSubjectIconDataUrl,
  isSubjectIconUpload,
  presetIconValue,
  subjectIconPresetId,
} from "@/lib/subject-icons";

export function SubjectIconPicker({
  name,
  value,
  onChange,
}: {
  name: string;
  value: string | null | undefined;
  onChange: (icon: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const presetId = subjectIconPresetId(value);
  const custom = isSubjectIconUpload(value);

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wider opacity-50">
        Ícone
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <SubjectIcon name={name || "?"} icon={value} size={44} />
        <div className="flex flex-wrap gap-1.5">
          {SUBJECT_ICON_PRESETS.map((p) => {
            const active = presetId === p.id;
            const Icon = p.Icon;
            return (
              <button
                key={p.id}
                type="button"
                title={p.label}
                aria-label={p.label}
                aria-pressed={active}
                onClick={() => {
                  setError(null);
                  onChange(active ? null : presetIconValue(p.id));
                }}
                className={`grid size-8 place-items-center rounded-lg ring-1 transition ${
                  active
                    ? "bg-[var(--signal-soft)] text-[var(--signal)] ring-[color-mix(in_srgb,var(--signal)_40%,transparent)]"
                    : "bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] ring-[var(--line)] hover:text-[var(--ink)]"
                }`}
              >
                <Icon size={15} strokeWidth={2} />
              </button>
            );
          })}
        </div>
        <button
          type="button"
          className="btn text-xs"
          onClick={() => inputRef.current?.click()}
        >
          <ImagePlus size={14} strokeWidth={1.75} /> Upload
        </button>
        {(presetId || custom) && (
          <button
            type="button"
            className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--warn)]"
            title="Remover ícone"
            aria-label="Remover ícone"
            onClick={() => {
              setError(null);
              onChange(null);
            }}
          >
            <X size={14} strokeWidth={2} />
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (!file) return;
            setError(null);
            void fileToSubjectIconDataUrl(file)
              .then((data) => onChange(data))
              .catch((err: unknown) =>
                setError(
                  err instanceof Error ? err.message : "Falha no upload.",
                ),
              );
          }}
        />
      </div>
      {error && <p className="text-xs text-[var(--warn)]">{error}</p>}
      <p className="text-[11px] leading-snug opacity-50">
        Pack pronto ou PNG/JPG opcional (recortado em quadrado).
      </p>
    </div>
  );
}
