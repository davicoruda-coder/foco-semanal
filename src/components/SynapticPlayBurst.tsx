"use client";

import { memo } from "react";

interface Props {
  active: boolean;
}

export const SynapticPlayBurst = memo(function SynapticPlayBurst({
  active,
}: Props) {
  if (!active) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[2] overflow-hidden rounded-[inherit]"
    >
      {/* Feixe elétrico principal que viaja da esquerda para a direita (como no Vídeo 1) */}
      <div className="synaptic-impulse-beam" />

      {/* Rede de fibras axônicas neurais e nós dourados (como nos Vídeos 1 e 2) */}
      <svg
        className="synaptic-fiber-svg absolute inset-0 size-full"
        viewBox="0 0 800 60"
        preserveAspectRatio="none"
      >
        <defs>
          {/* Gradiente elétrico ciano/violeta para as fibras */}
          <linearGradient id="syn-cyan-grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.1" />
            <stop offset="35%" stopColor="#38bdf8" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#c084fc" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
          </linearGradient>

          {/* Brilho âmbar/dourado dos nós de sinapse */}
          <radialGradient id="syn-amber-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#fffbeb" stopOpacity="1" />
            <stop offset="30%" stopColor="#fef08a" stopOpacity="0.95" />
            <stop offset="65%" stopColor="#fbbf24" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Fibra axônica superior */}
        <path
          d="M -10 32 Q 180 8, 360 28 T 720 16 L 810 24"
          fill="none"
          stroke="url(#syn-cyan-grad)"
          strokeWidth="1.75"
          className="synaptic-path-dash path-1"
        />

        {/* Fibra axônica central ondulada */}
        <path
          d="M -10 22 Q 230 48, 450 14 T 810 34"
          fill="none"
          stroke="url(#syn-cyan-grad)"
          strokeWidth="1.5"
          className="synaptic-path-dash path-2"
        />

        {/* Fibra axônica inferior */}
        <path
          d="M -10 38 Q 150 20, 330 44 T 690 28 L 810 20"
          fill="none"
          stroke="url(#syn-cyan-grad)"
          strokeWidth="1.25"
          className="synaptic-path-dash path-3"
        />

        {/* Nós sinápticos dourados que acendem em cascata com o avanço do impulso */}
        <circle
          cx="160"
          cy="20"
          r="4.5"
          fill="url(#syn-amber-glow)"
          className="syn-node node-1"
        />
        <circle
          cx="295"
          cy="30"
          r="5.5"
          fill="url(#syn-amber-glow)"
          className="syn-node node-2"
        />
        <circle
          cx="445"
          cy="16"
          r="6"
          fill="url(#syn-amber-glow)"
          className="syn-node node-3"
        />
        <circle
          cx="575"
          cy="32"
          r="5"
          fill="url(#syn-amber-glow)"
          className="syn-node node-4"
        />
        <circle
          cx="700"
          cy="22"
          r="5.5"
          fill="url(#syn-amber-glow)"
          className="syn-node node-5"
        />
      </svg>
    </div>
  );
});
