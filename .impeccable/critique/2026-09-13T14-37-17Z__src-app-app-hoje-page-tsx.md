---
target: desktop Hoje / ciclo
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/ruda/Projetos/foco_semanal/src/app/(app)/hoje/page.tsx"
target_fingerprint: "sha256:d39930b496a39c6fd8574d2cf7f0720d3efd0084a7726bdc495a929474ee62dd"
target_path: /home/ruda/Projetos/foco_semanal/src/app/(app)/hoje/page.tsx
timestamp: 2026-09-13T14-37-17Z
slug: src-app-app-hoje-page-tsx
---
# Critique: Desktop Hoje (Ciclo de Estudos)

Method: dual-agent (A: df7f2cd0 · B: b9c47bc0)
Target: src/app/(app)/hoje/page.tsx
Mode: Operate · refinement (preserve daily-use identity)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Status claro, mas 5× "Próxima" esconde a fila real |
| 2 | Match System / Real World | 3 | PT-BR natural; "Próxima" em todas as pendentes foge do senso comum |
| 3 | User Control and Freedom | 3 | Pause/reset/finish e toggle da semana OK; Reset e X muito próximos |
| 4 | Consistency and Standards | 3 | Tokens sólidos; sessão do ciclo vs Cronômetro livre competem |
| 5 | Error Prevention | 2 | Delete tem confirm; anotações e reset de sessão sem undo |
| 6 | Recognition Rather Than Recall | 2 | Nav desktop só ícone; "próximo" está no CTA, não na tabela |
| 7 | Flexibility and Efficiency | 3 | Compacto automático e aside sticky ajudam; coluna de notas apertada |
| 8 | Aesthetic and Minimalist Design | 2 | Duas faixas signal (agenda + Iniciar sessão) + chips repetidos |
| 9 | Error Recovery | 2 | Delete OK; recuperação fraca em notas/reset |
| 10 | Help and Documentation | 2 | aria/title bons; sem pista do modo compacto vs grade |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: Autoral para o Foco. Ciclo Concluída/Próxima, CTA de sessão com bloco (`Inglês + RLM · ~40 min`), chip `Da vez`, blocos tipados da semana e Syne + lilac não são dashboard genérico.

**Deterministic scan**: `impeccable detect` limpo (exit 0) em hoje/page.tsx, AppShell e StudySessionChrome — 0 findings. Overlay no browser falhou (HTTPS → localhost mixed content); sem overlays visíveis ao usuário. Fallback: screenshots desktop + detector CLI.

## Overall Impression

A base diária já funciona: o verbo certo é `Iniciar sessão`, o ciclo carrega o foco e o aside segura lembretes/tempo. O maior ganho no PC não é "embelezar" — é reduzir ruído de status e rebalancear agenda vs ciclo para o próximo passo saltar em um olhar.

## What's Working

1. CTA de sessão nomeia matérias + duração antes do play — Operate puro.
2. Sistema de cor Concluída (verde) vs pendente (laranja) escaneia rápido.
3. Shell desktop intencional: coluna principal + aside sticky 320px.

## Priority Issues

### P1 — "Próxima" não é a próxima
- **Why**: Cinco chips iguais (Inglês, RLM, Questões, Faculdade, Teste…) enquanto a barra já define o bloco real.
- **Fix**: Destacar só a cabeça da fila (ou membros do bloco da sessão); demais como pendente/fila ou só ordem + CTA.
- **Suggested**: `$impeccable clarify` + `$impeccable distill` na tabela do ciclo

### P1 — Duas faixas signal competem
- **Why**: Gradiente da agenda + botão `Iniciar sessão` ambos em `--signal`; no modo compacto o gradiente grita por uma faixa fina de chips.
- **Fix**: Um herói (barra de sessão); agenda mais quieta no compacto.
- **Suggested**: `$impeccable quieter` / `$impeccable layout`

### P2 — Equilíbrio vertical semana ↔ ciclo
- **Why**: Com ≥6 matérias a agenda encolhe demais; expandida empurra o ciclo e força scroll enquanto o aside fica curto.
- **Fix**: Faixa "hoje + peek" denser, ou ciclo primeiro e agenda secundária sem reabrir 7 colunas.
- **Suggested**: `$impeccable layout`

### P2 — Cronômetro livre vs verbo do ciclo
- **Why**: Aside sticky com Cronômetro 00:00 + Foco hoje 0s compete com "estudar o ciclo".
- **Fix**: Abaixar o clock livre até ser usado; puxar lembretes / contexto do próximo bloco.
- **Suggested**: `$impeccable distill` no aside

### P3 — Nav desktop só ícone
- **Why**: Custo de reconhecimento (Semana/Estatísticas/Ajustes) apesar de aria-labels.
- **Fix**: Labels em `lg+` ou tooltip óbvio no foco.
- **Suggested**: `$impeccable clarify` no shell

## Persona Red Flags

- **Alex**: Sem atalhos; Reset/X juntos; notas estreitas; nav por ícone.
- **Sam**: Links só ícone; status muito por cor; vários textareas "Anotações…" iguais na árvore a11y.
- **Rudá (concurseiro diário)**: Quer um olhar "o que é agora"; cinco Próximas + clock ocioso atrasam o play.

## Minor Observations

- Chip `Da vez: RLM` é o padrão certo de especificidade — a coluna Status deveria herdar essa clareza.
- `table-fixed` corta visualmente anotações longas.
- Densidade desigual: semana expandida arejada vs ciclo denso de 7 linhas.

## Questions to Consider

1. Se a barra já nomeia o próximo bloco, por que Status diz "Próxima" cinco vezes?
2. No PC, a semana deve alguma vez superar o ciclo verticalmente?
3. O Cronômetro sticky é segundo modo de estudo ou mobília ao lado do verbo real?
