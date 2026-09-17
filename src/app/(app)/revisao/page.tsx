"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  BookMarked,
  Brain,
  ChevronRight,
  GraduationCap,
  Layers,
  PieChart,
  Plus,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";
import { RevisaoProvider, useRevisao } from "@/components/revisao/RevisaoProvider";
import { CadernoList } from "@/components/revisao/CadernoList";
import { QuickCaptureForm } from "@/components/revisao/QuickCaptureForm";
import { FlashcardDeckList } from "@/components/revisao/FlashcardDeckList";
import { RevisaoStats } from "@/components/revisao/RevisaoStats";

type TabId = "caderno" | "flashcards" | "estatisticas";

function RevisaoContent() {
  const { reloadQuestoes, reloadFlashcards, flashcardsDoDia, moduloAtivo } =
    useRevisao();
  const [activeTab, setActiveTab] = useState<TabId>("caderno");
  const [showCaptureModal, setShowCaptureModal] = useState(false);

  useEffect(() => {
    reloadQuestoes();
    reloadFlashcards();
  }, [reloadQuestoes, reloadFlashcards]);

  if (!moduloAtivo) {
    return (
      <div className="mx-auto max-w-lg rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-8 text-center space-y-3">
        <RotateCcw
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
    <div className="space-y-4">
      {/* Header com Abas e Ação Principal */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 place-items-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)]">
            <RotateCcw size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-[var(--ink)]">
              Revisão
            </h1>
            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
              Caderno de Erros & Flashcards de Repetição Espaçada
            </p>
          </div>
        </div>

        {/* Botão de Captura Rápida */}
        <button
          type="button"
          onClick={() => setShowCaptureModal(true)}
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-3.5 py-2 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-95"
        >
          <Plus size={16} />
          Capturar Erro (20s)
        </button>
      </div>

      {/* Navegação de Abas do Módulo */}
      <div className="flex items-center gap-2 border-b border-[var(--line)] pb-1">
        <button
          type="button"
          onClick={() => setActiveTab("caderno")}
          className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
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
          className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
            activeTab === "flashcards"
              ? "bg-[var(--surface)] text-[var(--signal)] shadow-sm"
              : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:text-[var(--ink)]"
          }`}
        >
          <Brain size={14} />
          Flashcards
          {flashcardsDoDia.length > 0 && (
            <span className="grid size-4 place-items-center rounded-full bg-[var(--signal)] text-[9px] font-bold text-white">
              {flashcardsDoDia.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("estatisticas")}
          className={`relative flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
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
      {activeTab === "caderno" && <CadernoList />}
      {activeTab === "flashcards" && <FlashcardDeckList />}
      {activeTab === "estatisticas" && <RevisaoStats />}

      {/* Modal de Captura Rápida */}
      {showCaptureModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
            onClick={() => setShowCaptureModal(false)}
          />

          <div className="relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-[var(--shadow-lg)]">
            <div className="mb-4 flex items-center justify-between border-b border-[var(--line)] pb-3">
              <div>
                <h3 className="text-sm font-bold text-[var(--ink)]">
                  Captura Rápida de Questão
                </h3>
                <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                  Gera automaticamente a entrada no caderno e o flashcard
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowCaptureModal(false)}
                className="rounded-lg p-1.5 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)]"
              >
                <X size={16} />
              </button>
            </div>

            <QuickCaptureForm
              onSuccess={() => {
                setShowCaptureModal(false);
                reloadQuestoes();
                reloadFlashcards();
              }}
            />
          </div>
        </div>
      )}
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
