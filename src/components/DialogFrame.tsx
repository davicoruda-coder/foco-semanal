"use client";

import type { ReactNode } from "react";
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
  if (!shown) return null;

  return (
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
    </div>
  );
}
