import { formatFocusDuration } from "@/lib/focus-log";

export type FocusReportSubjectRow = {
  name: string;
  seconds: number;
  percentage: number;
};

export type FocusReportRow = {
  label: string;
  seconds: number;
};

export type FocusReportSessionRow = {
  subjectName: string;
  timeRange: string;
  durationMinutes: number;
  type: string;
  dateStr?: string;
};

export type FocusReportFlashcardSummary = {
  totalCards: number;
  pendentesHoje: number;
  reviewedInPeriod?: number;
  dominioCount?: {
    novo: number;
    dificil: number;
    bom: number;
    dominado: number;
  };
};

export type FocusReportAiSummary = {
  content: string;
  generatedAt?: string;
  model?: string;
};

export type FocusReportSections = {
  summary?: boolean;
  subjects?: boolean;
  timeSlots?: boolean;
  sessionDiary?: boolean;
  flashcards?: boolean;
  aiAnalysis?: boolean;
};

export type FocusReportOptions = {
  period: string;
  totalSeconds: number;
  rows: FocusReportRow[];
  subjectRows?: FocusReportSubjectRow[];
  sessionRows?: FocusReportSessionRow[];
  completedCycleRounds?: number;
  filename: string;
  subjectFilter?: string | null;
  sections?: FocusReportSections;
  flashcardStats?: FocusReportFlashcardSummary;
  aiAnalysis?: FocusReportAiSummary;
};

/** Gera no navegador um PDF estruturado, legível e personalizável de acordo com as preferências do estudante. */
export async function downloadFocusReport({
  period,
  totalSeconds,
  rows,
  subjectRows,
  sessionRows,
  completedCycleRounds = 0,
  filename,
  subjectFilter = null,
  sections = {
    summary: true,
    subjects: true,
    timeSlots: true,
    sessionDiary: true,
    flashcards: true,
    aiAnalysis: true,
  },
  flashcardStats,
  aiAnalysis,
}: FocusReportOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const includeSummary = sections.summary ?? true;
  const includeSubjects = sections.subjects ?? true;
  const includeTimeSlots = sections.timeSlots ?? true;
  const includeSessionDiary = sections.sessionDiary ?? true;
  const includeFlashcards = sections.flashcards ?? true;
  const includeAi = sections.aiAnalysis ?? true;

  doc.setProperties({
    title: subjectFilter ? `Relatório — ${subjectFilter} (${period})` : `Relatório de foco — ${period}`,
    subject: "Tempo de foco e atividades registrado no FocoHub",
    creator: "FocoHub",
  });

  // Top header banner
  doc.setFillColor(109, 94, 248);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("FocoHub", margin, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const subBannerText = subjectFilter
    ? `Relatório Focado: ${subjectFilter}`
    : "Relatório de Tempo & Atividades";
  doc.text(subBannerText, margin, 23);

  // Período e Data de geração
  doc.setTextColor(22, 23, 31);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(period, margin, 44);
  doc.setFontSize(9.5);
  doc.setTextColor(95, 96, 108);
  doc.setFont("helvetica", "normal");
  doc.text(
    `Gerado em ${new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date())}`,
    margin,
    51,
  );

  let y = 57;

  // 1. Cards do Resumo Geral (se habilitado)
  if (includeSummary) {
    const hasRounds = completedCycleRounds > 0;
    const cardWidth = hasRounds ? (contentWidth - 6) / 2 : contentWidth;

    doc.setFillColor(244, 243, 255);
    doc.roundedRect(margin, y, cardWidth, 19, 3, 3, "F");
    doc.setTextColor(95, 96, 108);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("TEMPO TOTAL REGISTRADO", margin + 5, y + 6.5);
    doc.setTextColor(22, 23, 31);
    doc.setFontSize(14);
    doc.text(formatFocusDuration(totalSeconds), margin + 5, y + 14);

    if (hasRounds) {
      const roundX = margin + cardWidth + 6;
      doc.setFillColor(238, 242, 255);
      doc.roundedRect(roundX, y, cardWidth, 19, 3, 3, "F");
      doc.setTextColor(95, 96, 108);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("CICLOS DE ESTUDO COMPLETOS", roundX + 5, y + 6.5);
      doc.setTextColor(79, 70, 229);
      doc.setFontSize(14);
      doc.text(
        `${completedCycleRounds} ${completedCycleRounds === 1 ? "volta concluída" : "voltas concluídas"}`,
        roundX + 5,
        y + 14,
      );
    }
    y += 26;
  } else {
    y += 4;
  }

  // 2. Tabela: Distribuição por Matéria / Atividade (se houver matérias e habilitado)
  if (includeSubjects && subjectRows && subjectRows.length > 0) {
    if (y + 24 > pageHeight - 17) {
      doc.addPage();
      y = 18;
    }

    doc.setTextColor(63, 58, 99);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DISTRIBUIÇÃO POR MATÉRIA / ATIVIDADE", margin, y);
    y += 4;

    doc.setFillColor(232, 230, 252);
    doc.rect(margin, y, contentWidth, 8, "F");
    doc.setTextColor(63, 58, 99);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("MATÉRIA / ATIVIDADE", margin + 4, y + 5.5);
    doc.text("TEMPO (% DO TOTAL)", pageWidth - margin - 4, y + 5.5, { align: "right" });
    y += 8;

    subjectRows.forEach((sub, index) => {
      if (y + 8 > pageHeight - 17) {
        doc.addPage();
        y = 18;
      }
      if (index % 2 === 1) {
        doc.setFillColor(248, 248, 251);
        doc.rect(margin, y, contentWidth, 8, "F");
      }
      doc.setTextColor(42, 43, 52);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(sub.name, margin + 4, y + 5.5);
      doc.setFont("helvetica", "bold");
      doc.text(
        `${formatFocusDuration(sub.seconds)} (${sub.percentage}%)`,
        pageWidth - margin - 4,
        y + 5.5,
        { align: "right" },
      );
      y += 8;
    });

    y += 8;
  }

  // 3. Tabela: Períodos / Horários de Foco (se habilitado)
  if (includeTimeSlots) {
    const activeRows = rows.filter((r) => r.seconds > 0);
    const rowsToRender = activeRows.length > 0 ? activeRows : rows.slice(0, 5);

    if (rowsToRender.length > 0) {
      if (y + 22 > pageHeight - 17) {
        doc.addPage();
        y = 18;
      }

      doc.setTextColor(63, 58, 99);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(
        activeRows.length > 0
          ? "HORÁRIOS DE ATIVIDADE REGISTRADOS"
          : "HISTÓRICO DO PERÍODO",
        margin,
        y,
      );
      y += 4;

      function drawTimeTableHeader() {
        doc.setFillColor(232, 230, 252);
        doc.rect(margin, y, contentWidth, 8, "F");
        doc.setTextColor(63, 58, 99);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8.5);
        doc.text("PERÍODO / HORÁRIO", margin + 4, y + 5.5);
        doc.text("TEMPO", pageWidth - margin - 4, y + 5.5, { align: "right" });
        y += 8;
      }

      drawTimeTableHeader();

      rowsToRender.forEach((row, index) => {
        if (y + 8 > pageHeight - 17) {
          doc.addPage();
          y = 18;
          drawTimeTableHeader();
        }

        if (index % 2 === 1) {
          doc.setFillColor(248, 248, 251);
          doc.rect(margin, y, contentWidth, 8, "F");
        }

        doc.setTextColor(42, 43, 52);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(row.label, margin + 4, y + 5.5);
        doc.setFont("helvetica", "bold");
        doc.text(
          formatFocusDuration(row.seconds),
          pageWidth - margin - 4,
          y + 5.5,
          { align: "right" },
        );
        y += 8;
      });

      y += 8;
    }
  }

  // 4. Flashcards e Retenção (se habilitado e houver estatísticas)
  if (includeFlashcards && flashcardStats && flashcardStats.totalCards > 0) {
    if (y + 28 > pageHeight - 17) {
      doc.addPage();
      y = 18;
    }

    doc.setTextColor(63, 58, 99);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("FLASHCARDS & FIXAÇÃO ATIVA", margin, y);
    y += 4;

    const fcColWidth = (contentWidth - 9) / 4;
    const statsItems = [
      { label: "TOTAL DE CARDS", val: `${flashcardStats.totalCards}`, sub: "cadastrados" },
      { label: "PENDENTES HOJE", val: `${flashcardStats.pendentesHoje}`, sub: "para treinar" },
      {
        label: "DOMINADOS (NV 3)",
        val: `${flashcardStats.dominioCount?.dominado ?? 0}`,
        sub: "retenção sólida",
      },
      {
        label: "DIFÍCEIS (NV 1)",
        val: `${flashcardStats.dominioCount?.dificil ?? 0}`,
        sub: "requer reforço",
      },
    ];

    statsItems.forEach((st, idx) => {
      const boxX = margin + idx * (fcColWidth + 3);
      doc.setFillColor(248, 248, 251);
      doc.roundedRect(boxX, y, fcColWidth, 16, 2, 2, "F");
      doc.setTextColor(95, 96, 108);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(6.5);
      doc.text(st.label, boxX + 3.5, y + 4.5);
      doc.setTextColor(22, 23, 31);
      doc.setFontSize(11);
      doc.text(st.val, boxX + 3.5, y + 10.5);
      doc.setTextColor(125, 126, 137);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.text(st.sub, boxX + 3.5, y + 14);
    });

    y += 22;
  }

  // 5. Tabela: Diário de Sessões e Histórico (Ciclos, Flashcards, Temporizador)
  if (includeSessionDiary && sessionRows && sessionRows.length > 0) {
    if (y + 20 > pageHeight - 17) {
      doc.addPage();
      y = 18;
    }

    doc.setTextColor(63, 58, 99);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DIÁRIO DE SESSÕES & HISTÓRICO", margin, y);
    y += 4;

    function drawSessionHeader() {
      doc.setFillColor(232, 230, 252);
      doc.rect(margin, y, contentWidth, 8, "F");
      doc.setTextColor(63, 58, 99);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text("DATA / HORÁRIO", margin + 4, y + 5.5);
      doc.text("MATÉRIA / ATIVIDADE", margin + 50, y + 5.5);
      doc.text("TIPO", margin + 128, y + 5.5);
      doc.text("DURAÇÃO", pageWidth - margin - 4, y + 5.5, { align: "right" });
      y += 8;
    }

    drawSessionHeader();

    sessionRows.forEach((s, idx) => {
      if (y + 8 > pageHeight - 17) {
        doc.addPage();
        y = 18;
        drawSessionHeader();
      }

      if (idx % 2 === 1) {
        doc.setFillColor(248, 248, 251);
        doc.rect(margin, y, contentWidth, 8, "F");
      }

      doc.setTextColor(42, 43, 52);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      const safeTimeRange = (s.timeRange || "")
        .replace(/[→➔➜]/g, "-")
        .replace(/[•·]/g, "-")
        .trim();
      const timeLabel = s.dateStr ? `${s.dateStr}  ${safeTimeRange}` : safeTimeRange;
      doc.text(timeLabel, margin + 4, y + 5.5);
      doc.text(s.subjectName.slice(0, 36), margin + 50, y + 5.5);
      const displayType = s.type === "Modo Intensivo" || s.type === "intensivo" ? "Intensivo" : s.type;
      doc.text(displayType, margin + 128, y + 5.5);
      doc.setFont("helvetica", "bold");
      doc.text(`${s.durationMinutes} min`, pageWidth - margin - 4, y + 5.5, { align: "right" });
      y += 8;
    });

    y += 8;
  }

  // 6. Parecer Pedagógico de Estudos (IA) (se habilitado e houver conteúdo)
  if (includeAi && aiAnalysis && aiAnalysis.content.trim().length > 0) {
    if (y + 25 > pageHeight - 17) {
      doc.addPage();
      y = 18;
    }

    doc.setTextColor(109, 94, 248);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10.5);
    doc.text("PARECER PEDAGÓGICO DE DESEMPENHO (ASSISTENTE IA)", margin, y);
    y += 4;

    if (aiAnalysis.generatedAt) {
      doc.setTextColor(125, 126, 137);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.text(
        `Análise fundamentada em evidências científicas de aprendizagem • Gerada em ${aiAnalysis.generatedAt}`,
        margin,
        y,
      );
      y += 5;
    }

    // Processamento de linhas do parecer
    const paragraphs = aiAnalysis.content.split("\n");
    for (const paragraph of paragraphs) {
      const trimmed = paragraph.trim();
      if (!trimmed) {
        y += 2.5;
        continue;
      }

      const isHeader = trimmed.startsWith("###") || trimmed.startsWith("##") || trimmed.startsWith("#");
      const isBullet = trimmed.startsWith("•") || trimmed.startsWith("- ") || trimmed.startsWith("* ");
      const cleanText = trimmed.replace(/^#{1,4}\s*/, "").replace(/^[-*]\s*/, "• ");

      if (isHeader) {
        if (y + 12 > pageHeight - 17) {
          doc.addPage();
          y = 18;
        }
        y += 3;
        doc.setTextColor(63, 58, 99);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.text(cleanText, margin, y);
        y += 5;
      } else {
        doc.setTextColor(42, 43, 52);
        doc.setFont("helvetica", isBullet ? "normal" : "normal");
        doc.setFontSize(8.5);

        const indent = isBullet ? 3 : 0;
        const textLines = doc.splitTextToSize(cleanText, contentWidth - indent);
        
        for (const line of textLines) {
          if (y + 5 > pageHeight - 17) {
            doc.addPage();
            y = 18;
          }
          doc.text(line, margin + indent, y);
          y += 4.5;
        }
      }
    }

    // Rodapé de ressalva ética no parecer
    y += 3;
    if (y + 12 > pageHeight - 17) {
      doc.addPage();
      y = 18;
    }
    doc.setFillColor(244, 243, 255);
    doc.roundedRect(margin, y, contentWidth, 10, 2, 2, "F");
    doc.setTextColor(109, 94, 248);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.text("Nota de Cautela e Responsabilidade Pedagógica:", margin + 3, y + 4);
    doc.setTextColor(95, 96, 108);
    doc.setFont("helvetica", "normal");
    doc.text(
      "As orientações acima são observações descritivas de padrões baseadas na literatura cognitiva. Adapte ao seu contexto pessoal e ritmo.",
      margin + 3,
      y + 7.5,
    );
    y += 14;
  }

  // Rodapé em todas as páginas
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(224, 224, 232);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setTextColor(125, 126, 137);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("FocoHub • Sistema de Ciclo de Estudos", margin, pageHeight - 7);
    doc.text(
      `Página ${page} de ${pages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: "right" },
    );
  }

  doc.save(filename);
}
