import { todayIndex } from "@/lib/utils";

const FLOW_KEY = "foco_semanal_study_flow_v1";

export type StudyFlowPhase =
  | "idle"
  | "running"
  | "paused"
  | "subject_notes"
  | "block_done"
  | "resting"
  | "rest_done";

export type PersistedStudyFlow = {
  version: 1;
  phase: StudyFlowPhase;
  blockIds: string[];
  currentIndex: number;
  restEndsAt: number | null;
  /** Dia da semana (0=Seg…6=Dom) em que a sessão foi gravada. */
  day: number;
  /** Indica se o bloco em execução foi iniciado como Sessão Extra. */
  isExtraSession?: boolean;
  /** Indica se o bloco em execução foi iniciado como Modo Intensivo. */
  isIntensiveSession?: boolean;
  /** Ids das matérias sendo estudadas no Modo Intensivo. */
  intensiveSubjectIds?: string[];
  /** Id da matéria sendo estudada no Modo Intensivo (retrocompatibilidade). */
  intensiveSubjectId?: string | null;
  /** Duração em minutos escolhida para o Modo Intensivo. */
  intensiveDurationMinutes?: number;
  /** Segundos de foco contínuo acumulados sem descanso. */
  continuousFocusSeconds?: number;
  /** Indica se já alertou sobre fadiga cognitiva nesta sequência contínua. */
  hasWarnedContinuous?: boolean;
};

const PHASES: StudyFlowPhase[] = [
  "idle",
  "running",
  "paused",
  "subject_notes",
  "block_done",
  "resting",
  "rest_done",
];

function idleState(): PersistedStudyFlow {
  return {
    version: 1,
    phase: "idle",
    blockIds: [],
    currentIndex: 0,
    restEndsAt: null,
    day: todayIndex(),
    isExtraSession: false,
    isIntensiveSession: false,
    intensiveSubjectIds: [],
    intensiveSubjectId: null,
    intensiveDurationMinutes: undefined,
    continuousFocusSeconds: 0,
    hasWarnedContinuous: false,
  };
}

function safeGet(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(FLOW_KEY);
  } catch {
    return null;
  }
}

function safeSet(value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FLOW_KEY, value);
  } catch {
    /* ignore */
  }
}

export function readPersistedStudyFlow(): PersistedStudyFlow {
  try {
    const raw = safeGet();
    if (!raw) return idleState();
    const parsed = JSON.parse(raw) as Partial<PersistedStudyFlow>;
    const phase = parsed.phase ?? "idle";
    return {
      version: 1,
      phase: PHASES.includes(phase as StudyFlowPhase)
        ? (phase as StudyFlowPhase)
        : "idle",
      blockIds: Array.isArray(parsed.blockIds)
        ? parsed.blockIds.filter((id): id is string => typeof id === "string")
        : [],
      currentIndex:
        typeof parsed.currentIndex === "number" && parsed.currentIndex >= 0
          ? Math.floor(parsed.currentIndex)
          : 0,
      restEndsAt:
        typeof parsed.restEndsAt === "number" && parsed.restEndsAt > 0
          ? parsed.restEndsAt
          : null,
      day:
        typeof parsed.day === "number" && parsed.day >= 0 && parsed.day <= 6
          ? parsed.day
          : todayIndex(),
      isExtraSession: Boolean(parsed.isExtraSession),
      isIntensiveSession: Boolean(parsed.isIntensiveSession),
      intensiveSubjectIds: Array.isArray(parsed.intensiveSubjectIds)
        ? parsed.intensiveSubjectIds.filter((id): id is string => typeof id === "string")
        : typeof parsed.intensiveSubjectId === "string"
          ? [parsed.intensiveSubjectId]
          : [],
      intensiveSubjectId:
        typeof parsed.intensiveSubjectId === "string" ? parsed.intensiveSubjectId : null,
      intensiveDurationMinutes:
        typeof parsed.intensiveDurationMinutes === "number" && parsed.intensiveDurationMinutes > 0
          ? Math.floor(parsed.intensiveDurationMinutes)
          : undefined,
      continuousFocusSeconds:
        typeof parsed.continuousFocusSeconds === "number" && parsed.continuousFocusSeconds >= 0
          ? Math.floor(parsed.continuousFocusSeconds)
          : 0,
      hasWarnedContinuous: Boolean(parsed.hasWarnedContinuous),
    };
  } catch {
    return idleState();
  }
}

export function writePersistedStudyFlow(state: PersistedStudyFlow) {
  safeSet(JSON.stringify(state));
}

export function clearPersistedStudyFlow() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(FLOW_KEY);
  } catch {
    /* ignore */
  }
}
