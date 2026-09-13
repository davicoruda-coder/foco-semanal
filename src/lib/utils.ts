import type {
  BlockType,
  RotationItem,
  Subject,
  SubjectRotation,
  SubjectStatus,
  WeekBlock,
} from "./types";

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

/** Aceita só hex (#rgb/#rrggbb/#rrggbbaa) ou var(--token). */
export function sanitizeCssColor(
  value: string | undefined | null,
  fallback: string,
): string {
  if (!value) return fallback;
  const v = value.trim();
  if (/^#[0-9A-Fa-f]{3}([0-9A-Fa-f]{1}|[0-9A-Fa-f]{3}|[0-9A-Fa-f]{5})?$/.test(v)) {
    return v;
  }
  if (/^var\(--[a-zA-Z0-9-]+\)$/.test(v)) return v;
  return fallback;
}

export function blockStyle(
  block: Pick<WeekBlock, "type" | "color">,
  opts?: { muted?: boolean },
): {
  className: string;
  style?: { background: string; color: string };
} {
  const bg = sanitizeCssColor(
    block.color,
    defaultBlockColor(block.type),
  );
  if (opts?.muted) {
    // Sem opacity < 1: opacity força composição e deixa a fonte “embaçada”.
    return {
      className: "",
      style: {
        background: `color-mix(in srgb, ${bg} 72%, var(--surface))`,
        color: "#3d453f",
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
      return "bg-[var(--status-ok-bg)] text-[var(--status-ok-fg)] ring-1 ring-[var(--status-ok-ring)]";
    case "prox":
      return "bg-[var(--status-prox-bg)] text-[var(--status-prox-fg)] ring-1 ring-[var(--status-prox-ring)]";
  }
}

/** Fundo da linha/card da matéria conforme o status. */
export function statusRowClass(status: SubjectStatus): string {
  switch (status) {
    case "ok":
      return "bg-[color-mix(in_srgb,var(--ok)_var(--row-tint-ok),var(--surface))]";
    case "prox":
      // Claro: mist um pouco mais carregado; escuro: igual à barra (--row-prox)
      return "bg-[var(--row-prox)]";
  }
}

/** Fundo da linha/card de matéria Livre (fora do ciclo). */
export function freeRowClass(): string {
  return "bg-[var(--row-free)]";
}

/** Monday=0 ... Sunday=6 (planilha style) */
export function todayIndex(): number {
  const js = new Date().getDay(); // 0 Sun
  return js === 0 ? 6 : js - 1;
}

/** Normaliza dias: null/vazio/7 dias = todos os dias. */
export function normalizeStudyDays(
  days: number[] | null | undefined,
): number[] | null {
  if (!days?.length) return null;
  const uniq = [
    ...new Set(
      days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    ),
  ].sort((a, b) => a - b);
  if (uniq.length === 0 || uniq.length === 7) return null;
  return uniq;
}

/** Sem `study_days` (ou lista vazia) = aparece todos os dias. */
export function subjectShowsOnDay(
  subject: Pick<Subject, "study_days">,
  day: number,
): boolean {
  const days = normalizeStudyDays(subject.study_days);
  if (!days) return true;
  return days.includes(day);
}

/** Normaliza dias exclusivos: null/vazio = nenhum. 1–7 dias válidos. */
export function normalizeExclusiveDays(
  days: number[] | null | undefined,
): number[] | null {
  if (!days?.length) return null;
  const uniq = [
    ...new Set(
      days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6),
    ),
  ].sort((a, b) => a - b);
  return uniq.length === 0 ? null : uniq;
}

export function subjectExclusiveOnDay(
  subject: Pick<Subject, "exclusive_days">,
  day: number,
): boolean {
  return Boolean(normalizeExclusiveDays(subject.exclusive_days)?.includes(day));
}

/** Matéria ativa que toma o dia (a de menor cycle_order, se houver empate). */
export function exclusiveSubjectOnDay(
  subjects: Pick<Subject, "id" | "active" | "exclusive_days" | "cycle_order">[],
  day: number,
): (typeof subjects)[number] | null {
  const matches = subjects.filter(
    (s) => s.active && subjectExclusiveOnDay(s, day),
  );
  if (!matches.length) return null;
  return [...matches].sort((a, b) => a.cycle_order - b.cycle_order)[0] ?? null;
}

/** Livre permanente, ou o dia exclusivo dela. */
export function subjectTreatAsFree(
  subject: Pick<Subject, "is_free" | "exclusive_days">,
  day: number,
): boolean {
  return Boolean(subject.is_free) || subjectExclusiveOnDay(subject, day);
}

/** Matérias visíveis no Hoje: dia exclusivo esconde as outras. */
export function subjectsOnDay<T extends Subject>(
  subjects: T[],
  day: number,
): T[] {
  const exclusive = exclusiveSubjectOnDay(subjects, day);
  if (exclusive) {
    const found = subjects.find((s) => s.id === exclusive.id);
    return found ? [found] : [];
  }
  return subjects.filter(
    (s) =>
      s.active &&
      (subjectShowsOnDay(s, day) || subjectExclusiveOnDay(s, day)),
  );
}

/** Fila do ciclo (Concluída/Próxima). Vazia num dia exclusivo. */
export function cycleSubjectsOnDay<T extends Subject>(
  subjects: T[],
  day: number,
): T[] {
  if (exclusiveSubjectOnDay(subjects, day)) return [];
  return [...subjects]
    .filter((s) => s.active && !s.is_free && subjectShowsOnDay(s, day))
    .sort((a, b) => a.cycle_order - b.cycle_order);
}

export function withoutExclusiveDays(
  days: number[] | null | undefined,
  taken: number[],
): number[] | null {
  if (!taken.length) return normalizeExclusiveDays(days);
  const takenSet = new Set(taken);
  return normalizeExclusiveDays(
    (normalizeExclusiveDays(days) ?? []).filter((d) => !takenSet.has(d)),
  );
}

export const DEFAULT_SIDEBAR_TIMER_NAME = "Temporizador";

export function normalizeSidebarTimerName(raw: unknown): string {
  if (typeof raw !== "string") return DEFAULT_SIDEBAR_TIMER_NAME;
  const t = raw.trim().slice(0, 40);
  return t || DEFAULT_SIDEBAR_TIMER_NAME;
}

export function normalizeSidebarTimerMinutes(
  raw: unknown,
  fallback = 40,
): number {
  const n = typeof raw === "number" ? raw : Number(raw);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(180, Math.floor(n));
}

const ROTATION_MAX_ITEMS = 30;
const ROTATION_MAX_NAME = 80;
const ROTATION_MAX_NOTES = 4000;

/** Valida/normaliza o rodízio vindo de storage/nuvem/backup. */
export function normalizeRotation(raw: unknown): SubjectRotation | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as { items?: unknown; index?: unknown };
  if (!Array.isArray(obj.items)) return null;
  const items: RotationItem[] = obj.items
    .filter((it): it is Record<string, unknown> =>
      Boolean(it) && typeof it === "object",
    )
    .map((it) => ({
      id:
        typeof it.id === "string" && it.id
          ? it.id.slice(0, 64)
          : `rot-${Math.random().toString(36).slice(2, 10)}`,
      name:
        typeof it.name === "string" ? it.name.slice(0, ROTATION_MAX_NAME) : "",
      notes:
        typeof it.notes === "string" ? it.notes.slice(0, ROTATION_MAX_NOTES) : "",
    }))
    .filter((it) => it.name.trim().length > 0)
    .slice(0, ROTATION_MAX_ITEMS);
  if (items.length === 0) return null;
  const idxRaw = typeof obj.index === "number" ? Math.floor(obj.index) : 0;
  const index = Math.min(Math.max(0, idxRaw), items.length - 1);
  return { items, index };
}

/** Item "da vez" do rodízio da matéria (null se não usa rodízio). */
export function rotationCurrent(
  subject: Pick<Subject, "rotation">,
): RotationItem | null {
  const rot = normalizeRotation(subject.rotation);
  if (!rot) return null;
  return rot.items[rot.index] ?? null;
}

/**
 * Item recém-estudado: como o ponteiro avança na conclusão, é o anterior
 * ao da vez. Útil no diálogo de anotações pós-matéria.
 */
export function rotationJustStudied(
  rotation: SubjectRotation,
): RotationItem | null {
  const len = rotation.items.length;
  if (len === 0) return null;
  return rotation.items[(rotation.index - 1 + len) % len] ?? null;
}

/** Atualiza a anotação de um item do rodízio (retorna o rotation novo). */
export function rotationWithItemNotes(
  rotation: SubjectRotation,
  itemId: string,
  notes: string,
): SubjectRotation {
  return {
    ...rotation,
    items: rotation.items.map((it) =>
      it.id === itemId ? { ...it, notes } : it,
    ),
  };
}

/** Avança o ponteiro do rodízio (volta ao início após o último). */
export function rotationAdvanced(rotation: SubjectRotation): SubjectRotation {
  if (rotation.items.length === 0) return rotation;
  return { ...rotation, index: (rotation.index + 1) % rotation.items.length };
}
