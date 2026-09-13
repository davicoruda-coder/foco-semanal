---
name: Foco Semanal
description: Sistema visual Operate para o ciclo diário de estudos
colors:
  ink: "#16171f"
  paper: "#e4e1f4"
  paper-deep: "#d6d2ea"
  mist: "#f3f2f9"
  surface: "#ffffff"
  signal: "#6d5ef8"
  signal-soft: "#ece9fe"
  accent-teal: "#14b8a6"
  warn: "#f97316"
  warn-soft: "#fff1e6"
  ok: "#16a34a"
  line: "#c9c7d8"
  ink-dark: "#eceef5"
  paper-dark: "#0d0e13"
  mist-dark: "#191a22"
  surface-dark: "#15161e"
  signal-dark: "#8f7dff"
  line-dark: "#2a2b38"
typography:
  display:
    fontFamily: "Syne, system-ui, sans-serif"
    fontWeight: 600
    letterSpacing: "-0.02em"
  body:
    fontFamily: "DM Sans, system-ui, sans-serif"
    fontWeight: 400
  mono:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontWeight: 500
rounded:
  surface: "18px"
  btn: "12px"
  tag: "10px"
spacing:
  section: "1.25rem"
  card-pad: "0.875rem"
components:
  button-signal:
    backgroundColor: "{colors.signal}"
    textColor: "#ffffff"
    rounded: "{rounded.btn}"
    padding: "12px 16px"
  surface-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.surface}"
  chip-proxima:
    backgroundColor: "{colors.warn-soft}"
    textColor: "#c2410c"
    rounded: "999px"
  chip-concluida:
    backgroundColor: "#e8f8ee"
    textColor: "#15803d"
    rounded: "999px"
---

# Design System: Foco Semanal

## Overview

**Creative North Star: "A Mesa do Ciclo"**

Interface Operate para estudo diário: calma o suficiente para longas sessões, clara o suficiente para decidir a próxima matéria em um olhar. O roxo **signal** é a voz da ação (iniciar sessão, links ativos); o resto é tinta, névoa e superfícies — nunca um dashboard de métricas gritando.

Densidade média-alta (lista de matérias + notas), com hierarquia explícita: CTA de sessão > status scannable > anotações > ferramentas laterais (lembretes, foco, relógio livre). Mobile prioriza o ciclo; agenda e lembretes vivem em abas.

Anti-referências confirmadas: não copiar mockups de marketing como IA de dados; não Inter/Roboto genérico; não parede de “Próxima”; não synaptic em linha idle.

**Key Characteristics:**
- Operate first (scan + ação), não Persuade
- Signal raro e intencional
- Chips semânticos (Próxima / Na fila / Concluída / Livre / Só hoje)
- Syne + DM Sans + Plex Mono
- Claro/escuro via `data-theme`, não só prefers-color-scheme

## Colors

Paleta lilac-paper com um único accent de ação e status semânticos.

### Primary
- **Signal Violet** (`#6d5ef8` / dark `#8f7dff`): CTA de sessão, nav ativa, links de produto, ícones de matéria. Soft (`#ece9fe`) para fundos de chip/tile.
- **Teal companion** (`#14b8a6`): só no gradiente da marca (logo), não como segundo CTA.

### Secondary
- **Warn Orange** (`#f97316` + soft `#fff1e6`): chip **Próxima** e atenção.
- **Ok Green** (`#16a34a` soft fill): chip/linha **Concluída**.

### Neutral
- **Ink** (`#16171f`): texto.
- **Paper / Mist / Surface** (`#e4e1f4` / `#f3f2f9` / `#ffffff`): fundo atmosférico, chrome, cards.
- **Line** (`#c9c7d8`): bordas.

Dark remap: ink/paper/mist/surface/signal/line sob `:root[data-theme="dark"]`.

**The One Signal Rule.** Signal pinta ação e identidade pontual — nunca fundos de página inteiros nem toda a tipografia de seção.

**The Status Speaks Rule.** Verde = feito, laranja = próxima real, cinza quieto = na fila; não reinventar com quinto accent.

## Typography

**Display Font:** Syne (`--font-display`)
**Body Font:** DM Sans (`--font-ui`)
**Mono Font:** IBM Plex Mono (`--font-mono`) — tempos e totais

**Character:** Display com presença de produto; corpo neutro e legível; mono só para medição.

### Hierarchy
- **Display / Title** (Syne 600–700, ~lg–xl): títulos de seção (ex. Ciclo de Estudos) em **ink**, não em signal — o CTA leva o chroma.
- **Body** (DM Sans 400–600, 15–16px): nomes, notas, UI.
- **Label** (11–12px, uppercase tracking moderado ~0.06em): cabeçalhos de tabela, “Foco hoje”.
- **Mono num** (Plex Mono 500): cronômetros e totais de foco.

**The CTA Owns Violet Rule.** Títulos de seção não competem em signal com “Iniciar sessão”.

## Layout

- Desktop Hoje: coluna principal + aside sticky (~300–320px) — Lembretes → Foco hoje → Relógio livre.
- Mobile: single column; bottom nav Estudo / Agenda / Lembretes / Mais; cards de matéria até `lg`; tabela do ciclo só em desktop largo.
- Ritmo: `space-y-3`–`5` entre surfaces; padding interno ~3–5 (escala Tailwind do projeto).
- Max content: `max-w-7xl` no shell.

## Elevation & Depth

Híbrido: **borda + sombra suave** em `.surface`; fundo `paper` com radiais leves de signal/teal. Sem glass decorativo; blur só onde há sticky utilitário (CTA sticky no mobile).

### Shadow Vocabulary
- **sm** (`var(--shadow-sm)`): cards em repouso.
- **md / lg**: menus, diálogos, elevação momentânea.

**The Flat Rest Rule.** Sombra acompanha superfície padrão; não empilhar borda + halo colorido zero-offset.

## Shapes

- Surface: **18px** (`--radius`)
- Botões: **12px** (`--radius-btn`)
- Tags/tiles/inputs densos: **10px** (`--radius-tag`)
- Chips de status: pill (`rounded-full`)
- Ícones de matéria: tile ~10px radius, não círculo puro quando preset

## Components

### Buttons
- **Primary (sessão):** fill signal, texto branco, radius btn, sombra sm; foco outline claro.
- **Secondary / mist:** `.btn` com borda line.
- Hover: leve opacity ou elevação; disabled: opacity reduzida.

### Chips
- **Próxima:** warn-soft + texto laranja + ring.
- **Concluída:** verde soft + texto ok.
- **Na fila:** quase transparente, texto muted, ring line fino.
- **Livre / Só hoje:** signal-soft ou muted conforme modo.

### Cards / Containers
- `.surface`: surface + line + radius 18 + shadow-sm.
- Linhas do ciclo: tint ok / prox / free via tokens `--row-*`.

### Inputs / Fields
- Anotações: borda sutil; focus border signal + ring suave; placeholder ~38% ink.

### Navigation
- Desktop: labels + ícones a partir de `lg`; ativo em signal-soft.
- Mobile: bottom bar 4 slots; chip ativo `nav-tab-active-chip`.

### Signature: Study session bar
- Idle: faixa/botão signal full-width “Iniciar sessão” + meta “matéria · ~min”.
- Running: `synaptic-flow` só na barra ativa (nunca em linhas concluídas).

### Signature: Relógio livre
- Rotulado “Relógio livre · fora do ciclo”; visualmente demovido vs CTA de sessão.

## Do's and Don'ts

### Do:
- **Do** manter uma única **Próxima** visual na fila.
- **Do** preservar anotações editáveis como coluna/campo de trabalho.
- **Do** usar Syne/DM Sans/Plex Mono e tokens `--ink/--signal/--mist/...`.
- **Do** distinguir sessão de ciclo vs relógio livre.
- **Do** preferir refinamento Operate a redesign de marketing.

### Don't:
- **Don't** inventar colunas ORDEM/DETALHES no lugar das anotações.
- **Don't** aplicar synaptic/gradiente de sessão em linhas idle ou concluídas.
- **Don't** trocar a stack tipográfica por Inter/system default.
- **Don't** explicar o timer com parede de texto; contrato curto ou visual.
- **Don't** tratar mockups de `docs/design-mockups/` como wireframe de dados.
