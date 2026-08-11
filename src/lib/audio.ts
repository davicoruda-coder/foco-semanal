"use client";

const STORAGE_KEY = "foco_semanal_alarm_prefs_v1";

export type AlarmToneId = "acorde" | "duplo" | "campainha";

export type AlarmPrefs = {
  /** 0–1 */
  volume: number;
  tone: AlarmToneId;
};

export const ALARM_TONES: { id: AlarmToneId; label: string }[] = [
  { id: "acorde", label: "Acorde" },
  { id: "duplo", label: "Duplo" },
  { id: "campainha", label: "Campainha" },
];

const DEFAULT_PREFS: AlarmPrefs = { volume: 0.7, tone: "acorde" };

export function loadAlarmPrefs(): AlarmPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<AlarmPrefs>;
    const volume =
      typeof parsed.volume === "number"
        ? Math.min(1, Math.max(0, parsed.volume))
        : DEFAULT_PREFS.volume;
    const tone =
      parsed.tone === "acorde" ||
      parsed.tone === "duplo" ||
      parsed.tone === "campainha"
        ? parsed.tone
        : DEFAULT_PREFS.tone;
    return { volume, tone };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveAlarmPrefs(prefs: AlarmPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        volume: Math.min(1, Math.max(0, prefs.volume)),
        tone: prefs.tone,
      }),
    );
  } catch {
    /* ignore */
  }
}

type Note = {
  freq: number;
  start: number;
  dur: number;
  peak?: number;
  type?: OscillatorType;
};

function scheduleNotes(
  ctx: AudioContext,
  master: GainNode,
  notes: Note[],
  volume: number,
) {
  const vol = Math.max(0, Math.min(1, volume));
  master.gain.setValueAtTime(vol, ctx.currentTime);

  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.freq;
    const t0 = ctx.currentTime + n.start;
    const peak = n.peak ?? 0.22;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + n.dur);
    osc.connect(gain);
    gain.connect(master);
    osc.start(t0);
    osc.stop(t0 + n.dur + 0.02);
  }
}

function notesForTone(tone: AlarmToneId): Note[] {
  switch (tone) {
    case "duplo":
      return [
        { freq: 880, start: 0, dur: 0.12, peak: 0.28, type: "triangle" },
        { freq: 880, start: 0.22, dur: 0.12, peak: 0.28, type: "triangle" },
      ];
    case "campainha":
      return [
        { freq: 988, start: 0, dur: 0.18, peak: 0.26, type: "sine" },
        { freq: 784, start: 0.16, dur: 0.2, peak: 0.24, type: "sine" },
        { freq: 659, start: 0.34, dur: 0.28, peak: 0.22, type: "sine" },
        { freq: 523, start: 0.55, dur: 0.35, peak: 0.2, type: "triangle" },
      ];
    case "acorde":
    default:
      return [
        { freq: 523.25, start: 0, dur: 0.35, peak: 0.2 },
        { freq: 659.25, start: 0.15, dur: 0.35, peak: 0.2 },
        { freq: 783.99, start: 0.3, dur: 0.4, peak: 0.2 },
      ];
  }
}

function durationForTone(tone: AlarmToneId): number {
  if (tone === "duplo") return 800;
  if (tone === "campainha") return 1200;
  return 1500;
}

/** Toca o alarme com prefs salvas (ou opts). */
export function playAlarmTone(opts?: Partial<AlarmPrefs>) {
  try {
    const prefs = { ...loadAlarmPrefs(), ...opts };
    if (prefs.volume <= 0) return;

    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.connect(ctx.destination);
    scheduleNotes(ctx, master, notesForTone(prefs.tone), prefs.volume);
    window.setTimeout(
      () => void ctx.close(),
      durationForTone(prefs.tone),
    );
  } catch {
    /* ignore */
  }
}

/** Prévia com toque/volume explícitos (botão Ouvir). */
export function previewAlarmTone(tone: AlarmToneId, volume: number) {
  playAlarmTone({ tone, volume });
}

export async function ensureNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function notify(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body });
  } catch {
    /* ignore */
  }
}
