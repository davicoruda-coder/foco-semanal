# Impeccable — guia de comandos (Foco e outros projetos)

Como pedir no chat (Cursor): `$impeccable <comando>` ou “roda o impeccable init”, etc.

A skill do projeto fica em `.agents/skills/impeccable/`.

---

## 1. Fundação (fazer cedo, 1× por projeto)

| Ordem | Comando | O que faz | Quando |
|------:|---------|-----------|--------|
| 1 | **`init`** | Cria/atualiza `PRODUCT.md` (usuário, propósito, regras de produto) | Projeto novo **ou** antes de mexer “no sistema” com o Impeccable |
| 2 | **`document`** | Cria/atualiza `DESIGN.md` + `.impeccable/design.json` a partir da UI/código | Quando **já existe** tela/tokens para gravar |

**No Foco:** já feitos (`PRODUCT.md`, `DESIGN.md`).

**Em outro sistema:** `init` → se já tem UI → `document` → só então critique/features grandes.

Pedidos **pequenos** (um botão, um bug visual) não exigem init antes.

---

## 2. Avaliar (diagnóstico)

| Comando | O que faz | Quando |
|---------|-----------|--------|
| **`critique [alvo]`** | Review UX + notas heurísticas (ex.: página Hoje) | Depois de mudanças grandes; **não** a cada microajuste |
| **`audit [alvo]`** | A11y, contraste, responsivo, qualidade técnica | Checkpoint 1× ou antes de “produção séria” |

Exemplo: `$impeccable critique src/app/(app)/hoje/page.tsx`

---

## 3. Refinar (sem redesenhar)

| Comando | O que faz | Quando |
|---------|-----------|--------|
| **`polish [alvo]`** | Acabamento de ship (foco, estados, consistência) | Depois do critique ou antes de considerar “pronto” |
| **`quieter [alvo]`** | Diminuir ruído visual | UI gritante / muito accent |
| **`bolder [alvo]`** | Amplificar visual tímido | Só se estiver genérico demais (cuidado em app Operate) |
| **`distill [alvo]`** | Tirar excesso, ir ao essencial | Ex.: parede de itens na lista |
| **`typeset [alvo]`** | Hierarquia tipográfica | Títulos vs CTA competindo |
| **`layout [alvo]`** | Espaço, ritmo, hierarquia espacial | Densidade / alinhamento |
| **`colorize [alvo]`** | Cor estratégica | UI monótona (Foco já tem paleta — raro precisar) |
| **`clarify [alvo]`** | Copy, labels, erros | Textos confusos |
| **`adapt [alvo]`** | Mobile / outro contexto de tela | Depois do desktop, ou outra rota |
| **`harden [alvo]`** | Erros, edge cases, i18n, estados vazios reais | Endurecer produção |
| **`onboard [alvo]`** | Primeira vez / empty states | Se outras pessoas forem usar |
| **`optimize [alvo]`** | Performance de UI | Lag, jank |

---

## 4. Construir / planejar

| Comando | O que faz | Quando |
|---------|-----------|--------|
| **`shape [feature]`** | Planeja UX/UI **antes** de codar | Feature nova (ex.: estatística nova, fluxo novo) |
| **`extract [alvo]`** | Extrai tokens/componentes reutilizáveis | Só se for formalizar design system de verdade |
| **`live`** | Variantes no browser (pick + alternativas) | Iterar um elemento visual ao vivo |
| **`animate [alvo]`** | Motion com propósito | Microinteração justificada |
| **`delight [alvo]`** | Personalidade | Com parcimônia em app de estudo |
| **`overdrive [alvo]`** | Empurrar o visual ao extremo | Quase nunca no Foco |

---

## 5. Manutenção do Impeccable

| Comando | O que faz |
|---------|-----------|
| **`hooks on` / `off` / `status`** | Detector automático após editar UI |
| **`doctor`** | Drift entre PRODUCT/DESIGN/config e a versão da skill |

---

## Fluxo recomendado (bem usado)

```
init
  → document          (se já tem UI)
  → [usar o app]
  → shape             (só se feature nova)
  → implementar
  → critique          (se mudança grande)
  → polish
  → adapt             (se precisar mobile)
  → harden / audit    (quando for fechar qualidade)
```

**No Foco hoje:** fundação ok → **usar o app**. Próximo Impeccable só com **dor concreta** ou **tela/feature nova**.

---

## O que evitar

- Critique + polish em loop na mesma tela sem mudança real
- `bolder` / `overdrive` / `delight` como padrão em app Operate
- Copiar mockup de marketing como spec de dados
- Pedir “roda o Impeccable no sistema todo” sem alvo (`/hoje`, `/materias`, …)

---

## Atalhos úteis no chat

- “Roda `$impeccable init`”
- “Roda `$impeccable document`”
- “`$impeccable critique` no Hoje”
- “`$impeccable polish` em `src/app/(app)/materias/page.tsx`”
- “`$impeccable shape` para [descrever a feature]”
- “`$impeccable adapt` na Agenda mobile”
