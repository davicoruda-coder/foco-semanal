import React from "react";

interface FlashcardsIconProps extends React.SVGAttributes<SVGElement> {
  size?: number | string;
  strokeWidth?: number | string;
  className?: string;
}

/**
 * Ícone clássico de Flashcards (dois cartões sobrepostos com cantos arredondados).
 * Padrão internacional de estudo e repetição espaçada.
 * Perfeitamente equilibrado e centralizado na grade 24x24 com espessura proporcional ao Lucide.
 */
export function FlashcardsIcon({
  size = 24,
  strokeWidth = 2,
  className = "",
  ...props
}: FlashcardsIconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Cartão frontal com cantos arredondados */}
      <rect x="4.5" y="4.5" width="12" height="11" rx="2.5" />
      {/* Cartão de trás sobreposto */}
      <path d="M16.5 7.5H17a2.5 2.5 0 0 1 2.5 2.5v7a2.5 2.5 0 0 1-2.5 2.5h-7a2.5 2.5 0 0 1-2.5-2.5v-.5" />
    </svg>
  );
}
