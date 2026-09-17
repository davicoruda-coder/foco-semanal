import React, { useId } from "react";

interface BrandIconProps {
  size?: number;
  className?: string;
  variant?: "squircle" | "plain";
}

/**
 * Ícone oficial FocoHub - "Original Refinado"
 * Traço perfeitamente equilibrado: miolo central sólido e 2 anéis concêntricos uniformes,
 * com gradiente moderno de alto contraste.
 */
export function BrandIcon({
  size = 32,
  className = "",
  variant = "squircle",
}: BrandIconProps) {
  const gradientId = useId();

  if (variant === "plain") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        aria-hidden="true"
      >
        {/* Miolo central sólido */}
        <circle cx="50" cy="50" r="9.8" fill="currentColor" />
        {/* Anel intermediário */}
        <circle
          cx="50"
          cy="50"
          r="22.2"
          stroke="currentColor"
          strokeWidth="6.4"
        />
        {/* Anel externo */}
        <circle
          cx="50"
          cy="50"
          r="36.2"
          stroke="currentColor"
          strokeWidth="6.4"
        />
      </svg>
    );
  }

  return (
    <div
      className={`relative inline-grid shrink-0 place-items-center select-none ${className}`}
      style={{
        width: size,
        height: size,
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="overflow-hidden"
        aria-hidden="true"
        style={{ borderRadius: `${(size * 22) / 100}px` }}
      >
        <defs>
          {/* Gradiente Moderno & Alto Contraste (Violeta vibrante #7062f8 a Índigo profundo #503fe8) */}
          <linearGradient
            id={gradientId}
            x1="10"
            y1="8"
            x2="90"
            y2="92"
            gradientUnits="userSpaceOnUse"
          >
            <stop offset="0%" stopColor="#7062f8" />
            <stop offset="100%" stopColor="#503fe8" />
          </linearGradient>
        </defs>

        {/* Fundo squircle */}
        <rect
          width="100"
          height="100"
          rx="22.5"
          fill={`url(#${gradientId})`}
        />

        {/* Marca: Alvo equilibrado com miolo sólido e 2 anéis concêntricos */}
        <g fill="none">
          {/* Miolo sólido */}
          <circle cx="50" cy="50" r="9.8" fill="#ffffff" />

          {/* Anel interno */}
          <circle
            cx="50"
            cy="50"
            r="22.2"
            stroke="#ffffff"
            strokeWidth="6.4"
          />

          {/* Anel externo */}
          <circle
            cx="50"
            cy="50"
            r="36.2"
            stroke="#ffffff"
            strokeWidth="6.4"
          />
        </g>
      </svg>
    </div>
  );
}
