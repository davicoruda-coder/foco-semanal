"use client";

import { useState, useMemo } from "react";
import {
  ExternalLink,
  Filter,
  GraduationCap,
  Pencil,
  Play,
  Search,
  Trash2,
  Video,
  ChevronDown,
  ChevronUp,
  Eye,
  Copy,
  Check,
  X,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { QuickCaptureForm } from "./QuickCaptureForm";
import {
  CAUSA_ERRO_LABEL,
  STATUS_RESULTADO_LABEL,
  type CausaErro,
  type QuestaoCaderno,
  type StatusResultado,
} from "@/lib/revisao/types";
import { useRevisao } from "./RevisaoProvider";

export function CadernoList() {
  const { questoes, questoesLoading, deleteQuestao } = useRevisao();
  const [search, setSearch] = useState("");
  const [bancaFiltro, setBancaFiltro] = useState<string>("todas");
  const [disciplinaFiltro, setDisciplinaFiltro] = useState<string>("todas");
  const [causaFiltro, setCausaFiltro] = useState<string>("todas");
  const [resultadoFiltro, setResultadoFiltro] = useState<string>("todas");
  const [itemExpandidoId, setItemExpandidoId] = useState<string | null>(null);
  const [deletandoId, setDeletandoId] = useState<string | null>(null);
  const [editingQuestao, setEditingQuestao] = useState<QuestaoCaderno | null>(null);
  const [pendingDeleteQuestao, setPendingDeleteQuestao] = useState<QuestaoCaderno | null>(null);
  const [viewingQuestao, setViewingQuestao] = useState<QuestaoCaderno | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback silencioso se área de transferência não estiver disponível
    }
  };

  // Extrair opções únicas para filtros
  const bancas = useMemo(() => {
    const set = new Set<string>();
    questoes.forEach((q) => {
      if (q.banca) set.add(q.banca);
    });
    return Array.from(set).sort();
  }, [questoes]);

  const disciplinas = useMemo(() => {
    const set = new Set<string>();
    questoes.forEach((q) => {
      if (q.disciplina) set.add(q.disciplina);
    });
    return Array.from(set).sort();
  }, [questoes]);

  // Filtragem local instantânea
  const questoesFiltradas = useMemo(() => {
    return questoes.filter((q) => {
      if (bancaFiltro !== "todas" && q.banca !== bancaFiltro) return false;
      if (disciplinaFiltro !== "todas" && q.disciplina !== disciplinaFiltro)
        return false;
      if (causaFiltro !== "todas" && q.causa_erro !== causaFiltro) return false;
      if (resultadoFiltro !== "todas" && q.status_resultado !== resultadoFiltro)
        return false;

      if (search.trim()) {
        const term = search.toLowerCase();
        const matchAprendizado = q.aprendizado_chave?.toLowerCase().includes(term);
        const matchCodigo = q.codigo_questao?.toLowerCase().includes(term);
        const matchEnunciado = q.enunciado_texto?.toLowerCase().includes(term);
        const matchAssunto = q.assunto?.toLowerCase().includes(term);
        if (!matchAprendizado && !matchCodigo && !matchEnunciado && !matchAssunto) {
          return false;
        }
      }
      return true;
    });
  }, [questoes, bancaFiltro, disciplinaFiltro, causaFiltro, resultadoFiltro, search]);

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteQuestao) return;
    setDeletandoId(pendingDeleteQuestao.id);
    try {
      await deleteQuestao(pendingDeleteQuestao.id);
      setPendingDeleteQuestao(null);
    } finally {
      setDeletandoId(null);
    }
  };

  return (
    <div className="space-y-4">
      {/* Barra de Busca e Filtros Rápidos */}
      <div className="space-y-2 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3">
        <div className="relative">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[color-mix(in_srgb,var(--ink)_45%,transparent)]"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, regra, assunto..."
            className="w-full rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] py-2 pl-9 pr-3 text-sm text-[var(--ink)] outline-none transition placeholder:text-[color-mix(in_srgb,var(--ink)_40%,transparent)] focus:border-[var(--signal)] focus:bg-[var(--surface)]"
          />
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <select
            value={disciplinaFiltro}
            onChange={(e) => setDisciplinaFiltro(e.target.value)}
            className="rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] px-2.5 py-1.5 text-xs text-[var(--ink)] outline-none"
          >
            <option value="todas">Todas Disciplinas</option>
            {disciplinas.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>

          <select
            value={bancaFiltro}
            onChange={(e) => setBancaFiltro(e.target.value)}
            className="rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] px-2.5 py-1.5 text-xs text-[var(--ink)] outline-none"
          >
            <option value="todas">Todas Bancas</option>
            {bancas.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>

          <select
            value={causaFiltro}
            onChange={(e) => setCausaFiltro(e.target.value)}
            className="rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] px-2.5 py-1.5 text-xs text-[var(--ink)] outline-none"
          >
            <option value="todas">Todas Causas</option>
            {(Object.entries(CAUSA_ERRO_LABEL) as [CausaErro, string][]).map(
              ([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ),
            )}
          </select>

          <select
            value={resultadoFiltro}
            onChange={(e) => setResultadoFiltro(e.target.value)}
            className="rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--mist)] px-2.5 py-1.5 text-xs text-[var(--ink)] outline-none"
          >
            <option value="todas">Todos Resultados</option>
            {(
              Object.entries(STATUS_RESULTADO_LABEL) as [StatusResultado, string][]
            ).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Lista de Registros */}
      {questoesLoading ? (
        <div className="py-12 text-center text-sm text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
          Carregando questões do caderno...
        </div>
      ) : questoesFiltradas.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-dashed border-[var(--line)] p-8 text-center">
          <GraduationCap
            size={36}
            className="mx-auto mb-2 text-[color-mix(in_srgb,var(--ink)_35%,transparent)]"
          />
          <p className="text-sm font-medium text-[var(--ink)]">
            Nenhuma questão encontrada
          </p>
          <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
            Use o botão de Captura Rápida acima para registrar seus erros de simulados ou baterias.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {questoesFiltradas.map((q) => {
            const isExpanded = itemExpandidoId === q.id;

            return (
              <div
                key={q.id}
                className="overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] transition hover:border-[color-mix(in_srgb,var(--signal)_40%,var(--line))]"
              >
                {/* Header do Card */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] bg-[var(--mist)]/40 px-3.5 py-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                    {q.banca && (
                      <span className="rounded-md bg-[var(--surface)] px-2 py-0.5 font-semibold text-[var(--ink)] border border-[var(--line)] shrink-0">
                        {q.banca}
                      </span>
                    )}
                    <span className="font-semibold text-[var(--signal)]">
                      {q.disciplina}
                    </span>
                    {q.assunto && (
                      <span className="text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                        › {q.assunto}
                      </span>
                    )}
                    {q.codigo_questao && (
                      <span className="font-mono text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)] shrink-0">
                        #{q.codigo_questao}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        q.status_resultado === "erro"
                          ? "bg-[color-mix(in_srgb,#ef4444_15%,transparent)] text-[#ef4444]"
                          : q.status_resultado === "chute"
                          ? "bg-[color-mix(in_srgb,#f59e0b_15%,transparent)] text-[#f59e0b]"
                          : "bg-[color-mix(in_srgb,#8b5cf6_15%,transparent)] text-[#8b5cf6]"
                      }`}
                    >
                      {STATUS_RESULTADO_LABEL[q.status_resultado]}
                    </span>

                    <span
                      className="rounded-full bg-[var(--mist)] px-2 py-0.5 text-[10px] font-medium text-[color-mix(in_srgb,var(--ink)_65%,transparent)]"
                    >
                      {CAUSA_ERRO_LABEL[q.causa_erro]}
                    </span>
                  </div>
                </div>

                {/* Conteúdo Principal: Regra Aprendida */}
                <div className="p-3.5">
                  <div className="flex items-start justify-between gap-2.5">
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
                        Regra Aprendida:
                      </p>
                      <p className="text-sm font-medium text-[var(--ink)] whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed">
                        {q.aprendizado_chave}
                      </p>
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setViewingQuestao(q)}
                        className="rounded-lg p-1.5 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--signal)] transition active:scale-95"
                        title="Visualizar ficha completa"
                        aria-label="Visualizar ficha completa"
                      >
                        <Eye size={17} />
                      </button>

                      <button
                        type="button"
                        onClick={() => setItemExpandidoId(isExpanded ? null : q.id)}
                        className="rounded-lg p-1.5 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition active:scale-95"
                        title={isExpanded ? "Recolher detalhes" : "Ver detalhes"}
                        aria-label={isExpanded ? "Recolher detalhes" : "Ver detalhes"}
                      >
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Seção expandida: Enunciado, Vídeo e Link */}
                  {isExpanded && (
                    <div className="mt-3 space-y-3 rounded-lg border border-[var(--line)] bg-[var(--mist)]/50 p-3 text-xs">
                      {q.enunciado_texto && (
                        <div>
                          <p className="font-semibold text-[color-mix(in_srgb,var(--ink)_70%,transparent)] mb-1">
                            Enunciado / Trecho:
                          </p>
                          <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] text-[color-mix(in_srgb,var(--ink)_85%,transparent)] leading-normal bg-[var(--surface)] p-2.5 rounded border border-[var(--line)]">
                            {q.enunciado_texto}
                          </p>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center gap-2 pt-1">
                        {q.link_questao && (
                          <a
                            href={q.link_questao}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-[var(--surface)] border border-[var(--line)] px-2.5 py-1 text-xs font-medium text-[var(--signal)] hover:bg-[var(--signal-soft)] transition"
                          >
                            <ExternalLink size={12} />
                            Ver Questão no QC
                          </a>
                        )}

                        {q.link_video && (
                          <a
                            href={q.link_video}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 rounded-md bg-[var(--surface)] border border-[var(--line)] px-2.5 py-1 text-xs font-medium text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                          >
                            <Video size={12} />
                            Vídeo Resolução
                          </a>
                        )}

                        <div className="ml-auto flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleCopy(q.id, q.aprendizado_chave)}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_65%,transparent)] hover:bg-[var(--surface)] hover:text-[var(--signal)] transition"
                            title="Copiar regra aprendida"
                          >
                            {copiedId === q.id ? (
                              <>
                                <Check size={12} className="text-[var(--ok,#16a34a)]" />
                                <span className="text-[var(--ok,#16a34a)]">Copiado</span>
                              </>
                            ) : (
                              <>
                                <Copy size={12} />
                                Copiar
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setViewingQuestao(q)}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_65%,transparent)] hover:bg-[var(--surface)] hover:text-[var(--signal)] transition"
                            title="Visualizar ficha completa"
                          >
                            <Eye size={12} />
                            Ficha
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingQuestao(q)}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_65%,transparent)] hover:bg-[var(--surface)] hover:text-[var(--signal)] transition"
                            title="Editar questão"
                          >
                            <Pencil size={12} />
                            Editar
                          </button>
                          <button
                            type="button"
                            disabled={deletandoId === q.id}
                            onClick={() => setPendingDeleteQuestao(q)}
                            className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[color-mix(in_srgb,#ef4444_12%,transparent)] hover:text-[#ef4444] transition"
                            title="Excluir questão"
                          >
                            <Trash2 size={12} />
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal de Visualização Completa (Modo Leitura) */}
      {viewingQuestao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl max-h-[90vh] flex flex-col rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] shadow-2xl my-auto overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3 bg-[var(--mist)]/40">
              <div className="min-w-0 pr-2">
                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                  {viewingQuestao.banca && (
                    <span className="rounded-md bg-[var(--surface)] px-2 py-0.5 font-semibold text-[var(--ink)] border border-[var(--line)] shrink-0">
                      {viewingQuestao.banca}
                    </span>
                  )}
                  <span className="font-semibold text-[var(--signal)]">
                    {viewingQuestao.disciplina}
                  </span>
                  {viewingQuestao.assunto && (
                    <span className="text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                      › {viewingQuestao.assunto}
                    </span>
                  )}
                  {viewingQuestao.codigo_questao && (
                    <span className="font-mono text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)] shrink-0">
                      #{viewingQuestao.codigo_questao}
                    </span>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingQuestao(null)}
                className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition shrink-0"
                aria-label="Fechar visualização"
              >
                <X size={18} />
              </button>
            </div>

            {/* Badges de Resultado & Causa */}
            <div className="flex items-center gap-2 px-4 py-2 border-b border-[var(--line)] bg-[var(--surface)] text-xs">
              <span
                className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                  viewingQuestao.status_resultado === "erro"
                    ? "bg-[color-mix(in_srgb,#ef4444_15%,transparent)] text-[#ef4444]"
                    : viewingQuestao.status_resultado === "chute"
                    ? "bg-[color-mix(in_srgb,#f59e0b_15%,transparent)] text-[#f59e0b]"
                    : "bg-[color-mix(in_srgb,#8b5cf6_15%,transparent)] text-[#8b5cf6]"
                }`}
              >
                {STATUS_RESULTADO_LABEL[viewingQuestao.status_resultado]}
              </span>

              <span className="rounded-full bg-[var(--mist)] px-2.5 py-0.5 text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)] border border-[var(--line)]">
                {CAUSA_ERRO_LABEL[viewingQuestao.causa_erro]}
              </span>
            </div>

            {/* Corpo com scroll confortável */}
            <div className="overflow-y-auto p-4 sm:p-5 space-y-4 text-sm">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[var(--signal)]">
                    📌 Regra Aprendida / Resumo
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopy(`modal-${viewingQuestao.id}`, viewingQuestao.aprendizado_chave)}
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium text-[color-mix(in_srgb,var(--ink)_65%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--signal)] transition"
                  >
                    {copiedId === `modal-${viewingQuestao.id}` ? (
                      <>
                        <Check size={12} className="text-[var(--ok,#16a34a)]" />
                        <span className="text-[var(--ok,#16a34a)]">Copiado</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        Copiar
                      </>
                    )}
                  </button>
                </div>
                <div className="rounded-xl border border-[var(--line)] bg-[var(--mist)]/40 p-3.5 sm:p-4">
                  <p className="text-sm sm:text-base font-medium text-[var(--ink)] whitespace-pre-wrap break-words [overflow-wrap:anywhere] leading-relaxed select-text">
                    {viewingQuestao.aprendizado_chave}
                  </p>
                </div>
              </div>

              {viewingQuestao.enunciado_texto && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                    📝 Enunciado / Trecho da Questão
                  </span>
                  <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs leading-relaxed text-[color-mix(in_srgb,var(--ink)_85%,transparent)]">
                    <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere] select-text">
                      {viewingQuestao.enunciado_texto}
                    </p>
                  </div>
                </div>
              )}

              {(viewingQuestao.link_questao || viewingQuestao.link_video) && (
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {viewingQuestao.link_questao && (
                    <a
                      href={viewingQuestao.link_questao}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--mist)] border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[var(--signal)] hover:bg-[var(--signal-soft)] transition"
                    >
                      <ExternalLink size={13} />
                      Ver Questão no QC
                    </a>
                  )}
                  {viewingQuestao.link_video && (
                    <a
                      href={viewingQuestao.link_video}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--mist)] border border-[var(--line)] px-3 py-1.5 text-xs font-medium text-[#ef4444] hover:bg-red-50 dark:hover:bg-red-950/30 transition"
                    >
                      <Video size={13} />
                      Vídeo Resolução
                    </a>
                  )}
                </div>
              )}
            </div>

            {/* Footer com Ações */}
            <div className="flex items-center justify-between border-t border-[var(--line)] px-4 py-3 bg-[var(--mist)]/30">
              <button
                type="button"
                onClick={() => {
                  const target = viewingQuestao;
                  setViewingQuestao(null);
                  setEditingQuestao(target);
                }}
                className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[var(--mist)] hover:text-[var(--signal)] transition"
              >
                <Pencil size={13} />
                Editar Ficha
              </button>

              <button
                type="button"
                onClick={() => setViewingQuestao(null)}
                className="rounded-[var(--radius-btn)] bg-[var(--signal)] px-4 py-1.5 text-xs font-semibold text-white transition hover:brightness-110 active:scale-95"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Edição */}
      {editingQuestao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl my-8">
            <div className="flex items-center justify-between border-b border-[var(--line)] pb-3 mb-4">
              <div>
                <h2 className="text-base font-semibold text-[var(--ink)]">
                  Editar Questão
                </h2>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                  Atualize os dados e a regra aprendida
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingQuestao(null)}
                className="rounded-full p-1.5 text-[color-mix(in_srgb,var(--ink)_50%,transparent)] hover:bg-[var(--mist)] hover:text-[var(--ink)] transition"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>
            <QuickCaptureForm
              initialData={editingQuestao}
              onCancel={() => setEditingQuestao(null)}
              onSuccess={() => setEditingQuestao(null)}
            />
          </div>
        </div>
      )}

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={pendingDeleteQuestao !== null}
        title="Excluir questão do caderno"
        message={`Tem certeza que deseja remover esta anotação do caderno (${pendingDeleteQuestao?.codigo_questao || pendingDeleteQuestao?.disciplina || "Item"})? O aprendizado registrado e o flashcard serão excluídos.`}
        confirmLabel={deletandoId ? "Excluindo…" : "Excluir"}
        cancelLabel="Cancelar"
        confirmVariant="danger"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setPendingDeleteQuestao(null)}
      />
    </div>
  );
}
