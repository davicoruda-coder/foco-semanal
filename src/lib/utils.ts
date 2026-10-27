import type {
  BlockType,
  ProgressTracker,
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

export interface BlockPaletteEntry {
  bg: string;
  accent: string;
  text: string;
  border: string;
  darkBg: string;
  darkAccent: string;
  darkText: string;
  darkBorder: string;
}

export const BLOCK_COLOR_PALETTE: Record<string, BlockPaletteEntry> = {
  "#E2E8F0": {
    bg: "#F1F5F9",
    accent: "#64748B",
    text: "#1E293B",
    border: "#CBD5E1",
    darkBg: "color-mix(in srgb, #64748B 20%, #15161e)",
    darkAccent: "#94A3B8",
    darkText: "#F1F5F9",
    darkBorder: "color-mix(in srgb, #94A3B8 28%, transparent)",
  },
  "#CCFBF1": {
    bg: "#F0FDFA",
    accent: "#0D9488",
    text: "#134E4A",
    border: "#99F6E4",
    darkBg: "color-mix(in srgb, #0D9488 22%, #15161e)",
    darkAccent: "#2DD4BF",
    darkText: "#CCFBF1",
    darkBorder: "color-mix(in srgb, #2DD4BF 30%, transparent)",
  },
  "#FEF3C7": {
    bg: "#FFFBEB",
    accent: "#D97706",
    text: "#78350F",
    border: "#FDE68A",
    darkBg: "color-mix(in srgb, #D97706 20%, #15161e)",
    darkAccent: "#FBBF24",
    darkText: "#FEF3C7",
    darkBorder: "color-mix(in srgb, #FBBF24 30%, transparent)",
  },
  "#E7E5E4": {
    bg: "#F5F5F4",
    accent: "#78716C",
    text: "#1C1917",
    border: "#D6D3D1",
    darkBg: "color-mix(in srgb, #78716C 20%, #15161e)",
    darkAccent: "#A8A29E",
    darkText: "#F5F5F4",
    darkBorder: "color-mix(in srgb, #A8A29E 28%, transparent)",
  },
  "#FBCFE8": {
    bg: "#FDF2F8",
    accent: "#DB2777",
    text: "#831843",
    border: "#FBCFE8",
    darkBg: "color-mix(in srgb, #DB2777 20%, #15161e)",
    darkAccent: "#F472B6",
    darkText: "#FCE7F3",
    darkBorder: "color-mix(in srgb, #F472B6 30%, transparent)",
  },
  "#DBEAFE": {
    bg: "#EFF6FF",
    accent: "#2563EB",
    text: "#1E3A8A",
    border: "#BFDBFE",
    darkBg: "color-mix(in srgb, #2563EB 22%, #15161e)",
    darkAccent: "#60A5FA",
    darkText: "#DBEAFE",
    darkBorder: "color-mix(in srgb, #60A5FA 30%, transparent)",
  },
  "#FEE2E2": {
    bg: "#FEF2F2",
    accent: "#E11D48",
    text: "#881337",
    border: "#FECDD3",
    darkBg: "color-mix(in srgb, #E11D48 20%, #15161e)",
    darkAccent: "#FB7185",
    darkText: "#FFE4E6",
    darkBorder: "color-mix(in srgb, #FB7185 30%, transparent)",
  },
  "#EDE9FE": {
    bg: "#F5F3FF",
    accent: "#7C3AED",
    text: "#4C1D95",
    border: "#DDD6FE",
    darkBg: "color-mix(in srgb, #7C3AED 22%, #15161e)",
    darkAccent: "#A78BFA",
    darkText: "#EDE9FE",
    darkBorder: "color-mix(in srgb, #A78BFA 30%, transparent)",
  },
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
  style: {
    background: string;
    color: string;
    borderLeft?: string;
    border?: string;
    [key: string]: string | undefined;
  };
} {
  const raw = sanitizeCssColor(
    block.color,
    defaultBlockColor(block.type),
  );
  const upper = raw.toUpperCase();
  const palette = BLOCK_COLOR_PALETTE[upper] || {
    bg: raw,
    accent: getBlockAccent(raw),
    text: "#1E293B",
    border: `color-mix(in srgb, ${raw} 80%, black 20%)`,
    darkBg: `color-mix(in srgb, ${getBlockAccent(raw)} 20%, #15161e)`,
    darkAccent: getBlockAccent(raw),
    darkText: "#F1F5F9",
    darkBorder: `color-mix(in srgb, ${getBlockAccent(raw)} 30%, transparent)`,
  };

  const isMuted = !!opts?.muted;
  const isPill = !!opts?.pill;

  let lightBg = palette.bg;
  let lightText = palette.text;
  let lightAccent = palette.accent;
  let lightBorder = palette.border;

  let darkBg = palette.darkBg;
  let darkText = palette.darkText;
  let darkAccent = palette.darkAccent;
  let darkBorder = palette.darkBorder;

  if (isMuted) {
    lightBg = `color-mix(in srgb, ${palette.bg} 68%, var(--surface))`;
    lightText = `color-mix(in srgb, ${palette.text} 75%, transparent)`;
    lightAccent = `color-mix(in srgb, ${palette.accent} 45%, transparent)`;
    lightBorder = `color-mix(in srgb, ${palette.border} 55%, transparent)`;

    darkBg = `color-mix(in srgb, ${palette.darkBg} 55%, var(--surface))`;
    darkText = `color-mix(in srgb, ${palette.darkText} 65%, transparent)`;
    darkAccent = `color-mix(in srgb, ${palette.darkAccent} 40%, transparent)`;
    darkBorder = `color-mix(in srgb, ${palette.darkBorder} 50%, transparent)`;
  }

  return {
    className: `agenda-block ${isMuted ? "agenda-block-muted" : "agenda-block-active"}${isPill ? " agenda-block-pill" : ""}`,
    style: {
      "--b-bg": lightBg,
      "--b-fg": lightText,
      "--b-accent": lightAccent,
      "--b-border": lightBorder,
      "--b-dark-bg": darkBg,
      "--b-dark-fg": darkText,
      "--b-dark-accent": darkAccent,
      "--b-dark-border": darkBorder,
      background: "var(--b-bg)",
      color: "var(--b-fg)",
      border: `1px solid var(--b-border)`,
      ...(isPill ? {} : { borderLeft: `3.5px solid var(--b-accent)` }),
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
      return "bg-transparent opacity-75 hover:opacity-100 transition-opacity";
    case "prox":
      // Destaque moderno para a matéria ativa: fundo sutil, borda leve e acento lateral
      return "bg-[var(--surface)] border border-[var(--line)] shadow-[0_2px_8px_-2px_color-mix(in_srgb,var(--ink)_8%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--ink)_2%,transparent)] border-l-[4px] border-l-[var(--signal)]";
  }
}

/** Fundo da linha/card de matéria Livre (no ciclo; cronômetro sem meta). */
export function freeRowClass(): string {
  return "bg-transparent border border-[color-mix(in_srgb,var(--signal)_15%,transparent)]";
}

/** Chip muted para matérias ainda na fila (não são a "Próxima" de verdade). */
export function queuePendingClass(): string {
  return "bg-transparent text-[color-mix(in_srgb,var(--ink)_48%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--ink)_12%,transparent)]";
}

export function queuePendingRowClass(): string {
  return "bg-transparent hover:bg-[color-mix(in_srgb,var(--ink)_2%,transparent)] transition-colors";
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
 * Verifica se a matéria concluiu todas as rodadas necessárias no ciclo de hoje.
 * Se tiver peso > 1, só é considerada concluída quando cycle_done >= weight.
 */
export function isSubjectDoneToday(
  s: Subject,
  exclusiveCycle: boolean = false,
): boolean {
  const w = Math.max(1, s.weight ?? 1);
  const done = Math.max(0, s.cycle_done ?? 0);
  if (w > 1) {
    return done >= w;
  }
  const st = exclusiveCycle ? (s.exclusive_status ?? "prox") : s.status;
  return st === "ok" || done >= 1;
}

/**
 * Intercala uma lista de matérias garantindo:
 * 1. Anti-adjacência estrita: se houver mais de uma matéria distinta, nunca coloca a mesma matéria consecutivamente.
 * 2. Espaçamento máximo para matérias com múltiplas passagens restantes (maior densidade).
 * 3. Estabilidade e respeito à ordem natural do ciclo (mantendo a matéria atual da vez no topo quando viável).
 */
export function interleaveWithAntiAdjacency<T extends Subject>(
  items: T[],
  initialAvoidId?: string | null,
): T[] {
  if (items.length <= 1) return items;

  const distinctIds = new Set(items.map((s) => s.id));
  if (distinctIds.size <= 1) return items;

  const itemMap = new Map<string, T>();
  const counts = new Map<string, number>();
  const firstSeenIndex = new Map<string, number>();

  items.forEach((item, idx) => {
    if (!itemMap.has(item.id)) {
      itemMap.set(item.id, item);
      firstSeenIndex.set(item.id, idx);
    }
    counts.set(item.id, (counts.get(item.id) ?? 0) + 1);
  });

  const result: T[] = [];
  let lastId: string | null = initialAvoidId ?? null;

  for (let step = 0; step < items.length; step++) {
    const remainingSlots = items.length - step;
    const available = Array.from(counts.entries()).filter(([, count]) => count > 0);
    if (available.length === 0) break;

    const nonAdjacent = available.filter(([id]) => id !== lastId);
    const candidatePool = nonAdjacent.length > 0 ? nonAdjacent : available;

    // Achar a frequência máxima entre os disponíveis
    const maxFreq = Math.max(...candidatePool.map(([, count]) => count));

    // Se alguém tiver frequência tão alta que precisa ser colocado AGORA para não colidir
    // (ex: precisa de mais de metade dos slots restantes: freq >= Math.ceil(remainingSlots / 2))
    const isUrgent = maxFreq >= Math.ceil(remainingSlots / 2);

    candidatePool.sort((a, b) => {
      // Se há urgência matemática para evitar colisões futuras, prioriza frequência máxima
      if (isUrgent && b[1] !== a[1]) {
        return b[1] - a[1];
      }
      // Se não há urgência, respeita a ordem natural de primeira aparição no ciclo
      const idxA = firstSeenIndex.get(a[0]) ?? 0;
      const idxB = firstSeenIndex.get(b[0]) ?? 0;
      if (idxA !== idxB) {
        return idxA - idxB;
      }
      return b[1] - a[1];
    });

    const chosenId = candidatePool[0][0];
    counts.set(chosenId, (counts.get(chosenId) ?? 1) - 1);
    const chosenItem = itemMap.get(chosenId);
    if (chosenItem) {
      result.push(chosenItem);
    }
    lastId = chosenId;
  }

  return result;
}

/**
 * Distribui as aparições de cada matéria uniformemente ao longo do ciclo,
 * respeitando anti-adjacência estrita (nunca a mesma matéria consecutiva).
 *
 * Usa posicionamento ideal com offset fracionário para garantir que matérias
 * com peso > 1 fiquem espaçadas entre as demais, em vez de acumuladas no final.
 *
 * Ex. com Proj(w=2), Py(w=2), Ing(w=1), Rev(w=1), Fac(w=1):
 * → Proj → Py → Ing → Proj → Rev → Py → Fac
 * (passadas extras distribuídas, nunca ping-pong no final)
 */
export function distributeUniformly<T extends Subject>(
  base: T[],
  initialAvoidId?: string | null,
): T[] {
  if (base.length === 0) return [];
  if (base.length === 1) {
    const s = base[0];
    const w = Math.min(10, Math.max(1, s.weight ?? 1));
    return Array(w).fill(s);
  }

  const totalSlots = base.reduce(
    (sum, s) => sum + Math.min(10, Math.max(1, s.weight ?? 1)),
    0,
  );
  if (totalSlots === 0) return [];

  const distinctIds = new Set(base.map((s) => s.id));
  if (distinctIds.size <= 1) {
    return Array(totalSlots).fill(base[0]);
  }

  // Estado de cada matéria: passadas restantes e posição ideal fracionária.
  // O offset inicial espalha os pontos de partida uniformemente ao longo do espaçamento,
  // garantindo que as aparições de diferentes matérias não colidam.
  const state = base.map((s, idx) => {
    const w = Math.min(10, Math.max(1, s.weight ?? 1));
    const spacing = totalSlots / w;
    return {
      subject: s,
      remaining: w,
      spacing,
      nextIdealPos: (idx / base.length) * spacing,
      orderIdx: idx,
    };
  });

  const result: T[] = [];
  let lastId: string | null = initialAvoidId ?? null;

  for (let pos = 0; pos < totalSlots; pos++) {
    const available = state.filter((s) => s.remaining > 0);
    if (available.length === 0) break;

    const nonAdj = available.filter((s) => s.subject.id !== lastId);
    const pool = nonAdj.length > 0 ? nonAdj : available;

    // Escolhe a matéria mais "atrasada" (overdue) em relação à sua posição ideal.
    // Matérias já atrasadas são priorizadas; entre as que não estão atrasadas, a que
    // tem a posição ideal mais próxima vem primeiro. Empate desfeito por ordem no ciclo.
    pool.sort((a, b) => {
      const overdueA = pos - a.nextIdealPos;
      const overdueB = pos - b.nextIdealPos;

      // Ambas atrasadas: a mais atrasada primeiro
      if (overdueA >= -0.001 && overdueB >= -0.001) {
        if (Math.abs(overdueA - overdueB) > 0.001) return overdueB - overdueA;
        return a.orderIdx - b.orderIdx;
      }
      // Uma atrasada e outra não: a atrasada primeiro
      if (overdueA >= -0.001) return -1;
      if (overdueB >= -0.001) return 1;
      // Nenhuma atrasada: a que tem ideal mais próximo primeiro
      if (Math.abs(a.nextIdealPos - b.nextIdealPos) > 0.001) {
        return a.nextIdealPos - b.nextIdealPos;
      }
      return a.orderIdx - b.orderIdx;
    });

    const chosen = pool[0];
    result.push(chosen.subject);
    chosen.remaining--;
    chosen.nextIdealPos += chosen.spacing;
    lastId = chosen.subject.id;
  }

  return result;
}

/**
 * Constrói uma sequência ponderada com distribuição uniforme e anti-adjacência rigorosa.
 *
 * Princípios Fundamentais (Método de Ciclo de Estudos & Neurociência):
 * 1. Distribuição Uniforme: Passadas extras de matérias com peso > 1 são distribuídas
 *    uniformemente entre as demais matérias, garantindo intercalação ampla e contínua.
 *    Nenhuma matéria pesada fica acumulada no final do ciclo.
 * 2. Anti-Adjacência Estrita: Matérias iguais nunca são colocadas consecutivamente.
 * 3. Fila Restante Inteligente: Calcula as passadas pendentes (weight - cycle_done) e
 *    redistribui uniformemente, mantendo anti-adjacência com a última matéria concluída.
 */
export function buildInterleavedWeightedSequence<T extends Subject>(
  base: T[],
  opts: {
    remainingOnly?: boolean;
    exclusive?: boolean;
  } = {},
): T[] {
  if (base.length === 0) return [];
  if (base.length === 1) {
    const s = base[0];
    const w = Math.max(1, s.weight ?? 1);
    const cd = Math.max(0, s.cycle_done ?? 0);
    const isDone = isSubjectDoneToday(s, opts.exclusive);
    const remainingPasses = isDone ? 0 : Math.max(0, w - cd);
    const count = opts.remainingOnly ? remainingPasses : w;
    return Array(count).fill(s);
  }

  const lastCompletedId = readLastCycleCompletedSubjectId();

  if (!opts.remainingOnly) {
    return distributeUniformly(base, lastCompletedId);
  }

  // Sequência completa distribuída idealmente
  const fullSequence = distributeUniformly(base, lastCompletedId);

  // Para a fila restante: consome as passadas já cumpridas diretamente da sequência ideal
  const doneCounts = new Map<string, number>();
  for (const s of base) {
    const isDone = isSubjectDoneToday(s, opts.exclusive);
    const w = Math.max(1, s.weight ?? 1);
    const cd = Math.max(0, s.cycle_done ?? 0);
    const done = isDone ? w : Math.min(w, cd);
    doneCounts.set(s.id, done);
  }

  const remaining: T[] = [];
  for (const item of fullSequence) {
    const done = doneCounts.get(item.id) ?? 0;
    if (done > 0) {
      doneCounts.set(item.id, done - 1);
    } else {
      remaining.push(item);
    }
  }

  // Cool-down na fila restante: se a cabeça da fila restante for idêntica à matéria
  // recém-concluída e houver alternativas, move a primeira alternativa para o topo
  if (remaining.length > 1 && remaining[0].id === lastCompletedId) {
    const diffIdx = remaining.findIndex((s) => s.id !== lastCompletedId);
    if (diffIdx > 0) {
      const alt = remaining.splice(diffIdx, 1)[0];
      remaining.unshift(alt);
    }
  }

  return remaining;
}

/**
 * Retorna a fila intercalada de matérias para o ciclo do dia considerando os pesos e o que já foi cumprido.
 * Cada matéria entra 'weight' vezes (padrão 1).
 * As matérias são intercaladas uniformemente, prevenindo repetições consecutivas.
 * O primeiro item da lista resultante é a próxima matéria exata a ser estudada.
 */
export function buildWeightedCycleQueue<T extends Subject>(
  subjects: T[],
  day: number,
): T[] {
  const rawBase = cycleSubjectsOnDay(subjects, day);
  if (rawBase.length === 0) return [];
  const base = rotateCycleBase(rawBase);
  const exclusive = isExclusiveCycleDay(subjects, day);

  return buildInterleavedWeightedSequence(base, {
    remainingOnly: true,
    exclusive,
  });
}

/**
 * Retorna o ciclo ponderado completo (todas as rodadas intercaladas).
 * Útil para looping contínuo no StudyFlowProvider.
 */
export function buildFullWeightedCycle<T extends Subject>(
  subjects: T[],
  day: number,
): T[] {
  const rawBase = cycleSubjectsOnDay(subjects, day);
  if (rawBase.length === 0) return [];
  const base = rotateCycleBase(rawBase);

  return buildInterleavedWeightedSequence(base, {
    remainingOnly: false,
  });
}

/** Id da próxima matéria do ciclo de hoje (cabeça da fila intercalada). */
export function nextCycleSubjectId(
  subjects: Subject[],
  day: number,
): string | null {
  const queue = buildWeightedCycleQueue(subjects, day);
  if (queue[0]) return queue[0].id;
  const full = buildFullWeightedCycle(subjects, day);
  return full[0]?.id ?? null;
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
      progress: normalizeProgress(it.progress),
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
 * Trata o ciclo na virada do dia:
 * - Se o ciclo já estava 100% concluído para as matérias ativas, reseta os status para iniciar uma nova rodada limpa.
 * - Se o ciclo estiver em andamento (matérias pendentes), preserva os status e cycle_done
 *   para manter o ciclo contínuo entre dias (não joga o estudante de volta ao início).
 */
export function resetDailyStatusIfNeeded<T extends Subject>(
  subjects: T[],
): { subjects: T[]; didReset: boolean } {
  if (typeof window === "undefined") return { subjects, didReset: false };

  const today = todayDateStr();
  const stored = localStorage.getItem(CYCLE_DATE_KEY);

  if (stored === today) return { subjects, didReset: false };

  localStorage.setItem(CYCLE_DATE_KEY, today);

  const activeSubjects = subjects.filter((s) => s.active);
  const allDone =
    activeSubjects.length > 0 &&
    activeSubjects.every((s) => isSubjectDoneToday(s));

  if (allDone) {
    const resetted = subjects.map((s) => ({
      ...s,
      status: "prox" as const,
      exclusive_status: "prox" as const,
      cycle_done: 0,
    }));
    localStorage.removeItem(CYCLE_ROUNDS_KEY);
    return { subjects: resetted as T[], didReset: true };
  }

  return { subjects, didReset: false };
}

const CYCLE_ROUNDS_KEY = "foco_semanal_cycle_rounds_v1";

interface CycleRoundsStored {
  date: string;
  rounds: number;
  lastCompletedId?: string | null;
}

export function readCycleRoundsToday(): number {
  if (typeof window === "undefined") return 0;
  try {
    const raw = localStorage.getItem(CYCLE_ROUNDS_KEY);
    if (!raw) return 0;
    const parsed: CycleRoundsStored = JSON.parse(raw);
    if (parsed.date !== todayDateStr()) return 0;
    return Number(parsed.rounds) || 0;
  } catch {
    return 0;
  }
}

export function readLastCycleCompletedSubjectId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CYCLE_ROUNDS_KEY);
    if (!raw) return null;
    const parsed: CycleRoundsStored = JSON.parse(raw);
    if (parsed.date !== todayDateStr()) return null;
    return typeof parsed.lastCompletedId === "string" ? parsed.lastCompletedId : null;
  } catch {
    return null;
  }
}

export function clearLastCycleCompletedSubjectId(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localStorage.getItem(CYCLE_ROUNDS_KEY);
    if (!raw) return;
    const parsed: CycleRoundsStored = JSON.parse(raw);
    if (parsed.date !== todayDateStr()) return;
    localStorage.setItem(
      CYCLE_ROUNDS_KEY,
      JSON.stringify({ ...parsed, lastCompletedId: null }),
    );
  } catch {
    // no-op
  }
}

/**
 * Se uma rodada do ciclo foi concluída e há registro da matéria que a finalizou,
 * rotaciona a lista base para começar na matéria seguinte da roda,
 * garantindo que a mesma matéria nunca seja repetida no início da nova rodada.
 */
export function rotateCycleBase<T extends Subject>(base: T[]): T[] {
  if (base.length <= 1) return base;
  const lastId = readLastCycleCompletedSubjectId();
  if (!lastId) return base;
  const idx = base.findIndex((s) => s.id === lastId);
  if (idx < 0) return base;
  const nextStart = (idx + 1) % base.length;
  if (nextStart === 0) return base;
  return [...base.slice(nextStart), ...base.slice(0, nextStart)];
}

export function incrementCycleRoundsToday(lastCompletedSubjectId?: string): number {
  if (typeof window === "undefined") return 1;
  try {
    const current = readCycleRoundsToday();
    const next = current + 1;
    localStorage.setItem(
      CYCLE_ROUNDS_KEY,
      JSON.stringify({
        date: todayDateStr(),
        rounds: next,
        lastCompletedId: lastCompletedSubjectId ?? null,
      }),
    );
    return next;
  } catch {
    return 1;
  }
}

/** Stamp today's date so subsequent loads in the same day don't re-reset. */
export function stampCycleDate(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(CYCLE_DATE_KEY, todayDateStr());
}

export interface CycleRoundProgress {
  currentRound: number;
  completedRoundsToday: number;
  totalPasses: number;
  donePasses: number;
  percent: number;
  isComplete: boolean;
}

/**
 * Calcula o progresso exato da rodada atual do ciclo para feedback visual.
 */
export function getCycleRoundProgress(
  subjects: Subject[],
  day: number,
): CycleRoundProgress {
  const active = cycleSubjectsOnDay(subjects, day);
  const exclusive = isExclusiveCycleDay(subjects, day);
  const totalPasses = active.reduce(
    (sum, s) => sum + Math.max(1, s.weight ?? 1),
    0,
  );
  const donePasses = active.reduce((sum, s) => {
    const w = Math.max(1, s.weight ?? 1);
    if (isSubjectDoneToday(s, exclusive)) return sum + w;
    const cd = Math.min(w, Math.max(0, s.cycle_done ?? 0));
    return sum + cd;
  }, 0);

  const completedRoundsToday = readCycleRoundsToday();
  const percent =
    totalPasses > 0
      ? Math.min(100, Math.round((donePasses / totalPasses) * 100))
      : 0;
  const isComplete = totalPasses > 0 && donePasses >= totalPasses;

  return {
    currentRound: completedRoundsToday + 1,
    completedRoundsToday,
    totalPasses,
    donePasses,
    percent,
    isComplete,
  };
}

// ---------------------------------------------------------------------------
// Progress tracking
// ---------------------------------------------------------------------------

/** Labels pré-definidos para unidades de progresso. */
export const PROGRESS_UNIT_LABELS = [
  "Vídeo",
  "Módulo",
  "Aula",
  "PDF",
  "Página",
  "Capítulo",
  "Exercício",
] as const;

/** Valida/normaliza um ProgressTracker vindo de storage/nuvem/backup. */
export function normalizeProgress(raw: unknown): ProgressTracker | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const obj = raw as Record<string, unknown>;
  const unit_label =
    typeof obj.unit_label === "string" && obj.unit_label.trim()
      ? obj.unit_label.trim().slice(0, 30)
      : "Vídeo";
  const total = Number(obj.total);
  const current = Number(obj.current);
  if (!Number.isFinite(total) || total < 1) return undefined;
  return {
    unit_label,
    total: Math.floor(Math.min(total, 99999)),
    current: Number.isFinite(current)
      ? Math.max(0, Math.min(Math.floor(current), Math.floor(total)))
      : 0,
    auto_detect: Boolean(obj.auto_detect),
    auto_prefix:
      typeof obj.auto_prefix === "string"
        ? obj.auto_prefix.trim().slice(0, 20).toLowerCase()
        : "",
  };
}

/**
 * Extrai o maior número com o prefixo dado de uma string de anotações.
 * Ex.: parseProgressFromNotes("v15 exercícios v12", "v") → 15
 */
export function parseProgressFromNotes(
  notes: string,
  prefix: string,
): number | null {
  if (!prefix || !notes) return null;
  // Escape regex special chars no prefixo
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`(?:^|[^a-záàâãéêíóôõúüç])${escaped}[\\s.:-]?(\\d+)`, "gi");
  let max: number | null = null;
  let match: RegExpExecArray | null;
  while ((match = re.exec(notes)) !== null) {
    const n = Number.parseInt(match[1], 10);
    if (max === null || n > max) max = n;
  }
  return max;
}

/** Percentual de progresso (0–100). */
export function progressPercent(p: ProgressTracker): number {
  if (p.total <= 0) return 0;
  return Math.min(100, Math.round((p.current / p.total) * 100));
}
