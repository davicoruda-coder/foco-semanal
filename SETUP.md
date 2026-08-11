# Foco Semanal — Setup (Supabase + Vercel)

Guia para a **versão final**: login por e-mail (Supabase), dados na nuvem e deploy.

---

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **Project Settings → API** — copie:
   - Project URL  
   - `anon` / publishable key
3. **SQL Editor** — cole e rode todo o arquivo [`supabase/schema.sql`](supabase/schema.sql).
4. **Authentication → Providers → Email** — habilitado (criar conta / esqueci a senha).  
   Pode desligar Google se estiver ativo.
5. **Authentication → URL Configuration**:
   - Site URL: `https://SEU-APP.vercel.app` (local: `http://localhost:3000`)
   - Redirect URLs:  
     `http://localhost:3000/auth/callback`  
     `https://SEU-APP.vercel.app/auth/callback`

Se o projeto já tinha tabelas de música, pode limpar (opcional):

```sql
drop table if exists public.music_day_map;
drop table if exists public.music_settings;
```

E rode de novo o `handle_new_user` do `schema.sql` (a função atualizada).

---

## 2. Variáveis locais

Crie `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...   # ou sb_publishable_...
```

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` → **Criar conta** ou **Entrar** com e-mail.

Sem `.env.local`, use **Continuar sem conta** (só neste aparelho).

---

## 3. GitHub + Vercel

1. Crie um repositório no GitHub e faça push deste projeto.
2. [vercel.com](https://vercel.com) → Import do repo.
3. **Environment Variables** — mesmas do `.env.local`.
4. Deploy.
5. Atualize redirects no Supabase com a URL da Vercel.

---

## 4. O que cada pessoa faz

1. Abre o link.
2. Cria conta ou entra com e-mail e senha.
3. Usa o app (dados sincronizam na conta).

---

## Local vs nuvem

| | Sem conta | E-mail + Supabase |
|--|------|-------------------|
| Dados | `localStorage` | banco Supabase |
| Login | Continuar sem conta | Criar conta / Entrar |
| Backup JSON | útil | opcional (já tem nuvem) |

---

## Planos free

Free do Supabase/Vercel costuma bastar no início.  
Clientes **não** precisam de conta Vercel/Supabase.
