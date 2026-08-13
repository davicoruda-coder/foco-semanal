# Foco

App de organização de estudos: grade da semana, ciclo de matérias, timers, lembretes e estatísticas de foco.

**Demo:** [https://foco.davicosystems.ia.br](https://foco.davicosystems.ia.br)  
**Stack:** Next.js · React · TypeScript · Tailwind CSS · Supabase · Vercel

---

## Prévia

### Ajustes

Tema (claro / escuro / automático), notificações, backup JSON e conta na nuvem.

![Ajustes](docs/screenshots/01-ajustes.png)

### Tema escuro

Tela principal (Hoje), estatísticas e ciclo de matérias.

![Hoje no tema escuro](docs/screenshots/02-hoje-escuro.png)

![Estatísticas no tema escuro](docs/screenshots/03-estatisticas-escuro.png)

![Matérias no tema escuro](docs/screenshots/04-materias-escuro.png)

---

## O que o sistema faz

| Área | Função |
|------|--------|
| **Hoje** | Visão do dia + semana, ciclo de matérias, lembretes e timers na lateral |
| **Semana** | Grade editável de blocos por dia |
| **Matérias** | Ciclo de estudos com status Ok / Próximo e observações |
| **Estatísticas** | Gráficos de tempo de foco (Sessão + cronômetro em play) |
| **Temporizadores** | Vários timers, cronômetro, volume e 3 toques de alarme |
| **Ajustes** | Tema, notificações do navegador, backup e conta |

**Autenticação:** login por e-mail (magic link). Após confirmar, os dados principais ficam na **nuvem** (Supabase).  
**Backup:** exportar/importar JSON em Ajustes (plano B manual).  
**Nuvem também:** histórico de foco / Estatísticas / Foco hoje (sincroniza ao pausar ou ao abrir Estatísticas).  
**Local no aparelho:** timers/cronômetro em andamento (sobrevivem ao F5), tema e preferências de alarme.

---

## Tecnologias

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Tailwind CSS 4**
- **Supabase** (Auth magic link + Postgres)
- Deploy na **Vercel** com domínio próprio

---

## Como rodar localmente

```bash
npm install
cp .env.example .env.local   # preencha URL e anon key do Supabase
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

Setup completo (Supabase + Vercel + redirects): veja **[SETUP.md](SETUP.md)**.

---

## Estrutura (visão rápida)

```
src/app/(app)/     # páginas do app (hoje, semana, matérias, estatísticas, ajustes…)
src/components/    # UI e providers (timers, shell, login…)
src/lib/           # domínio: sync, áudio, focus-log, tipos
supabase/          # schema SQL
docs/screenshots/  # prévias do README
```

---

## Licença

Projeto pessoal / portfólio.
