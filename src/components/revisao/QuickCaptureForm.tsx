"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  AlertCircle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Link2,
  Loader2,
  Plus,
  Video,
} from "lucide-react";
import {
  BANCAS_SUGERIDAS,
  CAUSA_ERRO_LABEL,
  STATUS_RESULTADO_LABEL,
  type CausaErro,
  type QuickCapturePayload,
  type StatusResultado,
} from "@/lib/revisao/types";
import { useRevisao } from "./RevisaoProvider";

const URL_REGEX = /^https?:\/\/.+/i;

/* ------------------------------------------------------------------ */
/*  Quick Capture Form                                                 */
/* ------------------------------------------------------------------ */

export function QuickCaptureForm({
  onSuccess,
}: {
  onSuccess?: () => void;
}) {
  const { addQuestao, materias, addMateria } = useRevisao();

  /* State */
  const [codigoOuLink, setCodigoOuLink] = useState("");
  const [banca, setBanca] = useState("");
  const [disciplina, setDisciplina] = useState("");
  const [assunto, setAssunto] = useState("");
  const [resultado, setResultado] = useState<StatusResultado>("erro");
  const [causa, setCausa] = useState<CausaErro>("teoria");
  const [aprendizado, setAprendizado] = useState("");
  const [linkVideo, setLinkVideo] = useState("");
  const [enunciado, setEnunciado] = useState("");
  const [expandido, setExpandido] = useState(false);

  const [saving, setSaving] = useState(false);
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
      };

      const ok = await addQuestao(payload);
      setSaving(false);

      if (ok) {
        if (payload.disciplina) {
          void addMateria(payload.disciplina);
        }
        setFeedback({ ok: true, msg: "Questão registrada + flashcard criado!" });
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
        feedbackTimer.current = setTimeout(() => setFeedback(null), 4000);
        onSuccess?.();
      } else {
        setFeedback({
          ok: false,
          msg: "Erro ao salvar. Verifique sua conexão.",
        });
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
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
            Banca
          </label>
          <input
            type="text"
            value={banca}
            onChange={(e) => setBanca(e.target.value)}
            list="bancas-list"
            placeholder="FGV, Cebraspe…"
            className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)]"
          />
          <datalist id="bancas-list">
            {BANCAS_SUGERIDAS.map((b) => (
              <option key={b} value={b} />
            ))}
          </datalist>
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
            Disciplina *
          </label>
          <input
            type="text"
            value={disciplina}
            onChange={(e) => setDisciplina(e.target.value)}
            list="materias-revisao-datalist"
            placeholder="Português, RLM…"
            required
            className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)]"
          />
          <datalist id="materias-revisao-datalist">
            {materias.map((m) => (
              <option key={m.id} value={m.nome} />
            ))}
          </datalist>
        </div>
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
          rows={3}
          maxLength={1500}
          className="w-full resize-none rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_35%,transparent)] focus:border-[var(--signal)] focus:ring-2 focus:ring-[var(--signal-soft)]"
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

      {/* Submit */}
      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
      >
        {saving ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <Plus size={16} />
        )}
        {saving ? "Salvando…" : "Registrar Questão"}
      </button>
    </form>
  );
}
