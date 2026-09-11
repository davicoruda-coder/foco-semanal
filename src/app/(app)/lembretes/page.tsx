"use client";

import { ReminderBoard } from "@/components/ReminderBoard";
import { ReminderWatcher } from "@/components/ReminderWatcher";

export default function LembretesPage() {
  return (
    <div className="space-y-4 sm:space-y-5">
      <ReminderWatcher />
      <h1 className="font-display px-0.5 text-2xl font-semibold tracking-tight md:text-3xl">
        Lembretes
      </h1>
      <div className="surface p-3.5 sm:p-5">
        <ReminderBoard />
      </div>
    </div>
  );
}
