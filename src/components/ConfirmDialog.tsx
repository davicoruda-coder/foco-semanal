"use client";

import { useRef } from "react";
import { DialogFrame } from "@/components/DialogFrame";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Excluir",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const snapRef = useRef({ title, message, confirmLabel, cancelLabel });
  if (open) {
    snapRef.current = { title, message, confirmLabel, cancelLabel };
  }
  const snap = snapRef.current;

  return (
    <DialogFrame
      open={open}
      onClose={onCancel}
      labelledBy="confirm-title"
      cardClassName="surface w-full max-w-sm p-6 shadow-[var(--shadow-lg)]"
    >
      <h2 id="confirm-title" className="font-display text-xl font-semibold">
        {snap.title}
      </h2>
      <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
        {snap.message}
      </p>
      <div className="mt-6 flex flex-wrap justify-end gap-2">
        <button type="button" className="btn" onClick={onCancel}>
          {snap.cancelLabel}
        </button>
        <button
          type="button"
          className="btn border-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_12%,var(--surface))] text-[var(--warn)]"
          onClick={onConfirm}
        >
          {snap.confirmLabel}
        </button>
      </div>
    </DialogFrame>
  );
}
