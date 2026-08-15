# Curso de Fundamentos de Programação com o Foco Semanal

## Apresentação

Este curso usa um sistema real, o **Foco Semanal**, para ensinar fundamentos de programação e as principais etapas da construção de uma aplicação web.

O objetivo não é decorar arquivos nem aprender todas as tecnologias de uma vez. Ao final, você deverá conseguir:

- explicar qual problema o sistema resolve;
- reconhecer as partes de uma aplicação web;
- acompanhar o caminho entre tela, lógica e banco de dados;
- ler trechos básicos de TypeScript e React;
- explicar decisões do projeto usando vocabulário técnico;
- apresentar o projeto em uma entrevista de estágio.

O curso foi escrito para dois usos simultâneos:

1. **Aprendizado:** cada conceito começa em linguagem simples.
2. **Apresentação técnica:** cada módulo ensina como explicar o mesmo conceito de maneira profissional.

> **Importante:** a ordem das pastas não revela a ordem cronológica em que o projeto foi criado. Os módulos abaixo apresentam uma **ordem lógica e pedagógica de construção**: primeiro o problema, depois a interface, os dados, a segurança e a entrega.

---

## Como estudar

Não tente terminar vários módulos no mesmo dia. Para cada módulo:

1. Leia a explicação geral.
2. Abra os arquivos indicados no Cursor.
3. Localize os exemplos sem tentar entender todas as linhas.
4. Responda às perguntas com suas próprias palavras.
5. Faça o exercício de apresentação em voz alta.

Uma resposta simples e correta vale mais do que uma resposta cheia de termos decorados.

### Ordem dos 12 módulos

1. Problema, objetivo e requisitos
2. Como uma aplicação web funciona
3. Stack, ambiente e estrutura do projeto
4. Fundamentos de TypeScript
5. React, JSX e componentes
6. Estado, eventos e Hooks
7. Next.js: rotas, páginas, layouts e execução
8. Interface, CSS, responsividade e experiência
9. Modelagem de dados e persistência local
10. Banco de dados, Supabase e sincronização
11. Autenticação, autorização, API e segurança
12. PWA, qualidade, deploy e apresentação profissional

### Estrutura de cada módulo

- **Objetivo:** o que você deverá compreender.
- **Conceitos:** fundamentos que valem para outros projetos.
- **No Foco Semanal:** onde observar esses conceitos.
- **Ordem de construção:** como essa etapa entraria em um sistema novo.
- **Prática guiada:** exercício de leitura ou raciocínio.
- **Como explicar:** modelo para entrevista ou apresentação.
- **Perguntas de revisão:** checagem de aprendizado.

---

# Módulo 1 — Problema, objetivo e requisitos

## Objetivo

Entender que um sistema começa com um problema real, não com uma linguagem ou framework.

## 1. O problema antes do código

O Foco Semanal existe para ajudar uma pessoa a organizar estudos. O problema pode ser descrito assim:

> “Preciso visualizar minha semana, organizar matérias, controlar sessões de foco e acompanhar meu tempo de estudo.”

Essa frase orienta todo o restante. React, Next.js e Supabase são ferramentas escolhidas para resolver o problema; não são o objetivo do sistema.

## 2. Requisitos funcionais e não funcionais

**Requisito funcional** descreve algo que o sistema deve fazer:

- cadastrar e ordenar matérias;
- organizar blocos da semana;
- executar temporizadores;
- registrar tempo de foco;
- exibir estatísticas;
- autenticar usuários;
- salvar dados.

**Requisito não funcional** descreve uma qualidade ou restrição:

- funcionar em computador e celular;
- proteger os dados de cada usuário;
- continuar com timers após atualizar a página;
- ter tema claro, escuro e automático;
- poder ser instalado como PWA;
- carregar com boa experiência visual.

## 3. Escopo e MVP

Um **MVP** é a menor versão útil de um produto. Uma primeira versão possível do Foco poderia ter:

1. uma tela “Hoje”;
2. uma lista de matérias;
3. um timer;
4. armazenamento local.

Login, nuvem, estatísticas detalhadas e PWA poderiam entrar depois. Dividir o trabalho reduz risco e permite testar a ideia cedo.

## No Foco Semanal

Abra:

- `README.md` — apresenta o objetivo, as funções e as tecnologias;
- `docs/screenshots/` — mostra as telas principais;
- `src/app/(app)/` — contém as áreas funcionais do sistema.

As pastas `hoje`, `semana`, `materias`, `estatisticas`, `sessao`, `temporizadores` e `ajustes` refletem requisitos do produto.

## Ordem de construção

1. Identificar o usuário e seu problema.
2. Escrever as funções necessárias.
3. Separar o essencial do que pode vir depois.
4. Rascunhar as telas e o fluxo de uso.
5. Só então escolher a tecnologia e criar o projeto.

## Prática guiada

Escreva sem consultar o README:

- Quem usa o Foco?
- Qual problema ele resolve?
- Quais são suas três funções mais importantes?
- Qual seria a versão mínima dele?

## Como explicar em uma entrevista

> “O Foco Semanal é uma aplicação de produtividade voltada à organização de estudos. O sistema reúne planejamento semanal, ciclo de matérias, timers, lembretes e estatísticas. Eu começaria sua construção validando essas necessidades e entregando primeiro um MVP com a tela principal, matérias e controle básico de foco.”

## Perguntas de revisão

1. Qual é a diferença entre problema e solução?
2. O que é requisito funcional?
3. O que é requisito não funcional?
4. Por que não é recomendado construir tudo de uma vez?

---

# Módulo 2 — Como uma aplicação web funciona

## Objetivo

Compreender navegador, frontend, backend, banco de dados, requisição e resposta.

## 1. As camadas principais

Uma aplicação web costuma ter três grandes partes:

### Frontend

É a parte que aparece no navegador: páginas, textos, botões, formulários, menus e gráficos.

No Foco, o frontend é construído principalmente com React, Next.js, TypeScript e CSS.

### Backend

É a parte que executa ações no servidor, protege segredos e conversa com serviços externos ou com o banco.

No Foco, parte do backend está nas rotas de API do Next.js e parte é fornecida pelo Supabase.

### Banco de dados

Armazena informações de forma organizada e persistente. O Foco usa PostgreSQL por meio do Supabase.

## 2. Cliente e servidor

O **cliente** é normalmente o navegador. O **servidor** recebe pedidos do cliente e devolve respostas.

Exemplo simplificado:

```text
Usuário abre /hoje
        ↓
Navegador solicita a página
        ↓
Next.js entrega a estrutura da aplicação
        ↓
React monta a interface
        ↓
O app carrega os dados locais ou do Supabase
        ↓
A tela é atualizada
```

## 3. Requisição e resposta

Uma **requisição HTTP** é um pedido. Uma **resposta HTTP** é o resultado.

Ao convidar um usuário, a interface envia dados para `POST /api/access/invite`. O servidor valida a sessão e responde, por exemplo:

- `200` — ação concluída;
- `400` — dados inválidos;
- `401` — usuário não autenticado;
- `403` — usuário sem permissão;
- `500` — erro interno.

## 4. Estado local e estado remoto

- **Local:** está no aparelho ou na memória do navegador.
- **Remoto:** está no banco e pode ser acessado em outros aparelhos.

O Foco combina os dois. Timers em execução permanecem locais; dados principais e histórico podem sincronizar com a nuvem.

## No Foco Semanal

Abra:

- `src/app/(app)/hoje/page.tsx` — uma página do frontend;
- `src/app/api/access/invite/route.ts` — código executado no servidor;
- `src/lib/supabase/sync.ts` — comunicação com o banco;
- `supabase/schema.sql` — estrutura do banco.

## Ordem de construção

1. Construir uma interface simples.
2. Fazer a interface reagir a ações.
3. Definir quais dados precisam persistir.
4. Criar backend ou integrar um serviço.
5. Conectar frontend, backend e banco.

## Prática guiada

Escolha a ação “entrar no sistema” e descreva:

1. o que o usuário faz no frontend;
2. qual pedido precisa chegar ao serviço;
3. o que deve ser verificado;
4. qual resposta a interface deve mostrar.

## Como explicar em uma entrevista

> “O projeto é uma aplicação web full stack. O frontend em React roda no navegador, o Next.js organiza páginas e rotas de servidor, e o Supabase oferece autenticação e banco PostgreSQL. A interface envia e recebe dados, mantém estado local e sincroniza informações persistentes com a nuvem.”

## Perguntas de revisão

1. Qual é a diferença entre frontend e backend?
2. Por que uma chave administrativa não deve ficar no frontend?
3. O que acontece em uma requisição?
4. Qual a diferença entre dado local e remoto?

---

# Módulo 3 — Stack, ambiente e estrutura do projeto

## Objetivo

Entender por que as tecnologias foram escolhidas e reconhecer arquivos criados pelo programador e arquivos gerados pelas ferramentas.

## 1. A stack

**Stack** é o conjunto de tecnologias usado em um projeto.

O Foco utiliza:

- **JavaScript:** linguagem executada pelo navegador;
- **TypeScript:** JavaScript com verificação de tipos;
- **React:** biblioteca para criar interfaces por componentes;
- **Next.js:** framework que organiza React, rotas e servidor;
- **Tailwind CSS e CSS:** estilos e responsividade;
- **Supabase:** autenticação, API e banco PostgreSQL;
- **Vercel:** hospedagem e deploy.

## 2. Por que essa combinação?

- React facilita dividir telas grandes em componentes.
- TypeScript ajuda a detectar inconsistências antes da execução.
- Next.js fornece estrutura para páginas e código de servidor.
- Supabase evita construir autenticação e banco do zero.
- Vercel integra facilmente o deploy de aplicações Next.js.

Essas escolhas têm vantagens, mas não são as únicas possíveis. Um bom programador explica a necessidade atendida por cada ferramenta.

## 3. `package.json`

O arquivo `package.json` identifica o projeto, define comandos e lista dependências.

Scripts importantes:

```json
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "eslint"
```

- `npm run dev` inicia o ambiente de desenvolvimento;
- `npm run build` prepara a versão de produção;
- `npm run start` executa a versão construída;
- `npm run lint` procura problemas de qualidade.

## 4. Pastas essenciais

```text
foco_semanal/
├── src/          código principal
├── public/       arquivos estáticos
├── supabase/     schema e migrações SQL
├── docs/         documentação e imagens
├── package.json  scripts e dependências
└── README.md     apresentação do projeto
```

Dentro de `src`:

```text
src/
├── app/          páginas, layouts e APIs
├── components/   peças de interface e providers
├── lib/          tipos, regras e integrações
└── proxy.ts      renovação da sessão Supabase
```

## 5. Arquivos gerados

- `node_modules/` contém bibliotecas instaladas;
- `.next/` contém resultado temporário de desenvolvimento/build;
- `.vercel/` guarda configuração local da hospedagem;
- `package-lock.json` registra versões exatas das dependências.

Esses itens não indicam ordem de criação. O explorador de arquivos normalmente os apresenta por nome.

## 6. Variáveis de ambiente

O `.env.local` guarda configurações que mudam entre ambientes. Exemplo:

```text
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Variáveis iniciadas com `NEXT_PUBLIC_` podem chegar ao navegador. A `SERVICE_ROLE_KEY` é administrativa e deve permanecer somente no servidor.

## Prática guiada

No `package.json`, identifique:

1. o nome do projeto;
2. os quatro scripts;
3. três dependências de execução;
4. duas dependências de desenvolvimento.

## Como explicar em uma entrevista

> “A aplicação usa Next.js e React com TypeScript. O código principal fica em `src`, separado entre rotas, componentes e bibliotecas internas. O `package.json` documenta scripts e dependências. Supabase fornece banco e autenticação, enquanto configurações sensíveis ficam em variáveis de ambiente do servidor.”

## Perguntas de revisão

1. O que é uma stack?
2. Qual a diferença entre React e Next.js?
3. Para que serve o `package.json`?
4. Por que não se edita `.next` ou `node_modules`?

---

# Módulo 4 — Fundamentos de TypeScript

## Objetivo

Reconhecer variáveis, tipos, funções, objetos, arrays, condições e módulos usando exemplos do projeto.

## 1. Variáveis e constantes

Uma variável guarda um valor. `const` cria uma referência que não será reatribuída:

```ts
const COMPACT_WEEK_THRESHOLD = 5;
const day = todayIndex();
```

O primeiro valor é um número. O segundo é o resultado de uma função.

## 2. Tipos primitivos

Tipos comuns:

- `string` — texto;
- `number` — número;
- `boolean` — verdadeiro ou falso;
- `null` — ausência intencional de valor;
- `undefined` — valor não definido.

O projeto também restringe valores possíveis:

```ts
export type SubjectStatus = "ok" | "prox";
export type Theme = "light" | "dark";
```

Isso impede, por exemplo, que uma matéria receba o status `"talvez"`.

## 3. Objetos e interfaces

Um objeto reúne valores relacionados. Uma interface define o formato esperado:

```ts
export interface Subject {
  id: string;
  name: string;
  status: SubjectStatus;
  notes: string;
  cycle_order: number;
  active: boolean;
}
```

Esse contrato diz que toda matéria possui essas propriedades e tipos.

## 4. Arrays

Um array é uma lista. `Subject[]` significa “lista de matérias”.

Métodos frequentes no projeto:

- `.map()` transforma cada item;
- `.filter()` seleciona itens;
- `.sort()` ordena;
- `.find()` procura um item;
- `.some()` verifica se pelo menos um item atende à condição.

Na página Hoje, as matérias ativas são filtradas e ordenadas:

```ts
[...data.subjects]
  .filter((subject) => subject.active)
  .sort((a, b) => a.cycle_order - b.cycle_order);
```

## 5. Funções

Uma função recebe entradas, executa uma tarefa e pode devolver uma saída:

```ts
function validPassword(value: unknown): value is string {
  return typeof value === "string" && value.length >= 6;
}
```

Essa função valida se um valor é texto e possui pelo menos seis caracteres.

## 6. Condições

Condições controlam decisões:

```ts
if (!user) {
  return <LoginScreen />;
}
```

Se não existir usuário, o sistema mostra a tela de login.

## 7. Importação e exportação

Arquivos são módulos. `export` disponibiliza algo; `import` traz esse item para outro arquivo.

O atalho `@/` aponta para `src/`, conforme configurado em `tsconfig.json`.

## No Foco Semanal

Abra:

- `src/lib/types.ts` — tipos, interfaces e constantes;
- `src/lib/utils.ts` — funções;
- `src/lib/demo-store.ts` — objetos, arrays e armazenamento;
- `src/app/(app)/hoje/page.tsx` — uso dos dados na interface.

## Prática guiada

Escolha a interface `Reminder` em `types.ts` e responda:

1. Quais campos são texto?
2. Quais são booleanos?
3. Qual campo pode ser `null`?
4. O que cada campo representa no mundo real?

## Como explicar em uma entrevista

> “TypeScript adiciona tipos estáticos ao JavaScript. No projeto, interfaces como `Subject` e `AppData` funcionam como contratos dos dados. Isso melhora o autocomplete, documenta o domínio e detecta incompatibilidades durante o desenvolvimento.”

## Perguntas de revisão

1. Qual a diferença entre valor e tipo?
2. O que uma interface representa?
3. Para que servem `filter`, `map` e `sort`?
4. Qual é a função de `import` e `export`?

---

# Módulo 5 — React, JSX e componentes

## Objetivo

Entender como React transforma funções e componentes em uma interface reutilizável.

## 1. Interface declarativa

Em React, descrevemos como a interface deve parecer para determinado estado. O React atualiza o necessário quando os dados mudam.

## 2. JSX e TSX

JSX é uma sintaxe parecida com HTML dentro do código. Como o projeto usa TypeScript, os arquivos com interface possuem extensão `.tsx`.

```tsx
export function AppShell({ children }: { children: React.ReactNode }) {
  return <main>{children}</main>;
}
```

O conteúdo retornado é a interface do componente.

## 3. Componentes

Um componente é uma parte independente da tela. Pode ser pequeno, como um botão, ou grande, como um painel.

Exemplos:

- `AppShell` — estrutura e navegação;
- `FocusTodayCard` — foco do dia;
- `ReminderBoard` — lembretes;
- `SessionClock` — relógio de sessão;
- `MonthCalendarDialog` — calendário;
- `LoginScreen` — formulário de login.

## 4. Props

**Props** são dados recebidos por um componente. Elas funcionam como parâmetros de uma função.

`AppShell` recebe `children`, que representa a página colocada dentro dele.

## 5. Composição

Componentes podem conter outros componentes:

```text
RootLayout
└── AppProvider
    └── AppLayout
        └── TimerRuntimeProvider
            └── AppShell
                └── Página atual
```

Isso é **composição**: uma interface complexa construída com partes menores.

## 6. Renderização condicional

React pode mostrar conteúdos diferentes:

```tsx
if (!ready) return <div>Carregando…</div>;
if (!user) return <LoginScreen />;
return <div>{children}</div>;
```

O resultado depende do estado da aplicação.

## 7. Listas e chaves

O React usa `.map()` para transformar dados em elementos visuais. Cada elemento de lista precisa de uma `key` estável para ser identificado.

## No Foco Semanal

Abra:

- `src/app/(app)/hoje/page.tsx` — página que reúne componentes;
- `src/components/AppShell.tsx` — composição, props, listas e condições;
- `src/components/FocusTodayCard.tsx` — componente de domínio;
- `src/app/layout.tsx` — composição global.

## Prática guiada

Na página Hoje:

1. localize os imports vindos de `components`;
2. localize o `return`;
3. encontre onde cada componente importado aparece;
4. explique por que ele foi separado da página.

## Como explicar em uma entrevista

> “React permite construir a interface de forma declarativa e componentizada. A página Hoje compõe componentes especializados, como relógio, lembretes e calendário. As props passam informações para os componentes, e a renderização muda conforme o estado.”

## Perguntas de revisão

1. O que é um componente?
2. O que é JSX?
3. Qual é a diferença entre componente e página?
4. O que são props?
5. Por que dividir uma tela em componentes?

---

# Módulo 6 — Estado, eventos e Hooks

## Objetivo

Entender como a interface guarda informações temporárias, reage ao usuário e executa efeitos externos.

## 1. Estado

**Estado** é uma informação que pode mudar enquanto a aplicação está sendo usada.

Na página Hoje:

```ts
const [calendarOpen, setCalendarOpen] = useState(false);
```

- `calendarOpen` é o valor atual;
- `setCalendarOpen` altera esse valor;
- `false` é o valor inicial.

Quando o estado muda, React renderiza novamente o componente.

## 2. Eventos

Eventos representam ações:

- `onClick` — clique;
- `onChange` — mudança em um campo;
- `onSubmit` — envio de formulário.

No login, `onChange` atualiza e-mail e senha; `onSubmit` tenta autenticar o usuário.

## 3. `useEffect`

`useEffect` executa um efeito relacionado ao mundo externo:

- acessar `window` ou `localStorage`;
- registrar um listener;
- iniciar um intervalo;
- carregar uma sessão;
- sincronizar dados.

Um efeito pode devolver uma função de limpeza para remover listeners ou intervalos.

## 4. `useMemo`

`useMemo` guarda o resultado de um cálculo enquanto suas dependências não mudam.

Na página Hoje, listas filtradas e ordenadas são derivadas de `data.subjects` e `data.week_blocks`.

Não se usa `useMemo` em todo cálculo. Ele é útil quando há uma razão clara para evitar recomputações ou manter referências estáveis.

## 5. `useCallback` e `useRef`

- `useCallback` mantém uma referência estável para uma função;
- `useRef` guarda um valor entre renderizações sem provocar nova renderização.

O `TimerRuntimeProvider` usa refs para controlar timers, operações em andamento e dados que precisam permanecer atualizados.

## 6. Estado local e compartilhado

- **Estado local:** pertence a uma tela ou componente, como “calendário aberto”.
- **Estado compartilhado:** é usado por várias partes, como matérias, tema e usuário.

O `AppProvider` oferece estado compartilhado através de Context. O hook `useApp()` permite consumi-lo.

## 7. Dados derivados

Nem todo valor precisa ser armazenado. Por exemplo, “matérias ativas e ordenadas” pode ser calculado a partir da lista original. Isso evita estados duplicados e inconsistentes.

## No Foco Semanal

Abra:

- `src/components/LoginScreen.tsx` — formulário e eventos;
- `src/app/(app)/hoje/page.tsx` — estado local e dados derivados;
- `src/components/AppProvider.tsx` — estado global;
- `src/components/TimerRuntimeProvider.tsx` — hooks e persistência de relógios.

## Prática guiada

Para cada estado no topo de `hoje/page.tsx`, responda:

1. qual informação ele guarda;
2. qual é o valor inicial;
3. qual ação pode alterá-lo;
4. se ele deveria ser local ou compartilhado.

## Como explicar em uma entrevista

> “O projeto diferencia estado local e global. Estados de interface, como abertura do calendário, ficam na página. Dados usados em várias telas ficam no `AppProvider`. Eventos alteram o estado, e efeitos integram React com APIs do navegador, sessão e persistência.”

## Perguntas de revisão

1. O que acontece quando um estado muda?
2. Qual é a diferença entre props e state?
3. Quando um `useEffect` é necessário?
4. O que é um dado derivado?
5. Para que serve um Context?

---

# Módulo 7 — Next.js: rotas, páginas, layouts e execução

## Objetivo

Compreender como o Next.js organiza URLs, páginas, layouts, componentes de cliente e código de servidor.

## 1. App Router

No Next.js usado pelo projeto, a pasta `src/app` organiza as rotas.

Exemplos:

```text
src/app/page.tsx                    → /
src/app/(app)/hoje/page.tsx        → /hoje
src/app/(app)/materias/page.tsx    → /materias
src/app/redefinir-senha/page.tsx   → /redefinir-senha
```

## 2. Arquivos especiais

- `page.tsx` define o conteúdo de uma rota;
- `layout.tsx` envolve páginas abaixo dele;
- `template.tsx` pode recriar uma camada ao navegar;
- `route.ts` cria um endpoint HTTP;
- `manifest.ts` gera o manifesto da PWA.

## 3. Grupo de rotas

A pasta `(app)` é um **route group**. Os parênteses organizam arquivos sem entrar na URL.

Por isso:

```text
src/app/(app)/hoje/page.tsx
```

corresponde a `/hoje`, e não a `/app/hoje`.

## 4. Layout global e layout da aplicação

`src/app/layout.tsx`:

- define idioma, fontes e metadados;
- carrega CSS global;
- envolve tudo com `AppProvider`;
- registra o service worker.

`src/app/(app)/layout.tsx`:

- envolve as páginas principais com `TimerRuntimeProvider`;
- adiciona `AppShell`, que fornece navegação e controle de login.

## 5. Componentes de servidor e cliente

No App Router, componentes são de servidor por padrão. A diretiva:

```ts
"use client";
```

é necessária quando o arquivo usa estado, efeitos, eventos ou APIs do navegador.

Isso não significa que toda a aplicação deva ser cliente. A divisão ajuda a manter responsabilidades claras.

## 6. Navegação e redirecionamento

`src/app/page.tsx` usa `redirect("/hoje")`. Assim, a raiz encaminha para a tela principal.

`Link` realiza navegação interna. `usePathname` identifica a rota ativa no menu.

## 7. Rotas de API

`src/app/api/access/invite/route.ts` exporta uma função `POST`. Ela roda no servidor e pode usar a chave administrativa sem enviá-la ao navegador.

## 8. O papel real de `proxy.ts`

Neste projeto, `src/proxy.ts` atualiza e valida o cookie de sessão do Supabase em requisições. A decisão visual de exibir login ou conteúdo está em `AppShell`, com base no usuário carregado pelo `AppProvider`.

É importante explicar o código real, sem afirmar que o proxy sozinho bloqueia todas as páginas.

## Prática guiada

Desenhe o caminho:

```text
/hoje → page.tsx → layout de (app) → AppShell → componentes da página
```

Depois explique o que cada camada acrescenta.

## Como explicar em uma entrevista

> “O projeto usa o App Router do Next.js. Pastas com `page.tsx` definem rotas, layouts compartilham estrutura, e o grupo `(app)` organiza páginas sem alterar a URL. Componentes interativos usam `use client`; operações privilegiadas ficam em rotas de servidor.”

## Perguntas de revisão

1. Como uma pasta vira URL?
2. Para que serve `layout.tsx`?
3. Por que `(app)` não aparece na URL?
4. Quando usar `use client`?
5. Qual a diferença entre `page.tsx` e `route.ts`?

---

# Módulo 8 — Interface, CSS, responsividade e experiência

## Objetivo

Entender que uma interface não é apenas aparência: ela comunica estrutura, responde a telas diferentes e precisa ser utilizável.

## 1. Estrutura, aparência e comportamento

- JSX descreve a estrutura;
- CSS descreve a aparência;
- React/TypeScript controla o comportamento.

Essas responsabilidades se encontram em um componente, mas continuam conceitualmente diferentes.

## 2. CSS global e classes utilitárias

`src/app/globals.css` define variáveis, temas e estilos compartilhados.

O projeto também usa classes do Tailwind:

```tsx
<main className="mx-auto max-w-7xl px-3 sm:px-5 md:px-8">
```

Essas classes controlam largura, centralização e espaçamento de forma responsiva.

## 3. Design tokens

Valores como `--signal`, `--surface`, `--ink`, `--line` e `--radius-btn` funcionam como **tokens de design**. Em vez de repetir cores e medidas, o sistema usa nomes com significado.

Isso facilita temas e consistência visual.

## 4. Responsividade

Responsividade adapta a interface a tamanhos diferentes.

No `AppShell`:

- o cabeçalho aparece em telas grandes;
- a navegação inferior aparece em telas pequenas;
- o conteúdo usa larguras e espaçamentos adaptáveis.

A página Hoje também observa a largura da tela para simplificar a visualização em dispositivos estreitos.

## 5. Acessibilidade

Exemplos presentes no projeto:

- `aria-label` descreve botões com apenas ícones;
- `aria-current="page"` informa a rota ativa;
- elementos `button`, `form`, `nav` e `main` dão significado semântico;
- campos possuem tipos como `email` e `password`;
- botões indicam estado desabilitado.

Acessibilidade deve fazer parte da construção, não ser um ajuste final.

## 6. Feedback ao usuário

O sistema mostra:

- “Carregando…” enquanto prepara os dados;
- mensagem de erro em login inválido;
- botão “Aguarde…” durante operação;
- alarmes e notificações ao finalizar timer.

Feedback evita que o usuário fique sem saber se sua ação funcionou.

## No Foco Semanal

Abra:

- `src/app/globals.css`;
- `src/components/AppShell.tsx`;
- `src/components/LoginScreen.tsx`;
- `src/app/(app)/hoje/page.tsx`.

## Prática guiada

Compare a captura de desktop e a móvel em `docs/screenshots/`. Liste:

1. o que mudou de posição;
2. o que permaneceu;
3. como o menu se adaptou;
4. por que essa mudança melhora o uso.

## Como explicar em uma entrevista

> “A interface combina Tailwind com variáveis CSS para manter consistência e temas. O layout é responsivo: usa navegação superior no desktop e inferior no celular. Também há elementos semânticos, atributos ARIA e feedback de carregamento e erro.”

## Perguntas de revisão

1. Qual a diferença entre JSX e CSS?
2. O que é responsividade?
3. O que são tokens de design?
4. Por que `aria-label` é útil?
5. Por que uma ação assíncrona precisa de feedback?

---

# Módulo 9 — Modelagem de dados e persistência local

## Objetivo

Aprender a transformar elementos do mundo real em estruturas de dados e entender memória, armazenamento e serialização.

## 1. Modelagem do domínio

**Domínio** é a área do problema. No Foco, os principais objetos são:

- matéria;
- bloco semanal;
- lembrete;
- sessão de estudo;
- timer;
- coluna de notas;
- nota adesiva;
- perfil do usuário.

`src/lib/types.ts` transforma esses conceitos em interfaces.

## 2. Identidade e relacionamentos

Cada objeto possui um `id` para ser identificado.

Relacionamentos:

- uma sessão pode referenciar uma matéria;
- uma nota pertence a uma coluna;
- dados na nuvem pertencem a um usuário.

Sem identidade estável, editar, excluir e sincronizar itens seria inseguro.

## 3. Estado na memória

`useState` mantém dados enquanto a aplicação está aberta. Se nada for persistido, uma atualização da página perde o estado.

## 4. `localStorage`

O navegador oferece `localStorage`, que guarda textos entre sessões.

Como os dados são objetos, usa-se:

- `JSON.stringify(data)` para objeto → texto;
- `JSON.parse(raw)` para texto → objeto.

O arquivo `demo-store.ts` cria dados padrão, lê e salva o estado local.

## 5. Persistência dos timers

O `TimerRuntimeProvider` guarda o instante final (`endsAt`) em vez de depender apenas de diminuir um contador em memória. Ao recarregar, calcula:

```text
tempo restante = instante final - horário atual
```

Esse é um exemplo importante de modelagem: guardar o dado necessário para reconstruir o estado.

## 6. Validação e migração

Dados persistidos podem ter formato antigo ou inválido. O projeto:

- usa valores padrão;
- captura erros de leitura;
- converte status antigo;
- preenche propriedades que não existiam em versões anteriores.

Isso é uma migração de dados local.

## 7. Backup

O `AppProvider` oferece exportação e importação em JSON. Esse recurso mostra que o formato dos dados também pode ser usado para portabilidade e recuperação manual.

## No Foco Semanal

Abra:

- `src/lib/types.ts`;
- `src/lib/demo-store.ts`;
- `src/components/TimerRuntimeProvider.tsx`;
- funções de backup em `src/components/AppProvider.tsx`.

## Prática guiada

Escolha `Subject` e faça o percurso:

```text
interface em types.ts
→ valor padrão em demo-store.ts
→ estado em AppProvider
→ exibição em uma página
→ tabela subjects no banco
```

## Como explicar em uma entrevista

> “O domínio é modelado com interfaces TypeScript. O app mantém estado em React e usa `localStorage` para persistência no dispositivo, serializando objetos em JSON. Timers guardam timestamps para poder reconstruir o tempo após recarregar, e os dados locais possuem tratamento de migração.”

## Perguntas de revisão

1. O que é modelar dados?
2. Por que cada entidade possui `id`?
3. Qual a diferença entre memória e `localStorage`?
4. Para que servem `JSON.stringify` e `JSON.parse`?
5. Por que guardar `endsAt` ajuda um timer?

---

# Módulo 10 — Banco de dados, Supabase e sincronização

## Objetivo

Entender tabelas, linhas, colunas, chaves, operações CRUD e o caminho entre estado local e nuvem.

## 1. Banco relacional

O Supabase usa PostgreSQL, um banco relacional. Os dados são organizados em tabelas:

- `profiles`;
- `subjects`;
- `week_blocks`;
- `study_sessions`;
- `reminders`;
- `focus_timers`;
- `focus_days`;
- entre outras.

Cada linha representa um registro; cada coluna representa uma característica.

## 2. SQL

SQL é a linguagem usada para definir e consultar bancos relacionais.

Exemplos conceituais:

- `CREATE TABLE` cria uma tabela;
- `SELECT` lê dados;
- `INSERT` cria registros;
- `UPDATE` altera registros;
- `DELETE` remove registros.

## 3. Restrições

O schema protege a qualidade dos dados:

- `primary key` identifica registros;
- `not null` exige um valor;
- `references` cria relacionamento;
- `check` limita valores;
- `default` define valor inicial;
- `on delete cascade` remove dados dependentes quando necessário.

## 4. CRUD

CRUD resume quatro operações:

- **Create** — criar;
- **Read** — ler;
- **Update** — atualizar;
- **Delete** — excluir.

Cadastrar, listar, editar e remover uma matéria é um CRUD.

## 5. Carregamento da nuvem

`loadCloudData`:

1. recebe o cliente Supabase e o usuário;
2. consulta várias tabelas;
3. valida erros;
4. converte linhas do banco para tipos do app;
5. devolve um único objeto `AppData`.

As consultas independentes são agrupadas com `Promise.all`, permitindo execução concorrente.

## 6. Salvamento e sincronização

`saveCloudData` converte o estado React em registros de banco.

O projeto usa uma estratégia simples para várias coleções: remove os registros atuais do usuário e insere o novo retrato. O histórico de sessões recebe tratamento diferente para não apagar registros remotos fora do conjunto sincronizado.

Essa estratégia é compreensível, mas possui troca: simplicidade versus eficiência. Em sistemas maiores, alterações individuais e controle de conflito seriam mais adequados.

## 7. Assincronismo

Operações de rede demoram e podem falhar. Por isso são assíncronas:

```ts
const loaded = await loadCloudData(supabase, uid);
```

- `async` indica uma função assíncrona;
- `await` espera uma Promise;
- `try/catch` trata falhas.

## 8. Estado vazio e migração para a nuvem

Ao entrar em uma conta vazia, o `AppProvider` pode enviar os dados locais para o Supabase. Antes, verifica se a nuvem está vazia, reduzindo o risco de sobrescrever informações existentes.

## No Foco Semanal

Abra:

- `supabase/schema.sql`;
- `src/lib/supabase/client.ts`;
- `src/lib/supabase/server.ts`;
- `src/lib/supabase/sync.ts`;
- `src/components/AppProvider.tsx`.

## Prática guiada

Compare a interface `Subject` com a tabela `subjects`:

1. quais campos existem nos dois lados?
2. qual campo existe no banco para indicar o dono?
3. quais restrições protegem os dados?
4. como o código converte uma linha para `Subject`?

## Como explicar em uma entrevista

> “O Supabase fornece PostgreSQL e SDK de acesso. As tabelas representam as entidades do domínio e usam chaves e restrições para manter integridade. O app carrega as coleções de forma assíncrona, converte os registros para `AppData` e sincroniza alterações novamente com a nuvem.”

## Perguntas de revisão

1. O que são tabela, linha e coluna?
2. O que significa CRUD?
3. Qual a função de uma chave estrangeira?
4. Por que operações de rede usam `async/await`?
5. Qual é a troca da estratégia “apagar e reinserir”?

---

# Módulo 11 — Autenticação, autorização, API e segurança

## Objetivo

Distinguir identidade de permissão e acompanhar o fluxo seguro de entrada e convite.

## 1. Autenticação e autorização

- **Autenticação:** descobrir quem é o usuário.
- **Autorização:** decidir o que esse usuário pode fazer.

No Foco:

- e-mail e senha autenticam;
- a lista de acesso autoriza a entrada;
- o papel `owner` autoriza administração de convites;
- regras do banco limitam dados ao dono.

## 2. Fluxo de login

```text
Usuário informa e-mail e senha
        ↓
LoginScreen valida os campos
        ↓
O sistema verifica a lista de acesso
        ↓
Supabase autentica as credenciais
        ↓
AppProvider recebe a sessão e carrega os dados
        ↓
AppShell mostra o conteúdo
```

## 3. Sessão

Depois do login, uma sessão representa a identidade do usuário. O Supabase usa tokens e cookies. `proxy.ts` chama `getUser()` para validar o token e atualizar cookies quando necessário.

## 4. Recuperação de senha

O login pede ao Supabase que envie um link. O usuário retorna por:

```text
/auth/callback?next=/redefinir-senha
```

A rota de callback troca o código por uma sessão e redireciona para um caminho interno validado.

`safeNextPath` é importante porque impede que um parâmetro malicioso redirecione o usuário para um site externo.

## 5. Rota de convite

`POST /api/access/invite`:

1. verifica se existe sessão;
2. confirma se o usuário é administrador;
3. valida e-mail e senha;
4. adiciona o e-mail à lista permitida;
5. usa o cliente administrativo no servidor;
6. cria ou atualiza o usuário;
7. retorna JSON e status HTTP.

## 6. Segredos

A chave `SUPABASE_SERVICE_ROLE_KEY` ignora proteções comuns e deve ficar somente no servidor.

Regra geral:

> Tudo que chega ao navegador deve ser considerado visível pelo usuário.

Por isso, renomear uma chave ou escondê-la em um componente não cria segurança.

## 7. RLS

**Row Level Security** protege linhas no próprio banco. As policies do Foco verificam se:

- o usuário autenticado é dono do registro;
- o e-mail ainda está autorizado;
- apenas administradores acessam tabelas de controle.

Essa proteção é essencial porque segurança apenas na interface pode ser contornada.

## 8. Validação em camadas

O projeto valida dados:

- no formulário, para resposta rápida;
- na rota do servidor, para segurança;
- no banco, com tipos, `check`, chaves e RLS.

Não se deve confiar apenas no frontend.

## No Foco Semanal

Abra:

- `src/components/LoginScreen.tsx`;
- `src/lib/supabase/access.ts`;
- `src/proxy.ts`;
- `src/app/auth/callback/route.ts`;
- `src/app/api/access/invite/route.ts`;
- seção de RLS em `supabase/schema.sql`.

## Prática guiada

Explique por que estas três checagens são diferentes:

1. senha precisa ter seis caracteres;
2. usuário precisa estar autenticado;
3. usuário precisa ter papel `owner`.

## Como explicar em uma entrevista

> “O Supabase autentica por e-mail e senha, enquanto uma allowlist e papéis controlam autorização. Operações administrativas ficam em uma rota de servidor que valida sessão e função antes de usar a service role. No banco, RLS garante que cada usuário acesse apenas os próprios dados.”

## Perguntas de revisão

1. Qual a diferença entre autenticação e autorização?
2. O que é uma sessão?
3. Por que a service role não pode ir para o navegador?
4. Para que serve RLS?
5. Por que validar no servidor se o formulário já validou?

---

# Módulo 12 — PWA, qualidade, deploy e apresentação profissional

## Objetivo

Compreender como o sistema passa de código local para produto utilizável e aprender a apresentá-lo com clareza.

## 1. PWA

Uma **Progressive Web App** usa recursos da web para oferecer experiência próxima de aplicativo instalado.

O Foco possui:

- `src/app/manifest.ts` — nome, cores, ícones e modo de exibição;
- `public/sw.js` — service worker;
- `ServiceWorkerRegister` — registro em produção;
- ícones em `public/icons/`;
- metadados móveis no layout.

Em desenvolvimento, o projeto remove registros antigos para evitar que cache esconda mudanças recentes.

## 2. Qualidade antes da entrega

Quatro verificações básicas:

### Lint

`npm run lint` encontra padrões problemáticos e inconsistências.

### TypeScript

A verificação de tipos encontra contratos quebrados.

### Build

`npm run build` confirma que a versão de produção pode ser gerada.

### Teste manual

Fluxos críticos devem ser testados:

- login e recuperação de senha;
- cadastro e edição de matéria;
- persistência após recarregar;
- timer e cronômetro;
- sincronização;
- responsividade;
- logout.

O repositório não apresenta atualmente uma suíte automatizada de testes no `package.json`. Em uma apresentação madura, isso deve ser reconhecido como oportunidade de evolução, não escondido.

## 3. Git e versionamento

Git registra a evolução do código. Conceitos essenciais:

- **repositório:** projeto versionado;
- **commit:** conjunto coerente de alterações;
- **branch:** linha de trabalho separada;
- **pull request:** proposta revisável de integração;
- **merge:** união das alterações.

Commits pequenos e mensagens claras ajudam manutenção e revisão.

## 4. Deploy

Deploy é publicar uma versão executável.

Fluxo simplificado:

```text
Código no repositório
        ↓
Vercel instala dependências
        ↓
Executa o build do Next.js
        ↓
Aplica variáveis de ambiente
        ↓
Publica a aplicação
        ↓
Domínio direciona usuários ao deploy
```

Banco e autenticação ficam no Supabase; a aplicação fica na Vercel. URLs de callback precisam estar autorizadas no Supabase.

## 5. Monitoramento e evolução

Depois do deploy, o trabalho continua:

- observar erros;
- receber feedback;
- corrigir bugs;
- melhorar desempenho e acessibilidade;
- criar testes automatizados;
- revisar estratégias de sincronização;
- manter dependências atualizadas com cuidado.

## 6. Como explicar o projeto em 60 segundos

> “O Foco Semanal é uma aplicação web de produtividade para organizar estudos. Ela foi construída com Next.js, React e TypeScript, com interface responsiva e componentizada. O estado compartilhado fica em providers, enquanto tipos, persistência e integrações são separados em `lib`. O sistema funciona com dados locais e sincronização no Supabase, que também fornece autenticação e PostgreSQL. Há controle de acesso por convite, policies de RLS e uma API de servidor para operações administrativas. A aplicação também é instalável como PWA e está preparada para deploy na Vercel.”

## 7. Como apresentar uma funcionalidade

Use esta ordem:

1. **Problema:** o que o usuário precisa?
2. **Entrada:** qual ação ele realiza?
3. **Interface:** qual componente recebe a ação?
4. **Estado/regra:** o que muda no código?
5. **Persistência:** onde o dado é salvo?
6. **Resultado:** qual feedback aparece?

Exemplo — alterar uma matéria:

```text
O usuário edita uma matéria
→ o formulário captura os valores
→ uma função do AppProvider atualiza o estado
→ a interface renderiza os novos dados
→ o estado é persistido localmente ou sincronizado
→ outras telas recebem a atualização compartilhada
```

## 8. Perguntas comuns de entrevista

### “Por que TypeScript?”

Porque tipos documentam os dados e detectam incompatibilidades antes da execução.

### “Por que React?”

Porque facilita criar interfaces declarativas e reutilizáveis por componentes.

### “Por que Next.js?”

Porque organiza rotas, layouts, renderização e código de servidor no mesmo projeto.

### “Como o estado é organizado?”

Estado específico fica no componente; dados compartilhados ficam em Context providers.

### “Como os dados são persistidos?”

Preferências e relógios podem ficar no navegador; dados principais sincronizam com PostgreSQL pelo Supabase.

### “Como a aplicação é protegida?”

Há autenticação Supabase, autorização por lista e papel, validação de servidor, segredos apenas no backend e RLS no banco.

### “O que você melhoraria?”

Uma resposta honesta e técnica:

> “Eu adicionaria testes automatizados para fluxos críticos, dividiria providers grandes em domínios menores conforme o sistema crescesse e avaliaria uma sincronização incremental para reduzir substituições completas de coleções.”

## 9. Projeto final do curso

Faça uma apresentação de 5 a 8 minutos seguindo este roteiro:

1. problema e público;
2. funcionalidades;
3. stack e motivo das escolhas;
4. arquitetura de pastas;
5. fluxo de uma página;
6. estado e componentes;
7. persistência e banco;
8. autenticação e segurança;
9. deploy;
10. melhorias futuras.

Não leia o código linha por linha. Mostre poucos arquivos e explique a responsabilidade de cada um.

## Prática guiada

Grave uma primeira apresentação de 60 segundos usando o roteiro acima. Depois escute e verifique:

1. você começou pelo problema ou pelas tecnologias?
2. explicou pelo menos um fluxo completo?
3. diferenciou frontend, servidor e banco?
4. citou uma decisão de segurança?
5. terminou com uma melhoria futura?

## Perguntas de revisão

1. O que transforma o site em PWA?
2. Qual a diferença entre lint, verificação de tipos e build?
3. O que é deploy?
4. Como explicar uma funcionalidade sem narrar cada linha?
5. Qual melhoria técnica você priorizaria e por quê?

---

# Visão completa do fluxo do sistema

Use este mapa como revisão, não como conteúdo para decorar:

```text
1. Usuário acessa a aplicação
   ↓
2. Next.js resolve a rota e os layouts
   ↓
3. AppProvider verifica ambiente e sessão
   ↓
4. Sem usuário: AppShell apresenta LoginScreen
   ↓
5. Com usuário: AppProvider carrega dados locais/nuvem
   ↓
6. A página recebe dados por useApp()
   ↓
7. Componentes transformam os dados em interface
   ↓
8. Eventos do usuário chamam funções
   ↓
9. Funções atualizam o estado React
   ↓
10. React renderiza a mudança
   ↓
11. Dados são persistidos localmente ou no Supabase
   ↓
12. Vercel entrega o frontend; Supabase mantém auth e banco
```

---

# Mapa de estudo dos arquivos

## Comece por estes

1. `README.md` — visão do produto.
2. `package.json` — ferramentas e comandos.
3. `src/lib/types.ts` — formato dos dados.
4. `src/app/page.tsx` — primeira rota.
5. `src/app/layout.tsx` — estrutura global.
6. `src/app/(app)/layout.tsx` — estrutura das telas privadas.
7. `src/app/(app)/hoje/page.tsx` — página real.
8. `src/components/AppShell.tsx` — navegação e composição.
9. `src/components/AppProvider.tsx` — estado compartilhado.
10. `src/lib/demo-store.ts` — persistência local.
11. `src/lib/supabase/sync.ts` — persistência remota.
12. `supabase/schema.sql` — banco e segurança.

## Leia depois

- `TimerRuntimeProvider.tsx` — lógica de tempo mais detalhada;
- `focus-log.ts` e `focus-sync.ts` — histórico de foco;
- `AccessManagement.tsx` — administração de acesso;
- `public/sw.js` — cache da PWA;
- páginas de estatísticas e ajustes — composição de funcionalidades maiores.

---

# Glossário essencial

- **API:** contrato para comunicação entre sistemas ou camadas.
- **Array:** lista de valores.
- **Assíncrono:** trabalho cujo resultado chega depois, como uma chamada de rede.
- **Autenticação:** confirmação da identidade.
- **Autorização:** verificação de permissão.
- **Backend:** código e serviços do lado do servidor.
- **Banco relacional:** banco organizado em tabelas relacionadas.
- **Build:** preparação otimizada da aplicação para produção.
- **Cliente:** programa que solicita um serviço, geralmente o navegador.
- **Componente:** parte reutilizável da interface React.
- **Context:** recurso React para compartilhar dados em uma árvore.
- **CRUD:** criar, ler, atualizar e excluir dados.
- **Deploy:** publicação de uma versão da aplicação.
- **Domínio:** área real do problema representada pelo software.
- **Estado:** informação mutável usada pela interface.
- **Frontend:** parte da aplicação usada diretamente no navegador.
- **Framework:** estrutura com convenções para construir aplicações.
- **Hook:** função React que oferece estado, efeitos ou outros recursos.
- **HTTP:** protocolo de comunicação da web.
- **Interface TypeScript:** contrato que descreve o formato de um objeto.
- **JSON:** formato textual para troca e armazenamento de dados.
- **JSX:** sintaxe usada para descrever interface em React.
- **Layout:** estrutura compartilhada entre páginas.
- **Módulo:** arquivo que importa e exporta código.
- **MVP:** menor versão do produto que entrega valor.
- **PWA:** aplicação web com recursos de instalação e funcionamento aprimorado.
- **Props:** valores recebidos por um componente.
- **Rota:** endereço e comportamento associado a uma URL.
- **RLS:** regras de segurança aplicadas às linhas do banco.
- **Servidor:** sistema que recebe requisições e fornece respostas.
- **Sessão:** estado que representa um usuário autenticado.
- **SQL:** linguagem para bancos relacionais.
- **Stack:** conjunto de tecnologias de um sistema.
- **TypeScript:** JavaScript com sistema de tipos.

---

# Checklist de conclusão

Ao terminar, confirme se você consegue explicar sem consultar:

- [ ] o problema resolvido pelo Foco Semanal;
- [ ] frontend, backend e banco;
- [ ] o papel de React, Next.js e TypeScript;
- [ ] a função de `src/app`, `components` e `lib`;
- [ ] variável, função, objeto, array e tipo;
- [ ] componente, props, state, evento e efeito;
- [ ] rota, página, layout e route handler;
- [ ] persistência local e remota;
- [ ] tabela, chave, CRUD e sincronização;
- [ ] autenticação, autorização e RLS;
- [ ] PWA, build e deploy;
- [ ] o fluxo completo de uma funcionalidade;
- [ ] duas melhorias futuras para o projeto.

Se algum item ainda estiver confuso, volte apenas ao módulo correspondente. O objetivo não é memorizar o projeto inteiro, mas conseguir seguir e explicar seu fluxo com segurança.

