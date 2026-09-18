"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Settings,
  Sparkles,
  Zap,
} from "lucide-react";
import { HelpTutorialSection } from "@/components/ajustes/HelpTutorialSection";

export default function AjudaPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      {/* Top Header / Breadcrumb */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <Link
          href="/hoje"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium text-[color-mix(in_srgb,var(--ink)_65%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
        >
          <ArrowLeft size={16} />
          Voltar para Hoje
        </Link>

        <Link
          href="/ajustes"
          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-medium text-[color-mix(in_srgb,var(--ink)_65%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
        >
          <Settings size={15} />
          Ajustes do Sistema
        </Link>
      </div>

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
              Respeite os 5 minutos de pausa
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed">
              Ao terminar o bloco de foco, levante, beba água e descanse a vista. Isso restaura a atenção para o próximo bloco.
            </p>
          </div>

          <div className="rounded-[var(--radius-sm)] border border-[var(--line)]/60 bg-[color-mix(in_srgb,var(--ink)_2.5%,transparent)] p-4">
            <h3 className="text-sm sm:text-base font-semibold text-[var(--ink)] flex items-center gap-2">
              <CheckCircle2 size={17} className="text-[var(--signal)] shrink-0" />
              Errou questão? Registre na hora
            </h3>
            <p className="mt-1.5 text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed">
              Na aba Revisão, cadastre a causa do erro em 20s. A retenção a longo prazo vem de transformar falhas em flashcards.
            </p>
          </div>
        </div>
      </section>

      {/* Link de Retorno aos Ajustes */}
      <div className="surface p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-semibold text-[var(--ink)]">
            Precisa configurar notificações, alarmes ou senhas?
          </h3>
          <p className="text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_70%,transparent)] mt-0.5">
            Acesse as preferências técnicas e opções de sincronização da sua conta.
          </p>
        </div>
        <Link
          href="/ajustes"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
        >
          Ir para Ajustes <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
}
