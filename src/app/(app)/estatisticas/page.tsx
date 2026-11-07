"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  History,
  Layers,
  PieChart,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { RevisaoProvider, useRevisao } from "@/components/revisao/RevisaoProvider";
import { RevisaoStats } from "@/components/revisao/RevisaoStats";
import { ReportConfigModal } from "@/components/estatisticas/ReportConfigModal";
import { StudyAiAnalysisCard } from "@/components/estatisticas/StudyAiAnalysisCard";
import { SIDEBAR_TIMER_ID, useTimerRuntime } from "@/components/TimerRuntimeProvider";
import { DialogFrame } from "@/components/DialogFrame";
import { FocusBarChart } from "@/components/FocusBarChart";
import {
  clearInterrupts,
  dismissInterrupt,
  formatInterruptWhen,
  interruptSummary,
  INTERRUPT_EVENT,
  loadInterrupts,
  type ClockInterrupt,
} from "@/lib/clock-interrupt";
import {
  downloadFocusReport,
  type FocusReportSections,
  type FocusReportFlashcardSummary,
} from "@/lib/focus-report";
import {
  addFocusSeconds,
  aggregatePeriodSubjects,
  commitFocusDisplaySnapshot,
  dateKey,
  formatFocusDuration,
  getDay,
  loadFocusLog,
  monthSeries,
  startOfWeek,
  weekSeries,
  yearSeries,
  type FocusLog,
} from "@/lib/focus-log";
import {
  syncFocusLogWithCloud,
} from "@/lib/supabase/focus-sync";
import { DAYS, type StudySession } from "@/lib/types";
import { getSessionDateKey, readCycleRoundsForDate } from "@/lib/utils";

type Range = "dia" | "semana" | "mes" | "ano";

const REPORT_BUTTON_LABEL: Record<Range, string> = {
  dia: "Baixar PDF do dia",
  semana: "Baixar PDF da semana",
  mes: "Baixar PDF do mês",
  ano: "Baixar PDF do ano",
};

const CURRENT_PERIOD_LABEL: Record<Range, string> = {
  dia: "Hoje",
  semana: "Esta semana",
  mes: "Este mês",
  ano: "Este ano",
};

const MONTHS_SHORT = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

const MONTHS_LONG = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAY_FULL = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;

function periodStart(range: Range, date: Date): Date {
  if (range === "semana") return startOfWeek(date);
  if (range === "mes") return new Date(date.getFullYear(), date.getMonth(), 1);
  if (range === "ano") return new Date(date.getFullYear(), 0, 1);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function isCurrentPeriod(range: Range, date: Date): boolean {
  return dateKey(periodStart(range, date)) === dateKey(periodStart(range, new Date()));
}

function shiftPeriod(date: Date, range: Range, amount: number): Date {
  const next = new Date(date);
  if (range === "dia") {
    next.setDate(next.getDate() + amount);
  } else if (range === "semana") {
    next.setDate(next.getDate() + amount * 7);
  } else if (range === "mes") {
    next.setDate(1);
    next.setMonth(next.getMonth() + amount);
  } else {
    next.setDate(1);
    next.setMonth(0);
    next.setFullYear(next.getFullYear() + amount);
  }
  return next;
}

function formatSessionTimeRange(startedAt: string, endedAt: string | null, durationMinutes: number) {
  const start = new Date(startedAt);
  const startStr = isNaN(start.getTime())
    ? "--:--"
    : start.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  let endStr = "";
  if (endedAt) {
    const end = new Date(endedAt);
    if (!isNaN(end.getTime())) {
      endStr = end.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    }
  }
  if (!endStr && !isNaN(start.getTime()) && durationMinutes > 0) {
    const endCalc = new Date(start.getTime() + durationMinutes * 60000);
    endStr = endCalc.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  return endStr ? `${startStr} → ${endStr}` : startStr;
}

function getSessionTypeInfo(sess: StudySession) {
  const nameLower = (sess.subject_name || "").toLowerCase();
  if (nameLower.includes("flashcard")) {
    return {
      type: "flashcards" as const,
      label: "Flashcards",
      icon: Sparkles,
      badgeClasses: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/20",
    };
  }
  if (nameLower.includes("quiz")) {
    return {
      type: "quiz" as const,
      label: "Quiz IA",
      icon: CheckCircle2,
      badgeClasses: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
    };
  }
  if (sess.mode === "ciclo") {
    return {
      type: "ciclo" as const,
      label: "Ciclo",
      icon: RefreshCw,
      badgeClasses: "bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] text-[var(--signal)] border-[color-mix(in_srgb,var(--signal)_25%,transparent)]",
    };
  }
  return {
    type: "livre" as const,
    label: "Temporizador",
    icon: Clock,
    badgeClasses: "bg-[color-mix(in_srgb,var(--ink)_8%,transparent)] text-[color-mix(in_srgb,var(--ink)_70%,transparent)] border-[color-mix(in_srgb,var(--line)_60%,transparent)]",
  };
}

export default function EstatisticasPage() {
  return (
    <RevisaoProvider>
      <EstatisticasContent />
    </RevisaoProvider>
  );
}

function EstatisticasContent() {
  const { user, data } = useApp();
  const { allFlashcards, flashcardsDoDia, stats: revisaoStats } = useRevisao();
  const { runtime, stopwatch, subjectStopwatches } = useTimerRuntime();
  const [range, setRange] = useState<Range>("semana");
  const [referenceDate, setReferenceDate] = useState(() => new Date());
  const [log, setLog] = useState<FocusLog>({ version: 1, days: {} });
  const [syncing, setSyncing] = useState(false);
  const [syncHint, setSyncHint] = useState<string | null>(null);
  const [downloadingReport, setDownloadingReport] = useState(false);
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [aiGeneratedAt, setAiGeneratedAt] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [interrupts, setInterrupts] = useState<ClockInterrupt[]>([]);
  const [addTimeOpen, setAddTimeOpen] = useState(false);
  const [addHours, setAddHours] = useState("0");
  const [addMinutes, setAddMinutes] = useState("25");
  const [addDay, setAddDay] = useState(() => dateKey());
  const [addHourOfDay, setAddHourOfDay] = useState(() =>
    String(new Date().getHours()),
  );
  const [addHint, setAddHint] = useState<string | null>(null);
  const [metricaView, setMetricaView] = useState<"foco" | "diagnostico">("foco");
  const [sessionFilter, setSessionFilter] = useState<"todos" | "ciclo" | "flashcards" | "quiz_livre">("todos");

  // Estatísticas de Flashcards e Domínio
  const flashcardDominioCount = useMemo(() => {
    const count = { novo: 0, dificil: 0, bom: 0, dominado: 0 };
    (allFlashcards || []).forEach((c) => {
      if (c.nivel_dominio === 0) count.novo++;
      else if (c.nivel_dominio === 1) count.dificil++;
      else if (c.nivel_dominio === 2) count.bom++;
      else if (c.nivel_dominio === 3) count.dominado++;
    });
    return count;
  }, [allFlashcards]);

  const flashcardSummary = useMemo<FocusReportFlashcardSummary | null>(() => {
    if (!allFlashcards || allFlashcards.length === 0) return null;
    return {
      totalCards: allFlashcards.length,
      pendentesHoje: flashcardsDoDia?.length || 0,
      dominioCount: flashcardDominioCount,
    };
  }, [allFlashcards, flashcardsDoDia, flashcardDominioCount]);

  // Filtros e visualização do card de Tempo por Matéria
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string | null>(null);
  const [subjectDropdownOpen, setSubjectDropdownOpen] = useState(false);
  const [subjectSearchQuery, setSubjectSearchQuery] = useState("");
  const [showAllSubjects, setShowAllSubjects] = useState(false);
  const subjectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!subjectDropdownOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (
        subjectDropdownRef.current &&
        !subjectDropdownRef.current.contains(e.target as Node)
      ) {
        setSubjectDropdownOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") setSubjectDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("keydown", handleEscape);
    };
  }, [subjectDropdownOpen]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (
        params.get("aba") === "diagnostico" ||
        params.get("tab") === "diagnostico"
      ) {
        setMetricaView("diagnostico");
      }
    }
  }, []);

  useEffect(() => {
    const applyLocal = () => {
      const next = loadFocusLog();
      commitFocusDisplaySnapshot(next);
      setLog(next);
    };

    const syncCloud = async () => {
      if (!user) {
        applyLocal();
        return;
      }
      setSyncing(true);
      setSyncHint("Sincronizando com a nuvem…");
      try {
        const merged = await syncFocusLogWithCloud();
        setLog(merged);
        setSyncHint("Atualizado da nuvem");
      } catch {
        applyLocal();
        setSyncHint("Sem conexão — mostrando dados deste aparelho");
      } finally {
        setSyncing(false);
      }
    };

    applyLocal();
    void syncCloud();
    setInterrupts(loadInterrupts());

    const onLog = () => applyLocal();
    const onInterrupt = () => setInterrupts(loadInterrupts());
    window.addEventListener("foco-focus-log", onLog);
    window.addEventListener(INTERRUPT_EVENT, onInterrupt);
    const onVis = () => {
      if (document.visibilityState === "visible") void syncCloud();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.removeEventListener("foco-focus-log", onLog);
      window.removeEventListener(INTERRUPT_EVENT, onInterrupt);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user]);

  const tracking =
    Object.entries(runtime).some(
      ([id, r]) =>
        r.running && (id === SIDEBAR_TIMER_ID || id.startsWith("sub:")),
    ) ||
    stopwatch.running ||
    Object.values(subjectStopwatches).some((s) => s.running);

  const currentDay = getDay(log, dateKey());
  const currentWeek = useMemo(() => weekSeries(log), [log]);
  const currentMonth = useMemo(() => monthSeries(log), [log]);
  const selectedDay = useMemo(
    () => getDay(log, dateKey(referenceDate)),
    [log, referenceDate],
  );
  const week = useMemo(
    () => weekSeries(log, referenceDate),
    [log, referenceDate],
  );
  const month = useMemo(
    () => monthSeries(log, referenceDate),
    [log, referenceDate],
  );
  const year = useMemo(
    () => yearSeries(log, referenceDate),
    [log, referenceDate],
  );

  const currentWeekTotal = currentWeek.reduce((a, b) => a + b.seconds, 0);
  const currentMonthTotal = currentMonth.reduce((a, b) => a + b.seconds, 0);
  const weekTotal = week.reduce((a, b) => a + b.seconds, 0);
  const monthTotal = month.reduce((a, b) => a + b.seconds, 0);
  const yearTotal = year.reduce((a, b) => a + b.seconds, 0);

  const bars = useMemo(() => {
    const now = new Date();
    const currentKey = dateKey(now);
    if (range === "dia") {
      const hour = now.getHours();
      const selectedIsToday = dateKey(referenceDate) === currentKey;
      return selectedDay.byHour.map((seconds, h) => ({
        label: String(h).padStart(2, "0"),
        value: seconds,
        hint: `${String(h).padStart(2, "0")}h — ${formatFocusDuration(seconds)}`,
        emphasis: selectedIsToday && h === hour,
      }));
    }
    if (range === "semana") {
      return week.map((d, i) => ({
        label: DAYS[i].slice(0, 3),
        value: d.seconds,
        hint: formatFocusDuration(d.seconds),
        emphasis: d.key === currentKey,
      }));
    }
    if (range === "mes") {
      return month.map((d) => {
        const day = String(d.date.getDate()).padStart(2, "0");
        const monthNum = String(d.date.getMonth() + 1).padStart(2, "0");
        const weekday = WEEKDAY_FULL[d.date.getDay()];
        return {
          label: String(d.date.getDate()),
          value: d.seconds,
          hint: `${day}/${monthNum} ${weekday} — ${formatFocusDuration(d.seconds)}`,
          emphasis: d.key === currentKey,
        };
      });
    }
    const monthI = now.getMonth();
    const selectedIsCurrentYear =
      referenceDate.getFullYear() === now.getFullYear();
    return year.map((m) => ({
      label: MONTHS_SHORT[m.month],
      value: m.seconds,
      hint: formatFocusDuration(m.seconds),
      emphasis: selectedIsCurrentYear && m.month === monthI,
    }));
  }, [range, referenceDate, selectedDay, week, month, year]);

  const headline =
    range === "dia"
      ? selectedDay.seconds
      : range === "semana"
        ? weekTotal
        : range === "mes"
          ? monthTotal
          : yearTotal;

  const viewingCurrentPeriod = isCurrentPeriod(range, referenceDate);

  const periodLabel = useMemo(() => {
    const shortDate = (date: Date) =>
      new Intl.DateTimeFormat("pt-BR").format(date);
    if (range === "dia") {
      return new Intl.DateTimeFormat("pt-BR", {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric",
      }).format(referenceDate);
    }
    if (range === "semana") {
      const first = week[0]?.date ?? referenceDate;
      const last = week[week.length - 1]?.date ?? referenceDate;
      return `${shortDate(first)} a ${shortDate(last)}`;
    }
    if (range === "mes") {
      return `${MONTHS_LONG[referenceDate.getMonth()]} de ${referenceDate.getFullYear()}`;
    }
    return String(referenceDate.getFullYear());
  }, [range, referenceDate, week]);

  const report = useMemo(() => {
    const shortDate = (date: Date) =>
      new Intl.DateTimeFormat("pt-BR").format(date);
    if (range === "dia") {
      return {
        period: `Dia — ${shortDate(referenceDate)}`,
        filename: `relatorio-foco-dia-${dateKey(referenceDate)}.pdf`,
        rows: selectedDay.byHour.map((seconds, hour) => ({
          label: `${String(hour).padStart(2, "0")}:00–${String(hour).padStart(2, "0")}:59`,
          seconds,
        })),
      };
    }

    if (range === "semana") {
      const first = week[0]?.date ?? referenceDate;
      const last = week[week.length - 1]?.date ?? referenceDate;
      return {
        period: `Semana — ${shortDate(first)} a ${shortDate(last)}`,
        filename: `relatorio-foco-semana-${dateKey(first)}.pdf`,
        rows: week.map((day, index) => ({
          label: `${DAYS[index]} — ${shortDate(day.date)}`,
          seconds: day.seconds,
        })),
      };
    }

    if (range === "mes") {
      return {
        period: `${MONTHS_LONG[referenceDate.getMonth()]} de ${referenceDate.getFullYear()}`,
        filename: `relatorio-foco-mes-${referenceDate.getFullYear()}-${String(
          referenceDate.getMonth() + 1,
        ).padStart(2, "0")}.pdf`,
        rows: month.map((day) => ({
          label: shortDate(day.date),
          seconds: day.seconds,
        })),
      };
    }

    return {
      period: `Ano de ${referenceDate.getFullYear()}`,
      filename: `relatorio-foco-ano-${referenceDate.getFullYear()}.pdf`,
      rows: year.map((item) => ({
        label: MONTHS_LONG[item.month],
        seconds: item.seconds,
      })),
    };
  }, [range, referenceDate, selectedDay, week, month, year]);

  const periodDayKeys = useMemo(() => {
    if (range === "dia") return [dateKey(referenceDate)];
    if (range === "semana") return week.map((d) => d.key);
    if (range === "mes") return month.map((d) => d.key);
    const yearNum = referenceDate.getFullYear();
    return Object.keys(log.days).filter((k) => k.startsWith(`${yearNum}-`));
  }, [range, referenceDate, week, month, log.days]);

  const subjectBreakdown = useMemo(() => {
    return aggregatePeriodSubjects(log, periodDayKeys);
  }, [log, periodDayKeys]);

  // Matérias cadastradas no sistema que não tiveram estudo registrado no período
  const registeredZeroSubjects = useMemo(() => {
    const studiedNames = new Set(subjectBreakdown.map((s) => s.name.toLowerCase().trim()));
    return (data.subjects ?? [])
      .filter((s) => s.active !== false && !studiedNames.has(s.name.toLowerCase().trim()))
      .map((s) => ({
        name: s.name,
        seconds: 0,
        percentage: 0,
      }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [data.subjects, subjectBreakdown]);

  // Filtro de busca de matérias no popover do seletor
  const studiedMatches = useMemo(() => {
    const q = subjectSearchQuery.toLowerCase().trim();
    if (!q) return subjectBreakdown;
    return subjectBreakdown.filter((s) => s.name.toLowerCase().includes(q));
  }, [subjectBreakdown, subjectSearchQuery]);

  const zeroMatches = useMemo(() => {
    const q = subjectSearchQuery.toLowerCase().trim();
    if (!q) return registeredZeroSubjects;
    return registeredZeroSubjects.filter((s) => s.name.toLowerCase().includes(q));
  }, [registeredZeroSubjects, subjectSearchQuery]);

  // Lista a ser exibida no modo "Todas" (Top 5 recolhível para manter o visual limpo)
  const displayedSubjects = useMemo(() => {
    if (showAllSubjects || subjectBreakdown.length <= 5) {
      return subjectBreakdown;
    }
    return subjectBreakdown.slice(0, 5);
  }, [subjectBreakdown, showAllSubjects]);

  // Detalhes da matéria selecionada em modo isolado (Foco na Matéria)
  const selectedSubjectItem = useMemo(() => {
    if (!selectedSubjectFilter) return null;
    const inBreakdown = subjectBreakdown.find(
      (s) => s.name.toLowerCase().trim() === selectedSubjectFilter.toLowerCase().trim(),
    );
    if (inBreakdown) return inBreakdown;
    const inZero = registeredZeroSubjects.find(
      (s) => s.name.toLowerCase().trim() === selectedSubjectFilter.toLowerCase().trim(),
    );
    if (inZero) return inZero;
    return { name: selectedSubjectFilter, seconds: 0, percentage: 0 };
  }, [selectedSubjectFilter, subjectBreakdown, registeredZeroSubjects]);

  const selectedDateKey = dateKey(referenceDate);

  // Rodadas completas do ciclo no período atual
  const cycleRoundsPeriod = useMemo(() => {
    if (range === "dia") {
      return readCycleRoundsForDate(selectedDateKey);
    }
    if (range === "semana") {
      return week.reduce((acc, d) => acc + readCycleRoundsForDate(d.key), 0);
    }
    return periodDayKeys.reduce((acc, k) => acc + readCycleRoundsForDate(k), 0);
  }, [range, selectedDateKey, week, periodDayKeys]);

  // Todas as sessões de estudo que caem nos dias do período selecionado
  const periodSessions = useMemo(() => {
    const dayKeySet = new Set(periodDayKeys);
    return (data.study_sessions ?? [])
      .filter((s: StudySession) => {
        if (!s.started_at) return false;
        const k = getSessionDateKey(s.started_at);
        return dayKeySet.has(k);
      })
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime());
  }, [data.study_sessions, periodDayKeys]);

  // Sessões da matéria selecionada para o resumo
  const selectedSubjectSessions = useMemo(() => {
    if (!selectedSubjectFilter) return [];
    const target = selectedSubjectFilter.toLowerCase().trim();
    return periodSessions.filter((s) => {
      const sName = s.subject_name.toLowerCase().trim();
      return sName === target || sName.startsWith(target) || sName.includes(target);
    });
  }, [selectedSubjectFilter, periodSessions]);

  // Contadores para as abas de filtro
  const sessionCounts = useMemo(() => {
    let ciclo = 0;
    let flashcards = 0;
    let quiz_livre = 0;
    for (const s of periodSessions) {
      const type = getSessionTypeInfo(s).type;
      if (type === "ciclo") ciclo++;
      else if (type === "flashcards") flashcards++;
      else quiz_livre++;
    }
    return { total: periodSessions.length, ciclo, flashcards, quiz_livre };
  }, [periodSessions]);

  // Sessões filtradas pelo usuário (Todos / Ciclo / Flashcards / Quiz & Outros)
  const filteredSessions = useMemo(() => {
    if (sessionFilter === "todos") return periodSessions;
    return periodSessions.filter((s) => {
      const type = getSessionTypeInfo(s).type;
      if (sessionFilter === "ciclo") return type === "ciclo";
      if (sessionFilter === "flashcards") return type === "flashcards";
      return type === "quiz" || type === "livre";
    });
  }, [periodSessions, sessionFilter]);

  // Agrupamento para a visão Semanal (Segunda a Domingo com subtotais e sessões)
  const weekGroupedSessions = useMemo(() => {
    if (range !== "semana") return [];
    return week.map((dayItem, index) => {
      const dayKey = dayItem.key;
      const dayName = DAYS[index];
      const shortFormattedDate = new Intl.DateTimeFormat("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }).format(dayItem.date);
      const daySessionsList = filteredSessions.filter(
        (s) => getSessionDateKey(s.started_at) === dayKey,
      );
      const dayRounds = readCycleRoundsForDate(dayKey);
      const totalDayMinutes = daySessionsList.reduce((acc, s) => acc + (s.duration_minutes || 0), 0);
      const isToday = dayKey === dateKey();

      return {
        key: dayKey,
        dayName,
        dateStr: shortFormattedDate,
        date: dayItem.date,
        sessions: daySessionsList,
        rounds: dayRounds,
        totalMinutes: totalDayMinutes,
        focusSeconds: dayItem.seconds,
        isToday,
      };
    });
  }, [range, week, filteredSessions]);

  async function downloadReport() {
    setDownloadingReport(true);
    try {
      await downloadFocusReport({
        period: report.period,
        totalSeconds: headline,
        rows: report.rows,
        subjectRows: subjectBreakdown,
        sessionRows: periodSessions.map((s) => ({
          subjectName: s.subject_name,
          timeRange: formatSessionTimeRange(s.started_at, s.ended_at, s.duration_minutes),
          durationMinutes: s.duration_minutes,
          type: getSessionTypeInfo(s).label,
          dateStr: range !== "dia" ? getSessionDateKey(s.started_at).slice(5).replace("-", "/") : undefined,
        })),
        completedCycleRounds: cycleRoundsPeriod,
        filename: report.filename,
        flashcardStats: flashcardSummary ?? undefined,
        aiAnalysis: aiAnalysis
          ? {
              content: aiAnalysis,
              generatedAt: aiGeneratedAt || undefined,
            }
          : undefined,
      });
    } catch (error) {
      console.error("[foco] falha ao gerar relatório:", error);
      window.alert("Não foi possível gerar o PDF. Tente novamente.");
    } finally {
      setDownloadingReport(false);
    }
  }

  async function handleCustomDownloadReport(config: {
    periodRange: Range;
    periodOffset: number;
    subjectFilter: string | null;
    sections: FocusReportSections;
  }) {
    setDownloadingReport(true);
    try {
      // 1. Data de referência alvo
      let targetRef = new Date();
      if (config.periodOffset === 0 && config.periodRange === range) {
        targetRef = new Date(referenceDate);
      } else if (config.periodOffset !== 0) {
        if (config.periodRange === "dia") {
          targetRef.setDate(targetRef.getDate() + config.periodOffset);
        } else if (config.periodRange === "semana") {
          targetRef.setDate(targetRef.getDate() + config.periodOffset * 7);
        } else if (config.periodRange === "mes") {
          targetRef.setMonth(targetRef.getMonth() + config.periodOffset);
        } else if (config.periodRange === "ano") {
          targetRef.setFullYear(targetRef.getFullYear() + config.periodOffset);
        }
      }

      // 2. Chaves de dias e séries temporais
      let targetPeriodTitle = "";
      let targetFilename = "";
      let targetRows: { label: string; seconds: number }[] = [];
      let dayKeys: string[] = [];
      const shortDate = (d: Date) => new Intl.DateTimeFormat("pt-BR").format(d);

      if (config.periodRange === "dia") {
        const dKey = dateKey(targetRef);
        dayKeys = [dKey];
        targetPeriodTitle = `Dia — ${shortDate(targetRef)}`;
        targetFilename = `relatorio-foco-dia-${dKey}.pdf`;
        const dayData = log.days[dKey] ?? { seconds: 0, byHour: Array(24).fill(0) };
        targetRows = dayData.byHour.map((sec, hr) => ({
          label: `${String(hr).padStart(2, "0")}:00–${String(hr).padStart(2, "0")}:59`,
          seconds: sec,
        }));
      } else if (config.periodRange === "semana") {
        const wSeries = weekSeries(log, targetRef);
        dayKeys = wSeries.map((d) => dateKey(d.date));
        const first = wSeries[0]?.date ?? targetRef;
        const last = wSeries[wSeries.length - 1]?.date ?? targetRef;
        targetPeriodTitle = `Semana — ${shortDate(first)} a ${shortDate(last)}`;
        targetFilename = `relatorio-foco-semana-${dateKey(first)}.pdf`;
        targetRows = wSeries.map((d, idx) => ({
          label: `${DAYS[idx]} — ${shortDate(d.date)}`,
          seconds: d.seconds,
        }));
      } else if (config.periodRange === "mes") {
        const mSeries = monthSeries(log, targetRef);
        dayKeys = mSeries.map((d) => dateKey(d.date));
        targetPeriodTitle = `${MONTHS_LONG[targetRef.getMonth()]} de ${targetRef.getFullYear()}`;
        targetFilename = `relatorio-foco-mes-${targetRef.getFullYear()}-${String(
          targetRef.getMonth() + 1,
        ).padStart(2, "0")}.pdf`;
        targetRows = mSeries.map((d) => ({
          label: shortDate(d.date),
          seconds: d.seconds,
        }));
      } else {
        const ySeries = yearSeries(log, targetRef);
        targetPeriodTitle = `Ano de ${targetRef.getFullYear()}`;
        targetFilename = `relatorio-foco-ano-${targetRef.getFullYear()}.pdf`;
        targetRows = ySeries.map((it) => ({
          label: MONTHS_LONG[it.month],
          seconds: it.seconds,
        }));
        const yr = targetRef.getFullYear();
        for (let m = 0; m < 12; m++) {
          const dim = new Date(yr, m + 1, 0).getDate();
          for (let day = 1; day <= dim; day++) {
            dayKeys.push(
              `${yr}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
            );
          }
        }
      }

      // 3. Distribuição de Matérias
      let targetSubjectRows = aggregatePeriodSubjects(log, dayKeys);
      let totalPeriodSeconds = dayKeys.reduce((acc, k) => acc + (log.days[k]?.seconds ?? 0), 0);

      if (config.subjectFilter) {
        const subName = config.subjectFilter;
        const match = targetSubjectRows.find(
          (s) => s.name.toLowerCase() === subName.toLowerCase(),
        );
        const subSeconds = match?.seconds ?? 0;
        targetSubjectRows = [
          {
            name: subName,
            seconds: subSeconds,
            percentage: 100,
          },
        ];
        totalPeriodSeconds = subSeconds;
        targetFilename = `relatorio-foco-${subName.toLowerCase().replace(/\s+/g, "-")}.pdf`;
      }

      // 4. Voltas do Ciclo
      const targetCompletedCycleRounds = dayKeys.reduce(
        (acc, k) => acc + readCycleRoundsForDate(k),
        0,
      );

      // 5. Sessões de Estudo
      const dayKeySet = new Set(dayKeys);
      const targetSessions = (data.study_sessions || []).filter((s) => {
        const sDate = getSessionDateKey(s.started_at);
        if (!dayKeySet.has(sDate)) return false;
        if (config.subjectFilter) {
          return s.subject_name.toLowerCase() === config.subjectFilter.toLowerCase();
        }
        return true;
      });

      // 6. Chamada ao gerador customizado
      await downloadFocusReport({
        period: targetPeriodTitle,
        totalSeconds: totalPeriodSeconds,
        rows: targetRows,
        subjectRows: targetSubjectRows,
        sessionRows: targetSessions.map((s) => ({
          subjectName: s.subject_name,
          timeRange: formatSessionTimeRange(s.started_at, s.ended_at, s.duration_minutes),
          durationMinutes: s.duration_minutes,
          type: getSessionTypeInfo(s).label,
          dateStr:
            config.periodRange !== "dia"
              ? getSessionDateKey(s.started_at).slice(5).replace("-", "/")
              : undefined,
        })),
        completedCycleRounds: targetCompletedCycleRounds,
        filename: targetFilename,
        subjectFilter: config.subjectFilter,
        sections: config.sections,
        flashcardStats: flashcardSummary ?? undefined,
        aiAnalysis:
          config.sections.aiAnalysis && aiAnalysis
            ? {
                content: aiAnalysis,
                generatedAt: aiGeneratedAt || undefined,
              }
            : undefined,
      });
    } catch (error) {
      console.error("[foco] falha ao gerar relatório customizado:", error);
      window.alert("Não foi possível gerar o PDF. Verifique os filtros e tente novamente.");
    } finally {
      setDownloadingReport(false);
    }
  }

  async function handleGenerateAiAnalysis() {
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await fetch("/api/estatisticas/analise-ia", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: range,
          periodLabel: report.period,
          totalSeconds: headline,
          activeDaysCount: report.rows.filter((r) => r.seconds > 0).length,
          totalDaysInPeriod:
            range === "dia" ? 1 : range === "semana" ? 7 : range === "mes" ? 30 : 365,
          completedCycleRounds: cycleRoundsPeriod,
          subjectsBreakdown: subjectBreakdown,
          timeSlotsSummary: report.rows,
          sessionsSummary: {
            totalSessions: periodSessions.length,
            averageDurationMinutes:
              periodSessions.length > 0
                ? Math.round(
                    periodSessions.reduce((acc, s) => acc + s.duration_minutes, 0) /
                      periodSessions.length,
                  )
                : 0,
            byType: {
              Ciclo: sessionCounts.ciclo,
              Flashcards: sessionCounts.flashcards,
              Livre: sessionCounts.quiz_livre,
            },
          },
          flashcardsStats: flashcardSummary
            ? {
                totalCards: flashcardSummary.totalCards,
                pendentesHoje: flashcardSummary.pendentesHoje,
                dominioCount: flashcardSummary.dominioCount,
                errorNotebookSummary: revisaoStats
                  ? {
                      totalQuestoes: revisaoStats.totalQuestoes,
                      porCausa: revisaoStats.porCausa,
                    }
                  : undefined,
              }
            : undefined,
        }),
      });

      const resJson = await res.json();
      if (!res.ok) {
        throw new Error(resJson.error || "Falha ao gerar o parecer da IA.");
      }

      setAiAnalysis(resJson.analysis);
      setAiGeneratedAt(resJson.generatedAt || new Date().toLocaleTimeString("pt-BR"));
    } catch (err: any) {
      console.error("[foco] erro na análise de IA:", err);
      setAiError(err.message || "Erro de conexão ao gerar análise.");
    } finally {
      setAiLoading(false);
    }
  }

  const addSeconds = useMemo(() => {
    const hours = Math.max(0, Math.min(12, Math.floor(Number(addHours) || 0)));
    const minutes = Math.max(0, Math.min(59, Math.floor(Number(addMinutes) || 0)));
    return hours * 3600 + minutes * 60;
  }, [addHours, addMinutes]);

  function openAddTime() {
    const today = dateKey();
    const viewingDay = range === "dia" ? dateKey(referenceDate) : today;
    setAddDay(viewingDay);
    setAddHours("0");
    setAddMinutes("25");
    setAddHourOfDay(
      viewingDay === today ? String(new Date().getHours()) : "12",
    );
    setAddHint(null);
    setAddTimeOpen(true);
  }

  async function submitAddTime() {
    if (addSeconds <= 0) {
      setAddHint("Informe pelo menos 1 minuto.");
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(addDay)) {
      setAddHint("Data inválida.");
      return;
    }
    const [year, month, day] = addDay.split("-").map(Number);
    const hour = Math.max(0, Math.min(23, Math.floor(Number(addHourOfDay) || 0)));
    const at = new Date(year, month - 1, day, hour, 0, 0, 0);
    const next = addFocusSeconds(addSeconds, at);
    commitFocusDisplaySnapshot(next);
    setLog(next);
    window.dispatchEvent(new Event("foco-focus-log"));
    setAddTimeOpen(false);
    if (user) {
      try {
        const merged = await syncFocusLogWithCloud();
        setLog(merged);
      } catch {
        /* local already saved */
      }
    }
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-4 sm:space-y-5">
      <ReportConfigModal
        open={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        initialRange={range}
        initialPeriodLabel={report.period}
        subjects={data.subjects}
        hasAiAnalysis={Boolean(aiAnalysis)}
        hasFlashcards={(allFlashcards || []).length > 0}
        onDownload={handleCustomDownloadReport}
      />

      <DialogFrame
        open={addTimeOpen}
        onClose={() => setAddTimeOpen(false)}
        labelledBy="add-time-title"
        cardClassName="surface w-full max-w-sm p-6 shadow-[var(--shadow-lg)]"
      >
        <h2 id="add-time-title" className="font-display text-xl font-semibold">
          Adicionar tempo
        </h2>
        <p className="mt-2 text-sm opacity-65">
          Some minutos de estudo feitos fora do sistema (cronômetro próprio,
          caderno, etc.).
        </p>
        <div className="mt-4 grid gap-3">
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium opacity-60">Dia</span>
            <input
              type="date"
              className="input"
              value={addDay}
              max={dateKey()}
              onChange={(e) => setAddDay(e.target.value)}
            />
          </label>
          <div className="grid grid-cols-2 gap-2">
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium opacity-60">Horas</span>
              <input
                type="number"
                min={0}
                max={12}
                className="input"
                value={addHours}
                onChange={(e) => setAddHours(e.target.value)}
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="text-xs font-medium opacity-60">Minutos</span>
              <input
                type="number"
                min={0}
                max={59}
                className="input"
                value={addMinutes}
                onChange={(e) => setAddMinutes(e.target.value)}
              />
            </label>
          </div>
          <label className="grid gap-1 text-sm">
            <span className="text-xs font-medium opacity-60">
              Horário no gráfico do dia
            </span>
            <select
              className="input"
              value={addHourOfDay}
              onChange={(e) => setAddHourOfDay(e.target.value)}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={String(h)}>
                  {String(h).padStart(2, "0")}:00
                </option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-sm font-medium">
          Vai somar {formatFocusDuration(addSeconds)}
        </p>
        {addHint ? (
          <p className="mt-1 text-sm text-[var(--warn)]">{addHint}</p>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="btn"
            onClick={() => setAddTimeOpen(false)}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn btn-primary"
            disabled={addSeconds <= 0}
            onClick={() => void submitAddTime()}
          >
            Adicionar
          </button>
        </div>
      </DialogFrame>

      <h1 className="sr-only">Métricas de Desempenho e Foco</h1>

      {/* Top Controls: Seletor de Módulo (Tempo & Atividades | Diagnóstico de Erros) e Status */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-[color-mix(in_srgb,var(--line)_70%,transparent)]">
        {/* Seletor Segmentado de Visualização em Abas Limpas */}
        <nav
          aria-label="Visualizações de métricas"
          className="grid grid-cols-2 sm:flex sm:items-center gap-1 sm:gap-6"
        >
          <button
            type="button"
            onClick={() => setMetricaView("foco")}
            className={`group relative inline-flex items-center justify-center gap-2 px-2 sm:px-1 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-colors ${
              metricaView === "foco"
                ? "text-[var(--ink)]"
                : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
            }`}
          >
            <Clock
              size={15}
              strokeWidth={2}
              className={`shrink-0 transition-colors ${
                metricaView === "foco"
                  ? "text-[var(--signal)]"
                  : "text-[color-mix(in_srgb,var(--ink)_45%,transparent)] group-hover:text-[var(--signal)]"
              }`}
            />
            <span className="truncate">Tempo & Atividades</span>
            {metricaView === "foco" && (
              <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-[var(--signal)]" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setMetricaView("diagnostico")}
            className={`group relative inline-flex items-center justify-center gap-2 px-2 sm:px-1 py-2 sm:py-3 text-xs sm:text-sm font-semibold transition-colors ${
              metricaView === "diagnostico"
                ? "text-[var(--ink)]"
                : "text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
            }`}
          >
            <PieChart
              size={15}
              strokeWidth={2}
              className={`shrink-0 transition-colors ${
                metricaView === "diagnostico"
                  ? "text-[var(--signal)]"
                  : "text-[color-mix(in_srgb,var(--ink)_45%,transparent)] group-hover:text-[var(--signal)]"
              }`}
            />
            <span className="truncate">Diagnóstico de Erros</span>
            {metricaView === "diagnostico" && (
              <span className="absolute inset-x-0 -bottom-px h-[2.5px] rounded-full bg-[var(--signal)]" />
            )}
          </button>
        </nav>

        {/* Quando no modo Foco: Status do cronômetro (à direita) */}
        {metricaView === "foco" && (
          <div className="flex items-center gap-2 text-xs pb-2.5 sm:pb-0">
            <span
              className={`inline-flex h-2 w-2 rounded-full ${
                tracking
                  ? "bg-[var(--ok)]"
                  : "bg-[color-mix(in_srgb,var(--ink)_25%,transparent)]"
              }`}
            />
            <span className="opacity-60">
              {tracking ? "Registrando agora…" : "Pausado — não está contando"}
            </span>
            {syncing ? (
              <span className="opacity-50">Sincronizando…</span>
            ) : null}
          </div>
        )}
      </div>

      {metricaView === "foco" ? (
        <>
          {/* Grid Dashboard: Coluna Principal (Gráfico + Resumos) + Coluna Lateral (Ações + Avisos) */}
          <div className="grid items-start gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]">
            {/* Coluna Principal */}
            <div className="min-w-0 space-y-4 sm:space-y-5">
              <section className="surface p-5 sm:p-6 shadow-xs space-y-5">
                {/* Header Integrado do Card: Métrica Principal + Controles Temporais (Granularidade & Data) */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--line)]/50 pb-4 sm:pb-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                      Tempo Total no Período
                    </p>
                    <p className="font-mono-num mt-1 text-3xl font-semibold tracking-tight md:text-4xl text-[var(--ink)]">
                      {formatFocusDuration(headline)}
                    </p>
                  </div>

                  {/* Controles de Granularidade e Navegação de Data */}
                  <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
                    {/* Seletor de Escala (Dia | Semana | Mês | Ano) */}
                    <div className="inline-flex h-[36px] items-center gap-0.5 rounded-xl border border-[var(--line)] bg-[var(--mist)] p-1 shadow-2xs shrink-0">
                      {(
                        [
                          ["dia", "Dia"],
                          ["semana", "Semana"],
                          ["mes", "Mês"],
                          ["ano", "Ano"],
                        ] as const
                      ).map(([value, label]) => {
                        const active = range === value;
                        return (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setRange(value)}
                            className={`h-full inline-flex items-center rounded-lg px-2.5 sm:px-3 text-xs font-semibold transition ${
                              active
                                ? "bg-[var(--surface)] text-[var(--ink)] shadow-xs ring-1 ring-black/[0.04] dark:ring-white/[0.06]"
                                : "text-[color-mix(in_srgb,var(--ink)_65%,transparent)] hover:text-[var(--ink)] hover:bg-[var(--surface)]/40"
                            }`}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Navegador de Período (Chevrons + Label) */}
                    <div className="inline-flex h-[36px] items-center gap-1 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-1 sm:px-1.5 shadow-2xs shrink-0">
                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-lg transition hover:bg-[var(--mist)] text-[var(--ink)] active:scale-95"
                        title="Período anterior"
                        aria-label="Mostrar período anterior"
                        onClick={() =>
                          setReferenceDate((date) => shiftPeriod(date, range, -1))
                        }
                      >
                        <ChevronLeft size={16} strokeWidth={2.2} />
                      </button>

                      <div className="px-2 sm:px-2.5 text-center">
                        <p
                          className={`text-xs sm:text-sm font-semibold text-[var(--ink)] whitespace-nowrap ${
                            range === "dia" ? "capitalize" : ""
                          }`}
                        >
                          {periodLabel}
                        </p>
                      </div>

                      <button
                        type="button"
                        className="grid h-7 w-7 place-items-center rounded-lg transition hover:bg-[var(--mist)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent text-[var(--ink)] active:scale-95"
                        title="Próximo período"
                        aria-label="Mostrar próximo período"
                        disabled={viewingCurrentPeriod}
                        onClick={() =>
                          setReferenceDate((date) => shiftPeriod(date, range, 1))
                        }
                      >
                        <ChevronRight size={16} strokeWidth={2.2} />
                      </button>
                    </div>

                    {/* Atalho rápido para retornar ao período atual */}
                    {!viewingCurrentPeriod && (
                      <button
                        type="button"
                        onClick={() => setReferenceDate(new Date())}
                        className="h-[36px] inline-flex items-center gap-1.5 rounded-xl border border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))] px-2.5 sm:px-3 text-xs font-semibold text-[var(--signal)] shadow-2xs hover:bg-[var(--signal)] hover:text-white transition active:scale-95 shrink-0"
                        title={`Voltar para ${CURRENT_PERIOD_LABEL[range].toLowerCase()}`}
                      >
                        <RotateCcw size={13} strokeWidth={2.2} />
                        <span>{CURRENT_PERIOD_LABEL[range]}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <FocusBarChart bars={bars} height={range === "mes" ? 170 : 190} />
                </div>
              </section>

          {/* Cards de Resumo Rápido */}
          <section className="grid gap-3 sm:grid-cols-3">
            <div className="surface border-[color-mix(in_srgb,var(--signal)_45%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))] p-4 shadow-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--signal)]">
                Hoje
              </p>
              <p className="font-mono-num mt-1 text-xl font-semibold text-[var(--ink)]">
                {formatFocusDuration(currentDay.seconds)}
              </p>
            </div>
            <div className="surface p-4 shadow-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60">
                Esta semana
              </p>
              <p className="font-mono-num mt-1 text-xl font-semibold text-[var(--ink)]">
                {formatFocusDuration(currentWeekTotal)}
              </p>
            </div>
            <div className="surface p-4 shadow-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60">
                Este mês
              </p>
              <p className="font-mono-num mt-1 text-xl font-semibold text-[var(--ink)]">
                {formatFocusDuration(currentMonthTotal)}
              </p>
            </div>
          </section>

          {/* Distribuição por Matéria no Período */}
          <section className="surface p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)]/60 pb-3">
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
                  Tempo por Matéria no Período
                </h3>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)] mt-0.5">
                  Discriminação do foco dedicado a cada disciplina e atividade
                </p>
              </div>

              {/* Seletor de Matéria com Popover e Busca */}
              <div className="relative" ref={subjectDropdownRef}>
                <button
                  type="button"
                  onClick={() => {
                    setSubjectDropdownOpen((prev) => !prev);
                    setSubjectSearchQuery("");
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold shadow-2xs transition active:scale-95 cursor-pointer ${
                    selectedSubjectFilter
                      ? "bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] text-[var(--signal)]"
                      : "bg-[var(--surface)] hover:bg-[var(--mist)] border-[var(--line)] text-[var(--ink)]"
                  }`}
                  aria-haspopup="listbox"
                  aria-expanded={subjectDropdownOpen}
                >
                  <span className="truncate max-w-[130px] sm:max-w-[200px]">
                    {selectedSubjectFilter ? selectedSubjectFilter : `Todas as matérias (${subjectBreakdown.length})`}
                  </span>
                  <ChevronDown size={14} className="shrink-0 opacity-70" />
                </button>

                {subjectDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-72 sm:w-80 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2.5 shadow-xl z-30 space-y-2 animate-in fade-in-0 zoom-in-95 duration-100">
                    <div className="relative">
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[color-mix(in_srgb,var(--ink)_45%,transparent)] pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Buscar matéria..."
                        value={subjectSearchQuery}
                        onChange={(e) => setSubjectSearchQuery(e.target.value)}
                        className="w-full rounded-lg bg-[var(--mist)] pl-8 pr-3 py-1.5 text-xs text-[var(--ink)] placeholder:text-[color-mix(in_srgb,var(--ink)_45%,transparent)] border border-transparent focus:border-[var(--signal)] outline-none transition"
                        autoFocus
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSubjectFilter(null);
                        setSubjectDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-semibold text-left transition cursor-pointer ${
                        !selectedSubjectFilter
                          ? "bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] text-[var(--signal)]"
                          : "hover:bg-[var(--mist)] text-[var(--ink)]"
                      }`}
                    >
                      <span>Todas as matérias ({subjectBreakdown.length})</span>
                      {!selectedSubjectFilter && <Check size={14} className="text-[var(--signal)]" />}
                    </button>

                    <div className="max-h-60 overflow-y-auto divide-y divide-[var(--line)]/30 pr-0.5 space-y-2">
                      {/* Lista com tempo */}
                      <div className="space-y-1 pt-1">
                        <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
                          Com estudo no período ({studiedMatches.length})
                        </p>
                        {studiedMatches.length === 0 ? (
                          <p className="px-2 py-1 text-[11px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)] italic">
                            Nenhuma matéria encontrada.
                          </p>
                        ) : (
                          studiedMatches.map((sub) => {
                            const isSelected = selectedSubjectFilter?.toLowerCase().trim() === sub.name.toLowerCase().trim();
                            return (
                              <button
                                key={sub.name}
                                type="button"
                                onClick={() => {
                                  setSelectedSubjectFilter(sub.name);
                                  setSubjectDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer text-left ${
                                  isSelected
                                    ? "bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] text-[var(--signal)] font-semibold"
                                    : "hover:bg-[var(--mist)] text-[var(--ink)]"
                                }`}
                              >
                                <span className="truncate pr-2">{sub.name}</span>
                                <span className="font-mono-num text-[11px] font-semibold text-[color-mix(in_srgb,var(--ink)_70%,transparent)] shrink-0">
                                  {formatFocusDuration(sub.seconds)}
                                </span>
                              </button>
                            );
                          })
                        )}
                      </div>

                      {/* Lista cadastradas com 0 min */}
                      {zeroMatches.length > 0 && (
                        <div className="space-y-1 pt-2">
                          <p className="px-2 text-[10px] font-bold uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
                            Cadastradas no sistema ({zeroMatches.length})
                          </p>
                          {zeroMatches.map((sub) => {
                            const isSelected = selectedSubjectFilter?.toLowerCase().trim() === sub.name.toLowerCase().trim();
                            return (
                              <button
                                key={sub.name}
                                type="button"
                                onClick={() => {
                                  setSelectedSubjectFilter(sub.name);
                                  setSubjectDropdownOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer text-left ${
                                  isSelected
                                    ? "bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] text-[var(--signal)] font-semibold"
                                    : "hover:bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_65%,transparent)]"
                                }`}
                              >
                                <span className="truncate pr-2">{sub.name}</span>
                                <span className="text-[10px] font-medium px-1.5 py-0.2 rounded bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_50%,transparent)] shrink-0">
                                  0 min
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Conteúdo: Modo Foco na Matéria Selecionada */}
            {selectedSubjectItem && (
              <div className="space-y-3.5 pt-1">
                <div className="p-4 rounded-xl border border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_6%,var(--surface))] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm sm:text-base text-[var(--ink)] truncate">
                        {selectedSubjectItem.name}
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--signal)_15%,transparent)] text-[var(--signal)]">
                        Foco selecionado
                      </span>
                    </div>
                    <p className="text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                      {selectedSubjectItem.seconds > 0
                        ? `Representa ${selectedSubjectItem.percentage}% do seu tempo total de estudo no período.`
                        : "Nenhum tempo registrado para esta matéria no período selecionado."}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 shrink-0">
                    <div className="text-right">
                      <div className="text-lg font-bold font-mono-num text-[var(--signal)]">
                        {formatFocusDuration(selectedSubjectItem.seconds)}
                      </div>
                      <div className="text-[10px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)] uppercase tracking-wider">
                        {selectedSubjectSessions.length} {selectedSubjectSessions.length === 1 ? "sessão" : "sessões"}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedSubjectFilter(null)}
                      className="p-1.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] hover:bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)] text-xs font-medium transition cursor-pointer"
                      title="Voltar a ver todas as matérias"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
                  <div
                    className="h-full rounded-full bg-[var(--signal)] transition-all duration-300"
                    style={{ width: `${selectedSubjectItem.percentage}%` }}
                  />
                </div>

                <div className="flex items-center justify-between pt-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setSelectedSubjectFilter(null)}
                    className="text-xs font-semibold text-[var(--signal)] hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    ← Voltar a ver todas as matérias
                  </button>
                  <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
                    {selectedSubjectSessions.length} {selectedSubjectSessions.length === 1 ? "registro encontrado" : "registros encontrados"}
                  </span>
                </div>
              </div>
            )}

            {/* Conteúdo: Modo Normal (Todas as Matérias com Top 5 + Ver Mais) */}
            {!selectedSubjectFilter && (
              <>
                {subjectBreakdown.length === 0 ? (
                  <p className="text-xs text-[color-mix(in_srgb,var(--ink)_45%,transparent)] py-2">
                    Nenhum tempo discriminado por matéria neste período. Conforme você estuda as matérias do ciclo, o progresso individual aparecerá aqui.
                  </p>
                ) : (
                  <div className="space-y-3 pt-1">
                    {displayedSubjects.map((item) => (
                      <div key={item.name} className="space-y-1.5 group">
                        <div className="flex items-center justify-between text-xs">
                          <button
                            type="button"
                            onClick={() => setSelectedSubjectFilter(item.name)}
                            className="font-semibold text-[var(--ink)] hover:text-[var(--signal)] transition text-left truncate max-w-[200px] sm:max-w-xs cursor-pointer inline-flex items-center gap-1.5"
                            title={`Filtrar apenas ${item.name}`}
                          >
                            <span className="truncate">{item.name}</span>
                          </button>
                          <div className="flex items-center gap-2 font-mono-num shrink-0">
                            <span className="font-semibold text-[var(--ink)]">
                              {formatFocusDuration(item.seconds)}
                            </span>
                            <span className="text-[11px] font-medium text-[color-mix(in_srgb,var(--ink)_50%,transparent)] w-10 text-right">
                              {item.percentage}%
                            </span>
                          </div>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
                          <div
                            className="h-full rounded-full bg-[var(--signal)] transition-all duration-300"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}

                    {/* Botão expansor quando há mais de 5 matérias */}
                    {subjectBreakdown.length > 5 && (
                      <div className="pt-2 text-center border-t border-[var(--line)]/40">
                        <button
                          type="button"
                          onClick={() => setShowAllSubjects((prev) => !prev)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[var(--mist)] hover:bg-[color-mix(in_srgb,var(--surface)_70%,var(--mist))] border border-[var(--line)] text-xs font-semibold text-[var(--ink)] shadow-2xs transition active:scale-95 cursor-pointer"
                        >
                          {showAllSubjects ? (
                            <>
                              <ChevronUp size={14} />
                              <span>Recolher para Top 5</span>
                            </>
                          ) : (
                            <>
                              <ChevronDown size={14} />
                              <span>Ver todas as {subjectBreakdown.length} matérias</span>
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </section>

          {/* Parecer Pedagógico & Análise de IA */}
          <StudyAiAnalysisCard
            periodLabel={report.period}
            analysis={aiAnalysis}
            generatedAt={aiGeneratedAt}
            loading={aiLoading}
            error={aiError}
            onGenerate={handleGenerateAiAnalysis}
            onExportPdf={() => setReportModalOpen(true)}
          />

          {/* Linha do Tempo & Diário de Estudos do Período */}
          <section className="surface p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--line)]/60 pb-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
                    Linha do Tempo & Diário de Estudos
                  </h3>
                  <span className="text-[10px] font-mono-num font-semibold px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--signal)_12%,transparent)] text-[var(--signal)]">
                    {sessionCounts.total} {sessionCounts.total === 1 ? "sessão" : "sessões"}
                  </span>
                </div>
                <p className="text-xs text-[color-mix(in_srgb,var(--ink)_55%,transparent)] mt-0.5">
                  Registro cronológico de matérias, horários exatos, ciclos e flashcards
                </p>
              </div>

              {/* Filtro por tipo de atividade quando há sessões */}
              {sessionCounts.total > 0 && (
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 text-xs">
                  <button
                    type="button"
                    onClick={() => setSessionFilter("todos")}
                    className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs shrink-0 ${
                      sessionFilter === "todos"
                        ? "bg-[var(--signal)] text-white shadow-2xs font-semibold"
                        : "bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)]"
                    }`}
                  >
                    Todos ({sessionCounts.total})
                  </button>
                  {sessionCounts.ciclo > 0 && (
                    <button
                      type="button"
                      onClick={() => setSessionFilter("ciclo")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs shrink-0 ${
                        sessionFilter === "ciclo"
                          ? "bg-[var(--signal)] text-white shadow-2xs font-semibold"
                          : "bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)]"
                      }`}
                    >
                      Ciclos ({sessionCounts.ciclo})
                    </button>
                  )}
                  {sessionCounts.flashcards > 0 && (
                    <button
                      type="button"
                      onClick={() => setSessionFilter("flashcards")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs shrink-0 ${
                        sessionFilter === "flashcards"
                          ? "bg-[var(--signal)] text-white shadow-2xs font-semibold"
                          : "bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)]"
                      }`}
                    >
                      Flashcards ({sessionCounts.flashcards})
                    </button>
                  )}
                  {sessionCounts.quiz_livre > 0 && (
                    <button
                      type="button"
                      onClick={() => setSessionFilter("quiz_livre")}
                      className={`px-2.5 py-1 rounded-lg font-medium transition cursor-pointer text-xs shrink-0 ${
                        sessionFilter === "quiz_livre"
                          ? "bg-[var(--signal)] text-white shadow-2xs font-semibold"
                          : "bg-[var(--mist)] text-[color-mix(in_srgb,var(--ink)_70%,transparent)] hover:text-[var(--ink)]"
                      }`}
                    >
                      Quiz / Outros ({sessionCounts.quiz_livre})
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Destaque de Rodadas do Ciclo Concluídas */}
            {cycleRoundsPeriod > 0 && (
              <div className="flex items-center justify-between p-3.5 rounded-xl border border-[color-mix(in_srgb,var(--signal)_30%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_6%,var(--surface))] shadow-2xs">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--signal)] text-white shadow-2xs">
                    <RefreshCw size={17} strokeWidth={2.3} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold uppercase tracking-wider text-[var(--signal)]">
                        Rodada do Ciclo Finalizada
                      </span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--signal)_18%,transparent)] text-[var(--signal)]">
                        {cycleRoundsPeriod} {cycleRoundsPeriod === 1 ? "volta completa" : "voltas completas"}
                      </span>
                    </div>
                    <p className="text-xs text-[color-mix(in_srgb,var(--ink)_70%,transparent)] mt-0.5 truncate">
                      {range === "dia"
                        ? "Todas as matérias ativas do ciclo foram concluídas nesta data."
                        : `O ciclo de estudos completou ${cycleRoundsPeriod} ${cycleRoundsPeriod === 1 ? "volta inteira" : "voltas inteiras"} nesta semana.`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Conteúdo: Visão DIA */}
            {range === "dia" && (
              <div className="space-y-2.5">
                {filteredSessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)] space-y-1.5">
                    <History size={24} className="mx-auto opacity-40 mb-2" />
                    <p className="font-semibold text-[var(--ink)]">Nenhuma sessão registrada nesta data</p>
                    <p className="max-w-md mx-auto">
                      As matérias estudadas no ciclo, treinos de flashcards e quizzes concluídos serão listados aqui automaticamente com seus horários e duração.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {filteredSessions.map((sess) => {
                      const info = getSessionTypeInfo(sess);
                      const Icon = info.icon;
                      const timeRange = formatSessionTimeRange(
                        sess.started_at,
                        sess.ended_at,
                        sess.duration_minutes,
                      );
                      const cleanName = sess.subject_name.endsWith(" (Flashcards)")
                        ? sess.subject_name.replace(" (Flashcards)", "")
                        : sess.subject_name;

                      return (
                        <div
                          key={sess.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-[var(--line)] bg-[var(--surface)] hover:bg-[color-mix(in_srgb,var(--surface)_75%,var(--mist))] transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`grid size-9 shrink-0 place-items-center rounded-lg border ${info.badgeClasses}`}>
                              <Icon size={16} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-xs sm:text-sm text-[var(--ink)] truncate max-w-[180px] sm:max-w-xs">
                                  {cleanName}
                                </span>
                                <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${info.badgeClasses}`}>
                                  {info.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                                <Clock size={12} className="shrink-0 opacity-70" />
                                <span className="font-mono-num">{timeRange}</span>
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <span className="font-mono-num font-semibold text-xs sm:text-sm text-[var(--signal)]">
                              {sess.duration_minutes} min
                            </span>
                            <div className="text-[10px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)] uppercase tracking-wide">
                              concluído
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo: Visão SEMANA */}
            {range === "semana" && (
              <div className="space-y-4">
                {filteredSessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)] space-y-1.5">
                    <Calendar size={24} className="mx-auto opacity-40 mb-2" />
                    <p className="font-semibold text-[var(--ink)]">Nenhuma sessão registrada nesta semana</p>
                    <p className="max-w-md mx-auto">
                      Conforme você cumpre o ciclo ou treina seus flashcards ao longo dos dias, cada dia da semana exibirá sua linha do tempo aqui.
                    </p>
                  </div>
                ) : (
                  weekGroupedSessions.map((dayGroup) => {
                    const hasActivity = dayGroup.sessions.length > 0 || dayGroup.rounds > 0;
                    if (!hasActivity) return null;

                    return (
                      <div
                        key={dayGroup.key}
                        className="rounded-xl border border-[var(--line)]/80 bg-[color-mix(in_srgb,var(--surface)_50%,var(--mist))] p-3.5 space-y-2.5"
                      >
                        <div className="flex items-center justify-between border-b border-[var(--line)]/60 pb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs font-bold text-[var(--ink)] uppercase tracking-wider">
                              {dayGroup.dayName}
                            </span>
                            <span className="text-[11px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)] font-mono-num">
                              {dayGroup.dateStr}
                            </span>
                            {dayGroup.isToday && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[var(--signal)] text-white shadow-2xs">
                                Hoje
                              </span>
                            )}
                            {dayGroup.rounds > 0 && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[color-mix(in_srgb,var(--signal)_15%,transparent)] text-[var(--signal)] border border-[color-mix(in_srgb,var(--signal)_25%,transparent)] inline-flex items-center gap-1">
                                <RefreshCw size={10} strokeWidth={2.3} /> {dayGroup.rounds} {dayGroup.rounds === 1 ? "ciclo concluído" : "ciclos concluídos"}
                              </span>
                            )}
                          </div>
                          <span className="text-xs font-mono-num font-semibold text-[var(--signal)] shrink-0">
                            {formatFocusDuration(dayGroup.focusSeconds || dayGroup.totalMinutes * 60)}
                          </span>
                        </div>

                        {dayGroup.sessions.length === 0 ? (
                          <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_45%,transparent)] italic py-1">
                            Sem sessões individuais registradas (rodada concluída).
                          </p>
                        ) : (
                          <div className="space-y-1.5">
                            {dayGroup.sessions.map((sess) => {
                              const info = getSessionTypeInfo(sess);
                              const Icon = info.icon;
                              const timeRange = formatSessionTimeRange(
                                sess.started_at,
                                sess.ended_at,
                                sess.duration_minutes,
                              );
                              const cleanName = sess.subject_name.endsWith(" (Flashcards)")
                                ? sess.subject_name.replace(" (Flashcards)", "")
                                : sess.subject_name;

                              return (
                                <div
                                  key={sess.id}
                                  className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] hover:bg-[color-mix(in_srgb,var(--surface)_80%,var(--mist))] transition-colors"
                                >
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className={`grid size-7 shrink-0 place-items-center rounded-md border ${info.badgeClasses}`}>
                                      <Icon size={13} strokeWidth={2.2} />
                                    </div>
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-xs text-[var(--ink)] truncate max-w-[170px] sm:max-w-xs">
                                          {cleanName}
                                        </span>
                                        <span className={`inline-flex items-center text-[9px] font-semibold px-1.5 py-0.2 rounded-full border ${info.badgeClasses}`}>
                                          {info.label}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-1 mt-0.5 text-[10px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)] font-mono-num">
                                        <Clock size={11} className="shrink-0 opacity-70" />
                                        <span>{timeRange}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <span className="font-mono-num font-semibold text-xs text-[var(--signal)] shrink-0">
                                    {sess.duration_minutes} min
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Conteúdo: Visão MÊS ou ANO */}
            {(range === "mes" || range === "ano") && (
              <div className="space-y-3">
                {filteredSessions.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--line)] p-6 text-center text-xs text-[color-mix(in_srgb,var(--ink)_50%,transparent)] space-y-1.5">
                    <History size={24} className="mx-auto opacity-40 mb-2" />
                    <p className="font-semibold text-[var(--ink)]">Nenhuma sessão registrada neste período</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
                      Exibindo as sessões mais recentes deste período:
                    </p>
                    {filteredSessions.slice(0, 30).map((sess) => {
                      const info = getSessionTypeInfo(sess);
                      const Icon = info.icon;
                      const timeRange = formatSessionTimeRange(
                        sess.started_at,
                        sess.ended_at,
                        sess.duration_minutes,
                      );
                      const sessDate = getSessionDateKey(sess.started_at);
                      const formattedDate = sessDate ? sessDate.slice(5).replace("-", "/") : "";
                      const cleanName = sess.subject_name.endsWith(" (Flashcards)")
                        ? sess.subject_name.replace(" (Flashcards)", "")
                        : sess.subject_name;

                      return (
                        <div
                          key={sess.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-lg border border-[var(--line)] bg-[var(--surface)] hover:bg-[color-mix(in_srgb,var(--surface)_75%,var(--mist))] transition-colors"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`grid size-8 shrink-0 place-items-center rounded-lg border ${info.badgeClasses}`}>
                              <Icon size={14} strokeWidth={2.2} />
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-xs text-[var(--ink)] truncate max-w-[170px] sm:max-w-xs">
                                  {cleanName}
                                </span>
                                <span className={`inline-flex items-center text-[10px] font-semibold px-1.5 py-0.2 rounded-full border ${info.badgeClasses}`}>
                                  {info.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-[color-mix(in_srgb,var(--ink)_50%,transparent)] font-mono-num">
                                <span className="font-semibold text-[var(--ink)]/80">{formattedDate}</span>
                                <span>{timeRange}</span>
                              </div>
                            </div>
                          </div>
                          <span className="font-mono-num font-semibold text-xs text-[var(--signal)] shrink-0">
                            {sess.duration_minutes} min
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        </div>

        {/* Coluna Lateral de Ações e Avisos */}
        <aside className="space-y-4">
          <section className="surface p-4 sm:p-5 shadow-xs space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
              Ações de Relatório
            </p>

            <button
              type="button"
              className="btn w-full justify-center bg-[var(--signal)] hover:opacity-90 text-white text-sm font-semibold shadow-xs gap-2"
              onClick={() => setReportModalOpen(true)}
            >
              <Download size={15} strokeWidth={2} />
              <span>Exportar Relatório PDF</span>
            </button>

            <button
              type="button"
              className="btn w-full justify-center bg-[var(--surface)] hover:bg-[var(--mist)] text-sm font-semibold shadow-2xs gap-2"
              onClick={openAddTime}
            >
              <Plus size={15} strokeWidth={2} />
              <span>Adicionar tempo</span>
            </button>

            {user ? (
              <button
                type="button"
                className="btn w-full justify-center bg-[var(--surface)] hover:bg-[var(--mist)] text-sm font-semibold shadow-2xs gap-2"
                disabled={syncing}
                onClick={() => {
                  setSyncing(true);
                  setSyncHint("Sincronizando com a nuvem…");
                  void syncFocusLogWithCloud()
                    .then((merged) => {
                      setLog(merged);
                      setSyncHint("Atualizado da nuvem");
                    })
                    .catch(() => {
                      setSyncHint("Falha ao sincronizar");
                    })
                    .finally(() => setSyncing(false));
                }}
              >
                <RefreshCw size={15} strokeWidth={2} className={syncing ? "animate-spin" : ""} />
                <span>{syncing ? "Sincronizando…" : "Atualizar da nuvem"}</span>
              </button>
            ) : null}
          </section>

          {interrupts.length > 0 ? (
            <section className="surface p-4 sm:p-5 shadow-xs">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider opacity-60">
                    Sessão interrompida
                  </p>
                  <p className="mt-1 text-xs opacity-65 leading-relaxed">
                    O computador desligou ou o navegador parou.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    clearInterrupts();
                    setInterrupts([]);
                  }}
                  className="shrink-0 rounded-lg px-2 py-0.5 text-[11px] font-medium text-[var(--ink)] opacity-60 hover:bg-[var(--mist)] hover:opacity-100 transition-opacity"
                >
                  Limpar
                </button>
              </div>
              <ul className="mt-3 space-y-2">
                {interrupts.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-[var(--mist)]/50 p-2 text-xs"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">{interruptSummary(item)}</p>
                      <p className="text-[10px] opacity-50">
                        {formatInterruptWhen(item)}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="Dispensar aviso"
                      aria-label="Dispensar aviso"
                      onClick={() => {
                        dismissInterrupt(item.id);
                        setInterrupts(loadInterrupts());
                      }}
                      className="rounded p-1 opacity-50 hover:bg-[var(--surface)] hover:opacity-100"
                    >
                      <X size={14} strokeWidth={2} />
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </aside>
      </div>
        </>
      ) : (
        <div className="pt-2">
          <RevisaoStats />
        </div>
      )}
    </div>
  );
}
