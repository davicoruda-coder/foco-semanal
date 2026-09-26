"use client";

import { useState } from "react";
import {
  BrainCircuit,
  CalendarDays,
  ChevronDown,
  Flame,
  Layers,
  Lightbulb,
  RotateCw,
  Sparkles,
  Target,
} from "lucide-react";

interface TutorialTopic {
  id: string;
  icon: typeof RotateCw;
  title: string;
  badge: string;
  summary: string;
  concept: string;
  steps: string[];
  tip: string;
}

const TOPICS: TutorialTopic[] = [
  {
    id: "ciclo",
    icon: RotateCw,
    title: "Ciclo de Estudos & Pesos (1x, 2x, 3x, 4x)",
    badge: "O Coração do App",
    summary: "Fluxo contínuo inteligente com matérias intercaladas por peso e meta.",
    concept:
      "Em vez de uma grade rígida com horários fixos que geram frustração quando você atrasa, o ciclo é uma fila dinâmica. Matérias com maior peso (dificuldade ou importância) aparecem mais vezes no ciclo de forma intercalada — nunca repetidas em sequência!",
    steps: [
      "Configure em Matérias o tempo e o peso de cada matéria (1x, 2x, 3x ou 4x).",
      "Como funcionam os pesos: se Português tem peso 2x e História tem 1x, você estuda Português ➔ História ➔ Português. Você cumpre 2 blocos de Português no ciclo, mas com outra matéria no meio para não cansar a mente.",
      "Acompanhe o indicador (ex.: 0/2, 1/2): ao concluir cada passagem, o contador sobe. Quando atingir a meta (2/2), a matéria fica verde e aguarda as demais terminarem para reiniciar o ciclo completo.",
      "Concluir antecipadamente: se terminar antes do timer acabar, basta clicar no botão de avançar (⏭) na barra de sessão para passar imediatamente para a próxima matéria.",
    ],
    tip: "Dê peso 2x ou 3x para matérias que você mais erra em simulados ou que têm maior peso no seu edital.",
  },
  {
    id: "sessao",
    icon: Flame,
    title: "Sessão Contínua & Modo Foco",
    badge: "Produtividade",
    summary: "Ciclo guiado com alternância automática entre foco e descanso.",
    concept:
      "Transforme sua fila de matérias em uma sessão contínua sem precisar configurar cronômetros manuais a cada troca de disciplina.",
    steps: [
      "No topo da tela Hoje, clique em 'Iniciar sessão' para agrupar as próximas matérias da fila em uma sessão de foco contínuo.",
      "Controles da sessão: use a barra do topo para pausar/retomar a sessão, avançar matéria (⏭), recomeçar o bloco do início (↻) ou encerrar os estudos (✕).",
      "Finalizar matéria em play: clique no ícone de avançar (⏭) na barra de sessão para salvar o foco, registrar anotações e passar imediatamente para a próxima.",
      "Descanso entre sessões: ao concluir as matérias do bloco, o sistema inicia automaticamente a pausa configurada por você em Ajustes (ex.: 5 a 15 min), com alarme sonoro suave antes da próxima sessão.",
    ],
    tip: "Você pode personalizar a duração de foco de cada matéria, o descanso e as matérias por sessão em Ajustes. O temporizador/cronômetro da barra lateral no PC funciona como relógio livre para tarefas avulsas (redações, simulados) e não avança o ciclo automaticamente.",
  },
  {
    id: "rodizio",
    icon: Layers,
    title: "Rodízio Interno de Disciplinas",
    badge: "Organização",
    summary: "Reveze vários tópicos ou disciplinas dentro de uma única matéria.",
    concept:
      "Ideal para matérias amplas ou blocos de revisão (ex.: 'Revisão Geral' que precisa passar por Constitucional, Administrativo e Português em dias alternados).",
    steps: [
      "No card da matéria em Matérias, clique em 'Ativar rodízio de disciplinas'.",
      "Cadastre as disciplinas daquele rodízio (ex.: Teoria, Exercícios, Jurisprudência).",
      "A cada passagem concluída no ciclo, o rodízio avança para a próxima disciplina da lista e resgata suas anotações daquele tema específico.",
    ],
    tip: "A anotação de 'onde parei' fica salva individualmente para cada disciplina do rodízio.",
  },
  {
    id: "revisao",
    icon: BrainCircuit,
    title: "Fixação Ativa: Caderno de Erros, Cards & Tutor IA",
    badge: "Estudo Reverso",
    summary: "Aprenda com as questões erradas e retenha com repetição espaçada.",
    concept:
      "O estudo reverso direciona seu tempo cirurgicamente para as suas reais deficiências em provas e questões de concurso.",
    steps: [
      "Na aba Fixar, clique em '+ Capturar Erro' logo após errar ou ter dúvida em uma questão de simulado ou prova.",
      "Preencha os dados essenciais: Disciplina, Assunto, Causa do Erro (Atenção, Teoria ou Interpretação) e a Regra Aprendida / O que não esquecer.",
      "Flashcards e Repetição Espaçada: formule seus próprios cartões ou gere com IA. O card entra no deck com repetição inicial em 24h para fixação imediata; ao acertar, os intervalos expandem automaticamente (4 a 7 dias, depois 15 a 30 dias).",
      "Deck Global vs Treino Isolado: utilize o 'Deck Global do Dia' para revisar rapidamente todos os cards previstos para hoje pelo algoritmo, ou treine uma disciplina específica de forma isolada nos 'Decks por Matéria'.",
    ],
    tip: "Consulte a aba Diagnóstico em Fixar para ver o raio-X das causas dos seus erros e onde você mais precisa reforçar a teoria.",
  },
  {
    id: "agenda",
    icon: CalendarDays,
    title: "Agenda & Grade Semanal",
    badge: "Planejamento",
    summary: "Visualize sua rotina fixa de horários e compromissos.",
    concept:
      "A agenda serve para planejar seu tempo disponível na semana (blocos de trabalho, estudo, aulas, academia ou descanso).",
    steps: [
      "Na aba Agenda, defina os blocos horários fixos de cada dia da semana.",
      "Cada bloco pode ter uma cor e categoria (Estudo, Trabalho, Reunião, Pessoal ou Outro).",
      "No desktop, a agenda do dia fica visível na tela Hoje para orientar seus horários.",
    ],
    tip: "O ciclo de estudos cuida da ordem das matérias, enquanto a agenda garante o tempo reservado para sentar e estudar.",
  },
  {
    id: "foco-lembretes",
    icon: Target,
    title: "Foco do Dia & Lembretes",
    badge: "Dia Especial",
    summary: "Dias exclusivos para matérias específicas e alarmes sonoros.",
    concept:
      "Recursos para dias de imersão e para não perder prazos ou simulados agendados.",
    steps: [
      "Foco do Dia: em Matérias, defina dias da semana para 'Foco do dia' em disciplinas específicas. Nesses dias, elas assumem prioridade no ciclo.",
      "Lembretes & Alarmes: crie lembretes com data, hora e alerta sonoro/notificação. Acesse facilmente pela barra lateral no computador ou pela aba dedicada 'Lembretes' no menu inferior do celular.",
      "Notas Rápidas: use o mural de post-its para anotações livres, fórmulas, links e rascunhos sem sair do fluxo de estudos.",
    ],
    tip: "Instale o FocoHub como aplicativo (PWA) no seu celular ou PC para notificações sonoras e tela cheia.",
  },
];

export function HelpTutorialSection() {
  const [openId, setOpenId] = useState<string | null>("ciclo");

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <section className="surface p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--signal)]">
            <Sparkles size={14} />
            Guia Rápido & Tutorial
          </div>
          <h2 className="font-display mt-0.5 text-base font-semibold tracking-tight md:text-lg text-[var(--ink)]">
            Como funciona o FocoHub?
          </h2>
          <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
            Toque nos tópicos abaixo para entender o fluxo de cada função em menos de 30 segundos.
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {TOPICS.map((topic) => {
          const isOpen = openId === topic.id;
          const Icon = topic.icon;

          return (
            <div
              key={topic.id}
              className={`rounded-[var(--radius)] border transition-all ${
                isOpen
                  ? "border-[color-mix(in_srgb,var(--signal)_40%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_4%,var(--surface))]"
                  : "border-[var(--line)] bg-[var(--surface)] hover:border-[color-mix(in_srgb,var(--signal)_25%,var(--line))]"
              }`}
            >
              <button
                type="button"
                onClick={() => toggle(topic.id)}
                className="flex w-full items-center justify-between gap-3 p-3.5 text-left md:p-4"
                aria-expanded={isOpen}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl transition ${
                      isOpen
                        ? "bg-[var(--signal)] text-white shadow-sm"
                        : "bg-[var(--mist)] text-[var(--ink)]"
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-[var(--ink)] sm:text-base">
                        {topic.title}
                      </span>
                      <span className="rounded-full bg-[var(--signal-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--signal)] sm:text-xs">
                        {topic.badge}
                      </span>
                    </div>
                    <p
                      className={`mt-1 text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed ${
                        isOpen ? "" : "line-clamp-2"
                      }`}
                    >
                      {topic.summary}
                    </p>
                  </div>
                </div>

                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[color-mix(in_srgb,var(--ink)_60%,transparent)] transition-transform duration-200 ${
                    isOpen ? "rotate-180 text-[var(--signal)]" : ""
                  }`}
                >
                  <ChevronDown size={20} />
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-[color-mix(in_srgb,var(--line)_70%,transparent)] px-4 pb-4 pt-3.5 text-sm text-[color-mix(in_srgb,var(--ink)_90%,transparent)] md:px-5 md:pb-5">
                  <p className="leading-relaxed text-[color-mix(in_srgb,var(--ink)_80%,transparent)] text-sm sm:text-base">
                    {topic.concept}
                  </p>

                  <div className="mt-4 space-y-2.5">
                    <p className="font-semibold uppercase tracking-wider text-xs text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
                      Como usar na prática:
                    </p>
                    <ol className="space-y-2.5 pl-0.5">
                      {topic.steps.map((step, idx) => (
                        <li key={idx} className="flex items-start gap-3">
                          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[color-mix(in_srgb,var(--signal)_20%,transparent)] text-xs font-bold text-[var(--signal)] mt-0.5">
                            {idx + 1}
                          </span>
                          <span className="leading-relaxed text-sm text-[var(--ink)] sm:text-base">
                            {step}
                          </span>
                        </li>
                      ))}
                    </ol>
                  </div>

                  <div className="mt-4 flex items-start gap-3 rounded-[var(--radius-tag)] border border-[color-mix(in_srgb,var(--signal)_25%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))] p-3.5 text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_90%,transparent)]">
                    <Lightbulb
                      size={18}
                      className="mt-0.5 shrink-0 text-[var(--signal)]"
                    />
                    <p className="leading-relaxed">
                      <strong className="font-semibold text-[var(--signal)]">
                        Dica:
                      </strong>{" "}
                      {topic.tip}
                    </p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
