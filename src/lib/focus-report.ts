import { formatFocusDuration } from "@/lib/focus-log";

export type FocusReportRow = {
  label: string;
  seconds: number;
};

type FocusReportOptions = {
  period: string;
  totalSeconds: number;
  rows: FocusReportRow[];
  filename: string;
};

/** Gera no navegador um PDF simples e legível do período selecionado. */
export async function downloadFocusReport({
  period,
  totalSeconds,
  rows,
  filename,
}: FocusReportOptions): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;

  doc.setProperties({
    title: `Relatório de foco — ${period}`,
    subject: "Tempo de foco registrado no Foco Semanal",
    creator: "Foco Semanal",
  });

  doc.setFillColor(109, 94, 248);
  doc.rect(0, 0, pageWidth, 32, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("Foco Semanal", margin, 15);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text("Relatório de tempo de foco", margin, 23);

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

  doc.setFillColor(244, 243, 255);
  doc.roundedRect(margin, 59, pageWidth - margin * 2, 19, 3, 3, "F");
  doc.setTextColor(95, 96, 108);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("TEMPO TOTAL", margin + 5, 66);
  doc.setTextColor(22, 23, 31);
  doc.setFontSize(15);
  doc.text(formatFocusDuration(totalSeconds), margin + 5, 73);

  let y = 88;

  function drawTableHeader() {
    doc.setFillColor(232, 230, 252);
    doc.rect(margin, y, pageWidth - margin * 2, 9, "F");
    doc.setTextColor(63, 58, 99);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("PERÍODO", margin + 4, y + 6);
    doc.text("TEMPO", pageWidth - margin - 4, y + 6, { align: "right" });
    y += 9;
  }

  drawTableHeader();

  rows.forEach((row, index) => {
    if (y + 9 > pageHeight - 17) {
      doc.addPage();
      y = 18;
      drawTableHeader();
    }

    if (index % 2 === 1) {
      doc.setFillColor(248, 248, 251);
      doc.rect(margin, y, pageWidth - margin * 2, 9, "F");
    }

    doc.setTextColor(42, 43, 52);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9.5);
    doc.text(row.label, margin + 4, y + 6);
    doc.setFont("helvetica", "bold");
    doc.text(formatFocusDuration(row.seconds), pageWidth - margin - 4, y + 6, {
      align: "right",
    });
    y += 9;
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
