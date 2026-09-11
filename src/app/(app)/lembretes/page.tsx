"use client";

import { ReminderBoard } from "@/components/ReminderBoard";
import { ReminderWatcher } from "@/components/ReminderWatcher";

export default function LembretesPage() {
  return (
    <div>
      <ReminderWatcher />
      <div className="surface p-3.5 sm:p-5">
        <ReminderBoard />
      </div>
    </div>
  );
}
