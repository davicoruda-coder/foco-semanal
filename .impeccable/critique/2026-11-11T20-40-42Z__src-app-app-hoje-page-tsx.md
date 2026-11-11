---
target: cor do Modo Intensivo vs Próxima no ciclo (/hoje)
total_score: 23
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 4
target_identity: "file:/home/ruda/Projetos/foco_semanal/src/app/(app)/hoje/page.tsx"
target_fingerprint: "sha256:fdee1d99dd31bfe746a675e942e182eb97426081005e0c9695d262211256d1eb"
target_path: /home/ruda/Projetos/foco_semanal/src/app/(app)/hoje/page.tsx
timestamp: 2026-11-11T20-40-42Z
slug: src-app-app-hoje-page-tsx
---
Method: dual-agent (A: b2d485e4-a491-4234-adea-2c6eacb571f3 · B: 835d3d3e-caf4-41d1-b8b3-77c62e683e6e)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Cronômetro e `.synaptic-flow` comunicam bem a sessão ativa, mas a pílula `Modo Intensivo` mimetiza `Próxima` e a borda esquerda de `statusRowClass` não renderiza em `<table>` `border-separate` (`hoje/page.tsx:616, 672`). |
| 2 | Match System / Real World | 3 | Vocabulário pt-BR ("Ciclo", "Próxima", "Na fila", "Modo Intensivo") é natural, porém a cor âmbar/laranja de alerta transmite "pendência/urgência" em vez de sprint focado deliberado. |
| 3 | User Control and Freedom | 2 | `DialogFrame.tsx` trava clique fora e não fecha com `Escape`; `ConfirmDialog` (`StudySessionChrome.tsx:234`) contradiz `finishIntensiveMode` sobre avanço do ciclo. |
| 4 | Consistency and Standards | 1 | `amber-*` hardcoded colide com `Próxima` (`--warn`) e mais 5 estados; `.btn`/`.btn-primary` sem `@layer` em `globals.css:231, 271` anulam `bg-amber-500` no Tailwind v4. |
| 5 | Error Prevention | 3 | `ConfirmDialog` pausa/retoma o cronômetro automaticamente e bloqueia início com 0 matérias, mas o aviso de encerramento induz erro mental sobre consumo do ciclo. |
| 6 | Recognition Rather Than Recall | 2 | `IntensiveSessionModal` não marca qual matéria é `Próxima` nem quais já foram concluídas hoje; botões `Skip`, `Reset` e `Finish` da barra são só ícones sem rótulo visível. |
| 7 | Flexibility and Efficiency | 2 | Presets de tempo ajudam, porém não há atalhos de teclado (`Esc`, `Space`) e `IntensiveSessionModal.tsx:34-39` zera `selectedSubjectIds` a cada abertura. |
| 8 | Aesthetic and Minimalist Design | 2 | 7+ sinais cromáticos competem simultaneamente no `/hoje`, 3 accents concorrem dentro de `IntensiveSessionModal`, e a pílula `amber-500/15` fica turva sobre `.synaptic-flow`. |
| 9 | Error Recovery | 3 | Estados vazios orientam bem os próximos passos e duração é limitada entre `1..180` min; não há estados sem saída de dados locais. |
| 10 | Help and Documentation | 2 | Nota explicativa no modal (`IntensiveSessionModal.tsx:274-276`) é clara, mas contradita pelo `ConfirmDialog` de encerramento; botão idle depende de `title` nativo. |
| **Total** | | **23/40** | **Acceptable (57.5%) — Melhorias relevantes necessárias em consistência cromática, cascata CSS e acessibilidade** |

## Design Specificity Verdict

**LLM assessment:** O `/hoje` ("A Mesa do Ciclo") tem identidade própria forte e coerente com `DESIGN.md` e `PRODUCT.md`: papel lilás frio (`--paper: #e4e1f4`), tipografia autoral (`Syne` + `DM Sans` + `IBM Plex Mono`) e uso contido de `--signal` violeta (`#6d5ef8` / `#8f7dff`) para ação e sessão em curso (`Em estudo` + barra `.synaptic-flow`). O `Modo Intensivo`, porém, rompe essa linguagem autoral: usa classes utilitárias `amber-*` hardcoded fora dos tokens semânticos de `globals.css` e viola explicitamente duas regras do `DESIGN.md` — **"The Status Speaks Rule"** (*"Verde = feito, laranja = próxima real, cinza quieto = na fila; não reinventar com quinto accent"*) e **"The One Signal Rule"** (introduzindo um segundo polo de CTA e misturando três accents no mesmo modal).

**Deterministic scan:** O detector automatizado (`impeccable detect --json` em `src/app/(app)/hoje/page.tsx`, `src/components/StudySessionChrome.tsx`, `src/components/IntensiveSessionModal.tsx` e `src/app/(app)/estatisticas/page.tsx`) retornou exit code `0` e `[]` (`0` achados primários e `0` advisories). O próprio detector alerta que a varredura em `.tsx` usa apenas *regex matching* e **não executa regras dependentes de DOM/estilos computados** (`tiny-text`, `low-contrast` etc.), sendo portanto um subregistro. A auditoria manual de tokens CSS + WCAG completou essa lacuna e revelou a colisão de matiz com `--warn`, quedas de contraste abaixo de AA (`2.15:1` e `2.84:1–3.74:1`) e um bug de cascata Tailwind v4 com `.btn`/`.btn-primary` fora de `@layer`.

**Visual overlays:** A visualização com overlay em browser (`live-server` + `detect.js`) foi ignorada porque a suíte `chrome_devtools` não está disponível neste ambiente e a rota `/hoje` é protegida por autenticação (`AppShell` renderiza `<LoginScreen />` e `src/proxy.ts` redireciona não autenticados para `/login?next=%2Fhoje`). Como sinal alternativo confiável, a síntese usou os screenshots reais autenticados fornecidos no chat (`media_1794429179204_e693315c.jpg` e `media_1794428616842_d7fe2d89.jpg`), combinados com medição direta dos tokens CSS e escalas OKLCH do Tailwind v4.

## Overall Impression

**Resposta direta: não — a cor atual (`amber-*`) do `Modo Intensivo` não funciona bem em relação à `Próxima` no ciclo.** No screenshot real em modo claro, o badge `⚡ Modo Intensivo` dentro da barra ativa senta diretamente acima do chip `Próxima` na linha de `Método ERA`: ambos aparecem no mesmo registro quente pêssego-âmbar-laranja (`amber-700` `#bb4d00` tem matiz HSL **25°**, idêntico ao `--warn: #f97316` a **25°** usado no anel de `Próxima`). No modo escuro a colisão piora ainda mais, porque `--warn` muda para `#ffb14a` (**34°**, literalmente âmbar-ouro). A maior oportunidade está em deixar de dar uma "cor de status de fila" ao `Modo Intensivo` e tratá-lo como **variante estrutural de sessão** via `--ink` / `--signal` (ou, caso deseje cor exclusiva no histórico, um matiz frio oposto como `sky`).

## What's Working

1. **Foco progressivo da tabela no `/hoje` (`hoje/page.tsx`):** Exibir por padrão apenas o bloco ativo + matérias `Livre`, recolhendo o restante em `Ver todas`, preserva legibilidade rápida mesmo com muitas disciplinas no ciclo.
2. **Proteção de cronômetro durante confirmações (`StudySessionChrome.tsx:172-188`):** Pausar automaticamente o tempo ao abrir `ConfirmDialog` e restaurar se o usuário cancelar (`wasRunningRef`) evita perda acidental de segundos em pular/reiniciar/encerrar.
3. **Resfriamento pós-intensivo sem consumir etapa (`StudyFlowProvider.tsx:627-629`):** Registrar `recordLastCycleCompletedSubjectId` ao sair do Modo Intensivo evita repetir a mesma matéria imediatamente na volta ao ciclo sem marcar `status = "ok"`.

## Análise Cromática & Semântica: `Modo Intensivo` vs. `Próxima`

| Superfície | Tema Claro (Hex / HSL Hue) | Tema Escuro (Hex / HSL Hue) | Contraste WCAG Medido |
|---|---|---|---|
| **Chip `Próxima`** (`globals.css:27-29, 62-64`) | Fundo `#fff1e6` (26°) · Texto `#c2410c` (17°) · Anel `--warn` `#f97316` (**25°**) | Fundo `--mist` `#191a22` · Texto/Anel `--warn` `#ffb14a` (**34°**) | Claro **4.68:1** (AA OK) · Escuro **9.60:1** (AAA OK) |
| **Pill `⚡ Modo Intensivo` na barra** (`StudySessionChrome.tsx:383`) | `amber-500/15` (`#fe9a00`, 36°) sobre `.synaptic-flow` (`16%..38%` `--signal`) · Texto `amber-700` `#bb4d00` (**25°**) | `amber-500/15` sobre `.synaptic-flow` dark · Texto `amber-300` `#ffd230` (47°) | Claro **2.84:1 – 3.74:1** (**FALHA AA** em `10px`) · Escuro **5.43:1 – 7.65:1** |
| **Botão idle `⚡ Modo Intensivo`** (`StudySessionChrome.tsx:325`) | `amber-500/5` sobre `#fff` · Texto `#bb4d00` (**25°**) | `amber-500/5` sobre `#15161e` · Texto `#ffd230` (47°) | Claro **4.86:1** · Escuro alto |
| **Bloco `Reunião` na Agenda** (`utils.ts:55-64`) | Fundo `#fffbeb` · Acento `#d97706` (32°) · Texto `#78350f` (22°) | Fundo `#d97706` 20% + `#15161e` · Texto `#fef3c7` | Alto |
| **CTAs `bg-amber-500 text-white`** (`IntensiveSessionModal.tsx:292`, `StudySessionChrome.tsx:678`) | Pretendido `#fe9a00` + `#fff` (bloqueado hoje por `.btn`/`.btn-primary`) | Idem | Se aplicado sem correção: **2.15:1** (`amber-600`: **3.19:1** — **FALHA GRAVE**) |

**Por que hoje o `amber-*` gera ruído:**
- **Mesmo canal visual que `Próxima`:** Em claro (`25°` vs `25°`) e ainda mais em escuro (`34°` vs `36–47°`), o olho agrupa `⚡ Modo Intensivo` e `Próxima` como parte do mesmo código semântico ("atenção / pendente / fila").
- **Sobrecarga de significado do âmbar/laranja:** No código atual, `amber`/`--warn` já representam **6 papéis**: `Próxima` no ciclo, `Reunião`/`Est. Família` na agenda, `Pausada` em `/materias:1223`, `Quiz IA` em `/estatisticas:197`, badges `+extra` em `/estatisticas:478, 553` e `Difícil`/alertas em `FlashcardPlayer.tsx:59` e `AppShell.tsx:255`.

**Direções de substituição alinhadas ao `DESIGN.md`:**
1. **Direção A (Recomendada — 100% `DESIGN.md`, zero 5º accent):** Tratar `Modo Intensivo` na família `--ink` + `--signal`:
   - **Pill na barra ativa (`StudySessionChrome.tsx:383`):** Alto contraste neutro **`bg-[var(--ink)] text-[var(--surface)]`** (**17.85:1** claro · **15.54:1** escuro) ou pílula crisp **`bg-[var(--surface)] text-[var(--signal)] border border-[color-mix(in_srgb,var(--signal)_35%,var(--line))]`** (**4.56:1** claro · **5.62:1** escuro). Separa imediatamente da faixa violeta, do `Em estudo` e do `Próxima` laranja.
   - **Botão idle (`StudySessionChrome.tsx:325`):** Botão secundário neutro (`border-[var(--line)] bg-[var(--mist)] text-[var(--ink)] hover:border-[var(--signal)] hover:text-[var(--signal)]`), subordinado ao CTA primário violeta.
   - **Modal e `block_done`:** Unificar CTAs em `.btn-primary` (`--signal`), mantendo `--ink`/borda estrutural para distinguir `Modo Intensivo` nos cards de `/estatisticas`.
2. **Direção B (Se quiser cor própria fria para separar também o histórico em `/estatisticas`):** **`Sky` (`sky-700` `#0069a8` no claro / `sky-300` `#74d4ff` no escuro, matiz ~230° OKLCH)**. Fica no lado frio oposto ao laranja de `Próxima` (separação máxima sem colidir com verde `Concluída` nem `rose` destrutivo), alcança **5.85:1** (claro) / **10.82:1** (escuro), porém cria um 5º accent que precisa ser formalizado no `DESIGN.md` (e exige cuidar para não confundir com os blocos azuis `Estudo` da agenda).
3. **Por que evitar `--accent-2` (Teal) e `Rose`:** O `DESIGN.md:85` reserva `--accent-2` (`#14b8a6`) para o gradiente da marca (e `Exercícios`/`Flashcards` já usam verde-água); já `rose` significa erro/perigo/exclusão ao lado do `X` (`StudySessionChrome.tsx:423`, `ConfirmDialog.tsx:37`).

## Carga Cognitiva & Jornada Emocional

- **Carga cognitiva (4/8 falhas → Alta):** Falham `Chunking` (lista plana no `IntensiveSessionModal` sem separar pendentes/concluídas), `Visual hierarchy` (pill âmbar compete com `Próxima`, modal mistura `amber` + `--signal` + `emerald`, e tabela `border-separate` perde o destaque lateral de linha), `Minimal choices` (`IntensiveSessionModal` custom + `block_done` acumulam >4 decisões na mesma vista) e `Working memory` (**7+ sinais cromáticos** simultâneos no `/hoje`, além de o modal esconder qual matéria é a `Próxima`).
- **Jornada emocional:** Em vez de comunicar **imersão deliberada**, o âmbar carrega conotação de alerta/pendência; no estado sem grade (`media_1794428616842_d7fe2d89.jpg`), o botão `Modo Intensivo` isolado abaixo à direita parece remendado; no fechamento (`ConfirmDialog`), a frase sobre avançar o ciclo gera dúvida e atrito.

## Priority Issues

- **[P1] Quebra de cascata Tailwind v4 (`.btn`/`.btn-primary` sem `@layer`) e contraste 2.15:1 em CTAs âmbar**
  - **Onde:** `src/app/globals.css:1, 231-296`, `src/components/IntensiveSessionModal.tsx:292`, `src/components/StudySessionChrome.tsx:678, 800`.
  - **Why it matters:** Regras fora de `@layer` em `globals.css` sobrescrevem `@layer utilities` no Tailwind v4: `bg-amber-500` e `text-white` no botão do modal são anulados por `.btn` (`--mist`), e em `block_done` são anulados por `.btn-primary`. E, se corrigida a cascata mantendo `bg-amber-500 text-white`, o contraste seria **2.15:1** (`amber-600`: **3.19:1**), reprovando WCAG AA.
  - **Fix:** Envolver `.btn`, `.btn-primary`, `.btn-lg`, `.btn-sm`, `.btn-xs` em `@layer components { ... }` em `globals.css` e usar `.btn-primary` (`--signal`, **4.56:1** com branco) ou token próprio com contraste ≥ 4.5:1.
  - **Suggested command:** `$impeccable polish`

- **[P1] Colisão cromática e semântica entre `Modo Intensivo` (`amber-*`) e `Próxima` (`--warn`) + falha de contraste na barra ativa**
  - **Onde:** `src/components/StudySessionChrome.tsx:325, 383, 617`, `src/components/IntensiveSessionModal.tsx:72-277`, `src/app/(app)/estatisticas/page.tsx:205, 416, 454-616`, `src/app/globals.css:14-64`.
  - **Why it matters:** `amber-700` (25°) e `--warn` claro (`#f97316`, 25°) dividem o mesmo matiz, e no tema escuro `--warn` (`#ffb14a`, 34°) fica praticamente idêntico ao âmbar. Na barra ativa clara (`.synaptic-flow`), a pílula `amber-500/15` cai para **2.84:1–3.74:1** em `10px`. Além disso, `amber` já rotula 6 outros estados no app.
  - **Fix:** Migrar `Modo Intensivo` para **Direção A** (`bg-[var(--ink)] text-[var(--surface)]` ou `surface` + `--signal`) em barra, botão idle, modal e cards — ou formalizar **Direção B (`sky`)** caso queira cor fria distinta na timeline de `/estatisticas`.
  - **Suggested command:** `$impeccable colorize`

- **[P1] Contradição factual no `ConfirmDialog` ao encerrar o `Modo Intensivo`**
  - **Onde:** `src/components/StudySessionChrome.tsx:230-240` vs. `src/components/StudyFlowProvider.tsx:615-639` e `src/components/IntensiveSessionModal.tsx:274-276`.
  - **Why it matters:** O modal de saída diz que *"O estudo de 'X' será computado no ciclo de hoje e o ciclo avançará para a próxima matéria"*, mas `finishIntensiveMode` apenas registra o cool-down (`recordLastCycleCompletedSubjectId`) e não avança nem marca `ok` no ciclo. O usuário recebe mensagens opostas na entrada e na saída.
  - **Fix:** Atualizar o texto de `StudySessionChrome.tsx:233-235` para refletir o comportamento real (*"A sessão intensiva de '${currentName}' será encerrada sem consumir as etapas do ciclo regular. Deseja voltar ao ciclo?"*) e trocar `confirmVariant: "danger"` para `"warn"` ou neutro.
  - **Suggested command:** `$impeccable clarify`

- **[P1] `DialogFrame` sem tecla `Escape` bloqueia saída por teclado nos diálogos de estudo**
  - **Onde:** `src/components/DialogFrame.tsx:10-122`.
  - **Why it matters:** Clicar fora já é travado (`closeOnOutsideClick = false`) e não há handler para `Escape`, prendendo usuários de teclado dentro de `IntensiveSessionModal` e `ConfirmDialog` até acharem o botão Cancelar/Fechar via `Tab`.
  - **Fix:** Adicionar listener `keydown` para `Escape` quando `open === true` em `DialogFrame` (com opt-out apenas em telas que exijam escolha explícita, mantendo `Esc` ativo em `IntensiveSessionModal` e `ConfirmDialog`).
  - **Suggested command:** `$impeccable harden`

- **[P2] Falha de destaque da linha ativa na tabela `border-separate` e excesso de accents no `IntensiveSessionModal`**
  - **Onde:** `src/app/(app)/hoje/page.tsx:616, 672-678`, `src/lib/utils.ts:257`, `src/components/IntensiveSessionModal.tsx:145-277`.
  - **Why it matters:** No desktop, `border-l-[4px]` no `<tr>` dentro de `table` com `border-separate` não renderiza (confirmado em `media_1794429179204_e693315c.jpg`), jogando toda a distinção visual nos chips; dentro do modal intensivo, três accents simultâneos (`amber`, `--signal`, `emerald`) enfraquecem o foco de decisão.
  - **Fix:** Mover a borda esquerda/destaque da linha ativa para a primeira/última `<td>` no desktop, e unificar os acentos do `IntensiveSessionModal` sob `--signal` adicionando badges discretos (`Próxima` / `Concluída`) ao lado das matérias.
  - **Suggested command:** `$impeccable layout`

## Persona Red Flags

- **Alex (Impatient Power User):** `IntensiveSessionModal` não fecha com `Esc` (`DialogFrame.tsx`) e limpa `selectedSubjectIds` ao abrir (`IntensiveSessionModal.tsx:34-39`); faltam atalhos na barra (`Space` pausar/retomar); `block_done` empilha 3 blocos antes da ação de retorno.
- **Sam (Accessibility-Dependent):** Pílula `⚡ Modo Intensivo` em `10px` atinge apenas **2.84:1–3.74:1** sobre `.synaptic-flow` claro; `bg-amber-500 text-white` cai para **2.15:1**; `amber` vs `--warn` se confundem sob deuteranopia/protanopia; botões `Skip`/`Reset`/`X` da barra dependem de ícone sem texto visível e `DialogFrame` não fecha com `Esc`.
- **Jordan (Confused First-Timer):** Em `media_1794429179204_e693315c.jpg`, vê duas pílulas laranja/âmbar empilhadas (`⚡ Modo Intensivo` e `Próxima`) e pode interpretar ambas como "pendente/atenção"; ao clicar `X`, lê uma promessa de avanço de ciclo contrária à do modal inicial.
- **Lucas (Estudante em Rotina Sequencial — `PRODUCT.md`):** Ao abrir o `Modo Intensivo`, não enxerga qual matéria é a `Próxima` do ciclo sem fechar o modal; no histórico de `/estatisticas`, cards `Modo Intensivo`, `Quiz IA` e tags `+extra` dividem exatamente o mesmo `amber-500/*`, dificultando distinguir sprints planejados.

## Minor Observations

- O botão idle `Modo Intensivo` (`StudySessionChrome.tsx:321-332`) fica solto no canto direito embaixo do CTA largo de sessão (`media_1794428616842_d7fe2d89.jpg`); integrá-lo em uma linha secundária coesa ou junto ao cabeçalho do card evita aspecto órfão.
- Em `StudySessionChrome.tsx:773, 800`, o alerta de fadiga de 90 min usa `indigo-500/600` hardcoded (também anulado por `.btn-primary` na linha 800) em vez de `--signal`.

## Questions to Consider

- "O `Modo Intensivo` precisa mesmo de uma quinta cor no aplicativo, ou fica mais autoral falando `--ink` + `--signal` como variante de intensidade de sessão?"
- "Se você quiser separar visualmente `Ciclo` vs. `Modo Intensivo` no Diário (`/estatisticas`), prefere um matiz frio oposto ao laranja (`sky` azul-ciano elétrico) com `DESIGN.md` atualizado?"
- "Por que o `IntensiveSessionModal` não mostra um chip discreto indicando qual matéria está `Próxima` no ciclo no momento da escolha?"
