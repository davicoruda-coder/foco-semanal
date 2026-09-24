"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle,
  Loader2,
  Sparkles,
  Trash2,
  X,
  Check,
  FileText,
  Bot,
} from "lucide-react";
import { useRevisao } from "./RevisaoProvider";

const MAX_GENERATIONS_PER_DAY = 15;
const MIN_TEXT_LENGTH = 15;
const MAX_TEXT_LENGTH = 8000;

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function AIFlashcardGenerator({
  onClose,
  initialText = "",
  initialDisciplina = "",
}: {
  onClose?: () => void;
  initialText?: string;
  initialDisciplina?: string;
}) {
  const {
    materias,
    generateFlashcardsIA,
    aiGenerationsToday,
    aiGenerating,
    aiConfig,
  } = useRevisao();

  /* State */
  const [texto, setTexto] = useState(initialText);
  const [disciplina, setDisciplina] = useState(initialDisciplina);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (initialText) setTexto(initialText);
    if (initialDisciplina) setDisciplina(initialDisciplina);
  }, [initialText, initialDisciplina]);

  // Preview state (after generation)
  type PreviewCard = { frente: string; verso: string; selected: boolean };
  const [previewCards, setPreviewCards] = useState<PreviewCard[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Feedback
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);
  const [savedCount, setSavedCount] = useState<number | null>(null);

  const isMaster = Boolean(aiConfig?.isMaster);
  const limitEnabled = aiConfig ? aiConfig.limitEnabled : true;
  const isUnlimited = isMaster || !limitEnabled;
  const dailyLimit = aiConfig?.dailyLimit ?? MAX_GENERATIONS_PER_DAY;
  const remaining = isUnlimited
    ? null
    : (aiConfig?.remaining ?? Math.max(0, dailyLimit - aiGenerationsToday));
  const canGenerate = isUnlimited || (remaining !== null && remaining > 0);
  const textLength = texto.trim().length;
  const isValid =
    textLength >= MIN_TEXT_LENGTH &&
    textLength <= MAX_TEXT_LENGTH &&
    disciplina.trim().length > 0;

  /* Filtered matérias for dropdown */
  const filteredMaterias = useMemo(() => {
    const q = disciplina.trim().toLowerCase();
    if (!q) return materias;
    return materias.filter((m) => m.nome.toLowerCase().includes(q));
  }, [materias, disciplina]);

  /* Generate */
  const handleGenerate = useCallback(async () => {
    if (!isValid || aiGenerating || !canGenerate) return;
    setFeedback(null);
    setSavedCount(null);

    const result = await generateFlashcardsIA(texto.trim(), disciplina.trim());

    if (!result.ok) {
      setFeedback({ ok: false, msg: result.error || "Erro desconhecido." });
      return;
    }

    // Show preview
    if (result.cards && result.cards.length > 0) {
      setPreviewCards(
        result.cards.map((c) => ({
          frente: typeof c.frente === "string" ? c.frente : "",
          verso: typeof c.verso === "string" ? c.verso : "",
          selected: true,
        })),
      );
      setShowPreview(true);
      setSavedCount(result.count ?? result.cards.length);
      setFeedback({
        ok: true,
        msg: `✅ ${result.count ?? result.cards.length} flashcards gerados e salvos no deck de "${disciplina}"!`,
      });
    }
  }, [isValid, aiGenerating, canGenerate, texto, disciplina, generateFlashcardsIA]);

  /* Reset for new generation */
  const handleReset = useCallback(() => {
    setTexto("");
    setDisciplina("");
    setPreviewCards([]);
    setShowPreview(false);
    setFeedback(null);
    setSavedCount(null);
  }, []);

  /* Toggle card selection */
  const toggleCard = useCallback((idx: number) => {
    setPreviewCards((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, selected: !c.selected } : c)),
    );
  }, []);

  const selectedCount = previewCards.filter((c) => c.selected).length;

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-[color-mix(in_srgb,var(--signal)_20%,var(--surface))] to-[color-mix(in_srgb,#a855f7_15%,var(--surface))] text-[var(--signal)]">
            <Sparkles size={18} />
          </div>
          <div>
            <h3 className="font-display font-semibold text-base text-[var(--ink)]">
              Gerar Flashcards com IA
            </h3>
            <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
              Cole um texto e a IA extrai os conceitos em cards
            </p>
          </div>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[color-mix(in_srgb,var(--ink)_40%,transparent)] hover:text-[var(--ink)] transition rounded-lg hover:bg-[var(--mist)]"
            title="Fechar"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Banner de IA não configurada (se houver) */}
      {aiConfig && !aiConfig.configured && (
        <div className="rounded-xl border border-[var(--warn)]/30 bg-[var(--warn-soft)] p-3.5 text-xs text-[var(--warn)]">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertCircle size={15} /> IA não configurada no sistema
          </p>
          {isMaster ? (
            <p className="mt-1">
              Você tem acesso Master: configure a chave do OpenRouter em{" "}
              <Link href="/ajustes" className="underline font-bold hover:text-[var(--ink)]">
                Ajustes &gt; Inteligência Artificial
              </Link>{" "}
              para ativar este recurso.
            </p>
          ) : (
            <p className="mt-1">
              O Administrador Master ainda não configurou a chave de IA em Ajustes.
            </p>
          )}
        </div>
      )}

      {/* Badges de Limite e Modelo Ativo */}
      <div className="flex flex-wrap items-center gap-2">
        {isUnlimited ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--signal)]">
            <Sparkles size={11} />
            {isMaster ? "Acesso Master · Gerações ilimitadas" : "Uso liberado · Ilimitado"}
          </span>
        ) : (
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
              canGenerate
                ? "bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] text-[var(--signal)]"
                : "bg-[color-mix(in_srgb,var(--warn)_12%,var(--surface))] text-[var(--warn)]"
            }`}
          >
            <Sparkles size={11} />
            {canGenerate
              ? `${remaining} geração${remaining !== 1 ? "ões" : ""} restante${remaining !== 1 ? "s" : ""} hoje`
              : "Limite diário atingido"}
          </span>
        )}

        <span
          className="inline-flex items-center gap-1 rounded-full bg-[var(--surface-soft)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--ink-soft)] border border-[var(--line)]"
          title={aiConfig?.isMaster && aiConfig?.model ? `Modelo ativo (Master): ${aiConfig.model}` : "Inteligência Artificial Integrada"}
        >
          <Bot size={11} className="text-[var(--signal)]" />
          <span>IA</span>
        </span>
      </div>

      {/* Feedback */}
      {feedback && (
        <div
          className={`flex items-start gap-2 rounded-[var(--radius-btn)] px-3 py-2.5 text-sm font-medium ${
            feedback.ok
              ? "bg-[color-mix(in_srgb,var(--ok)_12%,var(--surface))] text-[var(--ok)]"
              : "bg-[color-mix(in_srgb,var(--warn)_12%,var(--surface))] text-[var(--warn)]"
          }`}
        >
          {feedback.ok ? (
            <CheckCircle size={16} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
          )}
          <span>{feedback.msg}</span>
        </div>
      )}

      {/* ---- Input Mode ---- */}
      {!showPreview && (
        <>
          {/* Matéria selector */}
          <div className="relative">
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
              Matéria *
            </label>
            <input
              type="text"
              value={disciplina}
              onChange={(e) => {
                setDisciplina(e.target.value);
                setDropdownOpen(true);
              }}
              onFocus={() => setDropdownOpen(true)}
              onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
              placeholder="Selecione ou digite a matéria…"
              className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)]"
            />
            {dropdownOpen && filteredMaterias.length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-44 overflow-y-auto rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg">
                {filteredMaterias.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setDisciplina(m.nome);
                      setDropdownOpen(false);
                    }}
                    className={`flex w-full items-center px-3 py-2 text-left text-xs transition ${
                      m.nome.toLowerCase() === disciplina.trim().toLowerCase()
                        ? "bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] font-medium text-[var(--signal)]"
                        : "text-[var(--ink)] hover:bg-[var(--mist)]"
                    }`}
                  >
                    {m.nome}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Textarea */}
          <div>
            <label className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
              <FileText size={12} />
              Texto para Gerar Cards *
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Cole aqui seu resumo, anotação, trecho de PDF ou qualquer texto de estudo…"
              rows={8}
              maxLength={MAX_TEXT_LENGTH}
              className="w-full min-h-[160px] resize-y rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)] leading-relaxed"
            />
            <div className="mt-0.5 flex items-center justify-between text-[10px] text-[color-mix(in_srgb,var(--ink)_35%,transparent)]">
              <span>
                {textLength < MIN_TEXT_LENGTH
                  ? `Mínimo ${MIN_TEXT_LENGTH} caracteres`
                  : `${textLength} caracteres`}
              </span>
              <span>
                {textLength}/{MAX_TEXT_LENGTH}
              </span>
            </div>
          </div>

          {/* Generate button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={!isValid || aiGenerating || !canGenerate}
            className="w-full flex items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-gradient-to-r from-[var(--signal)] to-[color-mix(in_srgb,#a855f7_60%,var(--signal))] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {aiGenerating ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Gerando flashcards…
              </>
            ) : (
              <>
                <Sparkles size={16} />
                Gerar Flashcards com IA
              </>
            )}
          </button>
        </>
      )}

      {/* ---- Preview Mode ---- */}
      {showPreview && previewCards.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[var(--ink)]">
              {savedCount} cards gerados — {selectedCount} selecionados
            </p>
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1 text-xs font-medium text-[var(--signal)] hover:underline"
            >
              <Sparkles size={12} />
              Gerar mais
            </button>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
            {previewCards.map((card, idx) => (
              <div
                key={idx}
                className={`rounded-[var(--radius)] border p-3 transition ${
                  card.selected
                    ? "border-[color-mix(in_srgb,var(--signal)_30%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_4%,var(--surface))]"
                    : "border-[var(--line)] bg-[var(--surface)] opacity-50"
                }`}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    onClick={() => toggleCard(idx)}
                    className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded border transition ${
                      card.selected
                        ? "border-[var(--signal)] bg-[var(--signal)] text-white"
                        : "border-[var(--line)] bg-[var(--surface)] text-transparent hover:border-[var(--signal)]"
                    }`}
                  >
                    <Check size={12} />
                  </button>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="text-xs font-semibold text-[var(--ink)] leading-relaxed break-words [overflow-wrap:anywhere]">
                      {card.frente}
                    </p>
                    <div className="border-t border-[var(--line)]/50 pt-1.5">
                      <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_70%,transparent)] leading-relaxed break-words [overflow-wrap:anywhere]">
                        {card.verso}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-xs font-semibold text-[var(--ink)] transition hover:bg-[var(--mist)] active:scale-[0.98]"
            >
              <Trash2 size={13} />
              Nova Geração
            </button>
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-[var(--radius-btn)] bg-[var(--signal)] px-3 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98]"
              >
                <CheckCircle size={13} />
                Concluído
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
