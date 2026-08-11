"use client";

import { AppShell } from "@/components/AppShell";
import { TimerRuntimeProvider } from "@/components/TimerRuntimeProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TimerRuntimeProvider>
      <AppShell>{children}</AppShell>
    </TimerRuntimeProvider>
  );
}
