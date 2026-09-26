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
import { notify, playAlarmTone } from "@/lib/audio";
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
import type { Subject } from "@/lib/types";
import {
  buildFullWeightedCycle,
  buildWeightedCycleQueue,
  cycleSubjectsOnDay,
  isExclusiveCycleDay,
  todayIndex,
} from "@/lib/utils";

export type { StudyFlowPhase };
type StudyFlowContextValue = {
  phase: StudyFlowPhase;
  block: Subject[];
  blockSummary: string;
  previewBlock: Subject[];
  previewSummary: string;
  currentSubjectId: string | null;
  /** Índice da matéria atual no bloco (útil em subject_notes). */
  currentIndex: number;
  restSecondsLeft: number;
  settings: BlockRangeSettings;
  refreshSettings: () => void;
  saveSettings: (next: BlockRangeSettings) => void;
  canStart: boolean;
  /** Todo o ciclo de hoje foi concluído (todas as matérias estão Ok) */
  cycleCompleted: boolean;
  /** Número da volta que acabou de ser concluída (ex: 1, 2) para aviso comemorativo */
  cycleRoundCompleted: number | null;
  sessionActive: boolean;
  /** Play individual permitido? (sessão ativa → só a matéria atual) */
  allowSubjectPlay: (subjectId: string) => boolean;
  startSession: () => void;
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

function rotateToAvoidAdjacent(list: Subject[], avoidId?: string | null): Subject[] {
  if (!avoidId || list.length <= 1) return list;
  if (list[0].id !== avoidId) return list;
  const firstDifferentIdx = list.findIndex((s) => s.id !== avoidId);
  if (firstDifferentIdx < 0) return list;
  return [...list.slice(firstDifferentIdx), ...list.slice(0, firstDifferentIdx)];
}

function todayQueue(subjects: Subject[]): Subject[] {
  const day = todayIndex();
  const remaining = buildWeightedCycleQueue(subjects, day);
  const fullCycle = buildFullWeightedCycle(subjects, day);

  if (fullCycle.length === 0) return remaining;

  if (remaining.length === 0) {
    const cycle1 = fullCycle;
    const last1 = cycle1[cycle1.length - 1]?.id;
    const cycle2 = rotateToAvoidAdjacent(fullCycle, last1);
    const last2 = cycle2[cycle2.length - 1]?.id;
    const cycle3 = rotateToAvoidAdjacent(fullCycle, last2);
    return [...cycle1, ...cycle2, ...cycle3];
  }

  const lastRemId = remaining[remaining.length - 1]?.id;
  const cycle1 = rotateToAvoidAdjacent(fullCycle, lastRemId);
  const last1 = cycle1[cycle1.length - 1]?.id;
  const cycle2 = rotateToAvoidAdjacent(fullCycle, last1);

  return [...remaining, ...cycle1, ...cycle2];
}

export function StudyFlowProvider({ children }: { children: ReactNode }) {
  const {
    data,
    updateSettings,
    setSubjectStatus,
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
    });
  }, [hydrated, phase, block, currentIndex, restEndsAt]);

  const refreshSettings = useCallback(() => {
    setSettings(
      readBlockRange(
        data.session_settings?.focus_minutes,
        data.session_settings?.break_long_minutes,
      ),
    );
  }, [data.session_settings?.focus_minutes, data.session_settings?.break_long_minutes]);

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
      resetSubjectTimer(sub.id);
      window.setTimeout(() => {
        toggleSubjectTimer(sub.id);
      }, 60);
    },
    [resetSubjectTimer, toggleSubjectTimer],
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
    setBlock(packed);
    setCurrentIndex(0);
    setPhase("running");
    setRestEndsAt(null);
    startSubjectAt(0, packed);
  }, [data.subjects, settings, startSubjectAt, resetCycleToday, setSubjectStatus]);

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
      resetSubjectTimer(s.id);
      const live = (data.subjects ?? []).find((x) => x.id === s.id);
      if (live?.status === "ok") setSubjectStatus(s.id, "prox");
    }

    setBlock(subjects.map((s) => ({ ...s, status: "prox" as const })));
    setCurrentIndex(0);
    setRestEndsAt(null);

    if (wasRunning) {
      setPhase("running");
      window.setTimeout(() => startSubjectAt(0, subjects), 80);
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
  ]);

  const chooseRest = useCallback(() => {
    setCycleRoundCompleted(null);
    playAlarmTone();
    const ends = Date.now() + settings.restMinutes * 60 * 1000;
    setRestEndsAt(ends);
    setPhase("resting");
    setBlock([]);
    setCurrentIndex(0);
  }, [settings.restMinutes]);

  const chooseContinue = useCallback(() => {
    setCycleRoundCompleted(null);
    setPhase("idle");
    setBlock([]);
    setCurrentIndex(0);
    setRestEndsAt(null);
    window.setTimeout(() => {
      startSession();
    }, 80);
  }, [startSession]);

  const chooseFinish = useCallback(() => {
    setCycleRoundCompleted(null);
    const current = blockRef.current[indexRef.current];
    if (current && isClockRunning(current.id, current.is_free)) {
      toggleSubjectTimer(current.id);
    }
    setPhase("idle");
    setBlock([]);
    setCurrentIndex(0);
    setRestEndsAt(null);
    advancingRef.current = false;
  }, [isClockRunning, toggleSubjectTimer]);

  // Conclusão de matéria → avança o bloco ou abre o diálogo.
  const advanceAfterComplete = useCallback((subjectId: string) => {
    if (phaseRef.current !== "running" && phaseRef.current !== "paused") return;
    if (advancingRef.current) return;

    const subjects = blockRef.current;
    const idx = indexRef.current;
    const current = subjects[idx];
    if (!current || current.id !== subjectId) return;

    advancingRef.current = true;
    const nextIdx = idx + 1;
    if (nextIdx < subjects.length) {
      playAlarmTone();
      notify("FocoHub", `${current.name} concluída — anote se quiser`);
      setPhase("subject_notes");
      advancingRef.current = false;
    } else {
      playAlarmTone();
      notify(
        "FocoHub",
        `Bloco concluído · ${blockTotalMinutes(subjects)} min`,
      );
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
    setSubjectStatus(current.id, "ok");
    advanceAfterComplete(current.id);
  }, [isClockRunning, toggleSubjectTimer, setSubjectStatus, advanceAfterComplete]);

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
  }, [startSubjectAt]);

  const endRestEarly = useCallback(() => {
    setCycleRoundCompleted(null);
    setRestEndsAt(null);
    setPhase("idle");
  }, []);

  const dismissRestDone = useCallback(() => {
    setCycleRoundCompleted(null);
    setRestEndsAt(null);
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
    }

    window.addEventListener(SUBJECT_COMPLETE_EVENT, onComplete);
    window.addEventListener(CYCLE_COMPLETE_EVENT, onCycleComplete);
    return () => {
      window.removeEventListener(SUBJECT_COMPLETE_EVENT, onComplete);
      window.removeEventListener(CYCLE_COMPLETE_EVENT, onCycleComplete);
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
      currentSubjectId,
      currentIndex,
      restSecondsLeft,
      settings,
      refreshSettings,
      saveSettings,
      canStart,
      cycleCompleted,
      cycleRoundCompleted,
      sessionActive,
      allowSubjectPlay,
      startSession,
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
      currentSubjectId,
      currentIndex,
      restSecondsLeft,
      settings,
      refreshSettings,
      saveSettings,
      canStart,
      cycleCompleted,
      cycleRoundCompleted,
      sessionActive,
      allowSubjectPlay,
      startSession,
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
