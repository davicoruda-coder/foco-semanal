"use client";

const STORAGE_KEY = "foco_semanal_alarm_prefs_v1";

export type AlarmToneId = "acorde" | "duplo" | "campainha";
export type StartToneId = "zen" | "cristal" | "gota";
export type TransitionToneId = "passo" | "chime" | "sutil";
export type SessionEndToneId = "acorde" | "campainha" | "conquista";
export type CycleEndToneId = "triunfo" | "celebracao" | "fanfarra";

export type AlarmPrefs = {
  /** Volume global 0–1 */
  volume: number;
  /** Toque de alarme legado / temporizadores avulsos */
  tone: AlarmToneId;
  repeats: number;

  /** 1. Início da Sessão (Play) */
  playOnStart?: boolean;
  startTone?: StartToneId;
  startRepeats?: 1 | 2 | 3;

  /** 2. Transição de Matéria (de uma para outra) */
  playOnTransition?: boolean;
  transitionTone?: TransitionToneId;
  transitionRepeats?: 1 | 2 | 3;

  /** 3. Fim da Sessão (Bloco concluído) */
  playOnSessionEnd?: boolean;
  sessionEndTone?: SessionEndToneId;
  sessionEndRepeats?: 1 | 2 | 3;

  /** 4. Fim do Ciclo (100% concluído) */
  playOnCycleEnd?: boolean;
  cycleEndTone?: CycleEndToneId;
  cycleEndRepeats?: 1 | 2 | 3;
};

export const ALARM_TONES: { id: AlarmToneId; label: string }[] = [
  { id: "acorde", label: "Acorde" },
  { id: "duplo", label: "Duplo" },
  { id: "campainha", label: "Campainha" },
];

export const START_TONES: { id: StartToneId; label: string; desc: string }[] = [
  { id: "zen", label: "Zen", desc: "Tríade luminosa meditativa" },
  { id: "cristal", label: "Cristal", desc: "Claro, límpido e inspirador" },
  { id: "gota", label: "Gota", desc: "Curto, minimalista e sutil" },
];

export const TRANSITION_TONES: { id: TransitionToneId; label: string; desc: string }[] = [
  { id: "passo", label: "Passo", desc: "Ágil e estimulante para o próximo foco" },
  { id: "chime", label: "Chime", desc: "Arpeggio suave de 3 notas" },
  { id: "sutil", label: "Sutil", desc: "Pulso sonoro leve e discreto" },
];

export const SESSION_END_TONES: { id: SessionEndToneId; label: string; desc: string }[] = [
  { id: "acorde", label: "Acorde", desc: "Harmônico, acolhedor e relaxante" },
  { id: "conquista", label: "Conquista", desc: "Sensação de missão cumprida" },
  { id: "campainha", label: "Campainha", desc: "Toque clássico de término" },
];

export const CYCLE_END_TONES: { id: CycleEndToneId; label: string; desc: string }[] = [
  { id: "triunfo", label: "Triunfo", desc: "Fanfarra ascendente de ciclo fechado" },
  { id: "celebracao", label: "Celebração", desc: "Arpeggios festivos e luminosos" },
  { id: "fanfarra", label: "Fanfarra", desc: "Toque rítmico vibrante de vitória" },
];

export const REPEAT_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1x" },
  { value: 2, label: "2x" },
  { value: 3, label: "3x" },
];

export const ALARM_REPEATS = REPEAT_OPTIONS;

const DEFAULT_PREFS: AlarmPrefs = {
  volume: 0.7,
  tone: "acorde",
  repeats: 3,

  playOnStart: true,
  startTone: "zen",
  startRepeats: 1,

  playOnTransition: true,
  transitionTone: "passo",
  transitionRepeats: 1,

  playOnSessionEnd: true,
  sessionEndTone: "acorde",
  sessionEndRepeats: 2,

  playOnCycleEnd: true,
  cycleEndTone: "triunfo",
  cycleEndRepeats: 1,
};

export function loadAlarmPrefs(): AlarmPrefs {
  if (typeof window === "undefined") return { ...DEFAULT_PREFS };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<AlarmPrefs>;

    const volume =
      typeof parsed.volume === "number" && !isNaN(parsed.volume)
        ? Math.min(1, Math.max(0, parsed.volume))
        : DEFAULT_PREFS.volume;
    const tone =
      parsed.tone === "acorde" || parsed.tone === "duplo" || parsed.tone === "campainha"
        ? parsed.tone
        : DEFAULT_PREFS.tone;
    const repeats =
      typeof parsed.repeats === "number" && (parsed.repeats === 1 || parsed.repeats === 2 || parsed.repeats === 3)
        ? parsed.repeats
        : DEFAULT_PREFS.repeats;

    const playOnStart =
      typeof parsed.playOnStart === "boolean" ? parsed.playOnStart : DEFAULT_PREFS.playOnStart;
    const startTone =
      parsed.startTone === "zen" || parsed.startTone === "cristal" || parsed.startTone === "gota"
        ? parsed.startTone
        : DEFAULT_PREFS.startTone;
    const startRepeats =
      parsed.startRepeats === 1 || parsed.startRepeats === 2 || parsed.startRepeats === 3
        ? parsed.startRepeats
        : DEFAULT_PREFS.startRepeats;

    const playOnTransition =
      typeof parsed.playOnTransition === "boolean" ? parsed.playOnTransition : DEFAULT_PREFS.playOnTransition;
    const transitionTone =
      parsed.transitionTone === "passo" || parsed.transitionTone === "chime" || parsed.transitionTone === "sutil"
        ? parsed.transitionTone
        : DEFAULT_PREFS.transitionTone;
    const transitionRepeats =
      parsed.transitionRepeats === 1 || parsed.transitionRepeats === 2 || parsed.transitionRepeats === 3
        ? parsed.transitionRepeats
        : DEFAULT_PREFS.transitionRepeats;

    const playOnSessionEnd =
      typeof parsed.playOnSessionEnd === "boolean" ? parsed.playOnSessionEnd : DEFAULT_PREFS.playOnSessionEnd;
    const sessionEndTone =
      parsed.sessionEndTone === "acorde" || parsed.sessionEndTone === "campainha" || parsed.sessionEndTone === "conquista"
        ? parsed.sessionEndTone
        : DEFAULT_PREFS.sessionEndTone;
    const sessionEndRepeats =
      parsed.sessionEndRepeats === 1 || parsed.sessionEndRepeats === 2 || parsed.sessionEndRepeats === 3
        ? parsed.sessionEndRepeats
        : DEFAULT_PREFS.sessionEndRepeats;

    const playOnCycleEnd =
      typeof parsed.playOnCycleEnd === "boolean" ? parsed.playOnCycleEnd : DEFAULT_PREFS.playOnCycleEnd;
    const cycleEndTone =
      parsed.cycleEndTone === "triunfo" || parsed.cycleEndTone === "celebracao" || parsed.cycleEndTone === "fanfarra"
        ? parsed.cycleEndTone
        : DEFAULT_PREFS.cycleEndTone;
    const cycleEndRepeats =
      parsed.cycleEndRepeats === 1 || parsed.cycleEndRepeats === 2 || parsed.cycleEndRepeats === 3
        ? parsed.cycleEndRepeats
        : DEFAULT_PREFS.cycleEndRepeats;

    return {
      volume,
      tone,
      repeats,
      playOnStart,
      startTone,
      startRepeats,
      playOnTransition,
      transitionTone,
      transitionRepeats,
      playOnSessionEnd,
      sessionEndTone,
      sessionEndRepeats,
      playOnCycleEnd,
      cycleEndTone,
      cycleEndRepeats,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export function saveAlarmPrefs(prefs: AlarmPrefs) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
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
    osc.stop(t0 + n.dur + 0.03);
  }
}

function playSynthSound(
  notes: Note[],
  repeats: number = 1,
  cycleDur: number = 1.0,
  volume: number = 0.7,
) {
  if (typeof window === "undefined") return;
  if (volume <= 0) return;

  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;

    const ctx = new AudioContextClass();

    const run = () => {
      try {
        const master = ctx.createGain();
        const vol = Math.max(0.05, Math.min(1, volume));
        master.gain.setValueAtTime(vol, ctx.currentTime);

        const limiter = createLimiter(ctx);
        master.connect(limiter);
        limiter.connect(ctx.destination);

        const reps = Math.max(1, Math.min(5, repeats));
        for (let r = 0; r < reps; r++) {
          scheduleNotes(ctx, master, notes, r * cycleDur);
        }

        const totalMs = Math.ceil(reps * cycleDur * 1000 + 800);
        window.setTimeout(() => {
          try {
            void ctx.close();
          } catch {
            /* ignore */
          }
        }, totalMs);
      } catch {
        /* ignore */
      }
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(run).catch(run);
    } else {
      run();
    }
  } catch {
    /* ignore */
  }
}

// -------------------------------------------------------------
// Notas de cada Som do Ecossistema
// -------------------------------------------------------------

function notesForStartTone(tone: StartToneId): Note[] {
  switch (tone) {
    case "cristal":
      return [
        { freq: 523.25, start: 0, dur: 0.3, peak: 0.52, type: "sine" },
        { freq: 783.99, start: 0.07, dur: 0.38, peak: 0.56, type: "sine" },
        { freq: 1046.5, start: 0.14, dur: 0.55, peak: 0.6, type: "sine" },
      ];
    case "gota":
      return [
        { freq: 587.33, start: 0, dur: 0.2, peak: 0.5, type: "sine" },
        { freq: 880.0, start: 0.08, dur: 0.35, peak: 0.58, type: "sine" },
      ];
    case "zen":
    default:
      return [
        { freq: 440.0, start: 0, dur: 0.35, peak: 0.55, type: "sine" },
        { freq: 659.25, start: 0.08, dur: 0.42, peak: 0.58, type: "sine" },
        { freq: 987.77, start: 0.16, dur: 0.6, peak: 0.6, type: "sine" },
      ];
  }
}

function notesForTransitionTone(tone: TransitionToneId): Note[] {
  switch (tone) {
    case "chime":
      return [
        { freq: 659.25, start: 0, dur: 0.14, peak: 0.5, type: "sine" },
        { freq: 783.99, start: 0.06, dur: 0.16, peak: 0.54, type: "sine" },
        { freq: 1046.5, start: 0.12, dur: 0.32, peak: 0.58, type: "sine" },
      ];
    case "sutil":
      return [
        { freq: 880.0, start: 0, dur: 0.28, peak: 0.58, type: "sine" },
        { freq: 1318.5, start: 0, dur: 0.22, peak: 0.3, type: "sine" },
      ];
    case "passo":
    default:
      return [
        { freq: 587.33, start: 0, dur: 0.14, peak: 0.55, type: "sine" },
        { freq: 880.0, start: 0.09, dur: 0.26, peak: 0.6, type: "sine" },
      ];
  }
}

function notesForSessionEndTone(tone: SessionEndToneId): Note[] {
  switch (tone) {
    case "conquista":
      return [
        { freq: 587.33, start: 0, dur: 0.35, peak: 0.52, type: "sine" },
        { freq: 739.99, start: 0.1, dur: 0.4, peak: 0.55, type: "sine" },
        { freq: 880.0, start: 0.2, dur: 0.45, peak: 0.58, type: "sine" },
        { freq: 1174.66, start: 0.3, dur: 0.65, peak: 0.62, type: "sine" },
      ];
    case "campainha":
      return [
        { freq: 987.77, start: 0, dur: 0.18, peak: 0.58, type: "sine" },
        { freq: 783.99, start: 0.16, dur: 0.2, peak: 0.55, type: "sine" },
        { freq: 659.25, start: 0.34, dur: 0.28, peak: 0.52, type: "sine" },
        { freq: 523.25, start: 0.54, dur: 0.42, peak: 0.5, type: "triangle" },
      ];
    case "acorde":
    default:
      return [
        { freq: 523.25, start: 0, dur: 0.45, peak: 0.55, type: "sine" },
        { freq: 659.25, start: 0.12, dur: 0.45, peak: 0.55, type: "sine" },
        { freq: 783.99, start: 0.24, dur: 0.55, peak: 0.58, type: "sine" },
      ];
  }
}

function notesForCycleEndTone(tone: CycleEndToneId): Note[] {
  switch (tone) {
    case "celebracao":
      return [
        { freq: 659.25, start: 0, dur: 0.16, peak: 0.55, type: "sine" },
        { freq: 880.0, start: 0.1, dur: 0.18, peak: 0.58, type: "sine" },
        { freq: 1108.73, start: 0.2, dur: 0.22, peak: 0.6, type: "sine" },
        { freq: 1318.51, start: 0.32, dur: 0.75, peak: 0.65, type: "sine" },
      ];
    case "fanfarra":
      return [
        { freq: 587.33, start: 0, dur: 0.14, peak: 0.58, type: "triangle" },
        { freq: 587.33, start: 0.14, dur: 0.14, peak: 0.58, type: "triangle" },
        { freq: 880.0, start: 0.28, dur: 0.26, peak: 0.62, type: "triangle" },
        { freq: 1174.66, start: 0.46, dur: 0.7, peak: 0.66, type: "sine" },
      ];
    case "triunfo":
    default:
      return [
        { freq: 523.25, start: 0, dur: 0.2, peak: 0.55, type: "sine" },
        { freq: 659.25, start: 0.12, dur: 0.2, peak: 0.55, type: "sine" },
        { freq: 783.99, start: 0.24, dur: 0.24, peak: 0.58, type: "sine" },
        { freq: 1046.5, start: 0.38, dur: 0.35, peak: 0.62, type: "sine" },
        { freq: 1318.51, start: 0.52, dur: 0.75, peak: 0.65, type: "sine" },
      ];
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

// -------------------------------------------------------------
// Disparos e Prévia das Funções Sonoras
// -------------------------------------------------------------

/** 1. Toca o som suave ao iniciar/retomar sessão */
export function playSessionStartTone(opts?: Partial<AlarmPrefs>) {
  const prefs = { ...loadAlarmPrefs(), ...opts };
  if (prefs.playOnStart === false) return;
  const tone = prefs.startTone ?? "zen";
  const notes = notesForStartTone(tone);
  const reps = prefs.startRepeats ?? 1;
  playSynthSound(notes, reps, 0.85, prefs.volume * 0.85);
}

export function previewSessionStartTone(
  tone?: StartToneId,
  volume?: number,
  repeats?: number,
) {
  const prefs = loadAlarmPrefs();
  const t = tone ?? prefs.startTone ?? "zen";
  const v = volume !== undefined ? volume : prefs.volume;
  const r = repeats ?? prefs.startRepeats ?? 1;
  const notes = notesForStartTone(t);
  playSynthSound(notes, r, 0.85, v * 0.85);
}

/** 2. Toca o som ao transicionar de uma matéria para outra */
export function playTransitionTone(opts?: Partial<AlarmPrefs>) {
  const prefs = { ...loadAlarmPrefs(), ...opts };
  if (prefs.playOnTransition === false) return;
  const tone = prefs.transitionTone ?? "passo";
  const notes = notesForTransitionTone(tone);
  const reps = prefs.transitionRepeats ?? 1;
  playSynthSound(notes, reps, 0.65, prefs.volume * 0.85);
}

export function previewTransitionTone(
  tone?: TransitionToneId,
  volume?: number,
  repeats?: number,
) {
  const prefs = loadAlarmPrefs();
  const t = tone ?? prefs.transitionTone ?? "passo";
  const v = volume !== undefined ? volume : prefs.volume;
  const r = repeats ?? prefs.transitionRepeats ?? 1;
  const notes = notesForTransitionTone(t);
  playSynthSound(notes, r, 0.65, v * 0.85);
}

/** 3. Toca o som ao finalizar a sessão de estudos (bloco concluído) */
export function playSessionEndTone(opts?: Partial<AlarmPrefs>) {
  const prefs = { ...loadAlarmPrefs(), ...opts };
  if (prefs.playOnSessionEnd === false) return;
  const tone = prefs.sessionEndTone ?? "acorde";
  const notes = notesForSessionEndTone(tone);
  const reps = prefs.sessionEndRepeats ?? 2;
  playSynthSound(notes, reps, 1.1, prefs.volume * 0.9);
}

export function previewSessionEndTone(
  tone?: SessionEndToneId,
  volume?: number,
  repeats?: number,
) {
  const prefs = loadAlarmPrefs();
  const t = tone ?? prefs.sessionEndTone ?? "acorde";
  const v = volume !== undefined ? volume : prefs.volume;
  const r = repeats ?? prefs.sessionEndRepeats ?? 2;
  const notes = notesForSessionEndTone(t);
  playSynthSound(notes, r, 1.1, v * 0.9);
}

/** 4. Toca o som triunfal ao completar 100% da meta do ciclo */
export function playCycleEndTone(opts?: Partial<AlarmPrefs>) {
  const prefs = { ...loadAlarmPrefs(), ...opts };
  if (prefs.playOnCycleEnd === false) return;
  const tone = prefs.cycleEndTone ?? "triunfo";
  const notes = notesForCycleEndTone(tone);
  const reps = prefs.cycleEndRepeats ?? 1;
  playSynthSound(notes, reps, 1.4, prefs.volume * 0.95);
}

export function previewCycleEndTone(
  tone?: CycleEndToneId,
  volume?: number,
  repeats?: number,
) {
  const prefs = loadAlarmPrefs();
  const t = tone ?? prefs.cycleEndTone ?? "triunfo";
  const v = volume !== undefined ? volume : prefs.volume;
  const r = repeats ?? prefs.cycleEndRepeats ?? 1;
  const notes = notesForCycleEndTone(t);
  playSynthSound(notes, r, 1.4, v * 0.95);
}

/** Alarme genérico de temporizadores e lembretes */
export function playAlarmTone(opts?: Partial<AlarmPrefs>) {
  const prefs = { ...loadAlarmPrefs(), ...opts };
  const notes = notesForTone(prefs.tone);
  const reps = Math.max(1, Math.min(5, prefs.repeats ?? 3));
  const cycle = toneCycleDuration(prefs.tone);
  playSynthSound(notes, reps, cycle, prefs.volume);
}

export function previewAlarmTone(
  tone: AlarmToneId,
  volume: number,
  repeats?: number,
) {
  const notes = notesForTone(tone);
  const reps = Math.max(1, Math.min(5, repeats ?? 3));
  const cycle = toneCycleDuration(tone);
  playSynthSound(notes, reps, cycle, volume);
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
