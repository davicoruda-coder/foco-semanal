"use client";

import { AppShell } from "@/components/AppShell";
import { MusicPlayerProvider } from "@/components/MusicPlayerProvider";
import { TimerRuntimeProvider } from "@/components/TimerRuntimeProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <TimerRuntimeProvider>
      <MusicPlayerProvider>
        <AppShell>{children}</AppShell>
      </MusicPlayerProvider>
    </TimerRuntimeProvider>
  );
}
