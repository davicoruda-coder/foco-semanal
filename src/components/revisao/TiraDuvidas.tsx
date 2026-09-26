"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Lightbulb,
  Loader2,
  MessageCircleQuestion,
  Sparkles,
  Target,
  TriangleAlert,
  X,
  Zap,
} from "lucide-react";
import { useRevisao } from "./RevisaoProvider";
import { ImagePasteArea } from "./ImagePasteArea";

const MIN_TEXT_LENGTH = 10;
const MAX_TEXT_LENGTH = 12000;

/* ------------------------------------------------------------------ */
/*  Sub-components for the response                                    */
/* ------------------------------------------------------------------ */

function ResponseSection({
  icon: Icon,
  title,
  color,
  children,
  defaultOpen = true,
}: {
  icon: React.ElementType;
  title: string;
  color: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={`rounded-xl border overflow-hidden transition-all duration-200 ${
        open ? "border-[var(--line)]" : "border-[var(--line)]/60"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center gap-2 px-3.5 py-2.5 text-left transition-colors ${
          open
            ? `bg-[color-mix(in_srgb,${color}_8%,var(--surface))]`
            : "bg-[var(--surface)] hover:bg-[var(--mist)]"
        }`}
      >
        <Icon
          size={15}
          className="shrink-0"
          style={{ color }}
        />
        <span className="flex-1 text-xs font-semibold text-[var(--ink)]">
          {title}
        </span>
        {open ? (
          <ChevronUp size={14} className="text-[var(--ink-soft,color-mix(in_srgb,var(--ink)_40%,transparent))]" />
        ) : (
          <ChevronDown size={14} className="text-[var(--ink-soft,color-mix(in_srgb,var(--ink)_40%,transparent))]" />
        )}
      </button>
      {open && (
        <div className="px-3.5 py-3 border-t border-[var(--line)]/50 bg-[var(--surface)]">
          {children}
        </div>
      )}
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[10px] font-medium text-[color-mix(in_srgb,var(--ink)_45%,transparent)] hover:text-[var(--signal)] transition-colors"
      title="Copiar texto"
    >
      {copied ? <CheckCircle size={11} /> : <Copy size={11} />}
      {copied ? "Copiado!" : "Copiar"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

interface TiraDuvidasResponse {
  explicacao: string;
  resposta_certa: string;
  pegadinha: string;
  passo_a_passo: string[];
  conceito_chave: string;
  flashcard_sugerido?: { frente: string; verso: string };
}

export function TiraDuvidas() {
  const {
    materias,
    aiGenerationsToday,
    aiConfig,
    addFlashcardManual,
    reloadFlashcards,
    reloadAIConfig,
  } = useRevisao();

  /* State */
  const [pergunta, setPergunta] = useState("");
  const [imagem, setImagem] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [resposta, setResposta] = useState<TiraDuvidasResponse | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);
  const [flashcardSaved, setFlashcardSaved] = useState(false);

  /* Derived */
  const isMaster = Boolean(aiConfig?.isMaster);
  const limitEnabled = aiConfig ? aiConfig.limitEnabled : true;
  const isUnlimited = isMaster || !limitEnabled;
  const dailyLimit = aiConfig?.dailyLimit ?? 15;
  const remaining = isUnlimited
    ? null
    : (aiConfig?.remaining ?? Math.max(0, dailyLimit - aiGenerationsToday));
  const canGenerate = isUnlimited || (remaining !== null && remaining > 0);
  const textLength = pergunta.trim().length;
  const isValid =
    (textLength >= MIN_TEXT_LENGTH || imagem.length > 0) &&
    textLength <= MAX_TEXT_LENGTH;

  /* Filtered matérias for dropdown */
  const filteredMaterias = useMemo(() => {
    const q = disciplina.trim().toLowerCase();
    if (!q) return materias;
    return materias.filter((m) => m.nome.toLowerCase().includes(q));
  }, [materias, disciplina]);

  /* Ask the AI */
  const handleAsk = useCallback(async () => {
    if (!isValid || loading || !canGenerate) return;
    setFeedback(null);
    setResposta(null);
    setFlashcardSaved(false);
    setLoading(true);

    try {
      const res = await fetch("/api/revisao/tira-duvidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pergunta: pergunta.trim(),
          imagem: imagem || undefined,
          disciplina: disciplina.trim() || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ ok: false, msg: data.error || "Erro desconhecido." });
        return;
      }

      if (data.resposta) {
        setResposta(data.resposta);
        setFeedback({
          ok: true,
          msg: "✅ Resposta recebida! Confira a explicação abaixo.",
        });
      }

      // Atualizar cotas
      void reloadAIConfig();
    } catch {
      setFeedback({ ok: false, msg: "Falha de conexão. Tente novamente." });
    } finally {
      setLoading(false);
    }
  }, [isValid, loading, canGenerate, pergunta, imagem, disciplina, reloadAIConfig]);

  /* Save flashcard */
  const handleSaveFlashcard = useCallback(async () => {
    if (!resposta?.flashcard_sugerido || flashcardSaved) return;
    const disc = disciplina.trim() || "Geral";
    const card = await addFlashcardManual(
      disc,
      resposta.flashcard_sugerido.frente,
      resposta.flashcard_sugerido.verso,
    );
    if (card) {
      setFlashcardSaved(true);
      await reloadFlashcards();
    }
  }, [resposta, flashcardSaved, disciplina, addFlashcardManual, reloadFlashcards]);

  /* Reset */
  const handleReset = useCallback(() => {
    setPergunta("");
    setImagem("");
    setDisciplina("");
    setResposta(null);
    setFeedback(null);
    setFlashcardSaved(false);
  }, []);

  /* Global paste listener for images */
  useEffect(() => {
    if (resposta || loading) return; // Não capturar paste quando já tem resposta

    const handleGlobalPaste = (e: globalThis.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            if (file.size > 4 * 1024 * 1024) {
              alert("A imagem é muito grande (máx 4MB).");
              return;
            }
            const reader = new FileReader();
            reader.onload = () => {
              if (typeof reader.result === "string") {
                setImagem(reader.result);
              }
            };
            reader.readAsDataURL(file);
          }
          return;
        }
      }
    };

    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [resposta, loading]);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      {/* Header Unificado */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius)] border border-[color-mix(in_srgb,var(--signal)_28%,var(--line))] bg-gradient-to-r from-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] via-[var(--surface)] to-[color-mix(in_srgb,var(--signal)_5%,var(--surface))] p-4 sm:p-5 shadow-[var(--shadow-sm)]">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[var(--signal)] text-white shadow-sm">
            <MessageCircleQuestion size={22} />
          </div>
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <h3 className="font-display text-base font-bold text-[var(--ink)] sm:text-lg">
              Tira-Dúvidas com IA
            </h3>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--signal-soft)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--signal)]">
              Didática & Resolução
            </span>
          </div>
        </div>

        {/* Badge de limite apenas se houver cota restritiva */}
        {!isUnlimited && (
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${
                canGenerate
                  ? "border-[color-mix(in_srgb,var(--signal)_25%,transparent)] bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] text-[var(--signal)]"
                  : "border-[color-mix(in_srgb,var(--warn)_25%,transparent)] bg-[color-mix(in_srgb,var(--warn)_12%,var(--surface))] text-[var(--warn)]"
              }`}
            >
              <Sparkles size={12} />
              {canGenerate
                ? `${remaining} ${remaining === 1 ? "geração restante" : "gerações restantes"} hoje`
                : "Limite diário atingido"}
            </span>
          </div>
        )}
      </div>

      {/* Banner de IA não configurada */}
      {aiConfig && !aiConfig.configured && (
        <div className="rounded-xl border border-[var(--warn)]/30 bg-[var(--warn-soft)] p-3.5 text-xs text-[var(--warn)]">
          <p className="font-semibold flex items-center gap-1.5">
            <AlertCircle size={15} /> IA não configurada no sistema
          </p>
          {isMaster ? (
            <p className="mt-1">
              Configure a chave do OpenRouter em{" "}
              <Link
                href="/ajustes"
                className="underline font-bold hover:text-[var(--ink)]"
              >
                Ajustes &gt; Inteligência Artificial
              </Link>{" "}
              para ativar este recurso.
            </p>
          ) : (
            <p className="mt-1">
              O Administrador Master ainda não configurou a chave de IA em
              Ajustes.
            </p>
          )}
        </div>
      )}

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
      {!resposta && (
        <div className="surface rounded-[var(--radius)] border border-[var(--line)] p-4 sm:p-5 shadow-[var(--shadow-sm)] space-y-4">
          {/* Matéria (opcional) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)]/60 pb-3">
            <div>
              <label className="text-xs font-semibold text-[var(--ink)]">
                Matéria ou Disciplina
              </label>
              <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
                Opcional — direciona a linguagem técnica da explicação
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                value={disciplina}
                onChange={(e) => {
                  setDisciplina(e.target.value);
                  setDropdownOpen(true);
                }}
                onFocus={() => setDropdownOpen(true)}
                onBlur={() => setTimeout(() => setDropdownOpen(false), 200)}
                placeholder="Ex: Direito Constitucional, RLM…"
                className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs sm:text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)]"
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
          </div>

          {/* Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
                <span>Enunciado da questão ou sua dúvida</span>
                <span className="text-[var(--warn)]">*</span>
              </label>
              <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
                {textLength}/{MAX_TEXT_LENGTH}
              </span>
            </div>
            <textarea
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Cole aqui o texto da questão, a alternativa que gerou dúvida, ou descreva sua dúvida teórica..."
              rows={5}
              maxLength={MAX_TEXT_LENGTH}
              className="w-full min-h-[120px] resize-y rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] p-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)] leading-relaxed"
            />
          </div>

          {/* Área de imagem */}
          <ImagePasteArea
            value={imagem}
            onChange={setImagem}
            disabled={loading}
          />

          {/* Botão Perguntar e Status */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-[var(--line)]/60">
            <div className="text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
              {textLength === 0 && !imagem ? (
                <span>Digite sua dúvida ou anexe um print para consultar a IA</span>
              ) : textLength < MIN_TEXT_LENGTH && !imagem ? (
                <span className="text-[var(--warn)]">Mínimo de {MIN_TEXT_LENGTH} caracteres</span>
              ) : (
                <span className="font-medium text-[var(--ok,#16a34a)]">✓ Pronto para consultar</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleAsk}
              disabled={!isValid || loading || !canGenerate}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-gradient-to-r from-[var(--signal)] to-[color-mix(in_srgb,#f59e0b_50%,var(--signal))] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Analisando dúvida…
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Perguntar à IA
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ---- Response Mode ---- */}
      {resposta && (
        <div className="space-y-3 animate-in fade-in duration-300">
          {/* Conceito-chave badge */}
          {resposta.conceito_chave && (
            <div className="flex items-center gap-2 rounded-xl bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))] border border-[var(--signal)]/20 px-3 py-2">
              <Target size={14} className="shrink-0 text-[var(--signal)]" />
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal)]">
                  Conceito-Chave
                </span>
                <p className="text-xs font-medium text-[var(--ink)]">
                  {resposta.conceito_chave}
                </p>
              </div>
            </div>
          )}

          {/* Resposta Correta (destaque) */}
          {resposta.resposta_certa && (
            <div className="flex items-start gap-2 rounded-xl bg-[color-mix(in_srgb,var(--ok)_10%,var(--surface))] border border-[var(--ok)]/25 px-3.5 py-3">
              <CheckCircle
                size={16}
                className="mt-0.5 shrink-0 text-[var(--ok)]"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ok)]">
                  Resposta Correta
                </span>
                <p className="text-sm text-[var(--ink)] leading-relaxed mt-0.5 break-words [overflow-wrap:anywhere]">
                  {resposta.resposta_certa}
                </p>
              </div>
              <CopyButton text={resposta.resposta_certa} />
            </div>
          )}

          {/* Explicação */}
          <ResponseSection
            icon={Lightbulb}
            title="Explicação Didática"
            color="var(--signal)"
            defaultOpen
          >
            <p className="text-sm text-[var(--ink)] leading-relaxed whitespace-pre-line break-words [overflow-wrap:anywhere]">
              {resposta.explicacao}
            </p>
            <div className="mt-2">
              <CopyButton text={resposta.explicacao} />
            </div>
          </ResponseSection>

          {/* Pegadinha */}
          {resposta.pegadinha && (
            <ResponseSection
              icon={TriangleAlert}
              title="⚠️ Pegadinha / Armadilha"
              color="var(--warn)"
              defaultOpen
            >
              <p className="text-sm text-[var(--ink)] leading-relaxed break-words [overflow-wrap:anywhere]">
                {resposta.pegadinha}
              </p>
            </ResponseSection>
          )}

          {/* Passo a Passo */}
          {resposta.passo_a_passo.length > 0 && (
            <ResponseSection
              icon={Zap}
              title="Passo a Passo da Resolução"
              color="var(--accent-2)"
            >
              <ol className="space-y-2">
                {resposta.passo_a_passo.map((passo, idx) => (
                  <li key={idx} className="flex gap-2.5">
                    <span className="shrink-0 grid size-5 place-items-center rounded-full bg-[color-mix(in_srgb,var(--accent-2)_15%,var(--surface))] text-[10px] font-bold text-[var(--accent-2)]">
                      {idx + 1}
                    </span>
                    <p className="flex-1 text-sm text-[var(--ink)] leading-relaxed break-words [overflow-wrap:anywhere]">
                      {passo.replace(/^(Passo\s*\d+\s*:\s*)/i, "")}
                    </p>
                  </li>
                ))}
              </ol>
            </ResponseSection>
          )}

          {/* Flashcard sugerido */}
          {resposta.flashcard_sugerido && (
            <div className="rounded-xl border border-[var(--signal)]/25 bg-[color-mix(in_srgb,var(--signal)_5%,var(--surface))] p-3.5">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal)] flex items-center gap-1">
                  <Sparkles size={11} />
                  Flashcard Sugerido
                </span>
                <button
                  type="button"
                  onClick={handleSaveFlashcard}
                  disabled={flashcardSaved}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold transition active:scale-95 ${
                    flashcardSaved
                      ? "bg-[color-mix(in_srgb,var(--ok)_15%,var(--surface))] text-[var(--ok)] cursor-default"
                      : "bg-[var(--signal)] text-white hover:brightness-110 shadow-sm"
                  }`}
                >
                  {flashcardSaved ? (
                    <>
                      <CheckCircle size={12} />
                      Salvo no Deck!
                    </>
                  ) : (
                    <>
                      <Zap size={12} />
                      Criar Flashcard
                    </>
                  )}
                </button>
              </div>
              <div className="rounded-lg border border-[var(--line)]/50 bg-[var(--surface)] p-3 space-y-2">
                <p className="text-xs font-semibold text-[var(--ink)] leading-relaxed break-words [overflow-wrap:anywhere]">
                  {resposta.flashcard_sugerido.frente}
                </p>
                <div className="border-t border-[var(--line)]/50 pt-2">
                  <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_70%,transparent)] leading-relaxed break-words [overflow-wrap:anywhere]">
                    {resposta.flashcard_sugerido.verso}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Ações */}
          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--mist)] active:scale-[0.98]"
            >
              <MessageCircleQuestion size={14} />
              Fazer Nova Pergunta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
