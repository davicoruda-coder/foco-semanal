# Foco — Setup (Supabase + Vercel)

App com **login obrigatório** por **magic link** (e-mail). Dados principais ficam na **nuvem** (Supabase).

---

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **Project Settings → API** — copie:
   - Project URL  
   - Publishable / anon key
3. **SQL Editor** — rode [`supabase/schema.sql`](supabase/schema.sql).  
   Se já tinha o schema antigo, rode também [`supabase/migrate-theme-auto.sql`](supabase/migrate-theme-auto.sql) (tema Automático).
4. **Authentication → Providers → Email** — habilitado (Magic link / OTP).
5. **Authentication → URL Configuration**:
   - Site URL: `https://foco.davicosystems.ia.br` (ou sua URL da Vercel)
   - Redirect URLs:  
     `http://localhost:3000/auth/callback`  
     `https://SEU-APP.vercel.app/auth/callback`  
     `https://foco.davicosystems.ia.br/auth/callback`  
     (opcional) `https://foco.davicosystems.ia.br/**`

### E-mails chegando?

No plano free o remetente padrão do Supabase é limitado. Se o link não chegar:

- Confira spam, ou  
- Configure **SMTP custom** (Resend, etc.) em Authentication → SMTP / Emails.

Sempre disponível: **Exportar / Importar** em Ajustes (backup JSON).

---

## 2. Variáveis

`.env.local` e Vercel:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_...   # ou eyJ...
```

Cole **sem Enter no final**. Na Vercel, faça **Redeploy** depois de alterar.

---

## 3. Como a pessoa usa

1. Abre o app → informa o e-mail → abre o link de confirmação.
2. Entra no app; alterações salvam na nuvem automaticamente.
3. Em **Ajustes**: tema, notificações, backup JSON, sair da conta, apagar dados na nuvem.

---

## 4. Deploy

GitHub → Vercel → mesmas env vars → redirects no Supabase com a URL de produção (e do domínio customizado, se houver).
