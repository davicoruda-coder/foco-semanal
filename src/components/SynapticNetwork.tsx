"use client";

import { memo } from "react";

interface Props {
  isRunning: boolean;
  isBursting: boolean;
}

export const SynapticNetwork = memo(function SynapticNetwork({
  isRunning,
  isBursting,
}: Props) {
  const paused = !isRunning ? "is-paused" : "";

  return (
    <div
      aria-hidden="true"
      className={`synaptic-network-overlay pointer-events-none absolute inset-0 z-[1] overflow-hidden rounded-[inherit] transition-opacity duration-700 ${
        isRunning ? "opacity-100" : "opacity-25"
      }`}
    >
      {/* Pulso suave ao dar Play */}
      {isBursting && <div className="synaptic-impulse-beam" />}

      {/* Névoas abstratas deslizantes — sem forma definida */}
      <div className={`syn-wisp sw-1 ${paused}`} />
      <div className={`syn-wisp sw-2 ${paused}`} />
      <div className={`syn-wisp sw-3 ${paused}`} />
      <div className={`syn-wisp sw-4 ${paused}`} />
      <div className={`syn-wisp sw-5 ${paused}`} />
      <div className={`syn-wisp sw-6 ${paused}`} />
      <div className={`syn-wisp sw-7 ${paused}`} />
    </div>
  );
});
