---
target: desktop Hoje / header e foto
total_score: 28
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/ruda/Projetos/foco_semanal/src/app/(app)/hoje/page.tsx"
target_fingerprint: "sha256:de435591d51cbde8444b789df5563f9c5dd4774a258aa846df5aaaf03de93fa2"
target_path: /home/ruda/Projetos/foco_semanal/src/app/(app)/hoje/page.tsx
timestamp: 2026-09-21T23-19-25Z
slug: src-app-app-hoje-page-tsx
---
### Design Health Score

| # | Heurística | Nota | Problema Chave |
|---|------------|------|----------------|
| 1 | Visibility of System Status | 3 | Sessão ativa e status das matérias claros; ambiguidade sobre qual dos 3 timers está governando o ciclo. |
| 2 | Match System / Real World | 3 | Metáfora de ciclo de estudos sólida; conflito no termo "Semana" (aba de navegação vs expansor de grade diária). |
| 3 | User Control and Freedom | 3 | Bons controles de pausa/avanço de sessão e expansão do ciclo; falta clareza para resetar estados rápidos. |
| 4 | Consistency and Standards | 2 | Header com mistura de botão com texto, botões de ícone e divisores verticais; duplo significado para "Semana". |
| 5 | Error Prevention | 3 | Boas confirmações em ações críticas; risco moderado de acionar o timer livre achando que avança o ciclo. |
| 6 | Recognition Rather Than Recall | 3 | Chips de status semânticos excelentes ("Próxima", "Na fila"); exige recall para saber que o timer da lateral é livre. |
| 7 | Flexibility and Efficiency | 3 | Acesso rápido a notas e ciclo; faltam aceleradores de teclado evidentes para quem estuda pelo desktop. |
| 8 | Aesthetic and Minimalist Design | 2 | Header superior direito visualmente fragmentado com 5 elementos em 180px; Lembrete verde saturado rouba hierarquia visual. |
| 9 | Error Recovery | 3 | Fluxos de autenticação e recuperação bem estruturados; feedback de sincronização em nuvem presente. |
| 10 | Help and Documentation | 3 | Ajuda presente tanto no header quanto no menu do perfil (duplicação desnecessária). |
| **Total** | | **28/40** | **Good** |

---

### Design Specificity Verdict

**LLM assessment**: O FocoHub possui uma identidade de produto muito forte e intencional quando opera em seu núcleo (a paleta *lilac-paper/dark*, a tipografia Syne/DM Sans e o conceito de ciclo ponderado com faixas *synaptic*). No entanto, o header superior direito sofre de uma "síndrome de barra de ferramentas genérica": agrupa atalhos secundários (`Estatísticas`, `?`, `⚙`, foto) com divisores verticais que fragmentam o visual. A foto de perfil atrai atenção biológica imediata, mas disputa espaço com ícones utilitários que poderiam perfeitamente estar dentro do menu da própria conta.

**Deterministic scan**: `.agents/skills/impeccable/scripts/impeccable detect` executado em `src/components/AppShell.tsx`, `src/components/UserAccountMenu.tsx` e `src/app/(app)/hoje/page.tsx` retornou **0 violações mecânicas** (código limpo em tokens e regras de lint de design).

**Visual overlays**: Inspeção realizada a partir da captura de tela da sessão ativa do usuário e código-fonte sincronizado.

---

### Overall Impression

A interface é altamente produtiva, densa e com excelente propósito para concurseiros/estudantes sérios. No entanto, o topo da tela apresenta **poluição visual e redundância de controles**, enquanto o conteúdo central sofre com a concorrência entre **três marcações de tempo diferentes** e o peso cromático do card de lembretes. O maior ganho imediato está em desinchar o header, transformar o avatar no ponto único de perfil/ajustes e deixar a área superior respirar.

---

### What's Working

1. **Segmented Control Central (`Hoje | Semana | Revisão`)**: Perfeitamente posicionado, minimalista e claro como núcleo de navegação das três rotas de trabalho diário.
2. **Ciclo de Estudos com Chips Semânticos**: A distinção entre "Próxima" (laranja/warn), "Na fila" e a barra roxa com efeito de fluxo transmite instantaneamente o estado do estudo sem precisar ler parágrafos.
3. **Contraste e Legibilidade Tipográfica**: A combinação de Syne nos títulos com DM Sans e números em Plex Mono garante excelente escaneabilidade.

---

### Priority Issues

#### [P1] Fragmentação e Excesso de Informação no Topo Direito (Header)
- **O que**: O lado direito do header acumula 4 controles interativos (`Estatísticas` com texto e ícone, `Ajuda (?)`, `Ajustes (⚙)` e o `Avatar`) intercalados por duas barras verticais separadoras (`|`).
- **Por que importa**: Cria uma "grade" visual poluída em apenas ~180px. A foto de perfil tem forte atração visual, e ter Ajustes e Ajuda soltos ao lado dela é redundante, pois o popover da foto já oferece (ou deveria unificar) essas configurações e guias. Em um app cujo valor é *Foco*, o topo deve ser o mais sereno possível.
- **Correção**: Unificar `Ajuda` e `Ajustes` exclusivamente dentro do menu do perfil (aberto pelo clique na foto). Manter à mostra apenas `Estatísticas` (em formato de ícone sutil ou chip harmonizado) e a foto com um anel de destaque elegante, eliminando as barras divisórias verticais.
- **Comando sugerido**: `$impeccable distill`

#### [P1] Conflito de Modelo Mental: "Semana" no Header vs "Semana" no Card do Dia
- **O que**: No header central há o botão de rota `Semana` (que vai para `/semana`). Logo abaixo, no card de data (`Segunda · 21/09`), há um botão `[v Semana]` (que expande a grade semanal inline nesta mesma página).
- **Por que importa**: Dois botões com a mesma palavra a poucos pixels de distância executando ações completamente distintas (navegação de página vs toggle de acordeão) confundem o usuário sobre onde ele está e o que acontecerá ao clicar.
- **Correção**: Renomear a ação no card de data para algo focado no comportamento de visualização (ex: `Grade`, `Ver grade` ou `Expandir dias`), preservando `Semana` exclusivamente para a aba de navegação global.
- **Comando sugerido**: `$impeccable clarify`

#### [P2] Competição e Sobrecarga de Três Relógios/Timers Simultâneos
- **O que**: Na mesma visualização, o usuário é exposto a: (1) o player de sessão roxo no topo do ciclo (`~40 min`), (2) o cronômetro corrido da matéria (`06:48`), e (3) o dial circular na coluna direita (`40:00 - Temporizador/Cronômetro`).
- **Por que importa**: Causa atrito de decisão e dúvida imediata: "Qual timer está rodando o meu ciclo agora? Devo dar play na matéria ou no círculo da direita?". O `DESIGN.md` estipula que o relógio da direita é um "Relógio livre", mas ele não possui rotulagem de contraste suficiente para deixar claro que não avança o ciclo.
- **Correção**: Adicionar badge/sublegenda explícita no card da direita: "Relógio Livre · Avulso", e quando uma sessão de ciclo estiver ativa, demovê-lo visualmente para estado passivo ou em segundo plano.
- **Comando sugerido**: `$impeccable layout`

#### [P2] Ruído Cromático do Card de Lembretes Verde
- **O que**: O card de notas na coluna direita usa um fundo verde escuro intenso, criando um bloco visual pesado que atrai o olhar mais do que a matéria "Próxima" do ciclo de estudos.
- **Por que importa**: Viola a regra do `DESIGN.md` (*The One Signal Rule* e *The Status Speaks Rule*), onde o verde é reservado para matérias concluídas (`status: ok`). Um bloco verde contínuo desvia a hierarquia visual do que é prioridade de estudo.
- **Correção**: Manter o card de lembretes na superfície padrão escura (`var(--surface)`), usando a cor verde apenas como uma tag, borda lateral sutil ou indicador de categoria, e não preenchendo a caixa inteira.
- **Comando sugerido**: `$impeccable colorize`

---

### Persona Red Flags

- **Alex (Power User / Foco Rápido)**: Quer bater o olho, ver a matéria atual e dar play imediato. Fica incomodado com os múltiplos botões utilitários no topo que não usa no dia a dia, e com a redundância entre o botão Semana do topo e o botão Semana do card de data.
- **Jordan (Primeira Viagem / Estudo Iniciante)**: Vê o relógio grande de 40:00 na direita e dá play achando que começou a estudar a matéria "Projetos", mas o ciclo não avança porque aquele é o relógio livre. Fica confuso se a foto no topo é apenas decorativa ou se abre opções da conta.
- **Sam (Acessibilidade e Navegação por Teclado)**: Ao navegar por `Tab` no topo da página, precisa passar por 5 controles consecutivos antes de chegar ao conteúdo principal. A unificação dos itens sob o menu de perfil tornaria o caminho muito mais direto.

---

### Minor Observations

1. **Tamanho do avatar**: O avatar com foto está com `34px` (size-8.5). Está bem dimensionado, mas a foto tem bordas duras que se beneficiariam de uma transição mais suave ou um ring com leve respiro (`ring-offset-2`).
2. **Ícones sem rótulo no topo**: `(?)` e `[⚙]` não têm rótulo em desktop médio, dependendo exclusivamente de tooltip/reconhecimento de ícone.
3. **Alinhamento vertical**: A altura do segmented control (`h-8`) e dos botões à direita (`h-8.5`) tem uma diferença sutil de 2px que gera um micro-desalinhamento na linha base do header.

---

### Questions to Consider

- E se a foto do perfil fosse o único elemento na ponta direita, transformando-se em um hub elegante de conta, ajustes, guia de ajuda e tema?
- O que tornaria óbvio em 0,5 segundos que o cronômetro da coluna direita é livre e não interfere no ciclo de estudos?
- Como deixar o topo da página mais silencioso para que o olhar desça diretamente para o botão de iniciar a sessão?
