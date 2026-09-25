"use client";

import {
  CheckCircle2,
  Sparkles,
  Zap,
} from "lucide-react";
import { HelpTutorialSection } from "@/components/ajustes/HelpTutorialSection";

export default function AjudaPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Hero Banner Editorial */}
      <div className="relative overflow-hidden rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--signal)_25%,var(--line))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--signal)_8%,var(--surface)),var(--surface))] p-5 sm:p-7 shadow-[var(--shadow-sm)]">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--signal-soft)] px-3 py-1 text-xs font-semibold text-[var(--signal)]">
            <Sparkles size={14} />
            Central de Ajuda & Metodologia
          </div>
          <h1 className="font-display mt-3 text-xl font-bold tracking-tight text-[var(--ink)] sm:text-2xl md:text-3xl">
            Como dominar o método FocoHub
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[color-mix(in_srgb,var(--ink)_75%,transparent)] sm:text-base">
            O FocoHub foi desenhado para eliminar a paralisia do &ldquo;o que estudar agora&rdquo; através do <strong>Ciclo de Estudos contínuo</strong>, sessões focadas e revisões cirúrgicas.
          </p>
        </div>
      </div>

      {/* Guia Rápido & Tutorial Interativo */}
      <HelpTutorialSection />

      {/* Princípios Essenciais / Regras de Ouro */}
      <section className="surface p-5 sm:p-6">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)]">
            <Zap size={20} />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight text-[var(--ink)] sm:text-lg">
              Regras de Ouro para Estudar Melhor
            </h2>
            <p className="text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
              Princípios da metodologia para manter a constância sem burnout.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div className="rounded-[var(--radius-sm)] border border-[var(--line)]/60 bg-[color-mix(in_srgb,var(--ink)_2.5%,transparent)] p-4">
            <h3 className="text-sm sm:text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <CheckCircle2 size={17} className="text-[var(--signal)] shrink-0" />
              Não pule matérias difíceis
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed">
              Dê peso 2x ou 3x para elas. O ciclo garante que você terá pausas antes e depois com matérias mais leves.
            </p>
          </div>

          <div className="rounded-[var(--radius-sm)] border border-[var(--line)]/60 bg-[color-mix(in_srgb,var(--ink)_2.5%,transparent)] p-4">
            <h3 className="text-sm sm:text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <CheckCircle2 size={17} className="text-[var(--signal)] shrink-0" />
              Sempre anote onde parou
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed">
              Use o campo de anotações da matéria. Quando ela voltar à fila, você retoma o estudo em 5 segundos.
            </p>
          </div>

          <div className="rounded-[var(--radius-sm)] border border-[var(--line)]/60 bg-[color-mix(in_srgb,var(--ink)_2.5%,transparent)] p-4">
            <h3 className="text-sm sm:text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <CheckCircle2 size={17} className="text-[var(--signal)] shrink-0" />
              Respeite as pausas entre as sessões
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed">
              Ao concluir um bloco de foco, aproveite o tempo de descanso configurado por você (ex.: 5 a 15 min). Levante, beba água e descanse a vista para renovar a atenção para a próxima sessão.
            </p>
          </div>

          <div className="rounded-[var(--radius-sm)] border border-[var(--line)]/60 bg-[color-mix(in_srgb,var(--ink)_2.5%,transparent)] p-4">
            <h3 className="text-sm sm:text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <CheckCircle2 size={17} className="text-[var(--signal)] shrink-0" />
              Errou questão? Registre na hora
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed">
              Na aba Fixar, registre a causa do erro e a regra aprendida. A retenção a longo prazo vem de transformar falhas em flashcards com repetição espaçada.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

