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

type FocusReportOptions = {
  period: string;
  totalSeconds: number;
  rows: FocusReportRow[];
  subjectRows?: FocusReportSubjectRow[];
  filename: string;
};

/** Gera no navegador um PDF estruturado, legível e discriminado por matéria do período selecionado. */
export async function downloadFocusReport({
  period,
  totalSeconds,
  rows,
  subjectRows,
  filename,
}: FocusReportOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;

  doc.setProperties({
    title: `Relatório de foco — ${period}`,
    subject: "Tempo de foco registrado no FocoHub",
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
  doc.text("Relatório de tempo de foco", margin, 23);

  // Período e Data de geração
  doc.setTextColor(22, 23, 31);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text(period, margin, 45);
  doc.setFontSize(10);
  doc.setTextColor(95, 96, 108);
  doc.text(
    `Gerado em ${new Intl.DateTimeFormat("pt-BR", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date())}`,
    margin,
    52,
  );

  // Card do Tempo Total
  doc.setFillColor(244, 243, 255);
  doc.roundedRect(margin, 59, pageWidth - margin * 2, 19, 3, 3, "F");
  doc.setTextColor(95, 96, 108);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("TEMPO TOTAL", margin + 5, 66);
  doc.setTextColor(22, 23, 31);
  doc.setFontSize(15);
  doc.text(formatFocusDuration(totalSeconds), margin + 5, 73);

  let y = 87;

  // 1. Tabela: Distribuição por Matéria / Atividade (se houver matérias)
  if (subjectRows && subjectRows.length > 0) {
    doc.setTextColor(63, 58, 99);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("DISTRIBUIÇÃO POR MATÉRIA / ATIVIDADE", margin, y);
    y += 4;

    doc.setFillColor(232, 230, 252);
    doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
    doc.setTextColor(63, 58, 99);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("MATÉRIA / ATIVIDADE", margin + 4, y + 5.5);
    doc.text("TEMPO (% DO TOTAL)", pageWidth - margin - 4, y + 5.5, {
      align: "right",
    });
    y += 8;

    subjectRows.forEach((sub, index) => {
      if (y + 8 > pageHeight - 17) {
        doc.addPage();
        y = 18;
      }
      if (index % 2 === 1) {
        doc.setFillColor(248, 248, 251);
        doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
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

  // 2. Tabela: Períodos / Horários de Foco (Apenas horários com atividade > 0s para não poluir com 0s)
  const activeRows = rows.filter((r) => r.seconds > 0);
  const rowsToRender = activeRows.length > 0 ? activeRows : rows.slice(0, 5);

  if (y + 16 > pageHeight - 17) {
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

  function drawTableHeader() {
    doc.setFillColor(232, 230, 252);
    doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
    doc.setTextColor(63, 58, 99);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text("PERÍODO / HORÁRIO", margin + 4, y + 5.5);
    doc.text("TEMPO", pageWidth - margin - 4, y + 5.5, { align: "right" });
    y += 8;
  }

  drawTableHeader();

  rowsToRender.forEach((row, index) => {
    if (y + 8 > pageHeight - 17) {
      doc.addPage();
      y = 18;
      drawTableHeader();
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 248, 251);
      doc.rect(margin, y, pageWidth - margin * 2, 8, "F");
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

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(224, 224, 232);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setTextColor(125, 126, 137);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(
      `Página ${page} de ${pages}`,
      pageWidth - margin,
      pageHeight - 7,
      { align: "right" },
    );
  }

  doc.save(filename);
}
