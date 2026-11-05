"use client";

import { useMemo, useState } from "react";
import {
  BookMarked,
  Check,
  ChevronDown,
  FileText,
  FileUp,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { DialogFrame } from "@/components/DialogFrame";
import { useApp } from "@/components/AppProvider";
import { useRevisao } from "@/components/revisao/RevisaoProvider";
import { compressImage } from "@/lib/revisao/image-upload";
import {
  extractTextFromPdf,
  MAX_PDF_CHARS_ALLOWED,
  MAX_PDF_PAGES_ALLOWED,
} from "@/lib/revisao/pdf-extract";
import type {
  QuizQuestion,
  QuizSession,
  QuizSourceType,
} from "@/lib/revisao/quiz-types";

interface QuizCreatorModalProps {
  open: boolean;
  onClose: () => void;
  onQuizReady: (quiz: QuizSession) => void;
}

export function QuizCreatorModal({
  open,
  onClose,
  onQuizReady,
}: QuizCreatorModalProps) {
  const { data } = useApp();
  const { questoes, allFlashcards, materias } = useRevisao();

  const [sourceType, setSourceType] = useState<QuizSourceType>("texto");
  const [selectedMateria, setSelectedMateria] = useState<string>("");

  // Base Interna
  const [baseInternaMode, setBaseInternaMode] = useState<"caderno" | "cards">("caderno");

  // Texto
  const [texto, setTexto] = useState("");

  // Ficheiro (PDF)
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfNumPages, setPdfNumPages] = useState<number>(0);
  const [pdfStartPage, setPdfStartPage] = useState<number>(1);
  const [pdfEndPage, setPdfEndPage] = useState<number>(1);
  const [pdfExtractedText, setPdfExtractedText] = useState("");
  const [pdfCharCount, setPdfCharCount] = useState(0);
  const [pdfIsScanned, setPdfIsScanned] = useState(false);
  const [extractingPdf, setExtractingPdf] = useState(false);

  // Ficheiro (Imagens)
  const [imageFiles, setImageFiles] = useState<Array<{ dataUrl: string; name: string }>>([]);

  // Configuração das Questões
  const [questionType, setQuestionType] = useState<"todos" | "multipla_escolha" | "certo_errado">("todos");
  const [questionCount, setQuestionCount] = useState<number>(5);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Matérias disponíveis
  const materiaOptions = useMemo(() => {
    const names = new Set<string>();
    for (const m of materias) names.add(m.nome);
    for (const s of data.subjects ?? []) names.add(s.name);
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [materias, data.subjects]);

  // Contagem de itens na Base Interna
  const filteredErros = useMemo(() => {
    return questoes.filter((q) => {
      if (selectedMateria && q.disciplina !== selectedMateria) return false;
      return true;
    });
  }, [questoes, selectedMateria]);

  const filteredCardsDificeis = useMemo(() => {
    return allFlashcards.filter((c) => {
      if (selectedMateria && c.disciplina !== selectedMateria) return false;
      return c.nivel_dominio <= 1; // 0 = Novo, 1 = Difícil
    });
  }, [allFlashcards, selectedMateria]);

  // Handler de upload de PDF
  const handlePdfUpload = async (file: File) => {
    setPdfFile(file);
    setExtractingPdf(true);
    setErrorMsg(null);
    try {
      const res = await extractTextFromPdf(file, 1);
      setPdfNumPages(res.numPages);
      setPdfStartPage(res.startPage);
      setPdfEndPage(res.endPage);
      setPdfExtractedText(res.text);
      setPdfCharCount(res.charCount);
      setPdfIsScanned(res.isLikelyScanned);
    } catch (err) {
      console.error("PDF extraction error:", err);
      setErrorMsg("Falha ao ler o PDF. Tente enviar como texto ou imagem.");
    } finally {
      setExtractingPdf(false);
    }
  };

  const handlePdfRangeChange = async (start: number, end: number) => {
    if (!pdfFile) return;
    setPdfStartPage(start);
    setPdfEndPage(end);
    setExtractingPdf(true);
    try {
      const res = await extractTextFromPdf(pdfFile, start, end);
      setPdfExtractedText(res.text);
      setPdfCharCount(res.charCount);
      setPdfIsScanned(res.isLikelyScanned);
    } catch {
      setErrorMsg("Erro ao recarregar páginas do PDF.");
    } finally {
      setExtractingPdf(false);
    }
  };

  // Handler de upload de Imagens (máx 2)
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setErrorMsg(null);
    const toProcess = Array.from(files).slice(0, 2 - imageFiles.length);

    try {
      const compressedList: Array<{ dataUrl: string; name: string }> = [];
      for (const file of toProcess) {
        const res = await compressImage(file, 1080, 0.8);
        compressedList.push({
          dataUrl: res.dataUrl,
          name: file.name,
        });
      }
      setImageFiles((prev) => [...prev, ...compressedList].slice(0, 2));
    } catch (err) {
      console.error("Image compression error:", err);
      setErrorMsg("Erro ao comprimir imagem.");
    }
    e.target.value = "";
  };

  // Submissão
  const handleGenerate = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      let finalContent = "";
      const imagesToSend: string[] = [];

      if (sourceType === "base_interna") {
        if (baseInternaMode === "caderno") {
          const sample = filteredErros.slice(0, 6);
          if (sample.length === 0) {
            throw new Error("Nenhum item do Caderno de Erros selecionado.");
          }
          finalContent = sample
            .map(
              (item, idx) =>
                `[Erro ${idx + 1}] Assunto: ${item.assunto || "Geral"}\nEnunciado: ${item.enunciado_texto || ""}\nAprendizado/Regra: ${item.aprendizado_chave || ""}`,
            )
            .join("\n\n");
        } else {
          const sample = filteredCardsDificeis.slice(0, 8);
          if (sample.length === 0) {
            throw new Error("Nenhum Flashcard difícil encontrado nesta matéria.");
          }
          finalContent = sample
            .map(
              (card, idx) =>
                `[Card ${idx + 1}] Pergunta: ${card.frente}\nResposta: ${card.verso}`,
            )
            .join("\n\n");
        }
      } else if (sourceType === "texto") {
        if (!texto.trim() || texto.trim().length < 40) {
          throw new Error("O texto precisa ter ao menos 40 caracteres.");
        }
        finalContent = texto.trim();
      } else if (sourceType === "pdf") {
        if (!pdfExtractedText || pdfExtractedText.length < 40) {
          throw new Error("Nenhum texto suficiente foi extraído do PDF.");
        }
        finalContent = pdfExtractedText;
      } else if (sourceType === "imagem") {
        if (imageFiles.length === 0) {
          throw new Error("Adicione pelo menos 1 imagem ou print.");
        }
        imagesToSend.push(...imageFiles.map((f) => f.dataUrl));
        finalContent = "Analise o conteúdo do print/imagem anexo e gere o quiz didático.";
      }

      const res = await fetch("/api/revisao/gerar-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceType,
          texto: finalContent,
          images: imagesToSend,
          questionType,
          count: questionCount,
          disciplina: selectedMateria,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Falha ao gerar o Quiz com IA.");
      }

      const questions = data.questions as QuizQuestion[];
      if (!questions || questions.length === 0) {
        throw new Error("Nenhuma questão foi retornada pela IA.");
      }

      const session: QuizSession = {
        id: `quiz_${Date.now()}`,
        title: selectedMateria ? `Quiz: ${selectedMateria}` : "Quiz Inteligente",
        sourceType,
        subjectName: selectedMateria || undefined,
        questions,
        userAnswers: {},
        createdAt: new Date().toISOString(),
        totalQuestions: questions.length,
        correctCount: 0,
        scorePercentage: 0,
      };

      onQuizReady(session);
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Erro ao gerar quiz.");
    } finally {
      setLoading(false);
    }
  };

  const isFormValid = useMemo(() => {
    if (loading) return false;
    if (sourceType === "base_interna") {
      return baseInternaMode === "caderno"
        ? filteredErros.length > 0
        : filteredCardsDificeis.length > 0;
    }
    if (sourceType === "texto") return texto.trim().length >= 40;
    if (sourceType === "pdf") return pdfExtractedText.length >= 40;
    if (sourceType === "imagem") return imageFiles.length > 0;
    return false;
  }, [
    loading,
    sourceType,
    baseInternaMode,
    filteredErros.length,
    filteredCardsDificeis.length,
    texto,
    pdfExtractedText.length,
    imageFiles.length,
  ]);

  return (
    <DialogFrame
      open={open}
      onClose={onClose}
      closeOnOutsideClick
      labelledBy="quiz-creator-title"
      cardClassName="surface w-full max-w-lg overflow-hidden rounded-2xl p-0 shadow-[var(--shadow-lg)] border border-[var(--line)]"
    >
      {/* Cabeçalho */}
      <div className="flex items-center justify-between border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--signal)_6%,var(--surface))] px-5 py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-xl bg-[var(--signal)] text-white shadow-xs">
            <Sparkles size={16} />
          </span>
          <h2
            id="quiz-creator-title"
            className="text-base font-semibold tracking-tight text-[var(--ink)]"
          >
            Novo Quiz com IA
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-[color-mix(in_srgb,var(--ink)_60%,transparent)] transition hover:bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] hover:text-[var(--ink)]"
        >
          <X size={18} />
        </button>
      </div>

      <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
        {/* Seletor de Origem */}
        <div className="grid grid-cols-4 gap-1.5 rounded-xl bg-[color-mix(in_srgb,var(--ink)_5%,transparent)] p-1 text-xs">
          <button
            type="button"
            onClick={() => setSourceType("texto")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-lg py-2 px-1 font-medium transition ${
              sourceType === "texto"
                ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs font-semibold"
                : "text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)]"
            }`}
          >
            <FileText size={14} />
            Texto
          </button>
          <button
            type="button"
            onClick={() => setSourceType("pdf")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-lg py-2 px-1 font-medium transition ${
              sourceType === "pdf"
                ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs font-semibold"
                : "text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)]"
            }`}
          >
            <FileUp size={14} />
            PDF
          </button>
          <button
            type="button"
            onClick={() => setSourceType("imagem")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-lg py-2 px-1 font-medium transition ${
              sourceType === "imagem"
                ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs font-semibold"
                : "text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)]"
            }`}
          >
            <ImageIcon size={14} />
            Print/Foto
          </button>
          <button
            type="button"
            onClick={() => setSourceType("base_interna")}
            className={`flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 rounded-lg py-2 px-1 font-medium transition ${
              sourceType === "base_interna"
                ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs font-semibold"
                : "text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)]"
            }`}
          >
            <BookMarked size={14} />
            Base Interna
          </button>
        </div>

        {/* Disciplina Opcional */}
        <div>
          <label className="block text-xs font-semibold text-[color-mix(in_srgb,var(--ink)_75%,transparent)] mb-1">
            Matéria / Disciplina
          </label>
          <div className="relative">
            <select
              value={selectedMateria}
              onChange={(e) => setSelectedMateria(e.target.value)}
              className="w-full appearance-none rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-2 text-xs font-medium text-[var(--ink)] outline-none focus:border-[var(--signal)]"
            >
              <option value="">Geral / Sem matéria específica</option>
              {materiaOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[color-mix(in_srgb,var(--ink)_50%,transparent)]"
            />
          </div>
        </div>

        {/* ABA: TEXTO */}
        {sourceType === "texto" && (
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[var(--ink)]">Conteúdo do Texto</span>
              <span
                className={`font-mono text-[11px] ${
                  texto.length > MAX_PDF_CHARS_ALLOWED
                    ? "text-rose-500 font-bold"
                    : "text-[color-mix(in_srgb,var(--ink)_60%,transparent)]"
                }`}
              >
                {texto.length} / {MAX_PDF_CHARS_ALLOWED}
              </span>
            </div>
            <textarea
              rows={6}
              value={texto}
              maxLength={MAX_PDF_CHARS_ALLOWED}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Cole aqui seu resumo, artigos de lei ou anotações..."
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs text-[var(--ink)] placeholder:text-[color-mix(in_srgb,var(--ink)_40%,transparent)] outline-none focus:border-[var(--signal)]"
            />
          </div>
        )}

        {/* ABA: PDF */}
        {sourceType === "pdf" && (
          <div className="space-y-3">
            {!pdfFile ? (
              <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] p-6 text-center cursor-pointer transition hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)]">
                <FileUp size={28} className="text-[var(--signal)] mb-2" />
                <span className="text-xs font-semibold text-[var(--ink)]">
                  Selecionar arquivo PDF
                </span>
                <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] mt-0.5">
                  Extração instantânea no navegador
                </span>
                <input
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handlePdfUpload(f);
                  }}
                />
              </label>
            ) : (
              <div className="space-y-2.5 rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileUp size={16} className="text-[var(--signal)] shrink-0" />
                    <span className="truncate text-xs font-semibold text-[var(--ink)]">
                      {pdfFile.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                      ({pdfNumPages} {pdfNumPages === 1 ? "pág" : "págs"})
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPdfFile(null);
                      setPdfExtractedText("");
                    }}
                    className="text-xs text-rose-500 hover:underline"
                  >
                    Trocar
                  </button>
                </div>

                {/* Seletor de Páginas (quando > 8) */}
                {pdfNumPages > MAX_PDF_PAGES_ALLOWED && (
                  <div className="rounded-lg border border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_2%,var(--surface))] p-2.5 space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[var(--ink)]">
                        Intervalo (máx {MAX_PDF_PAGES_ALLOWED} págs):
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span>Pág</span>
                      <input
                        type="number"
                        min={1}
                        max={pdfNumPages}
                        value={pdfStartPage}
                        onChange={(e) => {
                          const s = Math.max(1, Number(e.target.value) || 1);
                          const ePage = Math.min(pdfNumPages, s + MAX_PDF_PAGES_ALLOWED - 1);
                          handlePdfRangeChange(s, ePage);
                        }}
                        className="w-14 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-center font-semibold text-[var(--ink)] outline-none"
                      />
                      <span>até</span>
                      <input
                        type="number"
                        min={pdfStartPage}
                        max={Math.min(pdfNumPages, pdfStartPage + MAX_PDF_PAGES_ALLOWED - 1)}
                        value={pdfEndPage}
                        onChange={(e) => {
                          const ed = Math.max(pdfStartPage, Number(e.target.value) || pdfStartPage);
                          handlePdfRangeChange(pdfStartPage, ed);
                        }}
                        className="w-14 rounded-md border border-[var(--line)] bg-[var(--surface)] px-2 py-1 text-center font-semibold text-[var(--ink)] outline-none"
                      />
                    </div>
                  </div>
                )}

                {extractingPdf ? (
                  <div className="flex items-center gap-2 text-xs text-[var(--signal)] py-2">
                    <Loader2 size={14} className="animate-spin" />
                    <span>Extraindo texto das páginas...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)] pt-1">
                    <span>
                      {pdfCharCount} caracteres prontos
                    </span>
                    {pdfIsScanned && (
                      <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                        Pouco texto detectado (documento escaneado?)
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ABA: IMAGEM / PRINT */}
        {sourceType === "imagem" && (
          <div className="space-y-3">
            {imageFiles.length < 2 && (
              <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[var(--line)] p-5 text-center cursor-pointer transition hover:bg-[color-mix(in_srgb,var(--ink)_3%,transparent)]">
                <ImageIcon size={26} className="text-[var(--signal)] mb-1.5" />
                <span className="text-xs font-semibold text-[var(--ink)]">
                  Enviar print ou foto (máx 2)
                </span>
                <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] mt-0.5">
                  Compressão automática para Full HD
                </span>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </label>
            )}

            {imageFiles.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {imageFiles.map((img, idx) => (
                  <div
                    key={idx}
                    className="group relative overflow-hidden rounded-xl border border-[var(--line)] bg-[var(--surface)] p-1.5"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.dataUrl}
                      alt={img.name}
                      className="h-24 w-full rounded-lg object-cover"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setImageFiles((prev) => prev.filter((_, i) => i !== idx))
                      }
                      className="absolute right-2.5 top-2.5 rounded-md bg-black/60 p-1 text-white transition hover:bg-rose-600"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ABA: BASE INTERNA */}
        {sourceType === "base_interna" && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-[color-mix(in_srgb,var(--ink)_4%,transparent)] p-1 text-xs">
              <button
                type="button"
                onClick={() => setBaseInternaMode("caderno")}
                className={`py-1.5 px-2 rounded-lg font-medium transition ${
                  baseInternaMode === "caderno"
                    ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs font-semibold"
                    : "text-[color-mix(in_srgb,var(--ink)_70%,transparent)]"
                }`}
              >
                Caderno de Erros ({filteredErros.length})
              </button>
              <button
                type="button"
                onClick={() => setBaseInternaMode("cards")}
                className={`py-1.5 px-2 rounded-lg font-medium transition ${
                  baseInternaMode === "cards"
                    ? "bg-[var(--surface)] text-[var(--signal)] shadow-xs font-semibold"
                    : "text-[color-mix(in_srgb,var(--ink)_70%,transparent)]"
                }`}
              >
                Cards Difíceis ({filteredCardsDificeis.length})
              </button>
            </div>

            <div className="rounded-xl border border-[var(--line)] bg-[var(--surface)] p-3 text-xs text-[color-mix(in_srgb,var(--ink)_70%,transparent)]">
              {baseInternaMode === "caderno" ? (
                filteredErros.length > 0 ? (
                  <span>
                    A IA vai elaborar questões inéditas baseadas nos{" "}
                    <strong className="text-[var(--ink)]">
                      {Math.min(6, filteredErros.length)} erros mais recentes
                    </strong>{" "}
                    desta matéria para verificar se a dúvida foi superada.
                  </span>
                ) : (
                  <span>Nenhum erro registrado com os filtros atuais.</span>
                )
              ) : filteredCardsDificeis.length > 0 ? (
                <span>
                  A IA vai criar um quiz testando os conceitos dos{" "}
                  <strong className="text-[var(--ink)]">
                    {Math.min(8, filteredCardsDificeis.length)} flashcards difíceis
                  </strong>.
                </span>
              ) : (
                <span>Nenhum flashcard difícil encontrado com os filtros atuais.</span>
              )}
            </div>
          </div>
        )}

        {/* Formato e Quantidade */}
        <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[var(--line)]">
          <div>
            <label className="block text-xs font-semibold text-[color-mix(in_srgb,var(--ink)_75%,transparent)] mb-1">
              Formato
            </label>
            <select
              value={questionType}
              onChange={(e) =>
                setQuestionType(
                  e.target.value as "todos" | "multipla_escolha" | "certo_errado",
                )
              }
              className="w-full rounded-xl border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-xs font-medium text-[var(--ink)] outline-none focus:border-[var(--signal)]"
            >
              <option value="todos">Mista (Múltipla + C/E)</option>
              <option value="multipla_escolha">Múltipla Escolha (4 opções)</option>
              <option value="certo_errado">Certo ou Errado</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[color-mix(in_srgb,var(--ink)_75%,transparent)] mb-1">
              Quantidade
            </label>
            <div className="grid grid-cols-3 gap-1">
              {[3, 5, 10].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setQuestionCount(num)}
                  className={`rounded-lg py-1.5 text-xs font-semibold transition ${
                    questionCount === num
                      ? "bg-[var(--signal)] text-white shadow-2xs"
                      : "border border-[var(--line)] bg-[var(--surface)] text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_5%,transparent)]"
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        </div>

        {errorMsg && (
          <p className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-2.5 text-xs font-medium text-rose-600 dark:text-rose-400">
            {errorMsg}
          </p>
        )}
      </div>

      {/* Rodapé */}
      <div className="flex items-center justify-end gap-2 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--ink)_2%,var(--surface))] px-5 py-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-2 text-xs font-medium text-[var(--ink)] hover:bg-[color-mix(in_srgb,var(--ink)_6%,transparent)]"
        >
          Cancelar
        </button>
        <button
          type="button"
          disabled={!isFormValid || loading}
          onClick={handleGenerate}
          className="flex items-center gap-1.5 rounded-xl bg-[var(--signal)] px-4 py-2 text-xs font-semibold text-white shadow-sm transition enabled:hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {loading ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Gerando Quiz...</span>
            </>
          ) : (
            <>
              <Sparkles size={14} />
              <span>Gerar Quiz</span>
            </>
          )}
        </button>
      </div>
    </DialogFrame>
  );
}
