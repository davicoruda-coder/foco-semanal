"use client";

import { ReminderBoard } from "@/components/ReminderBoard";
import { ensureNotificationPermission } from "@/lib/audio";

export default function LembretesPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <ReminderBoard />
      <button
        type="button"
        className="btn mt-8"
        onClick={() => void ensureNotificationPermission()}
      >
        Permitir notificações do navegador
      </button>
    </div>
  );
}
