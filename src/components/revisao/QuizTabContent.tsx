"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BrainCircuit,
  Calendar,
  CheckCircle2,
  FileText,
  FileUp,
  Image as ImageIcon,
  Play,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  Trophy,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { deleteQuizSession, getQuizSessions } from "@/lib/revisao/quiz-store";
import type { QuizSession, QuizSourceType } from "@/lib/revisao/quiz-types";

interface QuizTabContentProps {
  onStartNewQuiz: () => void;
  onPlayQuiz: (session: QuizSession) => void;
}

function getSourceBadge(source: QuizSourceType) {
  switch (source) {
    case "texto":
      return { label: "Texto", icon: FileText };
    case "pdf":
      return { label: "PDF", icon: FileUp };
    case "imagem":
      return { label: "Print/Foto", icon: ImageIcon };
    case "base_interna":
      return { label: "Base Interna", icon: BrainCircuit };
    default:
      return { label: "IA", icon: Sparkles };
  }
}

export function QuizTabContent({ onStartNewQuiz, onPlayQuiz }: QuizTabContentProps) {
  const [sessions, setSessions] = useState<QuizSession[]>([]);
  const [search, setSearch] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<QuizSession | null>(null);

  const loadSessions = () => {
    setSessions(getQuizSessions());
  };

  useEffect(() => {
    loadSessions();
  }, []);

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions;
    const q = search.toLowerCase();
    return sessions.filter((s) => {
      const matchSubject = s.subjectName?.toLowerCase().includes(q);
      const matchTitle = s.title?.toLowerCase().includes(q);
      return matchSubject || matchTitle;
    });
  }, [sessions, search]);

  const stats = useMemo(() => {
    if (sessions.length === 0) return null;
    const totalQuizzes = sessions.length;
    let totalQuestions = 0;
    let totalCorrect = 0;
    for (const s of sessions) {
      totalQuestions += s.questions.length;
      totalCorrect += s.correctCount;
    }
    const avgScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    return {
      totalQuizzes,
      totalQuestions,
      avgScore,
    };
  }, [sessions]);

  const handleDelete = () => {
    if (!sessionToDelete) return;
    deleteQuizSession(sessionToDelete.id);
    setSessionToDelete(null);
    loadSessions();
  };

  return (
    <div className="space-y-4">
      {/* Barra Superior / Header de Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-[color-mix(in_srgb,var(--signal)_15%,var(--surface))] text-[var(--signal)]">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="text-sm sm:text-base font-bold text-[var(--ink)]">
              Quiz Inteligente
            </h2>
            <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
              {sessions.length > 0
                ? `${sessions.length} ${sessions.length === 1 ? "quiz salvo" : "quizzes salvos"}`
                : "Gere questões com IA a partir de textos, PDFs, fotos ou erros"}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onStartNewQuiz}
          className="inline-flex items-center justify-center gap-2 rounded-[var(--radius)] bg-[var(--signal)] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90 active:scale-[0.98] transition shrink-0"
        >
          <Plus size={15} />
          <span>Criar Quiz com IA</span>
        </button>
      </div>

      {/* Métricas Rápidas (quando há histórico) */}
      {stats && (
        <div className="grid grid-cols-3 gap-2.5">
          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
            <span className="block text-base sm:text-lg font-bold font-mono-num text-[var(--ink)]">
              {stats.totalQuizzes}
            </span>
            <span className="text-[10px] sm:text-[11px] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
              Quizzes
            </span>
          </div>

          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
            <span className="block text-base sm:text-lg font-bold font-mono-num text-emerald-600 dark:text-emerald-400">
              {stats.avgScore}%
            </span>
            <span className="text-[10px] sm:text-[11px] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
              Aproveitamento
            </span>
          </div>

          <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3 text-center">
            <span className="block text-base sm:text-lg font-bold font-mono-num text-[var(--signal)]">
              {stats.totalQuestions}
            </span>
            <span className="text-[10px] sm:text-[11px] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
              Questões
            </span>
          </div>
        </div>
      )}

      {/* Campo de Busca Rápida (quando há mais de 2 quizzes) */}
      {sessions.length > 2 && (
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] pointer-events-none"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por matéria ou título..."
            className="w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] py-2 pl-8.5 pr-3 text-xs text-[var(--ink)] placeholder:text-[color-mix(in_srgb,var(--ink)_40%,transparent)] focus:outline-hidden focus:border-[var(--signal)]"
          />
        </div>
      )}

      {/* Lista de Quizzes ou Empty State */}
      {sessions.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-8 text-center space-y-3">
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] text-[var(--signal)]">
            <Sparkles size={24} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[var(--ink)]">
              Nenhum quiz gerado ainda
            </h3>
            <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
              Crie seu primeiro quiz a partir de um texto, PDF, print ou dos seus erros anotados.
            </p>
          </div>
          <button
            type="button"
            onClick={onStartNewQuiz}
            className="inline-flex items-center gap-1.5 rounded-[var(--radius)] bg-[var(--signal)] px-4 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-90 active:scale-[0.98] transition"
          >
            <Plus size={14} />
            <span>Iniciar Primeiro Quiz</span>
          </button>
        </div>
      ) : filteredSessions.length === 0 ? (
        <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-6 text-center text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
          Nenhum quiz encontrado para a busca.
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredSessions.map((s) => {
            const { label: sourceLabel, icon: SourceIcon } = getSourceBadge(s.sourceType);
            const scorePercent = s.questions.length > 0 ? Math.round((s.correctCount / s.questions.length) * 100) : 0;
            const isPassing = scorePercent >= 70;
            const dateFormatted = new Date(s.createdAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
            });

            return (
              <div
                key={s.id}
                className="group flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-3.5 hover:border-[color-mix(in_srgb,var(--signal)_40%,var(--line))] transition"
              >
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {s.subjectName && (
                      <span className="rounded-md bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] px-2 py-0.5 text-[11px] font-semibold text-[var(--signal)] border border-[color-mix(in_srgb,var(--signal)_20%,transparent)]">
                        {s.subjectName}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-md bg-[var(--mist)] px-2 py-0.5 text-[10px] font-medium text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
                      <SourceIcon size={11} />
                      {sourceLabel}
                    </span>
                    <span className="text-[10px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)]">
                      {dateFormatted}
                    </span>
                  </div>

                  <h4 className="text-xs sm:text-sm font-semibold text-[var(--ink)] truncate">
                    {s.title || (s.subjectName ? `Quiz de ${s.subjectName}` : "Quiz de Fixação")}
                  </h4>

                  <div className="flex items-center gap-3 text-[11px] text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                    <span>{s.questions.length} questões</span>
                    <span>•</span>
                    <span
                      className={`font-semibold font-mono-num ${
                        isPassing
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-rose-600 dark:text-rose-400"
                      }`}
                    >
                      {s.correctCount}/{s.questions.length} acertos ({scorePercent}%)
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => onPlayQuiz(s)}
                    className="inline-flex items-center gap-1.5 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] hover:bg-[var(--mist)] hover:text-[var(--signal)] hover:border-[color-mix(in_srgb,var(--signal)_40%,var(--line))] active:scale-[0.98] transition"
                  >
                    <RotateCcw size={13} />
                    <span>Praticar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSessionToDelete(s)}
                    className="rounded-[var(--radius)] p-1.5 text-[color-mix(in_srgb,var(--ink)_40%,transparent)] hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400 transition"
                    title="Excluir quiz"
                    aria-label="Excluir quiz"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmação de Exclusão */}
      <ConfirmDialog
        open={Boolean(sessionToDelete)}
        title="Excluir Quiz"
        message="Deseja remover este quiz do seu histórico? As questões não poderão ser recuperadas."
        confirmLabel="Excluir"
        confirmVariant="danger"
        onConfirm={handleDelete}
        onCancel={() => setSessionToDelete(null)}
      />
    </div>
  );
}
