"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  HelpCircle,
  Layers,
  PieChart,
  Target,
} from "lucide-react";
import {
  CAUSA_ERRO_LABEL,
  STATUS_RESULTADO_LABEL,
  type CausaErro,
  type StatusResultado,
} from "@/lib/revisao/types";
import { useRevisao } from "./RevisaoProvider";

export function RevisaoStats() {
  const { stats, reloadStats } = useRevisao();

  useEffect(() => {
    reloadStats();
  }, [reloadStats]);

  if (!stats) {
    return (
      <div className="py-12 text-center text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
        Calculando métricas do caderno...
      </div>
    );
  }

  const total = stats.totalQuestoes;
  const causasEntries = Object.entries(stats.porCausa);
  const disciplinasEntries = Object.entries(stats.porDisciplina).sort(
    ([, a], [, b]) => b - a,
  );
  const bancasEntries = Object.entries(stats.porBanca).sort(
    ([, a], [, b]) => b - a,
  );

  return (
    <div className="space-y-4">
      {/* Cards de Métricas Principais */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
            Total no Caderno
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-[var(--ink)]">{total}</span>
            <Layers size={18} className="text-[var(--signal)] opacity-80" />
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
            Cards Pendentes Hoje
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-[var(--signal)]">
              {stats.flashcardsPendentes}
            </span>
            <Brain size={18} className="text-[var(--signal)] opacity-80" />
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
            Pegadinhas Mapeadas
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-[#8b5cf6]">
              {stats.porResultado["pegadinha"] || 0}
            </span>
            <AlertTriangle size={18} className="text-[#8b5cf6] opacity-80" />
          </div>
        </div>

        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3.5 space-y-1">
          <span className="text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
            Acertos no Chute
          </span>
          <div className="flex items-center justify-between">
            <span className="text-xl font-bold text-[#f59e0b]">
              {stats.porResultado["chute"] || 0}
            </span>
            <HelpCircle size={18} className="text-[#f59e0b] opacity-80" />
          </div>
        </div>
      </div>

      {/* Gráficos de Distribuição */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Diagnóstico Causa Raiz */}
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-4 space-y-3">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
            <Target size={14} className="text-[var(--signal)]" />
            Diagnóstico de Causa Raiz
          </h4>

          {total === 0 ? (
            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
              Sem dados suficientes ainda.
            </p>
          ) : (
            <div className="space-y-2.5">
              {(
                [
                  { key: "atencao", label: "Falta de Atenção", color: "#f59e0b" },
                  { key: "teoria", label: "Teoria / Conceito", color: "#ef4444" },
                  { key: "interpretacao", label: "Interpretação", color: "#3b82f6" },
                ] as const
              ).map(({ key, label, color }) => {
                const count = stats.porCausa[key] || 0;
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;

                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[var(--ink)]">{label}</span>
                      <span className="text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                        {count} ({percent}%)
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--mist)]">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top Disciplinas com Mais Erros */}
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-4 space-y-3">
          <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--ink)]">
            <PieChart size={14} className="text-[var(--signal)]" />
            Disciplinas com Mais Erros
          </h4>

          {disciplinasEntries.length === 0 ? (
            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
              Nenhuma disciplina registrada.
            </p>
          ) : (
            <div className="space-y-2">
              {disciplinasEntries.slice(0, 5).map(([disc, count]) => {
                const percent = total > 0 ? Math.round((count / total) * 100) : 0;

                return (
                  <div key={disc} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="font-medium text-[var(--ink)] truncate max-w-[200px]">
                        {disc}
                      </span>
                      <span className="text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                        {count} questões
                      </span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--mist)]">
                      <div
                        className="h-full bg-[var(--signal)] rounded-full"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
