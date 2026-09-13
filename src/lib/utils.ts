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

/** Fundo da linha/card de matéria Livre (no ciclo; cronômetro sem meta). */
export function freeRowClass(): string {
  return "bg-[var(--row-free)]";
}

/** Chip muted para matérias ainda na fila (não são a "Próxima" de verdade). */
export function queuePendingClass(): string {
  return "bg-transparent text-[color-mix(in_srgb,var(--ink)_48%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--ink)_12%,transparent)]";
}

export function queuePendingRowClass(): string {
  return "bg-[var(--surface)]";
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

/** Todas as matérias ativas marcadas como exclusivas neste dia. */
export function exclusiveSubjectsOnDay<
  T extends Pick<Subject, "id" | "active" | "exclusive_days" | "cycle_order">,
>(subjects: T[], day: number): T[] {
  return subjects
    .filter((s) => s.active && subjectExclusiveOnDay(s, day))
    .sort((a, b) => a.cycle_order - b.cycle_order);
}

/** @deprecated Prefira exclusiveSubjectsOnDay — mantido p/ 1ª do dia. */
export function exclusiveSubjectOnDay<
  T extends Pick<Subject, "id" | "active" | "exclusive_days" | "cycle_order">,
>(subjects: T[], day: number): T | null {
  return exclusiveSubjectsOnDay(subjects, day)[0] ?? null;
}

/** Com tempo ou Livre no modo exclusivo do dia. */
export function exclusiveCycleSubjectsOnDay<T extends Subject>(
  subjects: T[],
  day: number,
): T[] {
  return exclusiveSubjectsOnDay(subjects, day);
}

/** Mini-ciclo ativo: 2+ matérias no dia exclusivo. */
export function isExclusiveCycleDay(
  subjects: Subject[],
  day: number,
): boolean {
  return exclusiveCycleSubjectsOnDay(subjects, day).length >= 2;
}

/** Dia exclusivo com só 1 matéria (só anotações, sem status). */
export function isExclusiveSoloDay(
  subjects: Subject[],
  day: number,
): boolean {
  return exclusiveSubjectsOnDay(subjects, day).length === 1;
}

/**
 * Dia exclusivo solo → só anotações (sem Concluída/Próxima).
 * Livre permanente NÃO entra aqui: Livre participa do ciclo com status.
 */
export function subjectTreatAsFree(
  subject: Pick<Subject, "id" | "is_free" | "exclusive_days">,
  day: number,
  allSubjects: Subject[],
): boolean {
  if (!subjectExclusiveOnDay(subject, day)) return false;
  return !isExclusiveCycleDay(allSubjects, day);
}

/** Cronômetro que sobe: Livre ou dia exclusivo solo. */
export function subjectUsesStopwatch(
  subject: Pick<Subject, "id" | "is_free" | "exclusive_days">,
  day: number,
  allSubjects: Subject[],
): boolean {
  return Boolean(subject.is_free) || subjectTreatAsFree(subject, day, allSubjects);
}

/** Matérias visíveis no Hoje: dia exclusivo mostra só as exclusivas. */
export function subjectsOnDay<T extends Subject>(
  subjects: T[],
  day: number,
): T[] {
  const exclusives = exclusiveSubjectsOnDay(subjects, day);
  if (exclusives.length) return exclusives as T[];
  return subjects.filter(
    (s) =>
      s.active &&
      (subjectShowsOnDay(s, day) || subjectExclusiveOnDay(s, day)),
  );
}

/**
 * Fila Concluída/Próxima do dia (inclui Livre).
 * Dia exclusivo com 2+ → mini-ciclo. Solo exclusivo → vazia.
 */
export function cycleSubjectsOnDay<T extends Subject>(
  subjects: T[],
  day: number,
): T[] {
  const exclusiveTimed = exclusiveCycleSubjectsOnDay(subjects, day);
  if (exclusiveTimed.length >= 2) return exclusiveTimed as T[];
  if (exclusiveSubjectsOnDay(subjects, day).length > 0) return [];
  return [...subjects]
    .filter((s) => s.active && subjectShowsOnDay(s, day))
    .sort((a, b) => a.cycle_order - b.cycle_order);
}

function statusOnDay(s: Subject, day: number, all: Subject[]): SubjectStatus {
  if (isExclusiveCycleDay(all, day)) return s.exclusive_status ?? "prox";
  return s.status;
}

/** Id da próxima matéria do ciclo de hoje (1ª não Concluída). */
export function nextCycleSubjectId(
  subjects: Subject[],
  day: number,
): string | null {
  const next = cycleSubjectsOnDay(subjects, day).find(
    (s) => statusOnDay(s, day, subjects) !== "ok",
  );
  return next?.id ?? null;
}

/** Rótulo/estilo de status no Hoje: só a cabeça da fila é "Próxima". */
export function cycleStatusPresentation(
  status: SubjectStatus,
  isQueueHead: boolean,
): { label: string; chipClass: string; rowClass: string } {
  if (status === "ok") {
    return {
      label: "Concluída",
      chipClass: statusClass("ok"),
      rowClass: statusRowClass("ok"),
    };
  }
  if (isQueueHead) {
    return {
      label: "Próxima",
      chipClass: statusClass("prox"),
      rowClass: statusRowClass("prox"),
    };
  }
  return {
    label: "Na fila",
    chipClass: queuePendingClass(),
    rowClass: queuePendingRowClass(),
  };
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
