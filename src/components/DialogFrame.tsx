"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useOpenTransition } from "@/lib/use-open-transition";

const emptySubscribe = () => () => {};

export function DialogFrame({
  open,
  onClose,
  labelledBy,
  label,
  overlayClassName = "",
  cardClassName = "",
  closeOnOutsideClick = false,
  children,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy?: string;
  label?: string;
  overlayClassName?: string;
  cardClassName?: string;
  /**
   * Por padrão é `false`. Trava a caixa para não fechar em cliques acidentais
   * no fundo escuro, exigindo que o usuário escolha uma opção ou use os botões
   * explícitos (Fechar, Cancelar, Confirmar).
   */
  closeOnOutsideClick?: boolean;
  children: ReactNode;
}) {
  const { shown, leaving } = useOpenTransition(open);
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
  const cardRef = useRef<HTMLDivElement>(null);

  // Trava o scroll do body enquanto o diálogo está aberto.
  useEffect(() => {
    if (!shown) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [shown]);

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Garante que o clique foi no próprio overlay e não em elementos internos
    if (e.target !== e.currentTarget) return;

    if (closeOnOutsideClick) {
      onClose();
    } else {
      // Trava de segurança: impede o fechamento acidental ao clicar fora.
      // Animação tátil direta via Web Animations API no card:
      // Não altera classes CSS nem o estado React, eliminando qualquer
      // reinício acidental de animação de entrada (que causava o piscar visual).
      const el = cardRef.current;
      if (!el) return;

      if (
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        return;
      }

      // Cancela animação de shake anterior se ainda estiver em andamento
      if (typeof el.getAnimations === "function") {
        el.getAnimations().forEach((anim) => {
          if ((anim as Animation & { id?: string }).id === "dialog-shake") {
            anim.cancel();
          }
        });
      }

      el.animate(
        [
          { transform: "translate3d(0, 0, 0)" },
          { transform: "translate3d(-6px, 0, 0)" },
          { transform: "translate3d(5px, 0, 0)" },
          { transform: "translate3d(-4px, 0, 0)" },
          { transform: "translate3d(3px, 0, 0)" },
          { transform: "translate3d(-1px, 0, 0)" },
          { transform: "translate3d(0, 0, 0)" },
        ],
        {
          id: "dialog-shake",
          duration: 320,
          easing: "cubic-bezier(0.36, 0.07, 0.19, 0.97)",
        },
      );
    }
  };

  if (!shown || !mounted) return null;

  return createPortal(
    <div
      className={`dialog-overlay ${leaving ? "is-leaving" : ""} ${overlayClassName}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
      aria-label={label}
      onClick={handleOverlayClick}
    >
      <div
        ref={cardRef}
        className={`dialog-card ${leaving ? "is-leaving" : ""} ${cardClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
