/* ------------------------------------------------------------------ */
/*  Algoritmo de repetição espaçada simplificado                       */
/*  Sem dependência externa — usa apenas Date nativo.                  */
/* ------------------------------------------------------------------ */

import type { NivelDominio } from "./types";

/**
 * Dado o nível de domínio atual e a resposta do aluno,
 * retorna { proximaRevisao, novoNivel }.
 *
 * Resposta:
 *  "errei"   → volta a nível 0, revisa em 1 dia
 *  "dificil" → mantém ou sobe para 1, revisa em 1–2 dias
 *  "bom"     → sobe para 2, revisa em 4–7 dias
 *  "facil"   → sobe para 3, revisa em 15–30 dias
 */
export type RespostaRevisao = "errei" | "dificil" | "bom" | "facil";

export const RESPOSTA_LABEL: Record<RespostaRevisao, string> = {
  errei: "Errei de novo",
  dificil: "Difícil",
  bom: "Bom",
  facil: "Fácil / Dominado",
};

interface SpacedResult {
  proximaRevisao: string; // "YYYY-MM-DD"
  novoNivel: NivelDominio;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function calcularProximaRevisao(
  nivelAtual: NivelDominio,
  resposta: RespostaRevisao,
): SpacedResult {
  const hoje = new Date();

  switch (resposta) {
    case "errei":
      return {
        novoNivel: 0,
        proximaRevisao: formatDate(addDays(hoje, 1)),
      };

    case "dificil":
      return {
        novoNivel: Math.min(1, nivelAtual) as NivelDominio,
        proximaRevisao: formatDate(addDays(hoje, nivelAtual === 0 ? 1 : 2)),
      };

    case "bom":
      return {
        novoNivel: 2,
        proximaRevisao: formatDate(addDays(hoje, nivelAtual <= 1 ? 4 : 7)),
      };

    case "facil":
      return {
        novoNivel: 3,
        proximaRevisao: formatDate(addDays(hoje, nivelAtual <= 2 ? 15 : 30)),
      };
  }
}

/**
 * Retorna a cor CSS (variável) adequada ao nível de domínio.
 */
export function corNivelDominio(nivel: NivelDominio): string {
  switch (nivel) {
    case 0:
      return "var(--danger, #ef4444)";
    case 1:
      return "var(--warn, #f59e0b)";
    case 2:
      return "var(--signal, #3b82f6)";
    case 3:
      return "var(--success, #22c55e)";
  }
}
