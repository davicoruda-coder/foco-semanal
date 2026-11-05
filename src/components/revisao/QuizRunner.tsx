"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  BookMarked,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
  XCircle,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { useRevisao } from "@/components/revisao/RevisaoProvider";
import { saveQuizSession } from "@/lib/revisao/quiz-store";
import type { QuizQuestion, QuizSession } from "@/lib/revisao/quiz-types";

interface QuizRunnerProps {
  session: QuizSession;
  onExit: () => void;
  onRestart: () => void;
}

export function QuizRunner({ session: initialSession, onExit, onRestart }: QuizRunnerProps) {
  const { addStudySession } = useApp();
  const { addFlashcardManual, addQuestao } = useRevisao();

  const [session, setSession] = useState<QuizSession>(initialSession);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isAnswered, setIsAnswered] = useState(false);
  const [isFinished, setIsFinished] = useState(Boolean(initialSession.completedAt));

  // Rastreamento de ações pós-erro para cada questão
  const [addedToCaderno, setAddedToCaderno] = useState<Record<string, boolean>>({});
  const [addedToCards, setAddedToCards] = useState<Record<string, boolean>>({});

  const startTimeRef = useState(() => Date.now())[0];

  const currentQ: QuizQuestion | undefined = session.questions[currentIndex];

  const handleSelectOption = (idx: number) => {
    if (isAnswered || !currentQ) return;
    setSelectedOption(idx);
    setIsAnswered(true);

    const isCorrect = idx === currentQ.answerIndex;
    const nextAnswers = { ...session.userAnswers, [currentQ.id]: idx };
    const nextCorrectCount = session.correctCount + (isCorrect ? 1 : 0);

    const updatedSession: QuizSession = {
      ...session,
      userAnswers: nextAnswers,
      correctCount: nextCorrectCount,
    };
    setSession(updatedSession);
  };

  const handleNext = () => {
    if (currentIndex < session.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setSelectedOption(null);
      setIsAnswered(false);
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    const total = session.questions.length;
    const correct = session.correctCount;
    const scorePercentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    const nowIso = new Date().toISOString();

    const completed: QuizSession = {
      ...session,
      completedAt: nowIso,
      scorePercentage,
    };

    setSession(completed);
    setIsFinished(true);
    saveQuizSession(completed);

    // Registra no histórico de sessões de estudo
    const elapsedMinutes = Math.max(1, Math.round((Date.now() - startTimeRef) / 60000));
    try {
      addStudySession({
        subject_id: null,
        subject_name: session.subjectName || "Quiz Inteligente",
        duration_minutes: elapsedMinutes,
        started_at: new Date(startTimeRef).toISOString(),
        ended_at: nowIso,
        mode: "unica",
        completed: true,
      });
    } catch (err) {
      console.warn("Could not save study session for quiz:", err);
    }
  };

  // Enviar questão errada para o Caderno de Erros
  const handleSendToCaderno = async (q: QuizQuestion) => {
    if (addedToCaderno[q.id]) return;
    try {
      await addQuestao({
        disciplina: q.subjectName || "Geral",
        assunto: "Quiz IA",
        banca: "FocoHub IA",
        enunciado_texto: q.statement,
        aprendizado_chave: `Gabarito: ${q.options[q.answerIndex] ?? ""}\n\nExplicação: ${q.explanation}`,
        status_resultado: "erro",
        causa_erro: "teoria",
      });
      setAddedToCaderno((prev) => ({ ...prev, [q.id]: true }));
    } catch (err) {
      console.error("Erro ao enviar para caderno:", err);
    }
  };

  // Criar flashcard a partir da questão errada
  const handleCreateFlashcard = async (q: QuizQuestion) => {
    if (addedToCards[q.id]) return;
    try {
      const correctText = q.options[q.answerIndex] || "";
      await addFlashcardManual(
        q.subjectName || "Geral",
        q.statement,
        `Resposta correta: ${correctText}\n\nExplicação:\n${q.explanation}`,
      );
      setAddedToCards((prev) => ({ ...prev, [q.id]: true }));
    } catch (err) {
      console.error("Erro ao criar flashcard:", err);
    }
  };

  // Se já finalizou, mostra a tela de resumo final
  if (isFinished) {
    const wrongQuestions = session.questions.filter(
      (q) => session.userAnswers[q.id] !== q.answerIndex,
    );

    return (
      <div className="mx-auto max-w-2xl space-y-5 p-3 sm:p-5">
        {/* Card do Desempenho Final */}
        <div className="surface rounded-2xl border border-[var(--line)] p-6 text-center shadow-xs space-y-3">
          <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-[var(--signal-soft)] text-[var(--signal)]">
            <Trophy size={32} />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-[var(--ink)]">
            Quiz Concluído!
          </h2>
          <div className="flex items-center justify-center gap-3 text-sm">
            <span className="rounded-full bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] px-3 py-1 font-bold text-[var(--signal)]">
              {session.scorePercentage}% de aproveitamento
            </span>
            <span className="text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
              {session.correctCount} de {session.totalQuestions} acertos
            </span>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-2">
            <button
              type="button"
              onClick={onRestart}
              className="flex items-center gap-1.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-semibold text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
            >
              <RotateCcw size={14} />
              Refazer Quiz
            </button>
            <button
              type="button"
              onClick={onExit}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--signal)] px-5 py-2 text-xs font-semibold text-white shadow-xs hover:opacity-95"
            >
              Concluir e Voltar
            </button>
          </div>
        </div>

        {/* Questões Erradas com Ações Rápidas */}
        {wrongQuestions.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_65%,transparent)] px-1">
              Questões que você errou ({wrongQuestions.length})
            </h3>
            <div className="space-y-3">
              {wrongQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className="surface rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2.5"
                >
                  <p className="text-xs font-semibold text-[var(--ink)] leading-snug">
                    <span className="text-rose-500 font-bold mr-1.5">✕</span>
                    {q.statement}
                  </p>

                  <div className="rounded-lg bg-[var(--surface)] p-2.5 text-xs border border-[var(--line)]">
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 mb-1">
                      Gabarito: {q.options[q.answerIndex]}
                    </p>
                    <p className="text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed">
                      {q.explanation}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      disabled={addedToCaderno[q.id]}
                      onClick={() => handleSendToCaderno(q)}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] disabled:opacity-50"
                    >
                      {addedToCaderno[q.id] ? (
                        <>
                          <Check size={13} className="text-emerald-500" />
                          <span>Salvo no Caderno</span>
                        </>
                      ) : (
                        <>
                          <BookMarked size={13} className="text-[var(--signal)]" />
                          <span>+ Caderno de Erros</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      disabled={addedToCards[q.id]}
                      onClick={() => handleCreateFlashcard(q)}
                      className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] disabled:opacity-50"
                    >
                      {addedToCards[q.id] ? (
                        <>
                          <Check size={13} className="text-emerald-500" />
                          <span>Flashcard Criado</span>
                        </>
                      ) : (
                        <>
                          <Sparkles size={13} className="text-amber-500" />
                          <span>+ Criar Flashcard</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!currentQ) return null;

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-3 sm:p-5">
      {/* Barra de Progresso e Saída */}
      <div className="flex items-center justify-between border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] px-2.5 py-0.5 text-xs font-bold text-[var(--signal)]">
            Questão {currentIndex + 1} de {session.questions.length}
          </span>
          {session.subjectName && (
            <span className="rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink)]">
              {session.subjectName}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={onExit}
          className="rounded-lg p-1 text-[color-mix(in_srgb,var(--ink)_60%,transparent)] hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] hover:text-[var(--ink)]"
          title="Sair do Quiz"
        >
          <X size={18} />
        </button>
      </div>

      {/* Card da Questão */}
      <div className="surface rounded-2xl border border-[var(--line)] p-5 shadow-xs space-y-4">
        <p className="text-sm sm:text-base font-semibold leading-relaxed text-[var(--ink)]">
          {currentQ.statement}
        </p>

        {/* Lista de Alternativas */}
        <div className="space-y-2">
          {currentQ.options.map((opt, idx) => {
            let btnStyle =
              "border-[var(--line)] bg-[var(--surface)] hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)] text-[var(--ink)]";

            if (isAnswered) {
              if (idx === currentQ.answerIndex) {
                btnStyle =
                  "border-emerald-500 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-semibold ring-1 ring-emerald-500";
              } else if (idx === selectedOption) {
                btnStyle =
                  "border-rose-500 bg-rose-500/10 text-rose-700 dark:text-rose-300 font-semibold ring-1 ring-rose-500";
              } else {
                btnStyle =
                  "border-[var(--line)] bg-[var(--surface)] text-[color-mix(in_srgb,var(--ink)_45%,transparent)] opacity-60";
              }
            }

            return (
              <button
                key={idx}
                type="button"
                disabled={isAnswered}
                onClick={() => handleSelectOption(idx)}
                className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-xs sm:text-sm transition ${btnStyle}`}
              >
                <span className="mt-0.5 shrink-0">
                  {isAnswered ? (
                    idx === currentQ.answerIndex ? (
                      <CheckCircle2 size={16} className="text-emerald-500" />
                    ) : idx === selectedOption ? (
                      <XCircle size={16} className="text-rose-500" />
                    ) : (
                      <span className="grid size-4 place-items-center rounded-full border border-[var(--line)] text-[10px]" />
                    )
                  ) : (
                    <span className="grid size-4 place-items-center rounded-full border border-[var(--line)] text-[10px]" />
                  )}
                </span>
                <span className="leading-snug">{opt}</span>
              </button>
            );
          })}
        </div>

        {/* Feedback Imediato e Comentário Didático */}
        {isAnswered && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-3 rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_2%,var(--surface))] p-4">
            <div className="flex items-center gap-2">
              {selectedOption === currentQ.answerIndex ? (
                <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                  <CheckCircle2 size={16} /> Você acertou!
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                  <AlertCircle size={16} /> Resposta incorreta
                </span>
              )}
            </div>

            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_80%,transparent)] leading-relaxed">
              {currentQ.explanation}
            </p>

            {/* Ações ao errar a questão */}
            {selectedOption !== currentQ.answerIndex && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--line)]">
                <button
                  type="button"
                  disabled={addedToCaderno[currentQ.id]}
                  onClick={() => handleSendToCaderno(currentQ)}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] disabled:opacity-50"
                >
                  {addedToCaderno[currentQ.id] ? (
                    <>
                      <Check size={13} className="text-emerald-500" />
                      <span>Salvo no Caderno</span>
                    </>
                  ) : (
                    <>
                      <BookMarked size={13} className="text-[var(--signal)]" />
                      <span>+ Caderno de Erros</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={addedToCards[currentQ.id]}
                  onClick={() => handleCreateFlashcard(currentQ)}
                  className="flex items-center gap-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] disabled:opacity-50"
                >
                  {addedToCards[currentQ.id] ? (
                    <>
                      <Check size={13} className="text-emerald-500" />
                      <span>Flashcard Criado</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={13} className="text-amber-500" />
                      <span>+ Criar Flashcard</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Botão de Avanço */}
        {isAnswered && (
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleNext}
              className="flex items-center gap-1.5 rounded-xl bg-[var(--signal)] px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm transition hover:opacity-95"
            >
              <span>{currentIndex < session.questions.length - 1 ? "Próxima Questão" : "Ver Resultado"}</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
