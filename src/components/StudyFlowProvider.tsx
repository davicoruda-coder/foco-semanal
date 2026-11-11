"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useApp } from "@/components/AppProvider";
import { useTimerRuntime } from "@/components/TimerRuntimeProvider";
import {
  notify,
  playAlarmTone,
  playCycleEndTone,
  playSessionEndTone,
  playSessionStartTone,
  playTransitionTone,
} from "@/lib/audio";
import {
  blockTotalMinutes,
  formatBlockSummary,
  packStudyBlock,
  readBlockRange,
  subjectMinutes,
  writeBlockRange,
  type BlockRangeSettings,
} from "@/lib/session-block";
import { SUBJECT_COMPLETE_EVENT, CYCLE_COMPLETE_EVENT } from "@/lib/study-flow-events";
import {
  clearPersistedStudyFlow,
  readPersistedStudyFlow,
  writePersistedStudyFlow,
  type StudyFlowPhase,
} from "@/lib/study-flow-persist";
import { claimTimerCompletion } from "@/lib/tab-sync";
import type { Subject } from "@/lib/types";
import {
  buildGlobalCycleQueue,
  buildLoopedCycleQueue,
  buildFullWeightedCycle,
  buildWeightedCycleQueue,
  cycleSubjectsOnDay,
  isExclusiveCycleDay,
  isExclusiveSoloDay,
  isSubjectDoneToday,
  recordLastCycleCompletedSubjectId,
  todayIndex,
} from "@/lib/utils";

export type { StudyFlowPhase };
type StudyFlowContextValue = {
  phase: StudyFlowPhase;
  block: Subject[];
  blockSummary: string;
  previewBlock: Subject[];
  previewSummary: string;
  advanceCyclePreview: Subject[];
  advanceCycleSummary: string;
  currentSubjectId: string | null;
  /** Índice da matéria atual no bloco (útil em subject_notes). */
  currentIndex: number;
  restSecondsLeft: number;
  settings: BlockRangeSettings;
  refreshSettings: () => void;
  saveSettings: (next: BlockRangeSettings) => void;
  canStart: boolean;
  canAdvanceCycle: boolean;
  /** Indica se a sessão atual em execução é um ciclo adiantado em dia sem grade. */
  isExtraSession: boolean;
  /** Indica se a sessão atual em execução é Modo Intensivo. */
  isIntensiveSession: boolean;
  intensiveSubjectIds: string[];
  intensiveSubjectId: string | null;
  intensiveDurationMinutes?: number;
  /** Modal de Modo Intensivo aberto? */
  isIntensiveModalOpen: boolean;
  openIntensiveModal: () => void;
  closeIntensiveModal: () => void;
  /** Inicia Modo Intensivo para 1 ou mais matérias com duração total dividida igualmente. */
  startIntensiveSession: (subjectIds: string | string[], durationMinutes: number) => void;
  /** Encerra o Modo Intensivo, marca no ciclo e avança para a próxima matéria. */
  finishIntensiveMode: () => void;
  /** Alerta de fadiga mental / limite contínuo atingido. */
  continuousFocusMinutes: number;
  showContinuousFocusAlert: boolean;
  dismissContinuousFocusAlert: () => void;
  /** Todo o ciclo de hoje foi concluído (todas as matérias estão Ok) */
  cycleCompleted: boolean;
  /** Número da volta que acabou de ser concluída (ex: 1, 2) para aviso comemorativo */
  cycleRoundCompleted: number | null;
  sessionActive: boolean;
  /** Play individual permitido? (sessão ativa → só a matéria atual) */
  allowSubjectPlay: (subjectId: string) => boolean;
  startSession: () => void;
  /** Adianta o ciclo global em dias sem matérias agendadas na grade semanal. */
  startAdvanceCycleSession: () => void;
  pauseSession: () => void;
  resumeSession: () => void;
  /** Zera o bloco atual e recomeça do início. */
  resetSession: () => void;
  chooseRest: () => void;
  chooseContinue: () => void;
  chooseFinish: () => void;
  /** Após anotar a matéria do meio do bloco, segue para a próxima. */
  continueToNextSubject: () => void;
  endRestEarly: () => void;
  dismissRestDone: () => void;
  /** Matéria na sessão: marca Concluída (manual) e avança. */
  completeCurrentSubjectEarly: () => void;
  /** Estende o tempo da matéria atual da sessão (ex: +2 min, +5 min) e retoma. */
  extendCurrentSubject: (extraMinutes: number) => void;
};

const StudyFlowContext = createContext<StudyFlowContextValue | null>(null);

function todayQueue(subjects: Subject[]): Subject[] {
  const day = todayIndex();
  const remaining = buildWeightedCycleQueue(subjects, day);
  const fullCycle = buildFullWeightedCycle(subjects, day);
  return buildLoopedCycleQueue(remaining, fullCycle);
}

export function StudyFlowProvider({ children }: { children: ReactNode }) {
  const {
    data,
    updateSettings,
    setSubjectStatus,
    addStudySession,
    reopenSubjectForExtraTime,
    resetCycleToday,
    ready: appReady,
  } = useApp();
  const {
    toggleSubjectTimer,
    resetSubjectTimer,
    addSubjectTimerSeconds,
    runtime,
    subjectTimerKey,
    subjectStopwatches,
    clocksReady,
  } = useTimerRuntime();

  const isClockRunning = useCallback(
    (subjectId: string, isFree: boolean) => {
      if (isFree) return Boolean(subjectStopwatches[subjectId]?.running);
      return Boolean(runtime[subjectTimerKey(subjectId)]?.running);
    },
    [runtime, subjectStopwatches, subjectTimerKey],
  );

  const [settings, setSettings] = useState<BlockRangeSettings>(() =>
    readBlockRange(
      data.session_settings?.focus_minutes,
      data.session_settings?.break_long_minutes,
    ),
  );
  const [phase, setPhase] = useState<StudyFlowPhase>("idle");
  const [block, setBlock] = useState<Subject[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [restEndsAt, setRestEndsAt] = useState<number | null>(null);
  const [cycleRoundCompleted, setCycleRoundCompleted] = useState<number | null>(null);
  const [isExtraSession, setIsExtraSession] = useState<boolean>(() => {
    const saved = readPersistedStudyFlow();
    return Boolean(saved.isExtraSession);
  });
  const [isIntensiveSession, setIsIntensiveSession] = useState<boolean>(() => {
    const saved = readPersistedStudyFlow();
    return Boolean(saved.isIntensiveSession);
  });
  const [intensiveSubjectIds, setIntensiveSubjectIds] = useState<string[]>(() => {
    const saved = readPersistedStudyFlow();
    return saved.intensiveSubjectIds && saved.intensiveSubjectIds.length > 0
      ? saved.intensiveSubjectIds
      : saved.intensiveSubjectId
        ? [saved.intensiveSubjectId]
        : [];
  });
  const [intensiveSubjectId, setIntensiveSubjectId] = useState<string | null>(() => {
    const saved = readPersistedStudyFlow();
    return saved.intensiveSubjectId ?? null;
  });
  const [intensiveDurationMinutes, setIntensiveDurationMinutes] = useState<number | undefined>(() => {
    const saved = readPersistedStudyFlow();
    return saved.intensiveDurationMinutes;
  });
  const [continuousFocusSeconds, setContinuousFocusSeconds] = useState<number>(() => {
    const saved = readPersistedStudyFlow();
    return saved.continuousFocusSeconds ?? 0;
  });
  const [hasWarnedContinuous, setHasWarnedContinuous] = useState<boolean>(() => {
    const saved = readPersistedStudyFlow();
    return Boolean(saved.hasWarnedContinuous);
  });
  const [showContinuousFocusAlert, setShowContinuousFocusAlert] = useState<boolean>(false);
  const dismissContinuousFocusAlert = useCallback(() => {
    setShowContinuousFocusAlert(false);
    setHasWarnedContinuous(true);
  }, []);

  const [isIntensiveModalOpen, setIsIntensiveModalOpen] = useState(false);
  const openIntensiveModal = useCallback(() => setIsIntensiveModalOpen(true), []);
  const closeIntensiveModal = useCallback(() => setIsIntensiveModalOpen(false), []);
  const [hydrated, setHydrated] = useState(false);
  const [, setTick] = useState(0);

  const phaseRef = useRef(phase);
  const blockRef = useRef(block);
  const indexRef = useRef(currentIndex);
  const advancingRef = useRef(false);
  const resumeAfterHydrateRef = useRef(false);
  phaseRef.current = phase;
  blockRef.current = block;
  indexRef.current = currentIndex;

  // Monitora o foco contínuo e alerta sobre fadiga cognitiva (Ciclo Ultradiano de 90 min)
  useEffect(() => {
    if (phase !== "running") return;
    const interval = window.setInterval(() => {
      setContinuousFocusSeconds((prev) => {
        const next = prev + 1;
        const maxMins = settings.maxContinuousMinutes ?? 90;
        if (maxMins > 0 && next >= maxMins * 60 && !hasWarnedContinuous) {
          setShowContinuousFocusAlert(true);
          setHasWarnedContinuous(true);
        }
        return next;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [phase, settings.maxContinuousMinutes, hasWarnedContinuous]);

  // Restaura sessão/descanso após F5 (timers das matérias já estão no localStorage).
  useEffect(() => {
    if (!appReady || hydrated) return;

    const saved = readPersistedStudyFlow();
    const day = todayIndex();

    if (saved.day !== day || saved.phase === "idle") {
      clearPersistedStudyFlow();
      setHydrated(true);
      return;
    }

    if (saved.phase === "resting" || saved.phase === "rest_done") {
      if (
        saved.phase === "resting" &&
        saved.restEndsAt != null &&
        Date.now() >= saved.restEndsAt
      ) {
        setPhase("rest_done");
        setRestEndsAt(null);
      } else {
        setPhase(saved.phase);
        setRestEndsAt(saved.restEndsAt);
      }
      setBlock([]);
      setCurrentIndex(0);
      setContinuousFocusSeconds(0);
      setHasWarnedContinuous(false);
      setHydrated(true);
      return;
    }

    const subjects = data.subjects ?? [];
    const restored = saved.blockIds
      .map((id) => subjects.find((s) => s.id === id))
      .filter((s): s is Subject => Boolean(s));

    if (
      restored.length === 0 &&
      (saved.phase === "running" ||
        saved.phase === "paused" ||
        saved.phase === "subject_notes" ||
        saved.phase === "block_done")
    ) {
      clearPersistedStudyFlow();
      setHydrated(true);
      return;
    }

    const idx = Math.min(
      saved.currentIndex,
      Math.max(0, restored.length - 1),
    );
    setBlock(restored);
    setCurrentIndex(idx);
    setPhase(saved.phase);
    setRestEndsAt(null);
    setIsExtraSession(Boolean(saved.isExtraSession));
    setIsIntensiveSession(Boolean(saved.isIntensiveSession));
    setIntensiveSubjectIds(
      saved.intensiveSubjectIds && saved.intensiveSubjectIds.length > 0
        ? saved.intensiveSubjectIds
        : saved.intensiveSubjectId
          ? [saved.intensiveSubjectId]
          : [],
    );
    setIntensiveSubjectId(saved.intensiveSubjectId ?? null);
    setIntensiveDurationMinutes(saved.intensiveDurationMinutes);
    setContinuousFocusSeconds(saved.continuousFocusSeconds ?? 0);
    setHasWarnedContinuous(Boolean(saved.hasWarnedContinuous));
    if (saved.phase === "running") {
      resumeAfterHydrateRef.current = true;
    }
    setHydrated(true);
  }, [appReady, hydrated, data.subjects]);

  // Se estava em play, retoma o timer da matéria atual sem zerar.
  useEffect(() => {
    if (!hydrated || !clocksReady || !resumeAfterHydrateRef.current) return;
    resumeAfterHydrateRef.current = false;
    const id = blockRef.current[indexRef.current]?.id;
    if (!id) return;
    const key = subjectTimerKey(id);
    if (!runtime[key]?.running) {
      window.setTimeout(() => toggleSubjectTimer(id), 80);
    }
  }, [hydrated, clocksReady, runtime, subjectTimerKey, toggleSubjectTimer]);

  // Persiste andamento.
  useEffect(() => {
    if (!hydrated) return;
    if (phase === "idle") {
      clearPersistedStudyFlow();
      return;
    }
    writePersistedStudyFlow({
      version: 1,
      phase,
      blockIds: block.map((s) => s.id),
      currentIndex,
      restEndsAt,
      day: todayIndex(),
      isExtraSession,
      isIntensiveSession,
      intensiveSubjectIds,
      intensiveSubjectId,
      intensiveDurationMinutes,
      continuousFocusSeconds,
      hasWarnedContinuous,
    });
  }, [
    hydrated,
    phase,
    block,
    currentIndex,
    restEndsAt,
    isExtraSession,
    isIntensiveSession,
    intensiveSubjectIds,
    intensiveSubjectId,
    intensiveDurationMinutes,
    continuousFocusSeconds,
    hasWarnedContinuous,
  ]);

  const refreshSettings = useCallback(() => {
    setSettings(
      readBlockRange(
        data.session_settings?.focus_minutes,
        data.session_settings?.break_long_minutes,
        data.session_settings?.max_continuous_minutes,
      ),
    );
  }, [
    data.session_settings?.focus_minutes,
    data.session_settings?.break_long_minutes,
    data.session_settings?.max_continuous_minutes,
  ]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const saveSettings = useCallback(
    (next: BlockRangeSettings) => {
      const saved = writeBlockRange(next) ?? next;
      setSettings(saved);
      updateSettings({
        focus_minutes: saved.targetMinutes,
        break_long_minutes: saved.restMinutes,
        max_continuous_minutes: saved.maxContinuousMinutes,
      });
    },
    [updateSettings],
  );

  const previewBlock = useMemo(() => {
    const queue = todayQueue(data.subjects ?? []);
    return packStudyBlock(
      queue,
      settings.minMinutes,
      settings.maxMinutes,
      settings.targetMinutes,
    );
  }, [data.subjects, settings]);

  const previewSummary = useMemo(
    () => formatBlockSummary(previewBlock),
    [previewBlock],
  );

  const blockSummary = useMemo(() => formatBlockSummary(block), [block]);

  const currentSubjectId =
    phase === "running" || phase === "paused"
      ? (block[currentIndex]?.id ?? null)
      : null;

  const sessionActive =
    phase === "running" ||
    phase === "paused" ||
    phase === "subject_notes" ||
    phase === "block_done" ||
    phase === "resting" ||
    phase === "rest_done";

  const cycleCompleted = useMemo(() => {
    const day = todayIndex();
    const cycleSubs = cycleSubjectsOnDay(data.subjects ?? [], day);
    const remaining = buildWeightedCycleQueue(data.subjects ?? [], day);
    return cycleSubs.length > 0 && remaining.length === 0;
  }, [data.subjects]);

  const canStart = (previewBlock.length > 0 || cycleCompleted) && !sessionActive;

  const advanceCyclePreview = useMemo(() => {
    if (canStart || sessionActive) return [];
    const day = todayIndex();
    if (isExclusiveSoloDay(data.subjects ?? [], day)) return [];
    if (cycleSubjectsOnDay(data.subjects ?? [], day).length > 0) return [];
    const queue = buildGlobalCycleQueue(data.subjects ?? []);
    return packStudyBlock(
      queue,
      settings.minMinutes,
      settings.maxMinutes,
      settings.targetMinutes,
    );
  }, [canStart, sessionActive, data.subjects, settings]);

  const advanceCycleSummary = useMemo(
    () => formatBlockSummary(advanceCyclePreview),
    [advanceCyclePreview],
  );

  const canAdvanceCycle =
    !canStart && !sessionActive && advanceCyclePreview.length > 0;

  const allowSubjectPlay = useCallback(
    (subjectId: string) => {
      if (!sessionActive) return true;
      if (
        phase === "resting" ||
        phase === "rest_done" ||
        phase === "subject_notes" ||
        phase === "block_done" ||
        phase === "paused"
      ) {
        return false;
      }
      return subjectId === currentSubjectId;
    },
    [sessionActive, phase, currentSubjectId],
  );

  const startSubjectAt = useCallback(
    (index: number, subjects: Subject[]) => {
      const sub = subjects[index];
      if (!sub) return;
      const customOverride = isIntensiveSession
        ? (sub.study_minutes ?? (intensiveDurationMinutes ? Math.max(1, Math.floor(intensiveDurationMinutes / (intensiveSubjectIds.length || 1))) : undefined))
        : undefined;
      resetSubjectTimer(sub.id, customOverride);
      window.setTimeout(() => {
        toggleSubjectTimer(sub.id);
      }, 60);
    },
    [resetSubjectTimer, toggleSubjectTimer, isIntensiveSession, intensiveDurationMinutes, intensiveSubjectIds],
  );

  const startSession = useCallback(() => {
    setCycleRoundCompleted(null);
    const day = todayIndex();
    const cycleSubs = cycleSubjectsOnDay(data.subjects ?? [], day);
    const remaining = buildWeightedCycleQueue(data.subjects ?? [], day);

    // Se o ciclo já estava 100% concluído para o dia, reinicia todas as matérias
    // para que a nova sessão seja iniciada do começo com status "prox".
    if (remaining.length === 0 && cycleSubs.length > 0) {
      resetCycleToday();
    }

    const queue = todayQueue(data.subjects ?? []);
    const packed = packStudyBlock(
      queue,
      settings.minMinutes,
      settings.maxMinutes,
      settings.targetMinutes,
    );
    if (packed.length === 0) return;

    // Garante que matérias incluídas no bloco a ser iniciado não permaneçam com status "ok"
    for (const s of packed) {
      const live = (data.subjects ?? []).find((x) => x.id === s.id);
      const exclusiveCycle = isExclusiveCycleDay(data.subjects ?? [], day);
      const st = exclusiveCycle ? live?.exclusive_status : live?.status;
      if (st === "ok") {
        setSubjectStatus(s.id, "prox");
      }
    }

    advancingRef.current = false;
    setIsExtraSession(false);
    setIsIntensiveSession(false);
    setIntensiveSubjectIds([]);
    setIntensiveSubjectId(null);
    setIntensiveDurationMinutes(undefined);
    setBlock(packed);
    setCurrentIndex(0);
    setPhase("running");
    setRestEndsAt(null);
    startSubjectAt(0, packed);
    playSessionStartTone();
  }, [data.subjects, settings, startSubjectAt, resetCycleToday, setSubjectStatus]);

  const startAdvanceCycleSession = useCallback(() => {
    setCycleRoundCompleted(null);
    const day = todayIndex();
    if (isExclusiveSoloDay(data.subjects ?? [], day)) return;

    const globalActive = (data.subjects ?? []).filter(
      (s) => s.active && !s.is_free,
    );
    const allGlobalDone =
      globalActive.length > 0 &&
      globalActive.every((s) => isSubjectDoneToday(s, false));

    if (allGlobalDone) {
      resetCycleToday();
    }

    const queue = buildGlobalCycleQueue(data.subjects ?? []);
    if (queue.length === 0) return;

    const packed = packStudyBlock(
      queue,
      settings.minMinutes,
      settings.maxMinutes,
      settings.targetMinutes,
    );
    if (packed.length === 0) return;

    advancingRef.current = false;
    setIsExtraSession(true);
    setIsIntensiveSession(false);
    setIntensiveSubjectIds([]);
    setIntensiveSubjectId(null);
    setIntensiveDurationMinutes(undefined);
    setBlock(packed);
    setCurrentIndex(0);
    setPhase("running");
    setRestEndsAt(null);
    startSubjectAt(0, packed);
    playSessionStartTone();
  }, [data.subjects, settings, startSubjectAt, resetCycleToday]);

  const startIntensiveSession = useCallback(
    (subjectIdsInput: string | string[], durationMinutes: number) => {
      const ids = Array.isArray(subjectIdsInput) ? subjectIdsInput : [subjectIdsInput];
      const validSubs = ids
        .map((id) => (data.subjects ?? []).find((s) => s.id === id))
        .filter((s): s is Subject => Boolean(s));

      if (validSubs.length === 0) return;

      setCycleRoundCompleted(null);
      advancingRef.current = false;
      setIsExtraSession(false);
      setIsIntensiveSession(true);
      setIntensiveSubjectIds(validSubs.map((s) => s.id));
      setIntensiveSubjectId(validSubs[0].id);
      setIntensiveDurationMinutes(durationMinutes);
      setIsIntensiveModalOpen(false);

      const day = todayIndex();
      const perSubjectMinutes = Math.max(
        1,
        Math.floor(durationMinutes / validSubs.length),
      );

      const packed: Subject[] = validSubs.map((sub) => ({
        ...sub,
        study_minutes: perSubjectMinutes,
      }));

      setBlock(packed);
      setCurrentIndex(0);
      setPhase("running");
      setRestEndsAt(null);

      resetSubjectTimer(packed[0].id, perSubjectMinutes);
      window.setTimeout(() => {
        toggleSubjectTimer(packed[0].id);
      }, 60);
      playSessionStartTone();
    },
    [data.subjects, resetSubjectTimer, toggleSubjectTimer],
  );

  const finishIntensiveMode = useCallback(() => {
    setCycleRoundCompleted(null);
    const ids = intensiveSubjectIds.length > 0
      ? intensiveSubjectIds
      : intensiveSubjectId
        ? [intensiveSubjectId]
        : blockRef.current.map((s) => s.id);

    for (const subId of ids) {
      if (isClockRunning(subId, false)) {
        toggleSubjectTimer(subId);
      }
      // Registra resfriamento no ciclo para priorizar as outras matérias na volta, sem queimar as etapas do ciclo
      recordLastCycleCompletedSubjectId(subId);
    }
    setIsIntensiveSession(false);
    setIntensiveSubjectIds([]);
    setIntensiveSubjectId(null);
    setIntensiveDurationMinutes(undefined);
    setPhase("idle");
    setBlock([]);
    setCurrentIndex(0);
    setRestEndsAt(null);
    advancingRef.current = false;
  }, [intensiveSubjectIds, intensiveSubjectId, isClockRunning, toggleSubjectTimer]);

  const pauseSession = useCallback(() => {
    if (phaseRef.current !== "running") return;
    const current = blockRef.current[indexRef.current];
    if (current && isClockRunning(current.id, current.is_free)) {
      toggleSubjectTimer(current.id);
    }
    setPhase("paused");
  }, [isClockRunning, toggleSubjectTimer]);

  const resumeSession = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    const current = blockRef.current[indexRef.current];
    setPhase("running");
    if (current && !isClockRunning(current.id, current.is_free)) {
      toggleSubjectTimer(current.id);
    }
    playSessionStartTone();
  }, [isClockRunning, toggleSubjectTimer]);

  const resetSession = useCallback(() => {
    setCycleRoundCompleted(null);
    if (phaseRef.current !== "running" && phaseRef.current !== "paused") return;
    const subjects = blockRef.current;
    if (subjects.length === 0) return;

    const wasRunning = phaseRef.current === "running";
    const current = subjects[indexRef.current];
    if (current && isClockRunning(current.id, current.is_free)) {
      toggleSubjectTimer(current.id);
    }

    advancingRef.current = false;
    for (const s of subjects) {
      resetSubjectTimer(
        s.id,
        isIntensiveSession ? intensiveDurationMinutes : undefined,
      );
      const live = (data.subjects ?? []).find((x) => x.id === s.id);
      if (live?.status === "ok") setSubjectStatus(s.id, "prox");
    }

    setBlock(subjects.map((s) => ({ ...s, status: "prox" as const })));
    setCurrentIndex(0);
    setRestEndsAt(null);

    if (wasRunning) {
      setPhase("running");
      window.setTimeout(() => startSubjectAt(0, subjects), 80);
      playSessionStartTone();
    } else {
      setPhase("paused");
    }
  }, [
    data.subjects,
    isClockRunning,
    toggleSubjectTimer,
    resetSubjectTimer,
    setSubjectStatus,
    startSubjectAt,
    isIntensiveSession,
    intensiveDurationMinutes,
  ]);

  const chooseRest = useCallback(() => {
    setCycleRoundCompleted(null);
    playAlarmTone({ repeats: 1 });
    const ends = Date.now() + settings.restMinutes * 60 * 1000;
    setRestEndsAt(ends);
    setPhase("resting");
    setBlock([]);
    setCurrentIndex(0);
    setContinuousFocusSeconds(0);
    setHasWarnedContinuous(false);
    setShowContinuousFocusAlert(false);
  }, [settings.restMinutes]);

  const chooseContinue = useCallback(() => {
    setCycleRoundCompleted(null);
    if (isIntensiveSession && (intensiveSubjectIds.length > 0 || intensiveSubjectId)) {
      const ids = intensiveSubjectIds.length > 0 ? intensiveSubjectIds : [intensiveSubjectId!];
      const duration = intensiveDurationMinutes ?? settings.targetMinutes;
      setPhase("idle");
      setBlock([]);
      setCurrentIndex(0);
      setRestEndsAt(null);
      window.setTimeout(() => {
        startIntensiveSession(ids, duration);
      }, 80);
      return;
    }
    const wasExtraSession = isExtraSession;
    setPhase("idle");
    setBlock([]);
    setCurrentIndex(0);
    setRestEndsAt(null);
    window.setTimeout(() => {
      if (wasExtraSession) {
        startAdvanceCycleSession();
      } else {
        startSession();
      }
    }, 80);
  }, [
    isIntensiveSession,
    isExtraSession,
    intensiveSubjectIds,
    intensiveSubjectId,
    intensiveDurationMinutes,
    settings.targetMinutes,
    startIntensiveSession,
    startAdvanceCycleSession,
    startSession,
  ]);

  const chooseFinish = useCallback(() => {
    if (isIntensiveSession) {
      finishIntensiveMode();
      return;
    }
    setCycleRoundCompleted(null);
    const current = blockRef.current[indexRef.current];
    if (current && isClockRunning(current.id, current.is_free)) {
      toggleSubjectTimer(current.id);
    }
    setPhase("idle");
    setBlock([]);
    setCurrentIndex(0);
    setRestEndsAt(null);
    setIsExtraSession(false);
    advancingRef.current = false;
  }, [isIntensiveSession, finishIntensiveMode, isClockRunning, toggleSubjectTimer]);

  // Conclusão de matéria → avança o bloco ou abre o diálogo.
  const advanceAfterComplete = useCallback((subjectId: string) => {
    if (phaseRef.current !== "running" && phaseRef.current !== "paused") return;
    if (advancingRef.current) return;

    const subjects = blockRef.current;
    const idx = indexRef.current;
    const current = subjects[idx];
    if (!current || current.id !== subjectId) return;

    advancingRef.current = true;
    recordLastCycleCompletedSubjectId(current.id);
    const nextIdx = idx + 1;
    const canPlayAudio = claimTimerCompletion(`flow_advance_${current.id}`, Date.now());

    if (nextIdx < subjects.length) {
      if (canPlayAudio) {
        playTransitionTone();
        notify("FocoHub", `${current.name} concluída — anote se quiser`);
      }
      setPhase("subject_notes");
      advancingRef.current = false;
    } else {
      if (canPlayAudio) {
        playSessionEndTone();
        notify(
          "FocoHub",
          `Bloco concluído · ${blockTotalMinutes(subjects)} min`,
        );
      }
      setPhase("block_done");
      advancingRef.current = false;
    }
  }, []);

  /** Marca a matéria atual como Concluída à mão e avança a sessão. */
  const completeCurrentSubjectEarly = useCallback(() => {
    if (phaseRef.current !== "running" && phaseRef.current !== "paused") return;
    if (advancingRef.current) return;
    const current = blockRef.current[indexRef.current];
    if (!current) return;
    if (isClockRunning(current.id, current.is_free)) toggleSubjectTimer(current.id);
    recordLastCycleCompletedSubjectId(current.id);
    if (!isIntensiveSession) {
      setSubjectStatus(current.id, "ok");
    }
    const durationMin = Math.max(1, current.study_minutes ?? 25);
    const nowIso = new Date().toISOString();
    addStudySession({
      subject_id: current.id,
      subject_name: current.name,
      started_at: new Date(Date.now() - durationMin * 60000).toISOString(),
      ended_at: nowIso,
      duration_minutes: durationMin,
      mode: isIntensiveSession ? "intensivo" : "ciclo",
      completed: true,
    });
    advanceAfterComplete(current.id);
  }, [isIntensiveSession, isClockRunning, toggleSubjectTimer, setSubjectStatus, addStudySession, advanceAfterComplete]);

  const extendCurrentSubject = useCallback(
    (extraMinutes: number) => {
      const subjects = blockRef.current;
      const idx = indexRef.current;
      const current = subjects[idx];
      if (!current) return;

      const seconds = Math.max(1, extraMinutes) * 60;
      if (
        phaseRef.current === "subject_notes" ||
        phaseRef.current === "block_done"
      ) {
        reopenSubjectForExtraTime(current.id);
      }
      setCycleRoundCompleted(null);
      advancingRef.current = false;
      addSubjectTimerSeconds(current.id, seconds);
      setPhase("running");
      playSessionStartTone();
    },
    [reopenSubjectForExtraTime, addSubjectTimerSeconds],
  );

  const continueToNextSubject = useCallback(() => {
    setCycleRoundCompleted(null);
    if (phaseRef.current !== "subject_notes") return;
    const subjects = blockRef.current;
    const nextIdx = indexRef.current + 1;
    if (nextIdx >= subjects.length) {
      setPhase("block_done");
      advancingRef.current = false;
      return;
    }
    advancingRef.current = false;
    setCurrentIndex(nextIdx);
    setPhase("running");
    startSubjectAt(nextIdx, subjects);
    playSessionStartTone();
  }, [startSubjectAt]);

  const endRestEarly = useCallback(() => {
    setCycleRoundCompleted(null);
    setRestEndsAt(null);
    setIsExtraSession(false);
    setIsIntensiveSession(false);
    setIntensiveSubjectIds([]);
    setIntensiveSubjectId(null);
    setIntensiveDurationMinutes(undefined);
    setContinuousFocusSeconds(0);
    setHasWarnedContinuous(false);
    setShowContinuousFocusAlert(false);
    setPhase("idle");
  }, []);

  const dismissRestDone = useCallback(() => {
    setCycleRoundCompleted(null);
    setRestEndsAt(null);
    setIsExtraSession(false);
    setIsIntensiveSession(false);
    setIntensiveSubjectIds([]);
    setIntensiveSubjectId(null);
    setIntensiveDurationMinutes(undefined);
    setContinuousFocusSeconds(0);
    setHasWarnedContinuous(false);
    setShowContinuousFocusAlert(false);
    setPhase("idle");
  }, []);

  useEffect(() => {
    function onComplete(ev: Event) {
      const detail = (ev as CustomEvent<{ subjectId: string }>).detail;
      const subjectId = detail?.subjectId;
      if (!subjectId) return;
      advanceAfterComplete(subjectId);
    }

    function onCycleComplete(ev: Event) {
      const detail = (ev as CustomEvent<{ round: number }>).detail;
      const round = detail?.round ?? 1;
      setCycleRoundCompleted(round);
      if (claimTimerCompletion(`flow_cycle_${round}`, Date.now())) {
        playCycleEndTone();
      }
    }

    function onStorage(e: StorageEvent) {
      if (e.key === "foco_semanal_study_flow_v1" && e.newValue) {
        try {
          const saved = readPersistedStudyFlow();
          if (saved.day === todayIndex()) {
            setPhase(saved.phase);
            setCurrentIndex(saved.currentIndex);
            setRestEndsAt(saved.restEndsAt);
          }
        } catch {}
      }
    }

    window.addEventListener(SUBJECT_COMPLETE_EVENT, onComplete);
    window.addEventListener(CYCLE_COMPLETE_EVENT, onCycleComplete);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(SUBJECT_COMPLETE_EVENT, onComplete);
      window.removeEventListener(CYCLE_COMPLETE_EVENT, onCycleComplete);
      window.removeEventListener("storage", onStorage);
    };
  }, [advanceAfterComplete]);

  const prevSubjectStatusRef = useRef<Record<string, string | undefined>>({});

  useEffect(() => {
    if (phase !== "running" && phase !== "paused") {
      prevSubjectStatusRef.current = {};
    }
  }, [phase]);

  // Matéria na sessão marcada como Concluída (manual / badge na lista) → avança como o fim do timer.
  useEffect(() => {
    if (phase !== "running" && phase !== "paused") return;
    const current = block[currentIndex];
    if (!current) return;
    const live = (data.subjects ?? []).find((s) => s.id === current.id);
    if (!live) return;
    const day = todayIndex();
    const exclusiveCycle = isExclusiveCycleDay(data.subjects ?? [], day);
    const currentStatus =
      (exclusiveCycle ? live.exclusive_status ?? "prox" : live.status);

    const prevStatus = prevSubjectStatusRef.current[current.id];
    prevSubjectStatusRef.current[current.id] = currentStatus;

    // Só avança se o status já estava sendo monitorado nesta sessão e transitou para "ok".
    // Isso evita pular matérias instantaneamente ao iniciar uma sessão com status já ok.
    if (prevStatus !== undefined && prevStatus !== "ok" && currentStatus === "ok") {
      if (isClockRunning(current.id, current.is_free)) toggleSubjectTimer(current.id);
      advanceAfterComplete(current.id);
    }
  }, [
    phase,
    block,
    currentIndex,
    data.subjects,
    isClockRunning,
    toggleSubjectTimer,
    advanceAfterComplete,
  ]);

  // Tick do descanso (não conta foco — só UI).
  useEffect(() => {
    if (phase !== "resting" || restEndsAt == null) return;
    const id = window.setInterval(() => {
      setTick((n) => n + 1);
      if (Date.now() >= restEndsAt) {
        playAlarmTone();
        notify("FocoHub", "Descanso encerrado — pode voltar aos estudos");
        setPhase("rest_done");
        setRestEndsAt(null);
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, restEndsAt]);

  const restSecondsLeft =
    phase === "resting" && restEndsAt
      ? Math.max(0, Math.ceil((restEndsAt - Date.now()) / 1000))
      : 0;

  const value = useMemo(
    () => ({
      phase,
      block,
      blockSummary,
      previewBlock,
      previewSummary,
      advanceCyclePreview,
      advanceCycleSummary,
      currentSubjectId,
      currentIndex,
      restSecondsLeft,
      settings,
      refreshSettings,
      saveSettings,
      canStart,
      canAdvanceCycle,
      isExtraSession,
      isIntensiveSession,
      intensiveSubjectIds,
      intensiveSubjectId,
      intensiveDurationMinutes,
      isIntensiveModalOpen,
      openIntensiveModal,
      closeIntensiveModal,
      startIntensiveSession,
      finishIntensiveMode,
      continuousFocusMinutes: Math.floor(continuousFocusSeconds / 60),
      showContinuousFocusAlert,
      dismissContinuousFocusAlert,
      cycleCompleted,
      cycleRoundCompleted,
      sessionActive,
      allowSubjectPlay,
      startSession,
      startAdvanceCycleSession,
      pauseSession,
      resumeSession,
      resetSession,
      chooseRest,
      chooseContinue,
      chooseFinish,
      continueToNextSubject,
      endRestEarly,
      dismissRestDone,
      completeCurrentSubjectEarly,
      extendCurrentSubject,
    }),
    [
      phase,
      block,
      blockSummary,
      previewBlock,
      previewSummary,
      advanceCyclePreview,
      advanceCycleSummary,
      currentSubjectId,
      currentIndex,
      restSecondsLeft,
      settings,
      refreshSettings,
      saveSettings,
      canStart,
      canAdvanceCycle,
      isExtraSession,
      isIntensiveSession,
      intensiveSubjectIds,
      intensiveSubjectId,
      intensiveDurationMinutes,
      isIntensiveModalOpen,
      openIntensiveModal,
      closeIntensiveModal,
      startIntensiveSession,
      finishIntensiveMode,
      continuousFocusSeconds,
      showContinuousFocusAlert,
      dismissContinuousFocusAlert,
      cycleCompleted,
      cycleRoundCompleted,
      sessionActive,
      allowSubjectPlay,
      startSession,
      startAdvanceCycleSession,
      pauseSession,
      resumeSession,
      resetSession,
      chooseRest,
      chooseContinue,
      chooseFinish,
      continueToNextSubject,
      endRestEarly,
      dismissRestDone,
      completeCurrentSubjectEarly,
      extendCurrentSubject,
    ],
  );

  return (
    <StudyFlowContext.Provider value={value}>{children}</StudyFlowContext.Provider>
  );
}

export function useStudyFlow() {
  const ctx = useContext(StudyFlowContext);
  if (!ctx) {
    throw new Error("useStudyFlow deve estar dentro de StudyFlowProvider");
  }
  return ctx;
}

/** Resumo curto para aria / debug. */
export function studyFlowStatusLabel(phase: StudyFlowPhase) {
  switch (phase) {
    case "idle":
      return "Inativo";
    case "running":
      return "Em sessão";
    case "paused":
      return "Sessão pausada";
    case "subject_notes":
      return "Anotações entre matérias";
    case "block_done":
      return "Bloco concluído";
    case "resting":
      return "Descansando";
    case "rest_done":
      return "Descanso encerrado";
  }
}

export { subjectMinutes };
