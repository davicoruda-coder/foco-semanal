"use client";

import { useEffect } from "react";
import { useApp } from "@/components/AppProvider";
import { ensureNotificationPermission, notify, playAlarmTone } from "@/lib/audio";
import { plainTextFromHtml } from "@/lib/note-html";

const fired = new Map<string, number>();
const FIRED_TTL_MS = 10 * 60_000;

function pruneFired(now: number) {
  for (const [key, at] of fired) {
    if (now - at > FIRED_TTL_MS) fired.delete(key);
  }
}

export function ReminderWatcher() {
  const { data } = useApp();

  useEffect(() => {
    void ensureNotificationPermission();
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      pruneFired(now);
      for (const r of data.reminders) {
        if (!r.active || r.done_at || !r.has_alarm) continue;
        const target =
          new Date(r.notify_at).getTime() - r.remind_minutes_before * 60_000;
        const key = `${r.id}:${target}`;
        if (now >= target && now < target + 60_000 && !fired.has(key)) {
          fired.set(key, now);
          playAlarmTone();
          notify(
            "Lembrete",
            plainTextFromHtml(r.title).trim() || "Lembrete",
          );
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 10_000);
    return () => window.clearInterval(id);
  }, [data.reminders]);

  return null;
}
