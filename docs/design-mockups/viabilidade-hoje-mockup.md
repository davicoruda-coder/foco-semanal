# Viabilidade: mockup desktop Hoje vs app atual

**Data:** 2026-09-13  
**Fonte:** Impeccable dual-agent (design review + detector/tokens)  
**Alvos:** mockups light/dark em `docs/design-mockups/` · superfície `src/app/(app)/hoje/page.tsx`  
**Detector:** 0 findings nos TSX do Hoje / SessionClock / AppShell  
**Contexto:** sem PRODUCT.md / DESIGN.md (documentação de design ainda não capturada)

---

## Veredito em uma frase

Os mockups são **bons como moodboard de hierarquia e polish**, mas **maus como spec de produto** se copiados à letra. **Vale fazer — de forma seletiva (condicional).**

---

## São visualmente melhores que o hoje?

| Aspecto | Mockup | App atual | Julgamento |
|--------|--------|-----------|------------|
| CTA da sessão | Botão claro + meta “matéria · min” | Faixa “Iniciar sessão” já existe | Mockup afina hierarquia; espírito já no app |
| Scan de status | Pills fortes, poucas colunas | Matéria / Status / Anotações + Na fila | Mockup mais “limpo”; app mais operacional |
| Identidade das matérias | Ícones em tile | Pack + upload + letra fallback | Direção alinhada; falta só preenchimento/uso |
| Tipografia / cor | Roxo sinal + UI genérica | Syne + DM Sans + tokens `--signal` | **Não trocar fontes** pelo mockup; harmonizar com tokens atuais |
| Sidebar | Lembretes → Foco → Cronômetro | Lembretes → Clock (abas) → Foco | Ordem pode adaptar; timer mock é regressão |
| Light / dark | Paridade visual clara | Tokens dark já próximos | Polish de chips/linhas; sem redesign de tema |

**Conclusão visual:** sim, o mockup *parece* mais produto premium — mas parte do “premium” vem de **esconder** anotações, agenda real, exclusive day e o contrato Temporizador/Cronômetro.

---

## Vale a pena?

**Sim, condicional** — alto valor se for **refinamento Operate** (CTA, tipografia do ciclo, chips, ritmo, ícones, dark parity).  
**Não vale** copiar ORDEM + DETALHES + chips “Campo/Est. Família” + cronômetro decorativo sem abas.

| Caminho | Esforço | Valor | Risco |
|---------|---------|-------|-------|
| A — Harmonizar (recomendado) | Baixo–médio | Alto | Baixo |
| B — Redesign IA da tabela à la mockup | Alto | Duvidoso | Alto (perde notas / inventa dados) |
| C — Ignorar mockup | Zero | Zero | Mantém critique ~26/40 |

---

## O que KEEP / ADAPT / SKIP

### KEEP (fazer se aprovar)
- CTA “Iniciar sessão” + linha de meta da sessão mais nítidos
- Pills/status mais scannable (vocabulário atual: Próxima, Na fila, Concluída, Livre, Só hoje, Da vez)
- Ícones por matéria (já implementados) — uso + tile um pouco mais presente
- Synaptic **só** em sessão ativa
- Banner / comportamento de dia exclusivo e rodízio
- Coluna **Anotações** editável
- Fontes e tokens atuais (Syne / DM Sans / Plex Mono; `--ink`, `--signal`, `--ok`, `--warn`, `--mist`)

### ADAPT (mockup como direção, não cópia)
- Header da agenda mais limpo (sem inventar chips de contexto)
- Labels na nav desktop (já em `xl`; pode reforçar)
- Ordem da sidebar (ex.: Foco hoje mais acima) se sticky continuar ok
- Visual do `FocusTodayCard` (barra) **sem** mudar a métrica para “3 de 5 sessões” a menos que o produto mude
- Densidade visual do `SessionClock` (anel / tipografia) **mantendo** abas Temporizador / Cronômetro

### SKIP (não implementar do mockup)
- Coluna **ORDEM** explícita
- Coluna **DETALHES** no lugar de anotações
- Chips **Campo / Est. Família** (não existem no modelo)
- Post-it “curl” decorativo nos lembretes
- Cronômetro só com reset / sem abas / sem play-pause
- Gradiente “synaptic” em linhas concluídas
- Trocar tipografia para stack genérica tipo Inter

---

## Harmonização (fonts, cores, ritmo) se aprovar

1. **Typeset** — hierarquia do título “Ciclo de Estudos”, pesos de status, números mono no relógio (já há `--font-mono`).
2. **Colorize / tokens** — apertar contraste de pills Próxima / Na fila / Concluída no light e dark; CTA idle sólido vs sessão ativa (já regra).
3. **Layout** — ritmo vertical da tabela + aside; menos “faixas” competindo; uma composição Operate.
4. **Document** — depois do polish, `$impeccable document` / `init` para gravar DESIGN.md + PRODUCT.md (hoje ausentes).

---

## Plano se você aprovar (resumo executável)

### P0 — Hierarquia sem mudar dados (~0,5–1 dia)
- Refinar CTA + subtítulo da próxima sessão
- Status chips mais legíveis
- Tipografia do bloco Ciclo
- Manter Matéria | Status | Anotações

### P1 — Polish Operate (~1–2 dias)
- Header agenda mais quieto/claro
- Tiles de ícone + consistência dark
- Ajuste fino sidebar / Foco hoje visual
- Exclusive banner legível

### P2 — Só com evidência de uso
- Qualquer “detalhe” derivado de nota (hint read-only) — nunca remover textarea
- Não redesenhar SessionClock além de densidade

### Fora de escopo nesta rodada
- Mobile full adapt (próximo passo separado: `$impeccable adapt`)
- Inventar campos ou filtros do mockup

---

## Riscos principais

1. Trocar anotações por “DETALHES” estático → quebra o loop diário.  
2. Timer “bonito” sem Temporizador/Cronômetro → regressão.  
3. Chips/contexto inventados → mentira de produto.  
4. Layout 70/30 desktop não escala no mobile sem adapt dedicado.

---

## Recomendação final

**Aprovar caminho A (harmonizar + P0/P1).**  
Usar o mockup como referência de **clareza e polish**, não como wireframe de dados. O app atual já carrega a lógica certa; o ganho está em **parecer tão claro quanto o mockup sem perder poder operacional**.
