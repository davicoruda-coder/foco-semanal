import type { QuizSession } from "./quiz-types";

const QUIZ_STORAGE_KEY = "foco_semanal_quiz_sessions_v1";

function safeGet(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(QUIZ_STORAGE_KEY);
  } catch {
    return null;
  }
}

function safeSet(val: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(QUIZ_STORAGE_KEY, val);
  } catch {
    // no-op
  }
}

export function getQuizSessions(): QuizSession[] {
  const raw = safeGet();
  if (!raw) return [];
  try {
    const list = JSON.parse(raw);
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export function getQuizSession(id: string): QuizSession | null {
  const all = getQuizSessions();
  return all.find((s) => s.id === id) ?? null;
}

export function saveQuizSession(session: QuizSession): void {
  const all = getQuizSessions();
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx >= 0) {
    all[idx] = session;
  } else {
    all.unshift(session);
  }
  // Guarda as últimas 30 sessões de quiz
  const trimmed = all.slice(0, 30);
  safeSet(JSON.stringify(trimmed));
}

export function deleteQuizSession(id: string): void {
  const all = getQuizSessions();
  const filtered = all.filter((s) => s.id !== id);
  safeSet(JSON.stringify(filtered));
}
