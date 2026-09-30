"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookMarked,
  ChevronRight,
  Layers,
  MessageCircleQuestion,
  PieChart,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { FlashcardsIcon } from "@/components/FlashcardsIcon";
import { DialogFrame } from "@/components/DialogFrame";
import { RevisaoProvider, useRevisao } from "@/components/revisao/RevisaoProvider";
import { CadernoList } from "@/components/revisao/CadernoList";
import { QuickCaptureForm } from "@/components/revisao/QuickCaptureForm";
import { FlashcardDeckList } from "@/components/revisao/FlashcardDeckList";
import { RevisaoStats } from "@/components/revisao/RevisaoStats";
import { AIFlashcardGenerator } from "@/components/revisao/AIFlashcardGenerator";
import { TiraDuvidas } from "@/components/revisao/TiraDuvidas";

type TabId = "caderno" | "flashcards" | "tira-duvidas" | "estatisticas";

function RevisaoContent() {
  const { reloadQuestoes, reloadFlashcards, flashcardsDoDia, moduloAtivo } =
    useRevisao();
  const [activeTab, setActiveTab] = useState<TabId>("caderno");
  const [showCaptureModal, setShowCaptureModal] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiInitialData, setAiInitialData] = useState<{ text?: string; disciplina?: string }>({});

  useEffect(() => {
    reloadQuestoes();
    reloadFlashcards();
  }, [reloadQuestoes, reloadFlashcards]);

  if (!moduloAtivo) {
    return (
      <div className="mx-auto max-w-lg rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-8 text-center space-y-3">
        <FlashcardsIcon
          size={36}
          className="mx-auto text-[color-mix(in_srgb,var(--ink)_40%,transparent)]"
        />
        <h2 className="text-base font-semibold text-[var(--ink)]">
          Módulo Revisão Desativado
        </h2>
        <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)] leading-relaxed">
          O módulo de Estudo Reverso e Flashcards está desativado nas configurações do seu perfil.
        </p>
        <Link
          href="/ajustes"
          className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--signal)] hover:underline"
        >
          Ir para Ajustes para reativar <ChevronRight size={14} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-full min-w-0">
      {/* Header com Abas e Ação Principal */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div className="min-w-0 max-w-full">
          <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[var(--ink)] flex flex-wrap items-center gap-2">
            Fixação Ativa
            <span className="rounded-full bg-[var(--signal)] px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
              IA
            </span>
          </h1>
        </div>

        {/* Ações: Gerar com IA e Captura Rápida */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setAiInitialData({});
              setShowAIModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] bg-[var(--surface)] px-3.5 py-2 text-xs sm:text-sm font-semibold text-[var(--signal)] shadow-xs transition hover:bg-[var(--signal-soft)] active:scale-95"
            title="Criar flashcards automaticamente a partir de texto com IA"
          >
            <Sparkles size={16} />
            <span>
              Gerar Flashcards <span className="hidden sm:inline">com IA</span>
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowCaptureModal(true)}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-3.5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
          >
            <Plus size={16} />
            Anotar no Caderno
          </button>
        </div>
      </div>

      {/* Navegação de Abas do Módulo com scroll horizontal seguro */}
      <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto scrollbar-none border-b border-[var(--line)] pb-1 max-w-full -mx-0.5 px-0.5">
        <button
          type="button"
          onClick={() => setActiveTab("caderno")}
          className={`shrink-0 whitespace-nowrap relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            activeTab === "caderno"
              ? "bg-[var(--surface)] text-[var(--signal)] shadow-sm"
              : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)]"
          }`}
        >
          <BookMarked size={14} />
          Caderno de Erros
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("flashcards")}
          className={`shrink-0 whitespace-nowrap relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            activeTab === "flashcards"
              ? "bg-[var(--surface)] text-[var(--signal)] shadow-sm"
              : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)]"
          }`}
        >
          <Layers size={14} />
          Flashcards
          {flashcardsDoDia.length > 0 && (
            <span className="grid size-4 place-items-center rounded-full bg-[var(--signal)] text-[9px] font-bold text-white">
              {flashcardsDoDia.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tira-duvidas")}
          className={`shrink-0 whitespace-nowrap relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            activeTab === "tira-duvidas"
              ? "bg-[var(--surface)] text-[var(--signal)] shadow-sm"
              : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)]"
          }`}
        >
          <MessageCircleQuestion size={14} />
          Tira-Dúvidas
          <span className="rounded-full bg-gradient-to-r from-[var(--signal)] to-[color-mix(in_srgb,#f59e0b_50%,var(--signal))] px-1.5 py-px text-[9px] font-bold text-white leading-none">
            IA
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("estatisticas")}
          className={`shrink-0 whitespace-nowrap relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            activeTab === "estatisticas"
              ? "bg-[var(--surface)] text-[var(--signal)] shadow-sm"
              : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)]"
          }`}
        >
          <PieChart size={14} />
          Diagnóstico
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === "caderno" && (
        <CadernoList
          onGenerateWithAI={(text, disciplina) => {
            setAiInitialData({ text, disciplina });
            setShowAIModal(true);
          }}
        />
      )}
      {activeTab === "flashcards" && <FlashcardDeckList />}
      {activeTab === "tira-duvidas" && <TiraDuvidas />}
      {activeTab === "estatisticas" && <RevisaoStats />}

      {/* Modal de Captura Rápida com DialogFrame e Header Fixo */}
      <DialogFrame
        open={showCaptureModal}
        onClose={() => setShowCaptureModal(false)}
        labelledBy="capture-modal-title"
        cardClassName="surface flex max-h-[85vh] sm:max-h-[88vh] w-full max-w-xl flex-col overflow-hidden p-0 shadow-[var(--shadow-lg)] border border-[var(--line)] rounded-[var(--radius)]"
      >
        <div className="flex flex-col h-full max-h-[85vh] sm:max-h-[88vh] min-h-0">
          {/* Header Fixo (Nunca corta nem some com o scroll) */}
          <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--mist)]/40 px-4 sm:px-5 py-3 sm:py-3.5 shrink-0">
            <div className="min-w-0 pr-2">
              <h3 id="capture-modal-title" className="font-display text-sm sm:text-base font-bold text-[var(--ink)] truncate">
                Anotar no Caderno
              </h3>
              <p className="text-[11px] sm:text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)] truncate">
                Registre seu erro, chute ou dúvida e decida se quer criar flashcards
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCaptureModal(false)}
              className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition shrink-0"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Conteúdo com Scroll interno perfeito */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0">
            <QuickCaptureForm
              onSuccess={() => {
                setShowCaptureModal(false);
                reloadQuestoes();
                reloadFlashcards();
              }}
              onSwitchToAI={() => {
                setShowCaptureModal(false);
                setAiInitialData({});
                setShowAIModal(true);
              }}
            />
          </div>
        </div>
      </DialogFrame>

      {/* Modal de Geração com IA com DialogFrame e Header Fixo */}
      <DialogFrame
        open={showAIModal}
        onClose={() => setShowAIModal(false)}
        labelledBy="ai-generator-dialog-title"
        cardClassName="surface flex max-h-[85vh] sm:max-h-[88vh] w-full max-w-2xl flex-col overflow-hidden p-0 shadow-[var(--shadow-lg)] border border-[var(--line)] rounded-[var(--radius)]"
      >
        <div className="flex flex-col h-full max-h-[85vh] sm:max-h-[88vh] min-h-0">
          <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--mist)]/40 px-4 sm:px-5 py-3 sm:py-3.5 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0 pr-2">
              <div className="grid size-8 sm:size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[color-mix(in_srgb,var(--signal)_20%,var(--surface))] to-[color-mix(in_srgb,#a855f7_15%,var(--surface))] text-[var(--signal)]">
                <Sparkles size={18} />
              </div>
              <div className="min-w-0">
                <h3 id="ai-generator-dialog-title" className="font-display text-sm sm:text-base font-bold text-[var(--ink)] truncate">
                  Gerar Flashcards com IA
                </h3>
                <p className="text-[11px] sm:text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)] truncate">
                  Cole seu resumo ou teoria para gerar perguntas e respostas automaticamente
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowAIModal(false)}
              className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition shrink-0"
              aria-label="Fechar"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 sm:p-5 min-h-0">
            <AIFlashcardGenerator
              initialText={aiInitialData.text}
              initialDisciplina={aiInitialData.disciplina}
              showHeader={false}
              onClose={() => {
                setShowAIModal(false);
                reloadFlashcards();
              }}
            />
          </div>
        </div>
      </DialogFrame>
    </div>
  );
}

export default function RevisaoPage() {
  return (
    <RevisaoProvider>
      <RevisaoContent />
    </RevisaoProvider>
  );
}
