import React from "react";

interface FormattedRuleTextProps {
  text: string;
  className?: string;
}

/**
 * Renderiza textos de estudo e fichas de revisão de forma limpa,
 * convertendo divisores ASCII (como === ou ---) em linhas horizontais sutis,
 * preservando parágrafos e quebra responsiva de palavras.
 */
export function FormattedRuleText({
  text,
  className = "text-sm font-medium text-[var(--ink)] leading-relaxed",
}: FormattedRuleTextProps) {
  if (!text) return null;

  const lines = text.split("\n");
  const isDividerOnly = (line: string) => /^[=\-_*~#]{3,}$/.test(line.trim());

  return (
    <div className={`space-y-0.5 select-text ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (isDividerOnly(trimmed)) {
          return (
            <hr
              key={idx}
              className="my-2 border-t border-[var(--line)] opacity-60"
            />
          );
        }
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }
        return (
          <p key={idx} className="break-words [overflow-wrap:anywhere]">
            {line}
          </p>
        );
      })}
    </div>
  );
}
