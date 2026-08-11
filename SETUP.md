# Foco Semanal — Setup (Supabase + Vercel)

App **local primeiro**; nuvem opcional por **magic link** (e-mail de confirmação).

---

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **Project Settings → API** — copie:
   - Project URL  
   - Publishable / anon key
3. **SQL Editor** — rode [`supabase/schema.sql`](supabase/schema.sql).
4. **Authentication → Providers → Email** — habilitado.  
   Em Email, deixe **Magic link** / OTP disponível (padrão).
5. **Authentication → URL Configuration**:
   - Site URL: `https://SEU-APP.vercel.app`
   - Redirect URLs:  
     `http://localhost:3000/auth/callback`  
     `https://SEU-APP.vercel.app/auth/callback`

### E-mails chegando?

No plano free o remetente padrão do Supabase é limitado. Se o link não chegar:

- Confira spam, ou  
- Configure **SMTP custom** (Resend, etc.) em Authentication → SMTP / Emails.

Sem SMTP confiável, use **Exportar/Importar** nas Configurações como backup.

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

1. Abre o app → entra direto (dados neste aparelho).
2. Opcional: **Configurações → Nuvem** → e-mail → abre o link do e-mail.
3. Depois disso, alterações sincronizam na nuvem.
4. Sempre disponível: **Exportar / Importar** backup JSON.

---

## 4. Deploy

GitHub → Vercel → mesmas env vars → redirects no Supabase com a URL da Vercel.
