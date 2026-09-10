"use client";

import { AppShell } from "@/components/AppShell";
import { StudyFlowProvider } from "@/components/StudyFlowProvider";
import { StudySessionChrome } from "@/components/StudySessionChrome";
import { TimerRuntimeProvider } from "@/components/TimerRuntimeProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TimerRuntimeProvider>
      <StudyFlowProvider>
        <AppShell>{children}</AppShell>
        <StudySessionChrome />
      </StudyFlowProvider>
    </TimerRuntimeProvider>
  );
}
