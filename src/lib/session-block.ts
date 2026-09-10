import type { Subject } from "@/lib/types";

export type BlockRangeSettings = {
  /** Meta do bloco (minutos). */
  targetMinutes: number;
  /** Mínimo aceitável do bloco. */
  minMinutes: number;
  /** Máximo aceitável do bloco. */
  maxMinutes: number;
  /** Descanso após o bloco (minutos). */
  restMinutes: number;
};

export const DEFAULT_BLOCK_RANGE: BlockRangeSettings = {
  targetMinutes: 40,
  minMinutes: 35,
  maxMinutes: 50,
  restMinutes: 20,
};

const RANGE_KEY = "foco_semanal_block_range_v1";

export function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.floor(n)));
}

export function readBlockRange(
  focusMinutes?: number,
  restMinutes?: number,
): BlockRangeSettings {
  const base = { ...DEFAULT_BLOCK_RANGE };
  if (typeof focusMinutes === "number") {
    base.targetMinutes = clampInt(focusMinutes, 15, 180);
  }
  if (typeof restMinutes === "number") {
    base.restMinutes = clampInt(restMinutes, 1, 60);
  }
  if (typeof window === "undefined") return base;
  try {
    const raw = localStorage.getItem(RANGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<BlockRangeSettings>;
    const min = clampInt(parsed.minMinutes ?? base.minMinutes, 10, 120);
    const max = clampInt(parsed.maxMinutes ?? base.maxMinutes, min, 180);
    return {
      targetMinutes: clampInt(
        parsed.targetMinutes ?? base.targetMinutes,
        min,
        max,
      ),
      minMinutes: min,
      maxMinutes: max,
      restMinutes: clampInt(
        parsed.restMinutes ?? base.restMinutes,
        1,
        60,
      ),
    };
  } catch {
    return base;
  }
}

export function writeBlockRange(settings: BlockRangeSettings) {
  if (typeof window === "undefined") return;
  const min = clampInt(settings.minMinutes, 10, 120);
  const max = clampInt(settings.maxMinutes, min, 180);
  const next: BlockRangeSettings = {
    minMinutes: min,
    maxMinutes: max,
    targetMinutes: clampInt(settings.targetMinutes, min, max),
    restMinutes: clampInt(settings.restMinutes, 1, 60),
  };
  try {
    localStorage.setItem(RANGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

/** Minutos efetivos da matéria (mín. 1). */
export function subjectMinutes(s: Pick<Subject, "study_minutes">) {
  return Math.max(1, Math.floor(s.study_minutes ?? 25));
}

/**
 * Agrupa as próximas matérias da fila até caber na faixa min–max,
 * preferindo parar perto da meta. Sempre inclui ao menos uma.
 * Matéria sozinha maior que o máximo entra sozinha.
 */
export function packStudyBlock(
  queue: Subject[],
  minMinutes: number,
  maxMinutes: number,
  targetMinutes: number,
): Subject[] {
  if (queue.length === 0) return [];

  const pack: Subject[] = [];
  let sum = 0;

  for (const s of queue) {
    const m = subjectMinutes(s);
    if (pack.length === 0) {
      pack.push(s);
      sum = m;
      if (sum >= minMinutes) break;
      continue;
    }
    if (sum + m > maxMinutes) break;
    pack.push(s);
    sum += m;
    if (sum >= targetMinutes) break;
  }

  return pack;
}

export function blockTotalMinutes(subjects: Subject[]) {
  return subjects.reduce((acc, s) => acc + subjectMinutes(s), 0);
}

export function formatBlockSummary(subjects: Subject[]) {
  if (subjects.length === 0) return "Nenhuma matéria na fila";
  const names = subjects.map((s) => s.name);
  const label =
    names.length <= 2
      ? names.join(" + ")
      : `${names[0]} + ${names[1]} +${names.length - 2}`;
  const total = blockTotalMinutes(subjects);
  return `${label} · ~${total} min`;
}
