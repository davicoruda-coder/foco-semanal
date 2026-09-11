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
import { SUBJECT_COMPLETE_EVENT } from "@/lib/study-flow-events";
import {
  clearPersistedStudyFlow,
  readPersistedStudyFlow,
  writePersistedStudyFlow,
  type StudyFlowPhase,
} from "@/lib/study-flow-persist";
import type { Subject } from "@/lib/types";
import { subjectShowsOnDay, todayIndex } from "@/lib/utils";

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
};

const StudyFlowContext = createContext<StudyFlowContextValue | null>(null);

function todayQueue(subjects: Subject[]): Subject[] {
  const day = todayIndex();
  return [...subjects]
    .filter(
      (s) =>
        s.active &&
        !s.is_free &&
        s.status !== "ok" &&
        subjectShowsOnDay(s, day),
    )
    .sort((a, b) => a.cycle_order - b.cycle_order);
}

export function StudyFlowProvider({ children }: { children: ReactNode }) {
  const { data, updateSettings, setSubjectStatus, ready: appReady } = useApp();
  const {
    toggleSubjectTimer,
    resetSubjectTimer,
    runtime,
    subjectTimerKey,
    clocksReady,
  } = useTimerRuntime();

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

  const canStart = previewBlock.length > 0 && !sessionActive;

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
    const queue = todayQueue(data.subjects ?? []);
    const packed = packStudyBlock(
      queue,
      settings.minMinutes,
      settings.maxMinutes,
      settings.targetMinutes,
    );
    if (packed.length === 0) return;
    advancingRef.current = false;
    setBlock(packed);
    setCurrentIndex(0);
    setPhase("running");
    setRestEndsAt(null);
    startSubjectAt(0, packed);
  }, [data.subjects, settings, startSubjectAt]);

  const pauseSession = useCallback(() => {
    if (phaseRef.current !== "running") return;
    const id = blockRef.current[indexRef.current]?.id;
    if (id) {
      const key = subjectTimerKey(id);
      if (runtime[key]?.running) toggleSubjectTimer(id);
    }
    setPhase("paused");
  }, [runtime, subjectTimerKey, toggleSubjectTimer]);

  const resumeSession = useCallback(() => {
    if (phaseRef.current !== "paused") return;
    const id = blockRef.current[indexRef.current]?.id;
    setPhase("running");
    if (id) {
      const key = subjectTimerKey(id);
      if (!runtime[key]?.running) toggleSubjectTimer(id);
    }
  }, [runtime, subjectTimerKey, toggleSubjectTimer]);

  const resetSession = useCallback(() => {
    if (phaseRef.current !== "running" && phaseRef.current !== "paused") return;
    const subjects = blockRef.current;
    if (subjects.length === 0) return;

    const wasRunning = phaseRef.current === "running";
    const currentId = subjects[indexRef.current]?.id;
    if (currentId) {
      const key = subjectTimerKey(currentId);
      if (runtime[key]?.running) toggleSubjectTimer(currentId);
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
    runtime,
    subjectTimerKey,
    toggleSubjectTimer,
    resetSubjectTimer,
    setSubjectStatus,
    startSubjectAt,
  ]);

  const chooseRest = useCallback(() => {
    playAlarmTone();
    const ends = Date.now() + settings.restMinutes * 60 * 1000;
    setRestEndsAt(ends);
    setPhase("resting");
    setBlock([]);
    setCurrentIndex(0);
  }, [settings.restMinutes]);

  const chooseContinue = useCallback(() => {
    setPhase("idle");
    setBlock([]);
    setCurrentIndex(0);
    setRestEndsAt(null);
    // Próximo bloco com a fila atualizada (matérias já Ok saem).
    window.setTimeout(() => {
      const queue = todayQueue(data.subjects ?? []);
      const packed = packStudyBlock(
        queue,
        settings.minMinutes,
        settings.maxMinutes,
        settings.targetMinutes,
      );
      if (packed.length === 0) {
        notify("Foco Semanal", "Não há mais matérias na fila de hoje");
        return;
      }
      advancingRef.current = false;
      setBlock(packed);
      setCurrentIndex(0);
      setPhase("running");
      startSubjectAt(0, packed);
    }, 80);
  }, [data.subjects, settings, startSubjectAt]);

  const chooseFinish = useCallback(() => {
    const id = blockRef.current[indexRef.current]?.id;
    if (id) {
      const key = subjectTimerKey(id);
      if (runtime[key]?.running) toggleSubjectTimer(id);
    }
    setPhase("idle");
    setBlock([]);
    setCurrentIndex(0);
    setRestEndsAt(null);
    advancingRef.current = false;
  }, [runtime, subjectTimerKey, toggleSubjectTimer]);

  const continueToNextSubject = useCallback(() => {
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
    setRestEndsAt(null);
    setPhase("idle");
  }, []);

  const dismissRestDone = useCallback(() => {
    setRestEndsAt(null);
    setPhase("idle");
  }, []);

  // Conclusão de matéria → avança o bloco ou abre o diálogo.
  useEffect(() => {
    function onComplete(ev: Event) {
      const detail = (ev as CustomEvent<{ subjectId: string }>).detail;
      const subjectId = detail?.subjectId;
      if (!subjectId) return;
      if (phaseRef.current !== "running") return;
      if (advancingRef.current) return;

      const subjects = blockRef.current;
      const idx = indexRef.current;
      const current = subjects[idx];
      if (!current || current.id !== subjectId) return;

      advancingRef.current = true;
      const nextIdx = idx + 1;
      if (nextIdx < subjects.length) {
        playAlarmTone();
        notify("Foco Semanal", `${current.name} concluída — anote se quiser`);
        setPhase("subject_notes");
        advancingRef.current = false;
      } else {
        playAlarmTone();
        notify(
          "Foco Semanal",
          `Bloco concluído · ${blockTotalMinutes(subjects)} min`,
        );
        setPhase("block_done");
        advancingRef.current = false;
      }
    }

    window.addEventListener(SUBJECT_COMPLETE_EVENT, onComplete);
    return () => window.removeEventListener(SUBJECT_COMPLETE_EVENT, onComplete);
  }, [startSubjectAt]);

  // Tick do descanso (não conta foco — só UI).
  useEffect(() => {
    if (phase !== "resting" || restEndsAt == null) return;
    const id = window.setInterval(() => {
      setTick((n) => n + 1);
      if (Date.now() >= restEndsAt) {
        playAlarmTone();
        notify("Foco Semanal", "Descanso encerrado — pode voltar aos estudos");
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
