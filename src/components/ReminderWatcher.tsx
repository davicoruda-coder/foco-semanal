"use client";

import { useEffect } from "react";
import { useApp } from "@/components/AppProvider";
import { ensureNotificationPermission, notify, playAlarmTone } from "@/lib/audio";
import { plainTextFromHtml } from "@/lib/note-html";

const fired = new Set<string>();

export function ReminderWatcher() {
  const { data } = useApp();

  useEffect(() => {
    void ensureNotificationPermission();
  }, []);

  useEffect(() => {
    const tick = () => {
      const now = Date.now();
      for (const r of data.reminders) {
        if (!r.active || r.done_at || !r.has_alarm) continue;
        const target =
          new Date(r.notify_at).getTime() - r.remind_minutes_before * 60_000;
        const key = `${r.id}:${target}`;
        if (now >= target && now < target + 60_000 && !fired.has(key)) {
          fired.add(key);
          playAlarmTone();
          notify(
            "Lembrete",
            plainTextFromHtml(r.title).trim() || "Lembrete",
          );
        }
      }
    };
    tick();
    const id = window.setInterval(tick, 15_000);
    return () => window.clearInterval(id);
  }, [data.reminders]);

  return null;
}
