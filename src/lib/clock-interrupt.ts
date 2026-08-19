import { formatFocusDuration } from "@/lib/focus-log";

export const HEARTBEAT_KEY = "foco_semanal_clock_heartbeat_v1";
export const INTERRUPT_KEY = "foco_semanal_clock_interrupts_v1";
export const INTERRUPT_EVENT = "foco-clock-interrupt";

/** PC dormiu, travou ou caiu a luz — JS parou bem além do backup de 5s. */
const STALE_MS = 120_000;
const MAX_INTERRUPTS = 12;

export type InterruptibleTimer = {
  secondsLeft: number;
  running: boolean;
  endsAt: number | null;
  startedAt: string | null;
  sortOrder?: number;
};

export type InterruptibleStopwatch = {
  running: boolean;
  segmentStartedAt: number | null;
  accumulatedMs: number;
};

export type ClockInterrupt = {
  id: string;
  detectedAt: string;
  lastBeatAt: string;
  kind: "session" | "timer" | "stopwatch";
  name: string;
  timerId?: string;
  remainingSeconds?: number;
  elapsedSeconds?: number;
};

export type TimerNameHint = {
  id: string;
  name: string;
  sort_order: number;
};

function safeGet(key: string): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key: string, value: string) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
}

export function readHeartbeat(): number {
  const n = Number(safeGet(HEARTBEAT_KEY));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function writeHeartbeat(at = Date.now()) {
  safeSet(HEARTBEAT_KEY, String(at));
}

export function heartbeatIsStale(beat = readHeartbeat(), now = Date.now()): boolean {
  return beat > 0 && now - beat >= STALE_MS;
}

export function loadInterrupts(): ClockInterrupt[] {
  try {
    const raw = safeGet(INTERRUPT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ClockInterrupt[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInterrupts(list: ClockInterrupt[]) {
  safeSet(INTERRUPT_KEY, JSON.stringify(list.slice(0, MAX_INTERRUPTS)));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(INTERRUPT_EVENT));
  }
}

export function clearInterrupts() {
  saveInterrupts([]);
}

export function appendInterrupts(events: ClockInterrupt[]) {
  if (!events.length) return;
  saveInterrupts([...events, ...loadInterrupts()].slice(0, MAX_INTERRUPTS));
}

export function patchInterruptNames(timers: TimerNameHint[]) {
  const list = loadInterrupts();
  if (!list.length || !timers.length) return;
  let changed = false;
  const next = list.map((item) => {
    if (!item.timerId) return item;
    const t = timers.find((x) => x.id === item.timerId);
    if (!t || t.name === item.name) return item;
    changed = true;
    return { ...item, name: t.name };
  });
  if (changed) saveInterrupts(next);
}

function timerRemainingAtBeat(r: InterruptibleTimer, beat: number): number {
  const stored = Math.max(0, r.secondsLeft);
  if (!r.endsAt) return stored;
  const fromBeat = Math.max(0, Math.ceil((r.endsAt - beat) / 1000));
  return Math.min(stored, fromBeat);
}

function stopwatchMsAtBeat(s: InterruptibleStopwatch, beat: number): number {
  if (s.running && s.segmentStartedAt) {
    const delta = beat - s.segmentStartedAt;
    if (delta < 0) return Math.max(0, s.accumulatedMs);
    return Math.max(0, s.accumulatedMs + delta);
  }
  return Math.max(0, s.accumulatedMs);
}

function newId(): string {
  return `int-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function nameForTimer(r: InterruptibleTimer, id: string, timers: TimerNameHint[]): string {
  const byId = timers.find((t) => t.id === id);
  if (byId?.name) return byId.name;
  if (r.sortOrder === 0) return "Sessão";
  return "Temporizador";
}

export function recoverStaleClocks(
  runtime: Record<string, InterruptibleTimer>,
  stopwatch: InterruptibleStopwatch,
  timers: TimerNameHint[] = [],
  now = Date.now(),
): {
  runtime: Record<string, InterruptibleTimer>;
  stopwatch: InterruptibleStopwatch;
  changed: boolean;
} {
  const beat = readHeartbeat();
  if (!heartbeatIsStale(beat, now)) {
    return { runtime, stopwatch, changed: false };
  }

  const detectedAt = new Date(now).toISOString();
  const lastBeatAt = new Date(beat).toISOString();
  const events: ClockInterrupt[] = [];
  let nextRuntime = runtime;
  let mutated = false;

  for (const [id, r] of Object.entries(runtime)) {
    if (!r.running) continue;
    if (!mutated) {
      nextRuntime = { ...runtime };
      mutated = true;
    }
    const remainingSeconds = timerRemainingAtBeat(r, beat);
    nextRuntime[id] = {
      ...r,
      secondsLeft: remainingSeconds,
      running: false,
      endsAt: null,
    };
    events.push({
      id: newId(),
      detectedAt,
      lastBeatAt,
      kind: r.sortOrder === 0 ? "session" : "timer",
      name: nameForTimer(r, id, timers),
      timerId: id,
      remainingSeconds,
    });
  }

  let nextStopwatch = stopwatch;
  if (stopwatch.running) {
    const elapsedMs = stopwatchMsAtBeat(stopwatch, beat);
    nextStopwatch = {
      running: false,
      segmentStartedAt: null,
      accumulatedMs: elapsedMs,
    };
    mutated = true;
    events.push({
      id: newId(),
      detectedAt,
      lastBeatAt,
      kind: "stopwatch",
      name: "Cronômetro",
      elapsedSeconds: Math.floor(elapsedMs / 1000),
    });
  }

  if (events.length) appendInterrupts(events);

  return { runtime: nextRuntime, stopwatch: nextStopwatch, changed: mutated };
}

export function interruptSummary(item: ClockInterrupt): string {
  if (item.kind === "stopwatch") {
    const elapsed = formatFocusDuration(item.elapsedSeconds ?? 0);
    return `${item.name} pausado — estava em ${elapsed}`;
  }
  const left = formatFocusDuration(item.remainingSeconds ?? 0);
  return `${item.name} pausado — faltavam ${left}`;
}

export function formatInterruptWhen(item: ClockInterrupt): string {
  const at = new Date(item.lastBeatAt);
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(at);
}
