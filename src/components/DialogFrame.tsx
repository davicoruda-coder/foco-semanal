"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
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
  const [shaking, setShaking] = useState(false);
  const shakeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (shakeTimeoutRef.current) {
        clearTimeout(shakeTimeoutRef.current);
      }
    };
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

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Garante que o clique foi no próprio overlay e não em elementos internos
    if (e.target !== e.currentTarget) return;

    if (closeOnOutsideClick) {
      onClose();
    } else {
      // Trava de segurança: impede o fechamento acidental ao clicar fora.
      // Ativa efeito visual sutil de alerta/trava para sinalizar ao usuário.
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
      setShaking(false);
      requestAnimationFrame(() => {
        setShaking(true);
        shakeTimeoutRef.current = setTimeout(() => {
          setShaking(false);
          shakeTimeoutRef.current = null;
        }, 320);
      });
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
        className={`dialog-card ${leaving ? "is-leaving" : ""} ${shaking ? "dialog-shake" : ""} ${cardClassName}`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
