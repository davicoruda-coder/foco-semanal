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
      "Concluir antecipadamente: se terminar antes do timer acabar, basta clicar em 'Concluir' diretamente na linha da matéria em play.",
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
      "No topo da tela Hoje, clique em 'Iniciar sessão' para agrupar as próximas matérias da fila em um bloco de estudos (~40 min).",
      "Controles da sessão: use a barra do topo para pausar/retomar a sessão, recomeçar o bloco do início (↻) ou encerrar os estudos (✕).",
      "Finalizar matéria em play: clique em 'Concluir' na linha da matéria atual para salvar o foco, registrar anotações e passar imediatamente para a próxima.",
      "Descanso pós-bloco: ao terminar todas as matérias do bloco, o sistema oferece a pausa (ex.: 20 min) com alarme suave antes do próximo bloco.",
    ],
    tip: "O tempo que você passa escrevendo anotações na transição não entra no cronômetro de foco, garantindo contagem 100% fiel.",
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
    title: "Revisão: Caderno de Erros & Flashcards",
    badge: "Estudo Reverso",
    summary: "Aprenda com as questões erradas e retenha com repetição espaçada.",
    concept:
      "O estudo reverso direciona seu tempo cirurgicamente para as suas reais deficiências em provas e questões de concurso.",
    steps: [
      "Na aba Revisão, clique em '+ Novo Erro' logo após errar uma questão em uma bateria de simulado.",
      "Preencha em ~20 segundos: Código/link, Disciplina, Assunto, Causa do Erro (Atenção, Teoria ou Interpretação) e o Aprendizado Chave.",
      "O sistema gera um Flashcard automático e agenda suas revisões nos intervalos científicos (24 horas, 7 dias e 30 dias).",
    ],
    tip: "Consulte a aba Estatísticas em Revisão para ver um raio-X das causas dos seus erros e onde você mais perde pontos.",
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
      "Foco do Dia: em Matérias, selecione dias específicos para 'Foco do dia'. Naqueles dias, o ciclo normal dá lugar exclusivamente a essas matérias.",
      "Lembretes: crie recados rápidos com sino ativado para receber avisos sonoros e notificações mesmo com o app em segundo plano.",
      "Notas Rápidas: use o quadro de post-its na barra lateral para anotações livres, fórmulas e links rápidos.",
    ],
    tip: "Instale o FocoHub como aplicativo (PWA) no seu celular ou PC para notificações mais estáveis e tela cheia.",
  },
];

export function HelpTutorialSection() {
  const [openId, setOpenId] = useState<string | null>("ciclo");

  function toggle(id: string) {
    setOpenId((prev) => (prev === id ? null : id));
  }

  return (
    <section className="surface mt-5 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
            <Sparkles size={14} />
            Guia Rápido & Tutorial
          </div>
          <h2 className="font-display mt-0.5 text-base font-semibold tracking-tight md:text-lg">
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
