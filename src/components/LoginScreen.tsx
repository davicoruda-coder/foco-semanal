"use client";

import { useState } from "react";
import { Eye, EyeOff, Target } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { checkCurrentUserAccess } from "@/lib/supabase/access";

const WHATSAPP_DEMO_URL =
  "https://wa.me/5571996952190?text=" +
  encodeURIComponent("Olá! Quero conhecer o Foco.");

const GENERIC_AUTH_ERROR = "E-mail ou senha incorretos.";
const GENERIC_RESET_MSG =
  "Se este e-mail tiver acesso, enviamos um link para redefinir a senha.";

export function LoginScreen() {
  const { supabaseReady } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  function resetFeedback() {
    setErr(null);
    setMsg(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseReady) {
      setErr("Supabase não configurado neste deploy.");
      return;
    }
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErr("Informe um e-mail.");
      return;
    }
    if (password.length < 6) {
      setErr("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setBusy(true);
    resetFeedback();
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (error) {
        setErr(GENERIC_AUTH_ERROR);
        setBusy(false);
        return;
      }

      // Após autenticar: allowlist via RPC autenticada (não expõe lista a anon).
      const access = await checkCurrentUserAccess(supabase);
      if (!access.configured) {
        await supabase.auth.signOut();
        setErr("O controle de acesso ainda não foi configurado.");
        setBusy(false);
        return;
      }
      if (!access.allowed) {
        await supabase.auth.signOut();
        setErr(GENERIC_AUTH_ERROR);
        setBusy(false);
        return;
      }
      setBusy(false);
    } catch {
      setBusy(false);
      setErr(GENERIC_AUTH_ERROR);
    }
  }

  async function forgotPassword() {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setErr("Informe seu e-mail primeiro.");
      return;
    }
    setBusy(true);
    resetFeedback();
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      // Sempre a mesma resposta — não revela se o e-mail está na allowlist.
      await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      });
      setMsg(GENERIC_RESET_MSG);
    } catch {
      setMsg(GENERIC_RESET_MSG);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="relative z-0 flex min-h-screen items-center justify-center px-4">
      <div className="surface w-full max-w-md p-6 md:p-8">
        <div className="flex items-center gap-3">
          <div
            className="grid h-11 w-11 place-items-center rounded-xl text-white"
            style={{
              background:
                "linear-gradient(135deg, var(--signal), var(--accent-2))",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <Target size={20} strokeWidth={2.25} />
          </div>
          <div>
            <h1 className="font-display text-2xl font-semibold tracking-tight">
              Foco
            </h1>
            <p className="text-xs opacity-55">Entre para continuar</p>
          </div>
        </div>

        <form className="mt-6 space-y-3" onSubmit={(e) => void submit(e)}>
          <input
            className="input w-full"
            type="email"
            autoComplete="email"
            required
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={!supabaseReady || busy}
          />
          <div className="relative">
            <input
              className="input w-full pr-11"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              minLength={6}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={!supabaseReady || busy}
            />
            <button
              type="button"
              title={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              className="absolute inset-y-0 right-1 grid w-10 place-items-center opacity-50 transition hover:opacity-100"
              onClick={() => setShowPassword((value) => !value)}
            >
              {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={!supabaseReady || busy}
          >
            {busy ? "Aguarde…" : "Entrar"}
          </button>
          <button
            type="button"
            className="w-full py-1 text-sm text-[var(--signal)]"
            disabled={busy}
            onClick={() => void forgotPassword()}
          >
            Esqueci minha senha
          </button>
          {!supabaseReady && (
            <p className="text-sm text-[var(--warn)]">
              Supabase não configurado neste ambiente.
            </p>
          )}
          {err && <p className="text-sm text-[var(--warn)]">{err}</p>}
          {msg && <p className="text-sm opacity-70">{msg}</p>}
        </form>

        <div className="mt-5 border-t border-[var(--line)] pt-4 text-center text-sm">
          <a
            href={WHATSAPP_DEMO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[color-mix(in_srgb,var(--ink)_60%,transparent)] transition hover:text-[var(--signal)]"
          >
            Quer conhecer o Foco? Solicite uma demonstração
          </a>
        </div>
      </div>
    </div>
  );
}
