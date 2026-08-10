# Foco Semanal — Setup (Supabase + Vercel)

Guia para a **versão final**: login Google, dados na nuvem e deploy.

---

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **Project Settings → API** — copie:
   - Project URL  
   - `anon` `public` key
3. **SQL Editor** — cole e rode todo o arquivo [`supabase/schema.sql`](supabase/schema.sql).
4. **Authentication → Providers → Google** — ative (Client ID/Secret do passo 2).
5. **Authentication → URL Configuration**:
   - Site URL: `http://localhost:3000` (depois a URL da Vercel)
   - Redirect URLs:  
     `http://localhost:3000/auth/callback`  
     `https://SEU-APP.vercel.app/auth/callback`

---

## 2. Google Cloud (OAuth)

1. [Google Cloud Console](https://console.cloud.google.com/) → projeto (ex.: `foco-semanal`).
2. Ative **Google Drive API**.
3. **Tela de consentimento OAuth** (Externo):
   - Escopos: `email`, `profile`, `openid`  
     e `https://www.googleapis.com/auth/drive.readonly`
   - Em Teste, adicione e-mails de teste.
4. **Credenciais → ID do cliente OAuth** (Aplicativo da Web):
   - Redirect: `https://SEU-PROJECT.supabase.co/auth/v1/callback`
5. Cole Client ID e Secret no Supabase → Google provider.

---

## 3. Variáveis locais

Crie `.env.local` na raiz:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

```bash
npm install
npm run dev
```

Abra `http://localhost:3000` → **Entrar com Google**.

Sem `.env.local`, o app continua em **modo demo**.

---

## 4. GitHub + Vercel

1. Crie um repositório no GitHub e faça push deste projeto.
2. [vercel.com](https://vercel.com) → Import do repo.
3. **Environment Variables** — mesmas do `.env.local`.
4. Deploy.
5. Atualize redirects no Supabase (e Google, se preciso) com  
   `https://seu-app.vercel.app` e `/auth/callback`.

---

## 5. O que cada pessoa faz

1. Abre o link.
2. **Entrar com Google** → Permitir.
3. Usa o app (dados sincronizam na conta).
4. Música: pasta local no PC, ou Drive quando conectar em **Música**.

---

## Demo vs nuvem

| | Demo | Google + Supabase |
|--|------|-------------------|
| Dados | `localStorage` | banco Supabase |
| Login | Continuar em modo demo | Entrar com Google |
| Backup JSON | útil | opcional (já tem nuvem) |

---

## Planos free

Free do Supabase/Vercel costuma bastar no início.  
Clientes **não** precisam de conta Vercel/Supabase.
