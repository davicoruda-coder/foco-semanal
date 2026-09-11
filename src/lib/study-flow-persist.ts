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
