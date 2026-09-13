# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Usuário principal: estudante adulto em preparação para concursos/área tech, em rotina diária de estudo (muitas vezes no desktop; também no celular).

Trabalho a fazer: saber **o que estudar agora**, anotar onde parou, marcar progresso no ciclo, e opcionalmente cronometrar foco — sem virar um LMS ou um app de revisão espaçada genérico.

*Aberto:* audiência além do dono (convites/allowlist existem; onboarding multi-usuário não é o foco atual).

## Product Purpose

**Foco** (Foco Semanal) organiza o estudo do dia e da semana: grade de blocos, ciclo de matérias, anotações, lembretes, timers e estatísticas de foco.

Sucesso = abrir o Hoje e em segundos iniciar a sessão certa, com status e notas confiáveis, sync na nuvem quando logado.

Live: https://foco.davicosystems.ia.br

## Positioning

Não é planner genérico nem spaced-repetition. O mecanismo próprio é o **ciclo de matérias** (fila ordenada + Concluída/Próxima/Na fila) com modos **Livre**, **Só hoje (dia exclusivo)** e **rodízio interno** de disciplinas — mais a **sessão de estudo** do ciclo, distinta do **relógio livre** (temporizador/cronômetro da lateral).

## Operating Context

- Ritual diário centrado em `/hoje` (Estudo no mobile).
- Agenda/semana com blocos por dia; matérias configuráveis em `/materias`.
- Estilo de revisão do usuário principal: **sequencial** (“onde parei”), não SR clássico.
- UI e docs em **português (pt-BR)**.
- Tema claro/escuro; PWA-capable.

## Capabilities and Constraints

**Confirmado**

- Ciclo: `cycle_order`, status `ok` | `prox`; exibição Hoje: só a cabeça da fila = **Próxima**, demais pendentes = **Na fila**.
- **Livre** (`is_free`): fora do ciclo; só nome/notas (e UI).
- **Exclusive days**: dia “Só hoje” — ciclo pausado; anotações; banner de modo.
- **Rodízio**: itens internos + ponteiro; avança ao concluir a matéria; chip “Da vez”.
- Sessão de ciclo (`Iniciar sessão`) vs Relógio livre (não marca Concluída / fora do ciclo).
- Foco hoje / estatísticas via focus-log (local-first + sync).
- Auth Supabase (email); allowlist de convite; backup JSON; sync de dados principais na nuvem.
- Stack: Next.js 16 App Router, React 19, TypeScript, Tailwind 4, Supabase, deploy Vercel.

**Aberto / não inventar**

- Meta diária numérica de “sessões” no card Foco hoje (hoje = tempo consolidado, não “3 de 5”).
- Produto público vs privado de longo prazo.

## Brand Commitments

- Nome de produto: **Foco** / Foco Semanal.
- Voz: direta, operacional, pt-BR; sem jargão de marketing.
- Identidade visual incumbente documentada em DESIGN.md (não redefinir aqui).

## Evidence on Hand

- Código e UI live em produção.
- Mockups de direção (não spec): `docs/design-mockups/foco-hoje-desktop-proposta.png` (+ dark).
- Relatório de viabilidade: `docs/design-mockups/viabilidade-hoje-mockup.md`.
- Critiques Impeccable em `.impeccable/critique/`.
- Sem depoimentos/clientes fabricáveis — não inventar prova social.

## Product Principles

1. **Operar o dia, não decorar o dashboard** — a ação primária é iniciar a sessão / estudar a Próxima.
2. **Ciclo é a verdade** — status e fila não mentem; modos especiais (Livre, Só hoje, rodízio) devem ser explícitos.
3. **Sessão ≠ relógio livre** — contagem de tempo auxiliar não avança o ciclo.
4. **Anotações são memória de trabalho** — não substituir por metadados “bonitos”.
5. **Refinar o incumbente** — mudanças de UI preservam comportamento e vocabulário; mockups são moodboard.

## Accessibility & Inclusion

Sem padrão WCAG formal contratado. Expectativa: contraste legível claro/escuro, alvos de toque no mobile, foco de teclado visível, UI em português claro.
