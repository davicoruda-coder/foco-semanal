"use client";

import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useOpenTransition } from "@/lib/use-open-transition";

export function DialogFrame({
  open,
  onClose,
  labelledBy,
  label,
  overlayClassName = "",
  cardClassName = "",
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  overlayClassName?: string;
  cardClassName?: string;
  children: ReactNode;
}) {
  const { shown, leaving } = useOpenTransition(open);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Trava o scroll do body enquanto o diálogo está aberto.
  useEffect(() => {
    if (!shown) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shown]);

  if (!shown || !mounted) return null;

  return createPortal(
    <div
      className={`dialog-overlay ${leaving ? "is-leaving" : ""} ${overlayClassName}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={label}
      onClick={onClose}
    >
      <div
        className={`dialog-card ${leaving ? "is-leaving" : ""} ${cardClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
