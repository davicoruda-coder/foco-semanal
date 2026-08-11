import type { BlockType, SubjectStatus, WeekBlock } from "./types";

export const BLOCK_COLORS = [
  "#E2E8F0", // trabalho / slate
  "#CCFBF1", // estudo / teal
  "#FEF3C7", // reunião / âmbar
  "#E7E5E4", // pessoal / stone
  "#FBCFE8", // rosa
  "#DBEAFE", // azul
  "#FEE2E2", // vermelho suave
  "#EDE9FE", // violeta
];

export function defaultBlockColor(type: BlockType): string {
  switch (type) {
    case "trabalho":
      return "#E2E8F0";
    case "estudo":
      return "#CCFBF1";
    case "reuniao":
      return "#FEF3C7";
    case "pessoal":
      return "#E7E5E4";
    default:
      return "#F3F6F4";
  }
}

export function blockStyle(
  block: Pick<WeekBlock, "type" | "color">,
  opts?: { muted?: boolean },
): {
  className: string;
  style?: { background: string; color: string; opacity?: number };
} {
  const bg = block.color || defaultBlockColor(block.type);
  if (opts?.muted) {
    return {
      className: "",
      style: {
        background: `color-mix(in srgb, ${bg} 78%, var(--surface))`,
        color: "#14201a",
        opacity: 0.82,
      },
    };
  }
  return {
    className: "",
    style: { background: bg, color: "#14201a" },
  };
}

/** @deprecated prefer blockStyle */
export function blockTint(type: BlockType): string {
  switch (type) {
    case "trabalho":
      return "bg-[#D5DDD7] text-[var(--ink)]";
    case "estudo":
      return "bg-[var(--signal-soft)] text-[var(--signal)]";
    case "reuniao":
      return "bg-[#FEF3C7] text-[#92400E]";
    case "pessoal":
      return "bg-[#E7E5E4] text-[#44403C]";
    default:
      return "bg-[var(--mist)] text-[var(--ink)]";
  }
}

export function statusClass(status: SubjectStatus): string {
  switch (status) {
    case "ok":
      return "bg-[color-mix(in_srgb,var(--ok)_42%,var(--surface))] text-[var(--ok)] ring-1 ring-[color-mix(in_srgb,var(--ok)_35%,transparent)]";
    case "prox":
      return "bg-[color-mix(in_srgb,var(--warn)_38%,var(--surface))] text-[var(--warn)] ring-1 ring-[color-mix(in_srgb,var(--warn)_45%,transparent)]";
  }
}

/** Fundo da linha/card da matéria conforme o status. */
export function statusRowClass(status: SubjectStatus): string {
  switch (status) {
    case "ok":
      return "bg-[color-mix(in_srgb,var(--ok)_var(--row-tint-ok),var(--surface))]";
    case "prox":
      return "bg-[color-mix(in_srgb,var(--warn)_var(--row-tint-warn),var(--surface))]";
  }
}

/** Monday=0 ... Sunday=6 (planilha style) */
export function todayIndex(): number {
  const js = new Date().getDay(); // 0 Sun
  return js === 0 ? 6 : js - 1;
}
