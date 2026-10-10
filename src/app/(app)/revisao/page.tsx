"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookMarked,
  Bot,
  ChevronRight,
  Layers,
  MessageCircleQuestion,
  X,
} from "lucide-react";
import { FlashcardsIcon } from "@/components/FlashcardsIcon";
import { DialogFrame } from "@/components/DialogFrame";
import { RevisaoProvider, useRevisao } from "@/components/revisao/RevisaoProvider";
import { CadernoList } from "@/components/revisao/CadernoList";
import { QuickCaptureForm } from "@/components/revisao/QuickCaptureForm";
import { FlashcardDeckList } from "@/components/revisao/FlashcardDeckList";
import { AIFlashcardGenerator } from "@/components/revisao/AIFlashcardGenerator";
import { TiraDuvidas } from "@/components/revisao/TiraDuvidas";

type TabId = "caderno" | "flashcards" | "tira-duvidas";

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
      {/* Header do Módulo */}
      <div className="border-b border-[var(--line)] pb-2.5">
        <h1 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-[var(--ink)] flex items-center gap-2">
          Fixação Ativa
          <span className="rounded-full bg-[var(--signal)] px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
            IA
          </span>
        </h1>
      </div>

      {/* Navegação de Abas do Módulo (Segmented Control em 3 colunas — espaçoso e sem aperto) */}
      <div className="grid grid-cols-3 w-full items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--mist)] p-1">
        <button
          type="button"
          onClick={() => setActiveTab("caderno")}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-1 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition ${
            activeTab === "caderno"
              ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs"
              : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)]"
          }`}
        >
          <BookMarked size={16} className="shrink-0 sm:size-3.5" />
          <span className="sm:hidden tracking-tight">Caderno</span>
          <span className="hidden sm:inline whitespace-nowrap">Caderno de Erros</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("flashcards")}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-1 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition ${
            activeTab === "flashcards"
              ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs"
              : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)]"
          }`}
        >
          <div className="relative inline-flex items-center justify-center">
            <Layers size={16} className="shrink-0 sm:size-3.5" />
            {flashcardsDoDia.length > 0 && (
              <span className="absolute -top-1 -right-2.5 sm:hidden grid min-w-3.5 h-3.5 place-items-center rounded-full bg-[var(--warn)] px-0.5 text-[8px] font-bold text-white dark:text-neutral-950 font-mono-num leading-none shadow-xs">
                {flashcardsDoDia.length}
              </span>
            )}
          </div>
          <span className="sm:hidden tracking-tight">Cards</span>
          <span className="hidden sm:inline whitespace-nowrap">Flashcards</span>
          {flashcardsDoDia.length > 0 && (
            <span className="hidden sm:grid size-4 shrink-0 place-items-center rounded-full bg-[var(--warn)] text-[9px] font-bold text-white dark:text-neutral-950 font-mono-num">
              {flashcardsDoDia.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("tira-duvidas")}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-lg px-1 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold transition ${
            activeTab === "tira-duvidas"
              ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs"
              : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)]"
          }`}
        >
          <div className="relative inline-flex items-center justify-center">
            <MessageCircleQuestion size={16} className="shrink-0 sm:size-3.5" />
            <span className="absolute -top-1 -right-2.5 sm:hidden shrink-0 rounded-full bg-gradient-to-r from-[var(--signal)] to-[color-mix(in_srgb,#f59e0b_50%,var(--signal))] px-0.5 py-px text-[7.5px] font-bold text-white leading-none shadow-xs">
              IA
            </span>
          </div>
          <span className="sm:hidden tracking-tight">Dúvidas</span>
          <span className="hidden sm:inline whitespace-nowrap">Tira-Dúvidas</span>
          <span className="hidden sm:inline-block shrink-0 rounded-full bg-gradient-to-r from-[var(--signal)] to-[color-mix(in_srgb,#f59e0b_50%,var(--signal))] px-1 py-px text-[9px] font-bold text-white leading-none">
            IA
          </span>
        </button>
      </div>

      {/* Conteúdo da Aba Ativa */}
      {activeTab === "caderno" && (
        <CadernoList
          onNewQuestao={() => setShowCaptureModal(true)}
          onGenerateWithAI={(text, disciplina) => {
            setAiInitialData({ text, disciplina });
            setShowAIModal(true);
          }}
        />
      )}
      {activeTab === "flashcards" && <FlashcardDeckList />}
      {activeTab === "tira-duvidas" && <TiraDuvidas />}

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
                <Bot size={18} />
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
