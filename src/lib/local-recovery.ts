import type { AppData } from "@/lib/types";

const LAST_GOOD_KEY = "foco_semanal_last_known_good_v1";
const ROLLING_PREFIX = "foco_semanal_backup_roll_";
const ROLLING_SLOTS = 3;

export function rememberLastKnownGood(data: AppData) {
  if (typeof window === "undefined") return;
  try {
    const payload = JSON.stringify({
      saved_at: new Date().toISOString(),
      data,
    });
    localStorage.setItem(LAST_GOOD_KEY, payload);
    // Rotação simples das últimas 3 cópias
    for (let i = ROLLING_SLOTS - 1; i >= 1; i -= 1) {
      const prev = localStorage.getItem(`${ROLLING_PREFIX}${i}`);
      if (prev) localStorage.setItem(`${ROLLING_PREFIX}${i + 1}`, prev);
    }
    localStorage.setItem(`${ROLLING_PREFIX}1`, payload);
  } catch {
    /* quota / private mode */
  }
}

export function loadLastKnownGood(): AppData | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_GOOD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { data?: AppData };
    return parsed.data ?? null;
  } catch {
    return null;
  }
}
