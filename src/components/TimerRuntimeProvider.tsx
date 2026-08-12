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
import { ensureNotificationPermission, notify, playAlarmTone } from "@/lib/audio";
import { addFocusSeconds, commitFocusDisplaySnapshot } from "@/lib/focus-log";
import { syncFocusLogWithCloud } from "@/lib/supabase/focus-sync";

export type TimerRuntime = {
  secondsLeft: number;
  running: boolean;
  /** Timestamp (ms) em que chega a zero, se estiver rodando */
  endsAt: number | null;
  startedAt: string | null;
};

type FlashKind = "play" | "pause";

export type ClockMode = "timers" | "stopwatch";

export type StopwatchState = {
  running: boolean;
  /** início do segmento atual (ms), se rodando */
  segmentStartedAt: number | null;
  /** tempo acumulado em ms (pausas) */
  accumulatedMs: number;
};

type TimerRuntimeContextValue = {
  mode: ClockMode;
  setMode: (mode: ClockMode) => void;
  runtime: Record<string, TimerRuntime>;
  flash: { id: string; kind: FlashKind; key: number } | null;
  toggleTimer: (id: string) => void;
  resetTimer: (id: string) => void;
  secondsFor: (id: string) => number;
  stopwatch: StopwatchState;
  stopwatchSeconds: number;
  toggleStopwatch: () => void;
  resetStopwatch: () => void;
};

const STORAGE_KEY = "foco_semanal_timer_runtime_v1";
const MODE_KEY = "foco_semanal_clock_mode";
const STOPWATCH_KEY = "foco_semanal_stopwatch_v1";

const DEFAULT_STOPWATCH: StopwatchState = {
  running: false,
  segmentStartedAt: null,
  accumulatedMs: 0,
};

const TimerRuntimeContext = createContext<TimerRuntimeContextValue | null>(null);

function readJson(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key) ?? sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeJson(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
    sessionStorage.removeItem(key);
  } catch {
    try {
      sessionStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }
}

function readStored(): Record<string, TimerRuntime> {
  try {
    const raw = readJson(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, TimerRuntime>;
  } catch {
    return {};
  }
}

function writeStored(runtime: Record<string, TimerRuntime>) {
  writeJson(STORAGE_KEY, JSON.stringify(runtime));
}

function readStopwatch(): StopwatchState {
  try {
    const raw = readJson(STOPWATCH_KEY);
    if (!raw) return DEFAULT_STOPWATCH;
    return { ...DEFAULT_STOPWATCH, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_STOPWATCH;
  }
}

function writeStopwatch(state: StopwatchState) {
  writeJson(STOPWATCH_KEY, JSON.stringify(state));
}

function liveStopwatchMs(s: StopwatchState): number {
  if (s.running && s.segmentStartedAt) {
    return s.accumulatedMs + (Date.now() - s.segmentStartedAt);
  }
  return s.accumulatedMs;
}

function liveSeconds(r: TimerRuntime | undefined, fallbackMinutes: number): number {
  if (!r) return Math.max(1, fallbackMinutes) * 60;
  if (r.running && r.endsAt) {
    return Math.max(0, Math.ceil((r.endsAt - Date.now()) / 1000));
  }
  return Math.max(0, r.secondsLeft);
}

function sameRuntime(
  a: Record<string, TimerRuntime>,
  b: Record<string, TimerRuntime>,
): boolean {
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (const key of aKeys) {
    const x = a[key];
    const y = b[key];
    if (!y) return false;
    if (
      x.secondsLeft !== y.secondsLeft ||
      x.running !== y.running ||
      x.endsAt !== y.endsAt ||
      x.startedAt !== y.startedAt
    ) {
      return false;
    }
  }
  return true;
}

export function TimerRuntimeProvider({ children }: { children: ReactNode }) {
  const { data, addStudySession } = useApp();
  const timers = data.timers ?? [];
  const [runtime, setRuntime] = useState<Record<string, TimerRuntime>>({});
  const [stopwatch, setStopwatch] = useState<StopwatchState>(DEFAULT_STOPWATCH);
  const [mode, setModeState] = useState<ClockMode>("timers");
  const [ready, setReady] = useState(false);
  const [flash, setFlash] = useState<{
    id: string;
    kind: FlashKind;
    key: number;
  } | null>(null);
  const flashTimer = useRef<number | null>(null);
  const doneRef = useRef<Record<string, boolean>>({});
  const [, setTick] = useState(0);

  useEffect(() => {
    setRuntime(readStored());
    setStopwatch(readStopwatch());
    const storedMode = readJson(MODE_KEY);
    if (storedMode === "timers" || storedMode === "stopwatch") {
      setModeState(storedMode);
    }
    setReady(true);
    void ensureNotificationPermission();
  }, []);

  const setMode = useCallback((next: ClockMode) => {
    setModeState(next);
    writeJson(MODE_KEY, next);
  }, []);

  // Alinha runtime às definições — sem apagar progresso no F5 / sync.
  useEffect(() => {
    if (!ready) return;
    // Evita wipe: na carga a lista pode vir vazia por um instante.
    if (timers.length === 0) return;

    setRuntime((prev) => {
      const next: Record<string, TimerRuntime> = {};
      for (const t of timers) {
        const existing = prev[t.id];
        const full = Math.max(1, t.minutes) * 60;

        if (!existing) {
          next[t.id] = {
            secondsLeft: full,
            running: false,
            endsAt: null,
            startedAt: null,
          };
          continue;
        }

        if (existing.running && existing.endsAt) {
          const left = liveSeconds(existing, t.minutes);
          next[t.id] =
            left <= 0
              ? {
                  secondsLeft: 0,
                  running: false,
                  endsAt: null,
                  startedAt: null,
                }
              : {
                  ...existing,
                  secondsLeft: left,
                };
          continue;
        }

        // Pausado, concluído (0) ou idle: preserva secondsLeft guardado.
        next[t.id] = {
          secondsLeft: Math.max(0, existing.secondsLeft),
          running: false,
          endsAt: null,
          startedAt: existing.startedAt,
        };
      }

      if (sameRuntime(prev, next)) return prev;
      writeStored(next);
      return next;
    });
  }, [timers, ready]);

  const anyTimerRunning = useMemo(
    () => Object.values(runtime).some((r) => r.running),
    [runtime],
  );
  const anyRunning = anyTimerRunning || stopwatch.running;

  // Conta foco só com Sessão (sort_order 0) ou cronômetro em play — nunca em pause.
  const sessionTimer = useMemo(
    () => [...timers].sort((a, b) => a.sort_order - b.sort_order)[0] ?? null,
    [timers],
  );
  const trackingFocus = Boolean(
    (sessionTimer && runtime[sessionTimer.id]?.running) || stopwatch.running,
  );
  const focusLastRef = useRef<number | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (!trackingFocus) {
      focusLastRef.current = null;
      return;
    }
    // Congela o card "Foco hoje" no total atual; o log real continua acumulando.
    commitFocusDisplaySnapshot();
    focusLastRef.current = Date.now();
    const id = window.setInterval(() => {
      const now = Date.now();
      const last = focusLastRef.current ?? now;
      focusLastRef.current = now;
      const deltaSec = Math.floor((now - last) / 1000);
      if (deltaSec > 0) {
        addFocusSeconds(deltaSec);
        window.dispatchEvent(new Event("foco-focus-log"));
      }
    }, 1000);
    return () => {
      const now = Date.now();
      const last = focusLastRef.current;
      focusLastRef.current = null;
      if (last) {
        const deltaSec = Math.floor((now - last) / 1000);
        if (deltaSec > 0) {
          addFocusSeconds(deltaSec);
        }
      }
      // Pause / fim / reset: libera o total consolidado e espelha na nuvem.
      commitFocusDisplaySnapshot();
      window.dispatchEvent(new Event("foco-focus-log"));
      void syncFocusLogWithCloud();
      window.clearInterval(id);
    };
  }, [ready, trackingFocus]);

  // Global tick — continues even when Hoje is unmounted
  useEffect(() => {
    if (!ready || !anyRunning) return;

    const id = window.setInterval(() => {
      setTick((n) => n + 1);
      setRuntime((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [tid, r] of Object.entries(prev)) {
          if (!r.running || !r.endsAt) continue;
          const left = Math.max(0, Math.ceil((r.endsAt - Date.now()) / 1000));
          if (left !== r.secondsLeft) {
            changed = true;
            next[tid] = { ...r, secondsLeft: left };
          }
        }
        if (changed) writeStored(next);
        return changed ? next : prev;
      });
    }, 1000);

    return () => window.clearInterval(id);
  }, [ready, anyRunning]);

  // Completions
  useEffect(() => {
    if (!ready) return;
    for (const t of timers) {
      const r = runtime[t.id];
      if (!r?.running) {
        if (r && r.secondsLeft > 0) doneRef.current[t.id] = false;
        continue;
      }
      const left = liveSeconds(r, t.minutes);
      if (left > 0) {
        doneRef.current[t.id] = false;
        continue;
      }
      if (doneRef.current[t.id]) continue;
      doneRef.current[t.id] = true;

      setRuntime((prev) => {
        const updated = {
          ...prev,
          [t.id]: {
            secondsLeft: 0,
            running: false,
            endsAt: null,
            startedAt: null,
          },
        };
        writeStored(updated);
        return updated;
      });
      playAlarmTone();
      notify("Foco Semanal", `${t.name} concluído`);

      if (t.sort_order === 0) {
        const subjects = [...data.subjects]
          .filter((s) => s.active)
          .sort((a, b) => a.cycle_order - b.cycle_order);
        const next =
          subjects.find((s) => s.status === "prox") ?? subjects[0] ?? null;
        if (next) {
          const ended = new Date().toISOString();
          addStudySession({
            subject_id: next.id,
            subject_name: next.name,
            started_at: r.startedAt ?? ended,
            ended_at: ended,
            duration_minutes: t.minutes,
            mode: "unica",
            completed: true,
          });
        }
      }
    }
  }, [runtime, timers, ready, data.subjects, addStudySession]);

  const showFlash = useCallback((id: string, kind: FlashKind) => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    setFlash({ id, kind, key: Date.now() });
    flashTimer.current = window.setTimeout(() => setFlash(null), 520);
  }, []);

  const toggleTimer = useCallback(
    (id: string) => {
      const def = timers.find((t) => t.id === id);
      setRuntime((prev) => {
        const current =
          prev[id] ??
          ({
            secondsLeft: Math.max(1, def?.minutes ?? 25) * 60,
            running: false,
            endsAt: null,
            startedAt: null,
          } satisfies TimerRuntime);

        const left = liveSeconds(current, def?.minutes ?? 25);
        if (left <= 0 && !current.running) {
          // restart from full
          const full = Math.max(1, def?.minutes ?? 25) * 60;
          showFlash(id, "play");
          const updated = {
            ...prev,
            [id]: {
              secondsLeft: full,
              running: true,
              endsAt: Date.now() + full * 1000,
              startedAt: new Date().toISOString(),
            },
          };
          writeStored(updated);
          return updated;
        }

        const willRun = !current.running;
        showFlash(id, willRun ? "play" : "pause");
        const updated = {
          ...prev,
          [id]: willRun
            ? {
                secondsLeft: left,
                running: true,
                endsAt: Date.now() + left * 1000,
                startedAt: current.startedAt ?? new Date().toISOString(),
              }
            : {
                secondsLeft: left,
                running: false,
                endsAt: null,
                startedAt: current.startedAt,
              },
        };
        writeStored(updated);
        return updated;
      });
    },
    [timers, showFlash],
  );

  const resetTimer = useCallback(
    (id: string) => {
      const def = timers.find((t) => t.id === id);
      doneRef.current[id] = false;
      setRuntime((prev) => {
        const updated = {
          ...prev,
          [id]: {
            secondsLeft: Math.max(1, def?.minutes ?? 25) * 60,
            running: false,
            endsAt: null,
            startedAt: null,
          },
        };
        writeStored(updated);
        return updated;
      });
    },
    [timers],
  );

  const secondsFor = useCallback(
    (id: string) => {
      const def = timers.find((t) => t.id === id);
      return liveSeconds(runtime[id], def?.minutes ?? 25);
    },
    [runtime, timers],
  );

  const stopwatchSeconds = Math.floor(liveStopwatchMs(stopwatch) / 1000);

  const toggleStopwatch = useCallback(() => {
    setStopwatch((prev) => {
      const willRun = !prev.running;
      showFlash("stopwatch", willRun ? "play" : "pause");
      const next: StopwatchState = willRun
        ? {
            running: true,
            segmentStartedAt: Date.now(),
            accumulatedMs: prev.accumulatedMs,
          }
        : {
            running: false,
            segmentStartedAt: null,
            accumulatedMs: liveStopwatchMs(prev),
          };
      writeStopwatch(next);
      return next;
    });
  }, [showFlash]);

  const resetStopwatch = useCallback(() => {
    const next = DEFAULT_STOPWATCH;
    writeStopwatch(next);
    setStopwatch(next);
  }, []);

  const value = useMemo(
    () => ({
      mode,
      setMode,
      runtime,
      flash,
      toggleTimer,
      resetTimer,
      secondsFor,
      stopwatch,
      stopwatchSeconds,
      toggleStopwatch,
      resetStopwatch,
    }),
    [
      mode,
      setMode,
      runtime,
      flash,
      toggleTimer,
      resetTimer,
      secondsFor,
      stopwatch,
      stopwatchSeconds,
      toggleStopwatch,
      resetStopwatch,
    ],
  );

  return (
    <TimerRuntimeContext.Provider value={value}>
      {children}
    </TimerRuntimeContext.Provider>
  );
}

export function useTimerRuntime() {
  const ctx = useContext(TimerRuntimeContext);
  if (!ctx) {
    throw new Error("useTimerRuntime deve estar dentro de TimerRuntimeProvider");
  }
  return ctx;
}
