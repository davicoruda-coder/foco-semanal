"use client";

import { ReminderBoard } from "@/components/ReminderBoard";
import { ReminderWatcher } from "@/components/ReminderWatcher";

export default function LembretesPage() {
  return (
    <div className="flex min-h-[calc(100dvh-10.5rem)] flex-col sm:min-h-0">
      <ReminderWatcher />
      <div className="surface flex flex-1 flex-col p-3.5 sm:p-6">
        <ReminderBoard />
      </div>
    </div>
  );
}
