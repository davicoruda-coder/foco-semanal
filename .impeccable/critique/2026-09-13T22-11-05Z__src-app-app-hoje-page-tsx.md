---
target: src/app/(app)/hoje/page.tsx
total_score: 25
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/home/ruda/Projetos/foco_semanal/src/app/(app)/hoje/page.tsx"
target_fingerprint: "sha256:7fd68fa4d3d05d897303cc1664a94681152b9f64e36a7ef25fda15dea0763d15"
target_path: /home/ruda/Projetos/foco_semanal/src/app/(app)/hoje/page.tsx
timestamp: 2026-09-13T22-11-05Z
slug: src-app-app-hoje-page-tsx
---
Method: dual-agent (A: 5b9a15a2-4b92-4152-8145-9a04b4abf5db · B: f288573b-180b-4328-a74d-280fde9a5e6e)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Chips/CTA ok; Foco hoje idle e dual timers sem “relógio ativo” único |
| 2 | Match System / Real World | 3 | pt-BR ok; Livre vs Relógio livre confunde |
| 3 | User Control and Freedom | 3 | Pause/reset ok; reset sessão sem confirm |
| 4 | Consistency and Standards | 2 | PRODUCT vs Livre-in-cycle; Lembretes pastel fora do sistema de surface |
| 5 | Error Prevention | 3 | CTA desliga sem fila; reset sessão sem confirm |
| 6 | Recognition Rather Than Recall | 3 | Status visível; Matérias icon-only |
| 7 | Flexibility and Efficiency | 2 | Sem atalho de teclado para iniciar sessão |
| 8 | Aesthetic and Minimalist Design | 2 | Lembretes ~47% do aside + fill forte compete com CTA |
| 9 | Error Recovery | 2 | Confirm lembrete ok; recuperação de sessão pouco evidenciada |
| 10 | Help and Documentation | 2 | Sem teach inline ciclo vs livre |
| **Total** | | **25/40** | **Acceptable** |

## Design Specificity Verdict

**LLM:** Mesa do ciclo é específica (Syne, uma Próxima, CTA signal, “Relógio livre · fora do ciclo”). Fraqueza genérica: cards laterais + Lembretes pastel + segundo play no anel.

**Detector:** `impeccable detect` em `hoje/page.tsx`, `SessionClock.tsx`, `FocusTodayCard.tsx` → 0 findings (exit 0).

**Overlays:** Inject falhou (HTTPS bloqueia `http://localhost:8400/detect.js` — mixed content). Sem overlay [Human]. Fallback: CLI limpo + screenshots/CDP.

## Overall Impression

Hierarquia do ciclo está correta; o maior vazamento de atenção é a **coluna direita** (Lembretes altos/coloridos + play do relógio livre), não o tamanho do anel (~116). Ícones 36px são ok; ainda puxam a linha um pouco.

## What's Working

1. CTA “Iniciar sessão” dono do chroma; títulos em ink.
2. Uma Próxima + chips semânticos; agenda default “só o dia”.
3. SoftRing fixo (sem salto de tamanho); contrato “fora do ciclo” rotulado.

## Priority Issues

### P1 — Aside: Lembretes pesam demais
- **Why:** Compete com iniciar sessão; Foco/relógio ficam secundários.
- **Fix:** Amortecer fill/altura default dos lembretes no compact.
- **Command:** `$impeccable quieter` / `$impeccable layout`

### P1 — Dois plays (CTA vs Relógio livre)
- **Why:** Risco de iniciar livre em vez do ciclo.
- **Fix:** Idle do livre mais demovido (play menos signal).
- **Command:** `$impeccable quieter`

### P2 — Ícones 36px vs texto/chips
- **Why:** Scan icon-led em vez de Próxima-led.
- **Fix:** 32px ou reforçar só a linha Próxima.
- **Command:** `$impeccable layout`

### P2 — Copy Livre / Relógio livre desalinhada do shipped
- **Why:** Modelo mental errado (PRODUCT ainda diz fora do ciclo).
- **Fix:** Alinhar label/chips ao comportamento real.
- **Command:** `$impeccable clarify`

### P3 — Controle Matérias icon-only
- **Fix:** Label ou aria/tooltip explícito.
- **Command:** `$impeccable clarify`

## Persona Red Flags

- **Alex:** sem atalho teclado; reset sessão fácil demais; aside atrasa start &lt;5s.
- **Jordan:** dois plays + jargão Livre/Relógio; Matérias só ícone.
- **Estudante diário:** CTA bom; Lembretes + Foco vazio + relógio ainda taxam o ritual.

## Minor Observations

- SoftRing always-on: bom. Semana toggle quieto: bom.
- Dark: cores pastel dos lembretes estouram mais que no claro.
- CDP: subject IMG 36×36; viewport mobile-narrow na captura B (503px).

## Questions to Consider

1. Sem Lembretes na vista default, o start ficaria mais rápido?
2. Relógio idle só com tempo — play só após opt-in?
3. 36px é marca, ou a Próxima deve carregar o peso?
