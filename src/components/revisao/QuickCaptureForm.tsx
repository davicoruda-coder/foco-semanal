"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Link2,
  Loader2,
  Plus,
  Sparkles,
  Video,
} from "lucide-react";
import {
  BANCAS_SUGERIDAS,
  CAUSA_ERRO_LABEL,
  STATUS_RESULTADO_LABEL,
  type CausaErro,
  type QuestaoCaderno,
  type QuickCapturePayload,
  type StatusResultado,
} from "@/lib/revisao/types";
import { useRevisao } from "./RevisaoProvider";

const URL_REGEX = /^https?:\/\/.+/i;

/* ------------------------------------------------------------------ */
/*  Custom Combobox Select (elimina flickering gráfico do datalist)    */
/* ------------------------------------------------------------------ */

function ComboboxSelect({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (value: string) => void;
  options: readonly string[];
  placeholder?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options;
    const matches = options.filter((opt) => opt.toLowerCase().includes(q));
    if (matches.length <= 1 && options.some((opt) => opt.toLowerCase() === q)) {
      return options;
    }
    return matches.length > 0 ? matches : options;
  }, [options, value]);

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
        {label}
      </label>
      <div className="relative">
        <input
          type="text"
          value={value}
          required={required}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              setIsOpen(false);
            }
          }}
          className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] pl-3 pr-8 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)]"
        />
        <button
          type="button"
          tabIndex={-1}
          onClick={(e) => {
            e.preventDefault();
            setIsOpen((prev) => !prev);
          }}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] hover:text-[var(--ink)] transition"
          title="Ver opções"
        >
          <ChevronDown
            size={15}
            className={`transition-transform duration-150 ${
              isOpen ? "rotate-180 text-[var(--signal)]" : ""
            }`}
          />
        </button>
      </div>

      {isOpen && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-52 overflow-y-auto rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--surface)] py-1 shadow-lg backdrop-blur-md">
          {filtered.length === 0 ? (
            <div className="px-3 py-2 text-xs text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
              Nenhuma sugestão encontrada.
            </div>
          ) : (
            filtered.map((opt) => {
              const isSelected =
                opt.toLowerCase() === value.trim().toLowerCase();
              return (
                <button
                  key={opt}
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt);
                    setIsOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2 text-left text-xs transition ${
                    isSelected
                      ? "bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] font-medium text-[var(--signal)]"
                      : "text-[var(--ink)] hover:bg-[var(--mist)] hover:text-[var(--ink)]"
                  }`}
                >
                  <span className="truncate">{opt}</span>
                  {isSelected && (
                    <span className="text-[10px] text-[var(--signal)]">✓</span>
                  )}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick Capture Form                                                 */
/* ------------------------------------------------------------------ */

export function QuickCaptureForm({
  onSuccess,
  initialData,
  onCancel,
  onSwitchToAI,
}: {
  onSuccess?: () => void;
  initialData?: QuestaoCaderno;
  onCancel?: () => void;
  onSwitchToAI?: () => void;
}) {
  const { addQuestao, updateQuestao, materias, addMateria } = useRevisao();
  const isEditing = Boolean(initialData);

  /* State */
  const [codigoOuLink, setCodigoOuLink] = useState(
    initialData?.codigo_questao || initialData?.link_questao || "",
  );
  const [banca, setBanca] = useState(initialData?.banca || "");
  const [disciplina, setDisciplina] = useState(initialData?.disciplina || "");
  const [assunto, setAssunto] = useState(initialData?.assunto || "");
  const [resultado, setResultado] = useState<StatusResultado>(
    initialData?.status_resultado || "erro",
  );
  const [causa, setCausa] = useState<CausaErro>(
    initialData?.causa_erro || "teoria",
  );
  const [aprendizado, setAprendizado] = useState(
    initialData?.aprendizado_chave || "",
  );
  const [linkVideo, setLinkVideo] = useState(initialData?.link_video || "");
  const [enunciado, setEnunciado] = useState(
    initialData?.enunciado_texto || "",
  );
  const [expandido, setExpandido] = useState(
    Boolean(initialData?.enunciado_texto || initialData?.link_video),
  );

  const [saving, setSaving] = useState(false);
  const [criarFlashcard, setCriarFlashcard] = useState(false);
  const [feedback, setFeedback] = useState<{
    ok: boolean;
    msg: string;
  } | null>(null);

  const formRef = useRef<HTMLFormElement>(null);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    };
  }, []);

  /* Derivar link e código do campo inteligente */
  const parseCodigoOuLink = useCallback(
    (raw: string): { codigo: string; link: string } => {
      const trimmed = raw.trim();
      if (URL_REGEX.test(trimmed)) {
        // Tentar extrair código da URL (ex.: Q4216278)
        const match = trimmed.match(/Q\d{4,}/i);
        return {
          link: trimmed,
          codigo: match ? match[0].toUpperCase() : "",
        };
      }
      // Só código (ex.: Q4216278)
      const code = trimmed.toUpperCase();
      return {
        codigo: code,
        link: /^Q\d{4,}$/i.test(code)
          ? `https://www.qconcursos.com/questoes-de-concursos/questoes/${code}`
          : "",
      };
    },
    [],
  );

  /* Submit */
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (saving) return;

      // Validações mínimas
      if (!disciplina.trim()) {
        setFeedback({ ok: false, msg: "Preencha a disciplina." });
        return;
      }
      if (!aprendizado.trim()) {
        setFeedback({
          ok: false,
          msg: "Escreva a regra aprendida.",
        });
        return;
      }
      if (linkVideo && !URL_REGEX.test(linkVideo)) {
        setFeedback({
          ok: false,
          msg: "Link do vídeo inválido (use https://…).",
        });
        return;
      }

      setSaving(true);
      setFeedback(null);

      const { codigo, link } = parseCodigoOuLink(codigoOuLink);
      const payload: QuickCapturePayload = {
        codigo_questao: codigo,
        link_questao: link,
        link_video: linkVideo.trim(),
        enunciado_texto: enunciado.trim(),
        banca: banca.trim(),
        disciplina: disciplina.trim(),
        assunto: assunto.trim(),
        status_resultado: resultado,
        causa_erro: causa,
        aprendizado_chave: aprendizado.trim(),
        criar_flashcard: isEditing ? false : criarFlashcard,
      };

      if (isEditing && initialData) {
        const ok = await updateQuestao(initialData.id, payload);
        setSaving(false);
        if (ok) {
          if (payload.disciplina) void addMateria(payload.disciplina);
          setFeedback({ ok: true, msg: "Questão atualizada com sucesso!" });
          feedbackTimer.current = setTimeout(() => {
            setFeedback(null);
            onSuccess?.();
          }, 800);
        } else {
          setFeedback({
            ok: false,
            msg: "Erro ao atualizar. Verifique sua conexão.",
          });
        }
      } else {
        const ok = await addQuestao(payload);
        setSaving(false);

        if (ok) {
          if (payload.disciplina) {
            void addMateria(payload.disciplina);
          }
          setFeedback({
            ok: true,
            msg: criarFlashcard
              ? "Questão registrada + flashcard criado!"
              : "Erro registrado no Caderno com sucesso!",
          });
          // Reset form
          setCodigoOuLink("");
          setBanca("");
          setDisciplina("");
          setAssunto("");
          setAprendizado("");
          setLinkVideo("");
          setEnunciado("");
          setExpandido(false);
          setResultado("erro");
          setCausa("teoria");
          setCriarFlashcard(false);
          feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
          onSuccess?.();
        } else {
          setFeedback({
            ok: false,
            msg: "Erro ao salvar. Verifique sua conexão.",
          });
        }
      }
    },
    [
      saving,
      codigoOuLink,
      banca,
      disciplina,
      assunto,
      resultado,
      causa,
      aprendizado,
      linkVideo,
      enunciado,
      criarFlashcard,
      addQuestao,
      parseCodigoOuLink,
      onSuccess,
    ],
  );

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-4"
    >
      {/* Atalho para Gerar com IA se não estiver em modo edição */}
      {!isEditing && onSwitchToAI && (
        <div className="flex items-center justify-between rounded-lg bg-purple-500/10 border border-purple-500/20 p-2.5 text-xs text-purple-600 dark:text-purple-400">
          <div className="flex items-center gap-1.5 font-medium">
            <Sparkles size={14} className="shrink-0" />
            <span>Quer criar flashcards colando um texto de resumo?</span>
          </div>
          <button
            type="button"
            onClick={onSwitchToAI}
            className="font-bold underline hover:opacity-80 shrink-0 ml-2"
          >
            Gerar com IA →
          </button>
        </div>
      )}
      {/* Feedback */}
      {feedback && (
        <div
          className={`flex items-center gap-2 rounded-[var(--radius-btn)] px-3 py-2.5 text-sm font-medium ${
            feedback.ok
              ? "bg-[color-mix(in_srgb,var(--ok)_12%,var(--surface))] text-[var(--ok)]"
              : "bg-[color-mix(in_srgb,var(--warn)_12%,var(--surface))] text-[var(--warn)]"
          }`}
        >
          {feedback.ok ? (
            <CheckCircle size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {feedback.msg}
        </div>
      )}

      {/* Link ou Código */}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
          <Link2 size={12} className="mr-1 inline" />
          Link ou Código da Questão
        </label>
        <input
          type="text"
          value={codigoOuLink}
          onChange={(e) => setCodigoOuLink(e.target.value)}
          placeholder="Q4216278 ou https://qconcursos.com/..."
          className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)]"
        />
      </div>

      {/* Banca + Disciplina + Assunto */}
      <div className="grid gap-3 sm:grid-cols-3">
        <ComboboxSelect
          label="Banca"
          value={banca}
          onChange={setBanca}
          options={BANCAS_SUGERIDAS}
          placeholder="FGV, Cebraspe…"
        />
        <ComboboxSelect
          label="Disciplina *"
          required
          value={disciplina}
          onChange={setDisciplina}
          options={materias.map((m) => m.nome)}
          placeholder="Português, RLM…"
        />
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
            Assunto
          </label>
          <input
            type="text"
            value={assunto}
            onChange={(e) => setAssunto(e.target.value)}
            placeholder="Crase, Equivalências…"
            className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)]"
          />
        </div>
      </div>

      {/* Resultado + Causa (Tags Rápidas) */}
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
            Resultado
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(STATUS_RESULTADO_LABEL) as [StatusResultado, string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setResultado(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    resultado === key
                      ? "bg-[var(--signal)] text-white shadow-sm"
                      : "bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] hover:bg-[var(--signal-soft)]"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </div>
        <div>
          <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
            Causa do Erro
          </label>
          <div className="flex flex-wrap gap-1.5">
            {(Object.entries(CAUSA_ERRO_LABEL) as [CausaErro, string][]).map(
              ([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setCausa(key)}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    causa === key
                      ? "bg-[var(--warn)] text-white shadow-sm"
                      : "bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] hover:bg-[var(--warn-soft)]"
                  }`}
                >
                  {label}
                </button>
              ),
            )}
          </div>
        </div>
      </div>

      {/* Regra Aprendida */}
      <div>
        <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
          📌 Regra Aprendida *
        </label>
        <textarea
          value={aprendizado}
          onChange={(e) => setAprendizado(e.target.value)}
          placeholder="A regra definitiva para não errar novamente…"
          required
          rows={4}
          maxLength={1500}
          className="w-full min-h-[96px] resize-y rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)] leading-relaxed"
        />
        <p className="mt-0.5 text-right text-[10px] text-[color-mix(in_srgb,var(--ink)_35%,transparent)]">
          {aprendizado.length}/1500
        </p>
      </div>

      {/* Campos Opcionais Expansíveis */}
      <button
        type="button"
        onClick={() => setExpandido(!expandido)}
        className="flex items-center gap-1 text-xs font-medium text-[var(--signal)] hover:underline"
      >
        {expandido ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        {expandido ? "Menos campos" : "Mais campos (vídeo, enunciado)"}
      </button>

      {expandido && (
        <div className="space-y-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--mist)] p-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
              <Video size={12} className="mr-1 inline" />
              Link do Vídeo / Resolução
            </label>
            <input
              type="url"
              value={linkVideo}
              onChange={(e) => setLinkVideo(e.target.value)}
              placeholder="https://youtube.com/watch?v=…"
              className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
              Texto / Enunciado da Questão
            </label>
            <textarea
              value={enunciado}
              onChange={(e) => setEnunciado(e.target.value)}
              placeholder="Cole o enunciado aqui (opcional)…"
              rows={4}
              maxLength={5000}
              className="w-full resize-none rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)]"
            />
            <p className="mt-0.5 text-right text-[10px] text-[color-mix(in_srgb,var(--ink)_35%,transparent)]">
              {enunciado.length}/5000
            </p>
          </div>
        </div>
      )}

      {/* Opção Opcional: Criar Flashcard Imediato */}
      {!isEditing && (
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--mist)]/40 p-3">
          <label className="flex items-start gap-2.5 cursor-pointer text-xs font-medium text-[var(--ink)]">
            <input
              type="checkbox"
              checked={criarFlashcard}
              onChange={(e) => setCriarFlashcard(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-[var(--line)] text-[var(--signal)] focus:ring-[var(--signal)] cursor-pointer"
            />
            <div className="space-y-0.5 select-none">
              <span className="font-semibold text-[var(--ink)]">
                Criar flashcard automático agora
              </span>
              <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] leading-relaxed">
                Deixe desmarcado se quiser apenas registrar no seu Caderno. Você pode criar flashcards manuais ou com IA depois a qualquer momento.
              </p>
            </div>
          </label>
        </div>
      )}

      {/* Submit / Cancel */}
      <div className="flex items-center gap-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-4 py-3 text-sm font-semibold text-[var(--ink)] transition hover:bg-[var(--mist)] active:scale-[0.98]"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
        >
          {saving ? (
            <Loader2 size={16} className="animate-spin" />
          ) : isEditing ? (
            <CheckCircle size={16} />
          ) : (
            <Plus size={16} />
          )}
          {saving
            ? "Salvando…"
            : isEditing
              ? "Salvar Alterações"
              : criarFlashcard
                ? "Salvar e Criar Flashcard"
                : "Salvar no Caderno"}
        </button>
      </div>
    </form>
  );
}
