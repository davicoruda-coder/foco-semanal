"use client";

import { useState, useCallback, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  AlertCircle,
  BookMarked,
  BookmarkPlus,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  CornerDownLeft,
  Copy,
  Lightbulb,
  Loader2,
  MessageCircleQuestion,
  MessageSquare,
  Plus,
  Send,
  Sparkles,
  Target,
  TriangleAlert,
  Type,
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
        className={`w-full flex items-center gap-2 px-3.5 py-2.5 sm:px-4 sm:py-3 text-left transition-colors ${
          open
            ? `bg-[color-mix(in_srgb,${color}_8%,var(--surface))]`
            : "bg-[var(--surface)] hover:bg-[var(--mist)]"
        }`}
      >
        <Icon
          size={16}
          className="shrink-0"
          style={{ color }}
        />
        <span className="flex-1 text-xs sm:text-sm font-semibold text-[var(--ink)]">
          {title}
        </span>
        {open ? (
          <ChevronUp size={15} className="text-[var(--ink-soft,color-mix(in_srgb,var(--ink)_40%,transparent))]" />
        ) : (
          <ChevronDown size={15} className="text-[var(--ink-soft,color-mix(in_srgb,var(--ink)_40%,transparent))]" />
        )}
      </button>
      {open && (
        <div className="px-3.5 py-3 sm:px-4 sm:py-3.5 border-t border-[var(--line)]/50 bg-[var(--surface)]">
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
      className="inline-flex items-center gap-1.5 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:text-[var(--signal)] transition-colors px-2 py-1 rounded-md hover:bg-[var(--mist)]"
      title="Copiar texto"
    >
      {copied ? <CheckCircle size={13} className="text-[var(--ok)]" /> : <Copy size={13} />}
      <span>{copied ? "Copiado!" : "Copiar"}</span>
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
  topico_assunto?: string;
  conceito_chave: string;
  disciplina_sugerida?: string;
  flashcard_sugerido?: { frente: string; verso: string };
}

interface FollowUpItem {
  id: string;
  pergunta: string;
  resposta: {
    explicacao: string;
    ponto_chave?: string;
    exemplo_adicional?: string;
  };
  timestamp: string;
}

const QUICK_PROMPTS = [
  {
    label: "💡 Exemplo Prático",
    prompt: "Poderia dar outro exemplo prático e realista do cotidiano sobre isso?",
  },
  {
    label: "👶 Mais Simples",
    prompt: "Poderia explicar esse raciocínio de uma forma mais simples e intuitiva?",
  },
  {
    label: "❌ Por que não as outras?",
    prompt: "Por que as outras alternativas ou interpretações comuns estão incorretas?",
  },
];

export function TiraDuvidas() {
  const {
    materias,
    aiGenerationsToday,
    aiConfig,
    addFlashcardManual,
    addQuestao,
    addMateria,
    reloadFlashcards,
    reloadQuestoes,
    reloadMaterias,
    reloadAIConfig,
  } = useRevisao();

  /* State */
  const [pergunta, setPergunta] = useState("");
  const [imagem, setImagem] = useState("");
  const [loading, setLoading] = useState(false);
  const [resposta, setResposta] = useState<TiraDuvidasResponse | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  /* Salvar Flashcard & Caderno na tela de resposta */
  const [saveDisciplina, setSaveDisciplina] = useState("");
  const [saveDropdownOpen, setSaveDropdownOpen] = useState(false);
  const [flashcardSaved, setFlashcardSaved] = useState(false);
  const [savingFlashcard, setSavingFlashcard] = useState(false);
  const [cadernoSaved, setCadernoSaved] = useState(false);
  const [savingCaderno, setSavingCaderno] = useState(false);

  /* Desdobramento contextual / Dúvidas sobre a explicação */
  const [followUps, setFollowUps] = useState<FollowUpItem[]>([]);
  const [duvidaTexto, setDuvidaTexto] = useState("");
  const [loadingFollowUp, setLoadingFollowUp] = useState(false);
  const [followUpError, setFollowUpError] = useState<string | null>(null);

  /* Tamanho da fonte de resposta (sm: 14px, base: 16px [padrão], lg: 18px) */
  const [textSize, setTextSize] = useState<"sm" | "base" | "lg">("base");

  // Carregar preferência salva
  useEffect(() => {
    try {
      const saved = localStorage.getItem("focohub_tira_duvidas_font_size");
      if (saved === "sm" || saved === "base" || saved === "lg") {
        setTextSize(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleSetTextSize = useCallback((size: "sm" | "base" | "lg") => {
    setTextSize(size);
    try {
      localStorage.setItem("focohub_tira_duvidas_font_size", size);
    } catch {
      /* ignore */
    }
  }, []);

  // Classes de texto e entrelinha para leitura didática
  const contentTextClass = useMemo(() => {
    switch (textSize) {
      case "sm":
        return "text-sm leading-relaxed";
      case "lg":
        return "text-base sm:text-lg leading-relaxed sm:leading-8";
      case "base":
      default:
        return "text-[15px] sm:text-base leading-relaxed sm:leading-7";
    }
  }, [textSize]);

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

  /* Filtered matérias for save dropdown */
  const filteredSaveMaterias = useMemo(() => {
    const q = saveDisciplina.trim().toLowerCase();
    if (!q) return materias;
    return materias.filter((m) => m.nome.toLowerCase().includes(q));
  }, [materias, saveDisciplina]);

  /* Ask the AI */
  const handleAsk = useCallback(async () => {
    if (!isValid || loading || !canGenerate) return;
    setFeedback(null);
    setResposta(null);
    setFlashcardSaved(false);
    setCadernoSaved(false);
    setLoading(true);

    try {
      const res = await fetch("/api/revisao/tira-duvidas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pergunta: pergunta.trim(),
          imagem: imagem || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFeedback({ ok: false, msg: data.error || "Erro desconhecido." });
        return;
      }

      if (data.resposta) {
        setResposta(data.resposta);
        // Preenche sugestão de disciplina para salvar
        const sug = (data.resposta as TiraDuvidasResponse).disciplina_sugerida?.trim();
        if (sug) {
          const match = materias.find((m) => m.nome.toLowerCase() === sug.toLowerCase());
          setSaveDisciplina(match ? match.nome : sug);
        } else if (materias.length > 0) {
          setSaveDisciplina(materias[0].nome);
        } else {
          setSaveDisciplina("Geral");
        }
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
  }, [isValid, loading, canGenerate, pergunta, imagem, materias, reloadAIConfig]);

  /* Save flashcard */
  const handleSaveFlashcard = useCallback(async () => {
    if (!resposta?.flashcard_sugerido || flashcardSaved || savingFlashcard) return;
    setSavingFlashcard(true);
    try {
      const disc = saveDisciplina.trim() || "Geral";
      const exists = materias.some((m) => m.nome.toLowerCase() === disc.toLowerCase());
      if (!exists && disc !== "Geral") {
        await addMateria(disc);
        await reloadMaterias();
      }

      const card = await addFlashcardManual(
        disc,
        resposta.flashcard_sugerido.frente,
        resposta.flashcard_sugerido.verso,
      );
      if (card) {
        setFlashcardSaved(true);
        await reloadFlashcards();
      }
    } finally {
      setSavingFlashcard(false);
    }
  }, [resposta, flashcardSaved, savingFlashcard, saveDisciplina, materias, addMateria, reloadMaterias, addFlashcardManual, reloadFlashcards]);

  /* Save caderno de erros */
  const handleSaveCaderno = useCallback(async () => {
    if (cadernoSaved || savingCaderno) return;
    setSavingCaderno(true);
    try {
      const disc = saveDisciplina.trim() || "Geral";
      const exists = materias.some((m) => m.nome.toLowerCase() === disc.toLowerCase());
      if (!exists && disc !== "Geral") {
        await addMateria(disc);
        await reloadMaterias();
      }

      // Obtém um assunto conciso (máximo 60 caracteres), sem frases cortadas
      let cleanAssunto = (resposta?.topico_assunto || "").trim();
      if (!cleanAssunto && resposta?.conceito_chave) {
        // Se cair no fallback de conceito_chave, pega apenas a primeira frase/termo
        const firstSegment = resposta.conceito_chave.split(/[.,;–—]/)[0]?.trim();
        cleanAssunto = firstSegment || resposta.conceito_chave.slice(0, 50).trim();
      }
      if (!cleanAssunto) cleanAssunto = "Dúvida de Fixação";
      cleanAssunto = cleanAssunto.replace(/^[,;:.›\-\s]+/, "").slice(0, 60).trim();

      const ok = await addQuestao({
        enunciado_texto: pergunta.trim() || "Questão analisada pelo Tira-Dúvidas com IA",
        banca: "IA / Dúvida",
        disciplina: disc,
        assunto: cleanAssunto,
        status_resultado: resposta?.pegadinha ? "pegadinha" : "erro",
        causa_erro: "teoria",
        aprendizado_chave: resposta?.pegadinha
          ? `Pegadinha/Regra: ${resposta.pegadinha}`
          : resposta?.explicacao
            ? resposta.explicacao.slice(0, 350)
            : "Revisão e fixação conceitual",
      });

      if (ok) {
        setCadernoSaved(true);
        await reloadQuestoes();
      }
    } finally {
      setSavingCaderno(false);
    }
  }, [cadernoSaved, savingCaderno, saveDisciplina, materias, addMateria, reloadMaterias, addQuestao, pergunta, resposta, reloadQuestoes]);

  /* Enviar dúvida de desdobramento sobre a explicação */
  const handleSendFollowUp = useCallback(
    async (perguntaDireta?: string) => {
      const texto = (perguntaDireta ?? duvidaTexto).trim();
      if (
        !texto ||
        texto.length < 3 ||
        loadingFollowUp ||
        !canGenerate ||
        !resposta
      ) {
        return;
      }

      setLoadingFollowUp(true);
      setFollowUpError(null);

      try {
        const res = await fetch("/api/revisao/tira-duvidas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            isFollowUp: true,
            pergunta: texto,
            perguntaOriginal: pergunta.trim(),
            disciplina: saveDisciplina || resposta.disciplina_sugerida,
            contextoAnterior: {
              conceito_chave: resposta.conceito_chave,
              resposta_certa: resposta.resposta_certa,
              explicacao: resposta.explicacao,
              passo_a_passo: resposta.passo_a_passo,
              pegadinha: resposta.pegadinha,
            },
            historicoAnterior: followUps.map((f) => ({
              pergunta: f.pergunta,
              resposta: f.resposta.explicacao,
            })),
          }),
        });

        const data = await res.json();

        if (!res.ok) {
          setFollowUpError(data.error || "Não foi possível obter resposta do tutor.");
          return;
        }

        if (data.followUp) {
          const novoItem: FollowUpItem = {
            id:
              typeof crypto !== "undefined" && crypto.randomUUID
                ? crypto.randomUUID()
                : `fup-${Date.now()}`,
            pergunta: texto,
            resposta: data.followUp,
            timestamp: new Date().toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          };
          setFollowUps((prev) => [...prev, novoItem]);
          setDuvidaTexto("");
        }

        void reloadAIConfig();
      } catch {
        setFollowUpError("Falha de conexão com a IA. Tente novamente.");
      } finally {
        setLoadingFollowUp(false);
      }
    },
    [
      duvidaTexto,
      loadingFollowUp,
      canGenerate,
      resposta,
      pergunta,
      saveDisciplina,
      followUps,
      reloadAIConfig,
    ],
  );

  /* Reset */
  const handleReset = useCallback(() => {
    setPergunta("");
    setImagem("");
    setResposta(null);
    setFeedback(null);
    setFlashcardSaved(false);
    setCadernoSaved(false);
    setSaveDisciplina("");
    setFollowUps([]);
    setDuvidaTexto("");
    setFollowUpError(null);
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
          {/* Textarea */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-[var(--ink)]">
                  Enunciado da questão ou sua dúvida
                </label>
                {!isUnlimited && (
                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                      canGenerate
                        ? "border-[color-mix(in_srgb,var(--signal)_25%,transparent)] bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] text-[var(--signal)]"
                        : "border-[color-mix(in_srgb,var(--warn)_25%,transparent)] bg-[color-mix(in_srgb,var(--warn)_12%,var(--surface))] text-[var(--warn)]"
                    }`}
                  >
                    <Sparkles size={10} />
                    {canGenerate
                      ? `${remaining} restantes hoje`
                      : "Limite diário atingido"}
                  </span>
                )}
              </div>
              {textLength > 10000 && (
                <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)] font-mono-num">
                  {textLength}/{MAX_TEXT_LENGTH}
                </span>
              )}
            </div>
            <textarea
              value={pergunta}
              onChange={(e) => setPergunta(e.target.value)}
              placeholder="Cole aqui o texto da questão, a alternativa que gerou dúvida, ou descreva sua dúvida teórica..."
              rows={5}
              maxLength={MAX_TEXT_LENGTH}
              className="w-full min-h-[120px] resize-y rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] p-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-sm placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)] leading-relaxed"
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
            <div className="text-xs">
              {textLength > 0 && textLength < MIN_TEXT_LENGTH && !imagem && (
                <span className="text-[var(--warn)] font-medium">Mínimo de {MIN_TEXT_LENGTH} caracteres</span>
              )}
            </div>

            <button
              type="button"
              onClick={handleAsk}
              disabled={!isValid || loading || !canGenerate}
              className="flex w-full sm:w-auto items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-gradient-to-r from-[var(--signal)] to-[color-mix(in_srgb,#f59e0b_50%,var(--signal))] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed sm:ml-auto"
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
          {/* Barra de Ajuste de Leitura (Tamanho da Fonte) */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 rounded-xl border border-[var(--line)]/70 bg-[var(--surface)] px-3.5 py-2 shadow-xs">
            <div className="flex items-center gap-2">
              <span className="grid size-7 place-items-center rounded-lg bg-[var(--signal-soft)] text-[var(--signal)]">
                <Type size={15} />
              </span>
              <div className="leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-[var(--ink)]">
                    Modo Leitura
                  </span>
                  <span className="hidden sm:inline-block rounded-full bg-[var(--mist)] px-2 py-0.5 text-[10px] font-semibold text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                    Salva automaticamente
                  </span>
                </div>
                <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hidden sm:block">
                  Ajuste o tamanho do texto para maior conforto visual no seu monitor
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 ml-auto">
              <span className="text-[11px] font-semibold text-[color-mix(in_srgb,var(--ink)_55%,transparent)] mr-1">
                Tamanho da letra:
              </span>
              <div
                className="inline-flex items-center rounded-lg border border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_4%,var(--surface))] p-0.5"
                role="group"
                aria-label="Tamanho da fonte"
              >
                <button
                  type="button"
                  onClick={() => handleSetTextSize("sm")}
                  title="Pequeno (14px) - Compacto"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    textSize === "sm"
                      ? "bg-[var(--signal)] text-white shadow-xs"
                      : "text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
                  }`}
                >
                  <span>A-</span>
                  <span className="text-[10px] opacity-75 font-normal">P</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetTextSize("base")}
                  title="Padrão Confortável (16px) - Recomendado para Computador"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    textSize === "base"
                      ? "bg-[var(--signal)] text-white shadow-xs"
                      : "text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
                  }`}
                >
                  <span>A</span>
                  <span className="text-[10px] opacity-75 font-normal">M</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSetTextSize("lg")}
                  title="Ampliado (18px) - Leitura relaxada"
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                    textSize === "lg"
                      ? "bg-[var(--signal)] text-white shadow-xs"
                      : "text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)] hover:bg-[var(--surface)]"
                  }`}
                >
                  <span>A+</span>
                  <span className="text-[10px] opacity-75 font-normal">G</span>
                </button>
              </div>
            </div>
          </div>

          {/* Conceito-chave badge */}
          {resposta.conceito_chave && (
            <div className="flex items-center gap-2.5 rounded-xl bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))] border border-[var(--signal)]/20 px-3.5 py-2.5">
              <Target size={15} className="shrink-0 text-[var(--signal)]" />
              <div>
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--signal)]">
                  Conceito-Chave
                </span>
                <p className={`font-medium text-[var(--ink)] ${
                  textSize === "lg" ? "text-sm sm:text-base" : textSize === "sm" ? "text-xs" : "text-xs sm:text-sm"
                }`}>
                  {resposta.conceito_chave}
                </p>
              </div>
            </div>
          )}

          {/* Resposta Correta (destaque) */}
          {resposta.resposta_certa && (
            <div className="flex items-start gap-2.5 rounded-xl bg-[color-mix(in_srgb,var(--ok)_10%,var(--surface))] border border-[var(--ok)]/25 px-3.5 py-3 sm:px-4">
              <CheckCircle
                size={18}
                className="mt-0.5 shrink-0 text-[var(--ok)]"
              />
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--ok)]">
                  Resposta Correta
                </span>
                <p className={`text-[var(--ink)] break-words [overflow-wrap:anywhere] mt-0.5 ${
                  textSize === "lg"
                    ? "text-base sm:text-lg font-semibold sm:leading-relaxed"
                    : textSize === "sm"
                    ? "text-sm leading-relaxed"
                    : "text-sm sm:text-base font-semibold leading-relaxed"
                }`}>
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
            <p className={`text-[var(--ink)] whitespace-pre-line break-words [overflow-wrap:anywhere] ${contentTextClass}`}>
              {resposta.explicacao}
            </p>
            <div className="mt-2.5">
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
              <p className={`text-[var(--ink)] break-words [overflow-wrap:anywhere] ${contentTextClass}`}>
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
              <ol className="space-y-2.5">
                {resposta.passo_a_passo.map((passo, idx) => (
                  <li key={idx} className="flex gap-2.5">
                    <span className="shrink-0 grid size-5 sm:size-6 place-items-center rounded-full bg-[color-mix(in_srgb,var(--accent-2)_15%,var(--surface))] text-[10px] sm:text-xs font-bold text-[var(--accent-2)]">
                      {idx + 1}
                    </span>
                    <p className={`flex-1 text-[var(--ink)] break-words [overflow-wrap:anywhere] ${contentTextClass}`}>
                      {passo.replace(/^(Passo\s*\d+\s*:\s*)/i, "")}
                    </p>
                  </li>
                ))}
              </ol>
            </ResponseSection>
          )}

          {/* Card de Ação: Salvar e Fixar */}
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--signal)_25%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_4%,var(--surface))] p-4 sm:p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)]/60 pb-3">
              <div>
                <h4 className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
                  <BookmarkPlus size={16} className="text-[var(--signal)]" />
                  Salvar nos seus estudos
                </h4>
                <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                  Escolha a matéria para salvar como Flashcard ou guardar no Caderno de Erros
                </p>
              </div>

              {/* Seletor de Matéria com busca e opção de nova matéria */}
              <div className="relative w-full sm:w-64">
                <label className="block text-[10px] font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_50%,transparent)] mb-1">
                  Matéria de Destino
                </label>
                <input
                  type="text"
                  value={saveDisciplina}
                  onChange={(e) => {
                    setSaveDisciplina(e.target.value);
                    setSaveDropdownOpen(true);
                  }}
                  onFocus={() => setSaveDropdownOpen(true)}
                  onBlur={() => setTimeout(() => setSaveDropdownOpen(false), 200)}
                  placeholder="Selecione ou digite nova…"
                  className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs text-[var(--ink)] outline-none transition focus:border-[var(--signal)] focus:ring-1 focus:ring-[var(--signal)] placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)]"
                />
                {saveDropdownOpen && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-40 overflow-y-auto rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg text-xs">
                    {filteredSaveMaterias.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSaveDisciplina(m.nome);
                          setSaveDropdownOpen(false);
                        }}
                        className={`flex w-full items-center px-3 py-1.5 text-left transition ${
                          m.nome.toLowerCase() === saveDisciplina.trim().toLowerCase()
                            ? "bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] font-semibold text-[var(--signal)]"
                            : "text-[var(--ink)] hover:bg-[var(--mist)]"
                        }`}
                      >
                        {m.nome}
                      </button>
                    ))}
                    {saveDisciplina.trim() &&
                      !materias.some(
                        (m) => m.nome.toLowerCase() === saveDisciplina.trim().toLowerCase()
                      ) && (
                        <div className="border-t border-[var(--line)]/50 p-1">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              setSaveDropdownOpen(false);
                            }}
                            className="flex w-full items-center gap-1.5 rounded px-2.5 py-1.5 text-left text-xs font-semibold text-[var(--signal)] hover:bg-[var(--signal-soft)]"
                          >
                            <Plus size={13} />
                            Criar matéria &quot;{saveDisciplina.trim()}&quot;
                          </button>
                        </div>
                      )}
                  </div>
                )}
              </div>
            </div>

            {/* Prévia do Flashcard Sugerido */}
            {resposta.flashcard_sugerido && (
              <div className="rounded-lg border border-[var(--line)]/60 bg-[var(--surface)] p-3 space-y-2">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[var(--signal)]">
                  <span className="flex items-center gap-1">
                    <Sparkles size={12} />
                    Flashcard Sugerido
                  </span>
                  <span className="text-[10px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)] font-normal">
                    Deck: {saveDisciplina.trim() || "Geral"}
                  </span>
                </div>
                <div className="text-xs font-semibold text-[var(--ink)] leading-relaxed break-words">
                  {resposta.flashcard_sugerido.frente}
                </div>
                <div className="border-t border-[var(--line)]/50 pt-2 text-[11px] text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed break-words">
                  {resposta.flashcard_sugerido.verso}
                </div>
              </div>
            )}

            {/* Botões de Ação para Salvar */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {resposta.flashcard_sugerido && (
                <button
                  type="button"
                  onClick={handleSaveFlashcard}
                  disabled={flashcardSaved || savingFlashcard}
                  className={`inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] px-3.5 py-2 text-xs font-semibold transition active:scale-95 ${
                    flashcardSaved
                      ? "bg-[color-mix(in_srgb,var(--ok)_15%,var(--surface))] text-[var(--ok)] border border-[var(--ok)]/30 cursor-default"
                      : "bg-[var(--signal)] text-white hover:brightness-110 shadow-xs"
                  }`}
                >
                  {flashcardSaved ? (
                    <>
                      <CheckCircle size={14} />
                      Flashcard Salvo no Deck!
                    </>
                  ) : savingFlashcard ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Zap size={14} />
                      Criar Flashcard
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={handleSaveCaderno}
                disabled={cadernoSaved || savingCaderno}
                className={`inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border px-3.5 py-2 text-xs font-semibold transition active:scale-95 ${
                  cadernoSaved
                    ? "bg-[color-mix(in_srgb,var(--ok)_15%,var(--surface))] text-[var(--ok)] border-[var(--ok)]/30 cursor-default"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:border-[var(--signal)] hover:text-[var(--signal)] shadow-xs"
                }`}
              >
                {cadernoSaved ? (
                  <>
                    <CheckCircle size={14} />
                    Salvo no Caderno de Erros!
                  </>
                ) : savingCaderno ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <BookMarked size={14} />
                    Salvar no Caderno de Erros
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Card Interativo: Desdobramento e Dúvidas com o Tutor */}
          <div className="rounded-xl border border-[color-mix(in_srgb,var(--signal)_25%,var(--line))] bg-gradient-to-b from-[color-mix(in_srgb,var(--signal)_3%,var(--surface))] to-[var(--surface)] p-4 sm:p-5 shadow-[var(--shadow-sm)] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[var(--line)]/60 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="grid size-8 place-items-center rounded-lg bg-[var(--signal-soft)] text-[var(--signal)] shrink-0">
                  <MessageSquare size={17} />
                </span>
                <div>
                  <h4 className="text-sm font-bold text-[var(--ink)] flex items-center gap-1.5">
                    Ficou com dúvida na explicação?
                    <span className="rounded-full bg-[var(--signal-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--signal)]">
                      Tutor IA
                    </span>
                  </h4>
                  <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                    Pergunte o que não ficou claro, conteste alternativas ou peça novos exemplos sem perder o contexto.
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de dúvidas já respondidas nesta conversa (Thread) */}
            {followUps.length > 0 && (
              <div className="space-y-3.5 pt-1">
                {followUps.map((item, idx) => (
                  <div
                    key={item.id || idx}
                    className="space-y-2.5 rounded-xl border border-[var(--line)]/70 bg-[color-mix(in_srgb,var(--ink)_2%,var(--surface))] p-3.5 sm:p-4"
                  >
                    {/* Pergunta do Aluno */}
                    <div className="flex items-start gap-2.5">
                      <span className="grid size-6 shrink-0 place-items-center rounded-full bg-[var(--signal-soft)] text-[10px] font-bold text-[var(--signal)] mt-0.5">
                        Você
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-semibold text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                            Sua dúvida
                          </span>
                          <span className="text-[10px] text-[color-mix(in_srgb,var(--ink)_40%,transparent)]">
                            {item.timestamp}
                          </span>
                        </div>
                        <p className="text-xs sm:text-sm font-medium text-[var(--ink)] mt-0.5 whitespace-pre-line break-words">
                          {item.pergunta}
                        </p>
                      </div>
                    </div>

                    {/* Resposta do Tutor */}
                    <div className="mt-2.5 rounded-lg border border-[color-mix(in_srgb,var(--signal)_25%,var(--line))] bg-[var(--surface)] p-3.5 sm:p-4 space-y-2.5">
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-[var(--signal)]">
                        <span className="flex items-center gap-1.5">
                          <Sparkles size={14} />
                          Esclarecimento do Tutor
                        </span>
                        <CopyButton text={item.resposta.explicacao} />
                      </div>

                      <p
                        className={`text-[var(--ink)] whitespace-pre-line break-words [overflow-wrap:anywhere] ${contentTextClass}`}
                      >
                        {item.resposta.explicacao}
                      </p>

                      {item.resposta.exemplo_adicional && (
                        <div className="mt-2.5 rounded-md bg-[color-mix(in_srgb,var(--accent-2)_10%,var(--surface))] border border-[var(--accent-2)]/25 p-3 text-xs text-[var(--ink)] space-y-1">
                          <span className="font-semibold text-[var(--accent-2)] block">
                            💡 Exemplo Prático Adicional:
                          </span>
                          <p className={`whitespace-pre-line ${contentTextClass}`}>
                            {item.resposta.exemplo_adicional}
                          </p>
                        </div>
                      )}

                      {item.resposta.ponto_chave && (
                        <div className="mt-2 flex items-start gap-2 rounded-lg bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))] border border-[var(--signal)]/20 px-3 py-2 text-xs font-medium text-[var(--ink)]">
                          <Target size={14} className="shrink-0 text-[var(--signal)] mt-0.5" />
                          <span>
                            <strong className="text-[var(--signal)] mr-1">Em resumo:</strong>
                            {item.resposta.ponto_chave}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Feedback de erro no follow-up */}
            {followUpError && (
              <div className="flex items-center gap-2 rounded-lg bg-[color-mix(in_srgb,var(--warn)_12%,var(--surface))] border border-[var(--warn)]/30 px-3 py-2 text-xs font-semibold text-[var(--warn)]">
                <AlertCircle size={14} className="shrink-0" />
                <span>{followUpError}</span>
              </div>
            )}

            {/* Input e Sugestões para nova dúvida */}
            <div className="space-y-2.5 pt-1">
              {/* Sugestões Rápidas */}
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-semibold text-[color-mix(in_srgb,var(--ink)_50%,transparent)] mr-1">
                  Atalhos rápidos:
                </span>
                {QUICK_PROMPTS.map((qp, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setDuvidaTexto(qp.prompt);
                    }}
                    disabled={loadingFollowUp || !canGenerate}
                    className="inline-flex items-center rounded-full border border-[var(--line)] bg-[var(--surface)] hover:border-[var(--signal)] hover:text-[var(--signal)] hover:bg-[var(--signal-soft)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink)] transition disabled:opacity-50"
                  >
                    {qp.label}
                  </button>
                ))}
              </div>

              {/* Caixa de Texto Livre do Aluno */}
              <div className="relative">
                <textarea
                  value={duvidaTexto}
                  onChange={(e) => setDuvidaTexto(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSendFollowUp();
                    }
                  }}
                  placeholder="Ex: Não entendi quando você disse que a estrutura é falha... / Por que a letra B não pode ser? / O que significa o termo..."
                  rows={2}
                  disabled={loadingFollowUp || !canGenerate}
                  className="w-full resize-y min-h-[76px] rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] p-3 pr-28 text-xs sm:text-sm text-[var(--ink)] outline-none transition focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)] placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] leading-relaxed disabled:opacity-60"
                />

                <div className="absolute right-2.5 bottom-2.5 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => void handleSendFollowUp()}
                    disabled={
                      duvidaTexto.trim().length < 3 ||
                      loadingFollowUp ||
                      !canGenerate
                    }
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius-tag)] bg-[var(--signal)] px-3 py-1.5 text-xs font-semibold text-white shadow-xs transition hover:brightness-110 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
                    title="Enviar dúvida (Enter)"
                  >
                    {loadingFollowUp ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Send size={13} />
                        <span>Perguntar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-1 text-[10px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)] px-1">
                <span>
                  Pressione <b>Enter</b> para enviar ou <b>Shift+Enter</b> para nova linha
                </span>
                {!isUnlimited && (
                  <span>
                    {remaining} {remaining === 1 ? "geração restante" : "gerações restantes"} hoje
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Ações Finais: Nova Pergunta */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-[var(--line)]/50">
            <button
              type="button"
              onClick={handleReset}
              className="inline-flex items-center justify-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--mist)] active:scale-[0.98]"
            >
              <MessageCircleQuestion size={15} />
              Fazer Nova Pergunta (Trocar de Assunto)
            </button>
            <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
              Quer analisar outra questão ou print? Clique acima para limpar e começar uma nova consulta.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
