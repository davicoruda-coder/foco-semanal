"use client";

import { useEffect, useState } from "react";

export const OPEN_MS = 180;
export const EXIT_MS = 140;

/** Mantém o conteúdo montado durante o fade de saída. */
export function useOpenTransition(open: boolean, exitMs = EXIT_MS) {
  const [shown, setShown] = useState(open);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (open) {
      setShown(true);
      setLeaving(false);
      return;
    }
    if (!shown) return;
    setLeaving(true);
    const id = window.setTimeout(() => {
      setShown(false);
      setLeaving(false);
    }, exitMs);
    return () => window.clearTimeout(id);
  }, [open, shown, exitMs]);

  return { shown, leaving };
}
