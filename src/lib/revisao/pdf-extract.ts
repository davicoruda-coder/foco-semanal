"use client";

export interface PdfExtractionResult {
  text: string;
  numPages: number;
  startPage: number;
  endPage: number;
  charCount: number;
  isLikelyScanned: boolean;
}

export const MAX_PDF_PAGES_ALLOWED = 8;
export const MAX_PDF_CHARS_ALLOWED = 20000;

/**
 * Extrai texto diretamente no navegador a partir de um arquivo PDF.
 * Suporta seleção de páginas (máx 8) e trava em teto de caracteres.
 */
export async function extractTextFromPdf(
  file: File,
  startPage = 1,
  endPage?: number,
): Promise<PdfExtractionResult> {
  const pdfjsLib = await import("pdfjs-dist");

  // Configura o worker oficial via CDN correspondente à versão instalada
  if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const doc = await loadingTask.promise;
  const numPages = doc.numPages;

  const validStart = Math.max(1, Math.min(startPage, numPages));
  const maxEnd = Math.min(numPages, validStart + MAX_PDF_PAGES_ALLOWED - 1);
  const validEnd = endPage
    ? Math.max(validStart, Math.min(endPage, maxEnd))
    : maxEnd;

  let fullText = "";

  for (let p = validStart; p <= validEnd; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item) => ("str" in item ? item.str : ""))
      .join(" ");

    fullText += `\n[Página ${p}]\n` + pageText.trim() + "\n";

    if (fullText.length >= MAX_PDF_CHARS_ALLOWED) {
      fullText = fullText.slice(0, MAX_PDF_CHARS_ALLOWED);
      break;
    }
  }

  const cleanedText = fullText.trim();
  const isLikelyScanned = cleanedText.replace(/\[Página \d+\]/g, "").trim().length < 80;

  return {
    text: cleanedText,
    numPages,
    startPage: validStart,
    endPage: validEnd,
    charCount: cleanedText.length,
    isLikelyScanned,
  };
}

