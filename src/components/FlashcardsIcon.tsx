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
      {/* Cartão frontal com proporção equilibrada ao Lucide */}
      <rect x="3" y="6" width="14" height="14" rx="2" />
      {/* Cartão de trás com respiro e cantos arredondados */}
      <path d="M7 6V4a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" />
    </svg>
  );
}
