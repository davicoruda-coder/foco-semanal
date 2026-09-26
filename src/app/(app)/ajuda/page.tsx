"use client";

import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  Sparkles,
  Zap,
} from "lucide-react";
import { HelpTutorialSection } from "@/components/ajustes/HelpTutorialSection";

const REGRAS_DE_OURO = [
  {
    title: "Não pule matérias difíceis",
    desc: "Dê peso 2x ou 3x para elas. O ciclo garante pausas antes e depois com disciplinas mais leves.",
  },
  {
    title: "Sempre anote onde parou",
    desc: "Use o campo de notas da matéria. Ao retornar à fila, você retoma o foco em 5 segundos sem atrito.",
  },
  {
    title: "Respeite as pausas da sessão",
    desc: "Ao concluir um bloco, aproveite o descanso configurado. Levante e descanse a vista para renovar a energia.",
  },
  {
    title: "Errou questão? Registre na hora",
    desc: "Na aba Fixar, anote o motivo do erro e gere flashcards. Retenção real vem de transformar falhas em fixação ativa.",
  },
];

export default function AjudaPage() {
  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-5">
      {/* Cabeçalho da página fora dos blocos */}
      <div>
        <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[var(--ink)]">
          Guia Rápido & Tutorial
        </h1>
        <p className="mt-0.5 text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)] sm:text-sm">
          Entenda a metodologia do ciclo de estudos e o fluxo prático de cada ferramenta.
        </p>
      </div>

      {/* Grid Principal do Guia: Tutorial na Esquerda + Dicas de Ouro e Atalhos no Aside */}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_360px]">
        {/* Coluna Principal: Tutorial Interativo (Passo a passo com accordions) */}
        <div className="min-w-0">
          <HelpTutorialSection />
        </div>

        {/* Coluna Lateral: Regras de Ouro & Atalhos */}
        <aside className="space-y-4 lg:sticky lg:top-[4.5rem] lg:self-start">
          {/* Card das Regras de Ouro */}
          <section className="surface p-4 sm:p-5 shadow-xs space-y-3.5">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)] shrink-0">
                <Zap size={18} />
              </div>
              <div>
                <h2 className="font-display text-sm font-semibold tracking-tight text-[var(--ink)] sm:text-base">
                  Regras de Ouro
                </h2>
                <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
                  Constância diária sem burnout
                </p>
              </div>
            </div>

            <div className="space-y-2.5 pt-1">
              {REGRAS_DE_OURO.map((regra, idx) => (
                <div
                  key={idx}
                  className="rounded-[var(--radius-sm)] border border-[var(--line)]/60 bg-[color-mix(in_srgb,var(--ink)_2%,transparent)] p-3 text-xs"
                >
                  <p className="font-semibold text-[var(--ink)] flex items-start gap-2">
                    <CheckCircle2
                      size={15}
                      className="text-[var(--signal)] mt-0.5 shrink-0"
                    />
                    <span>{regra.title}</span>
                  </p>
                  <p className="mt-1 text-[11px] sm:text-xs text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed pl-5.5">
                    {regra.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Card de Atalho para Configurações */}
          <section className="surface p-4 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="grid size-8 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] text-[var(--signal)] shrink-0">
                <Sparkles size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-[var(--ink)]">
                  Quer ajustar sua rotina?
                </p>
                <p className="mt-0.5 text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
                  Defina tempos de foco, descanso e ative módulos opcionais.
                </p>
                <Link
                  href="/ajustes"
                  className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--signal)] hover:underline"
                >
                  <span>Ir para Ajustes</span>
                  <ChevronRight size={14} />
                </Link>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}

