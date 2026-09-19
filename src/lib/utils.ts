import type {
  BlockType,
  RotationItem,
  Subject,
  SubjectRotation,
  SubjectStatus,
  SubjectResource,
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

export const BLOCK_COLOR_PALETTE: Record<
  string,
  { bg: string; accent: string; text: string; border: string }
> = {
  "#E2E8F0": { bg: "#F1F5F9", accent: "#64748B", text: "#0F172A", border: "#CBD5E1" },
  "#CCFBF1": { bg: "#F0FDFA", accent: "#0D9488", text: "#134E4A", border: "#99F6E4" },
  "#FEF3C7": { bg: "#FFFBEB", accent: "#D97706", text: "#78350F", border: "#FDE68A" },
  "#E7E5E4": { bg: "#F5F5F4", accent: "#78716C", text: "#1C1917", border: "#D6D3D1" },
  "#FBCFE8": { bg: "#FDF2F8", accent: "#DB2777", text: "#831843", border: "#FBCFE8" },
  "#DBEAFE": { bg: "#EFF6FF", accent: "#2563EB", text: "#1E3A8A", border: "#BFDBFE" },
  "#FEE2E2": { bg: "#FEF2F2", accent: "#E11D48", text: "#881337", border: "#FECDD3" },
  "#EDE9FE": { bg: "#F5F3FF", accent: "#7C3AED", text: "#4C1D95", border: "#DDD6FE" },
};

export function getBlockAccent(rawColor: string): string {
  const upper = (rawColor || "").toUpperCase();
  if (BLOCK_COLOR_PALETTE[upper]) return BLOCK_COLOR_PALETTE[upper].accent;
  return `color-mix(in srgb, ${rawColor || "#64748B"} 65%, black 35%)`;
}

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
  opts?: { muted?: boolean; pill?: boolean },
): {
  className: string;
  style?: {
    background: string;
    color: string;
    borderLeft?: string;
    border?: string;
  };
} {
  const raw = sanitizeCssColor(
    block.color,
    defaultBlockColor(block.type),
  );
  const upper = raw.toUpperCase();
  const palette = BLOCK_COLOR_PALETTE[upper];

  const bg = palette ? palette.bg : raw;
  const accent = palette ? palette.accent : `color-mix(in srgb, ${raw} 65%, black 35%)`;
  const text = palette ? palette.text : "#14201a";

  if (opts?.muted) {
    return {
      className: "",
      style: {
        background: `color-mix(in srgb, ${bg} 72%, var(--surface))`,
        color: "#525e57",
        ...(opts?.pill
          ? { border: `1px solid color-mix(in srgb, ${accent} 25%, transparent)` }
          : { borderLeft: `3px solid color-mix(in srgb, ${accent} 40%, transparent)` }),
      },
    };
  }

  if (opts?.pill) {
    return {
      className: "",
      style: {
        background: bg,
        color: text,
        border: `1px solid color-mix(in srgb, ${accent} 30%, transparent)`,
      },
    };
  }

  return {
    className: "",
    style: {
      background: bg,
      color: text,
      borderLeft: `3.5px solid ${accent}`,
    },
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

/**
 * Retorna a fila intercalada de matérias para o ciclo do dia considerando os pesos e o que já foi cumprido.
 * Cada matéria entra 'weight' vezes (padrão 1).
 * Na rodada r (1..maxWeight), entram as matérias com weight >= r que ainda têm cycle_done < r.
 * O primeiro item da lista resultante é a próxima matéria exata a ser estudada.
 */
export function buildWeightedCycleQueue<T extends Subject>(
  subjects: T[],
  day: number,
): T[] {
  const base = cycleSubjectsOnDay(subjects, day);
  if (base.length === 0) return [];

  const exclusive = isExclusiveCycleDay(subjects, day);
  const maxWeight = Math.max(
    ...base.map((s) => Math.max(1, s.weight ?? 1)),
    1,
  );

  const queue: T[] = [];
  for (let round = 1; round <= maxWeight; round++) {
    for (const s of base) {
      const w = Math.max(1, s.weight ?? 1);
      const done = Math.max(0, s.cycle_done ?? 0);
      const isDone = exclusive
        ? s.exclusive_status === "ok"
        : s.status === "ok" || done >= w;
      if (w >= round && (!isDone && done < round)) {
        queue.push(s);
      }
    }
  }

  return queue;
}

/**
 * Retorna o ciclo ponderado completo (todas as rodadas intercaladas).
 * Útil para looping contínuo no StudyFlowProvider.
 */
export function buildFullWeightedCycle<T extends Subject>(
  subjects: T[],
  day: number,
): T[] {
  const base = cycleSubjectsOnDay(subjects, day);
  if (base.length === 0) return [];

  const maxWeight = Math.max(
    ...base.map((s) => Math.max(1, s.weight ?? 1)),
    1,
  );

  const queue: T[] = [];
  for (let round = 1; round <= maxWeight; round++) {
    for (const s of base) {
      const w = Math.max(1, s.weight ?? 1);
      if (w >= round) {
        queue.push(s);
      }
    }
  }

  return queue;
}

/** Id da próxima matéria do ciclo de hoje (cabeça da fila intercalada). */
export function nextCycleSubjectId(
  subjects: Subject[],
  day: number,
): string | null {
  const queue = buildWeightedCycleQueue(subjects, day);
  return queue[0]?.id ?? null;
}

/** Lista matérias em pt-BR: "A", "A e B", "A, B e C". */
export function formatSubjectFocusList(names: string[]): string {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length === 0) return "";
  if (clean.length === 1) return clean[0];
  if (clean.length === 2) return `${clean[0]} e ${clean[1]}`;
  return `${clean.slice(0, -1).join(", ")} e ${clean[clean.length - 1]}`;
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
const RECURSOS_MAX_ITEMS = 30;

export function normalizeRecursos(raw: unknown): SubjectResource[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const valid = raw
    .filter(
      (r): r is Record<string, unknown> => Boolean(r) && typeof r === "object",
    )
    .map((r) => {
      const id = typeof r.id === "string" && r.id ? r.id.slice(0, 64) : `rec-${Math.random().toString(36).slice(2, 10)}`;
      const title = typeof r.title === "string" ? r.title.slice(0, 200).trim() : undefined;
      const url = typeof r.url === "string" ? r.url.slice(0, 2000).trim() : "";
      return { id, title: title || undefined, url };
    })
    .filter((r) => r.url.length > 0)
    .slice(0, RECURSOS_MAX_ITEMS);
  return valid.length > 0 ? valid : undefined;
}

export function ensureProtocolUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function getResourceDisplayTitle(res: SubjectResource): string {
  if (res.title) return res.title;
  try {
    const url = new URL(ensureProtocolUrl(res.url));
    let hostname = url.hostname.replace(/^www\./i, "");
    if (url.pathname && url.pathname !== "/") {
      hostname += url.pathname.slice(0, 15) + (url.pathname.length > 15 ? "…" : "");
    }
    return hostname;
  } catch {
    return res.url.slice(0, 30) + (res.url.length > 30 ? "…" : "");
  }
}

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
      recursos: normalizeRecursos(it.recursos),
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

/** Atualiza os recursos de um item do rodízio. */
export function rotationWithItemRecursos(
  rotation: SubjectRotation,
  itemId: string,
  recursos: SubjectResource[] | undefined,
): SubjectRotation {
  return {
    ...rotation,
    items: rotation.items.map((it) =>
      it.id === itemId ? { ...it, recursos } : it,
    ),
  };
}

/** Avança o ponteiro do rodízio (volta ao início após o último). */
export function rotationAdvanced(rotation: SubjectRotation): SubjectRotation {
  if (rotation.items.length === 0) return rotation;
  return { ...rotation, index: (rotation.index + 1) % rotation.items.length };
}

// ── Daily cycle reset ──────────────────────────────────────────────────────
const CYCLE_DATE_KEY = "foco_semanal_cycle_date";

/** Returns today's date as "YYYY-MM-DD" in local time. */
export function todayDateStr(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Resets every subject's status and cycle_done when a new calendar day starts.
 * Returns the (possibly mutated) subjects array and whether a reset occurred.
 */
export function resetDailyStatusIfNeeded<T extends Subject>(
  subjects: T[],
): { subjects: T[]; didReset: boolean } {
  if (typeof window === "undefined") return { subjects, didReset: false };

  const today = todayDateStr();
  const stored = localStorage.getItem(CYCLE_DATE_KEY);

  if (stored === today) return { subjects, didReset: false };

  // New day → reset all statuses
  const resetted = subjects.map((s) => ({
    ...s,
    status: "prox" as const,
    exclusive_status: "prox" as const,
    cycle_done: 0,
  }));

  localStorage.setItem(CYCLE_DATE_KEY, today);
  return { subjects: resetted as T[], didReset: true };
}

/** Stamp today's date so subsequent loads in the same day don't re-reset. */
export function stampCycleDate(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CYCLE_DATE_KEY, todayDateStr());
}
