# Foco — Setup (Supabase + Vercel)

App com **login obrigatório** por **magic link** (e-mail). Dados principais ficam na **nuvem** (Supabase).

---

## 1. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. **Project Settings → API** — copie:
   - Project URL  
   - Publishable / anon key
3. **SQL Editor** — rode [`supabase/schema.sql`](supabase/schema.sql).  
   Se o projeto já existia, rode também:
   - [`supabase/migrate-theme-auto.sql`](supabase/migrate-theme-auto.sql)
   - [`supabase/migrate-focus-days.sql`](supabase/migrate-focus-days.sql)
   - [`supabase/migrate-access-control.sql`](supabase/migrate-access-control.sql)
   - [`supabase/migrate-focus-days-allowlist.sql`](supabase/migrate-focus-days-allowlist.sql)
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
# Settings → API Keys → service_role (somente servidor; nunca NEXT_PUBLIC_)
SUPABASE_SERVICE_ROLE_KEY=...
```

Cole **sem Enter no final**. Na Vercel, faça **Redeploy** depois de alterar.
A `SUPABASE_SERVICE_ROLE_KEY` é usada somente pela rota protegida que cria
acesso com senha temporária. Não coloque essa chave em código, GitHub ou variável `NEXT_PUBLIC_`.

---

## 3. Como a pessoa usa

1. O proprietário libera o e-mail em **Ajustes → Acessos** com uma senha temporária.
2. A pessoa entra com e-mail + essa senha; a sessão fica salva no aparelho.
3. Em **Ajustes → Conta**, pode definir/alterar a senha.
4. “Esqueci minha senha” na tela de login envia um link seguro para outra senha.
5. Quem quiser conhecer o app pode solicitar demonstração pelo WhatsApp na tela de login.
6. Alterações salvam na nuvem automaticamente.

---

## 4. Deploy

GitHub → Vercel → mesmas env vars → redirects no Supabase com a URL de produção (e do domínio customizado, se houver).
