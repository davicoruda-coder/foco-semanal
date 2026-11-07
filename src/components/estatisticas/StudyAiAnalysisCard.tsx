"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  FileDown,
  AlertCircle,
  BookOpenCheck,
  ShieldAlert,
} from "lucide-react";

export interface StudyAiAnalysisCardProps {
  periodLabel: string;
  analysis: string | null;
  generatedAt: string | null;
  loading: boolean;
  error: string | null;
  onGenerate: () => Promise<void>;
  onExportPdf: () => void;
}

export function StudyAiAnalysisCard({
  periodLabel,
  analysis,
  generatedAt,
  loading,
  error,
  onGenerate,
  onExportPdf,
}: StudyAiAnalysisCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!analysis) return;
    navigator.clipboard.writeText(analysis).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <section className="surface p-4 sm:p-5 shadow-xs space-y-4 rounded-[var(--radius)] border border-[var(--line)]">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)]/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)] flex-shrink-0">
            <Sparkles size={17} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--ink)]">
                Parecer Pedagógico de Desempenho
              </h3>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--signal-soft)] text-[var(--signal)]">
                IA Científica
              </span>
            </div>
            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
              Análise fundamentada em evidências de aprendizagem • {periodLabel}
            </p>
          </div>
        </div>

        {/* Ações no topo */}
        {analysis && !loading && (
          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            <button
              type="button"
              onClick={handleCopy}
              className="btn px-2.5 py-1 text-xs font-medium bg-[var(--mist)] hover:bg-[var(--line)] text-[var(--ink)] shadow-2xs gap-1"
              title="Copiar texto da análise"
            >
              {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
              <span>{copied ? "Copiado!" : "Copiar"}</span>
            </button>

            <button
              type="button"
              onClick={onExportPdf}
              className="btn px-2.5 py-1 text-xs font-medium bg-[var(--mist)] hover:bg-[var(--line)] text-[var(--ink)] shadow-2xs gap-1"
              title="Exportar no PDF"
            >
              <FileDown size={13} />
              <span>Exportar no PDF</span>
            </button>

            <button
              type="button"
              onClick={() => void onGenerate()}
              className="btn px-2.5 py-1 text-xs font-medium bg-[var(--mist)] hover:bg-[var(--line)] text-[var(--ink)] shadow-2xs gap-1"
              title="Regerar análise"
            >
              <RefreshCw size={13} />
              <span>Atualizar</span>
            </button>
          </div>
        )}
      </div>

      {/* Estado: Carregando */}
      {loading && (
        <div className="py-8 text-center space-y-3">
          <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--signal-soft)] text-[var(--signal)] animate-spin">
            <RefreshCw size={20} />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-semibold text-[var(--ink)]">
              Sintetizando métricas e consultando literatura cognitiva...
            </p>
            <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
              Avaliando prática espaçada, alternância do ciclo e gestão de carga cognitiva.
            </p>
          </div>
        </div>
      )}

      {/* Estado: Erro */}
      {!loading && error && (
        <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/50 dark:bg-rose-950/20 text-xs space-y-2">
          <div className="flex items-center gap-2 text-rose-700 dark:text-rose-400 font-semibold">
            <AlertCircle size={15} />
            <span>Não foi possível gerar a análise</span>
          </div>
          <p className="text-[11px] text-rose-600 dark:text-rose-300">{error}</p>
          <button
            type="button"
            onClick={() => void onGenerate()}
            className="btn text-xs font-medium bg-white dark:bg-zinc-800 text-rose-700 dark:text-rose-300 shadow-2xs hover:bg-rose-100"
          >
            Tentar novamente
          </button>
        </div>
      )}

      {/* Estado: Parecer Gerado */}
      {!loading && !error && analysis && (
        <div className="space-y-3.5 text-xs text-[var(--ink)] leading-relaxed">
          <div className="prose prose-xs max-w-none space-y-3">
            {analysis.split("\n\n").map((block, idx) => {
              const trimmed = block.trim();
              if (!trimmed) return null;

              if (trimmed.startsWith("###")) {
                const title = trimmed.replace(/^###\s*/, "");
                return (
                  <h4
                    key={idx}
                    className="text-xs font-bold text-[var(--signal)] uppercase tracking-wide pt-2 first:pt-0 border-b border-[var(--line)]/40 pb-1"
                  >
                    {title}
                  </h4>
                );
              }

              if (trimmed.startsWith("•") || trimmed.startsWith("-")) {
                const items = trimmed.split("\n").filter(Boolean);
                return (
                  <ul key={idx} className="list-disc pl-4 space-y-1 text-[12px] opacity-90">
                    {items.map((item, i) => (
                      <li key={i}>{item.replace(/^[-•*]\s*/, "")}</li>
                    ))}
                  </ul>
                );
              }

              return (
                <p key={idx} className="text-[12px] opacity-90">
                  {trimmed}
                </p>
              );
            })}
          </div>

          {/* Box de Cautela e Ética */}
          <div className="mt-4 p-3 rounded-xl bg-[var(--signal-soft)]/40 border border-[var(--signal)]/20 flex items-start gap-2.5">
            <ShieldAlert size={16} className="text-[var(--signal)] flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-[11px]">
              <span className="font-semibold text-[var(--ink)]">
                Nota de Cautela & Individualidade:
              </span>
              <p className="text-[color-mix(in_srgb,var(--ink)_75%,transparent)]">
                Este parecer apresenta padrões observados com base na literatura científica (Dunlosky, Roediger, Sweller, Cepeda). Cada
                pessoa tem rotinas, cansaço e contextos distintos — adapte sempre as sugestões ao
                seu bem-estar e ritmo sustentável.{" "}
                <Link
                  href="/ajuda"
                  className="text-[var(--signal)] underline hover:opacity-80 font-medium inline-flex items-center gap-0.5 ml-1"
                >
                  Ver resumo dos estudos em Ajuda →
                </Link>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estado: Sem análise gerada ainda (Idle) */}
      {!loading && !error && !analysis && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-[var(--mist)]/70 border border-[var(--line)]/50">
          <div className="flex items-start gap-2.5">
            <BookOpenCheck size={18} className="text-[var(--signal)] flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5 text-xs">
              <span className="font-medium text-[var(--ink)]">
                Avaliação de consistência, distribuição e saúde das revisões
              </span>
              <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
                Gere um parecer responsável baseado em evidências cognitivas (Dunlosky, Roediger,
                Sweller, Cepeda) para orientar seus próximos passos com segurança.{" "}
                <Link
                  href="/ajuda"
                  className="text-[var(--signal)] underline hover:opacity-80 font-medium inline-flex items-center gap-0.5 ml-1"
                >
                  Entenda a base científica →
                </Link>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => void onGenerate()}
            className="btn whitespace-nowrap px-3.5 py-2 text-xs font-semibold bg-[var(--signal)] hover:opacity-90 text-white shadow-xs gap-1.5 self-start sm:self-auto"
          >
            <Sparkles size={14} strokeWidth={2.2} />
            <span>Gerar Análise com IA</span>
          </button>
        </div>
      )}
    </section>
  );
}

