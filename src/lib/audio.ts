"use client";

const STORAGE_KEY = "foco_semanal_alarm_prefs_v1";

export type AlarmToneId = "acorde" | "duplo" | "campainha";

export type AlarmPrefs = {
  /** 0–1 */
  volume: number;
  tone: AlarmToneId;
  repeats: number;
  /** Toca um som suave ao iniciar/retomar a sessão de estudos */
  playOnStart?: boolean;
};

export const ALARM_TONES: { id: AlarmToneId; label: string }[] = [
  { id: "acorde", label: "Acorde" },
  { id: "duplo", label: "Duplo" },
  { id: "campainha", label: "Campainha" },
];

export const ALARM_REPEATS: { value: number; label: string }[] = [
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 3, label: "3x" },
];

const DEFAULT_PREFS: AlarmPrefs = {
  volume: 0.7,
  tone: "acorde",
  repeats: 3,
  playOnStart: true,
};

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
    const repeats =
      typeof parsed.repeats === "number" && (parsed.repeats === 1 || parsed.repeats === 2 || parsed.repeats === 3)
        ? parsed.repeats
        : DEFAULT_PREFS.repeats;
    const playOnStart =
      typeof parsed.playOnStart === "boolean"
        ? parsed.playOnStart
        : DEFAULT_PREFS.playOnStart;
    return { volume, tone, repeats, playOnStart };
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
        repeats: [1, 2, 3].includes(prefs.repeats) ? prefs.repeats : DEFAULT_PREFS.repeats,
        playOnStart: prefs.playOnStart !== false,
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

function createLimiter(ctx: AudioContext) {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -1.8;
  limiter.knee.value = 4;
  limiter.ratio.value = 18;
  limiter.attack.value = 0.002;
  limiter.release.value = 0.08;
  return limiter;
}

function scheduleNotes(
  ctx: AudioContext,
  master: GainNode,
  notes: Note[],
  timeOffset: number = 0,
) {
  for (const n of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = n.type ?? "sine";
    osc.frequency.value = n.freq;
    const t0 = ctx.currentTime + timeOffset + n.start;
    const peak = n.peak ?? 0.5;
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
        { freq: 880, start: 0, dur: 0.12, peak: 0.62, type: "triangle" },
        { freq: 880, start: 0.22, dur: 0.12, peak: 0.62, type: "triangle" },
      ];
    case "campainha":
      return [
        { freq: 988, start: 0, dur: 0.18, peak: 0.55, type: "sine" },
        { freq: 784, start: 0.16, dur: 0.2, peak: 0.52, type: "sine" },
        { freq: 659, start: 0.34, dur: 0.28, peak: 0.48, type: "sine" },
        { freq: 523, start: 0.55, dur: 0.35, peak: 0.45, type: "triangle" },
      ];
    case "acorde":
    default:
      return [
        { freq: 523.25, start: 0, dur: 0.35, peak: 0.48 },
        { freq: 659.25, start: 0.15, dur: 0.35, peak: 0.48 },
        { freq: 783.99, start: 0.3, dur: 0.4, peak: 0.48 },
      ];
  }
}

function toneCycleDuration(tone: AlarmToneId): number {
  if (tone === "duplo") return 0.75;
  if (tone === "campainha") return 1.35;
  return 1.15;
}

function durationForTone(tone: AlarmToneId, repeats: number = 1): number {
  const cycle = toneCycleDuration(tone);
  const tail = tone === "campainha" ? 1200 : tone === "duplo" ? 800 : 1000;
  return Math.ceil((repeats - 1) * cycle * 1000 + tail + 200);
}

/** Toca o alarme com prefs salvas (ou opts). Repete conforme prefs (padrão 3x). */
export function playAlarmTone(opts?: Partial<AlarmPrefs>) {
  try {
    const prefs = { ...loadAlarmPrefs(), ...opts };
    if (prefs.volume <= 0) return;

    const repeats = Math.max(1, Math.min(5, prefs.repeats ?? 3));
    const cycleDur = toneCycleDuration(prefs.tone);

    const ctx = new AudioContext();
    const master = ctx.createGain();
    const vol = Math.max(0, Math.min(1, prefs.volume));
    master.gain.setValueAtTime(vol, ctx.currentTime);

    const limiter = createLimiter(ctx);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    for (let r = 0; r < repeats; r++) {
      scheduleNotes(
        ctx,
        master,
        notesForTone(prefs.tone),
        r * cycleDur,
      );
    }

    window.setTimeout(
      () => void ctx.close(),
      durationForTone(prefs.tone, repeats),
    );
  } catch {
    /* ignore */
  }
}

/** Prévia com toque/volume/repetições explícitos (botão Ouvir). */
export function previewAlarmTone(tone: AlarmToneId, volume: number, repeats?: number) {
  playAlarmTone({ tone, volume, repeats });
}

/**
 * Toca um chime suave e relaxante ao iniciar/retomar a sessão de estudos.
 * Harmonioso, acolhedor e com decaimento suave.
 */
export function playSessionStartTone(opts?: Partial<AlarmPrefs>) {
  if (typeof window === "undefined") return;
  try {
    const prefs = { ...loadAlarmPrefs(), ...opts };
    if (prefs.playOnStart === false) return;
    if (prefs.volume <= 0) return;

    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();
    if (ctx.state === "suspended") {
      void ctx.resume();
    }

    const master = ctx.createGain();
    // Chime suave: volume escalado para ~45% do alarme principal para ser sereno e não assustar
    const vol = Math.max(0, Math.min(1, prefs.volume)) * 0.45;
    master.gain.setValueAtTime(vol, ctx.currentTime);

    const limiter = createLimiter(ctx);
    master.connect(limiter);
    limiter.connect(ctx.destination);

    // Acorde aberto e meditativo (A4 -> E5 -> B5), com envelope macio
    const notes: Note[] = [
      { freq: 440.0, start: 0, dur: 0.28, peak: 0.24, type: "sine" },
      { freq: 659.25, start: 0.08, dur: 0.34, peak: 0.28, type: "sine" },
      { freq: 987.77, start: 0.16, dur: 0.48, peak: 0.3, type: "sine" },
    ];

    scheduleNotes(ctx, master, notes, 0);

    window.setTimeout(() => {
      try {
        void ctx.close();
      } catch {
        /* ignore */
      }
    }, 750);
  } catch {
    /* ignore */
  }
}

/** Prévia explícita do som suave de início de sessão. */
export function previewSessionStartTone(volume?: number) {
  playSessionStartTone({
    playOnStart: true,
    volume: volume !== undefined ? volume : loadAlarmPrefs().volume,
  });
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
