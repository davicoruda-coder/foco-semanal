"use client";

import { useLayoutEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Altura mínima em px */
  minPx: number;
  /** Altura máxima em px (ex.: 2× minPx) */
  maxPx: number;
  rows?: number;
};

/** Textarea sem puxador: cresce com o texto até maxPx; barra só quando passa do limite. */
export function AutoGrowTextarea({
  value,
  onChange,
  placeholder,
  className = "",
  minPx,
  maxPx,
  rows = 1,
}: Props) {
  const ref = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const from = el.offsetHeight || minPx;
    el.style.transition = "none";
    el.style.overflowY = "hidden";
    el.style.height = "auto";
    const content = el.scrollHeight;
    const next = Math.min(Math.max(content, minPx), maxPx);
    const needsScroll = content > maxPx + 1;
    el.style.height = `${from}px`;
    void el.offsetHeight;
    el.style.transition = "height 220ms ease";
    el.style.height = `${next}px`;
    el.style.overflowY = needsScroll ? "auto" : "hidden";
  }, [value, minPx, maxPx]);

  return (
    <textarea
      ref={ref}
      rows={rows}
      className={`resize-none outline-none ${className}`}
      style={{
        minHeight: minPx,
        maxHeight: maxPx,
        overflowY: "hidden",
      }}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    />
  );
}
