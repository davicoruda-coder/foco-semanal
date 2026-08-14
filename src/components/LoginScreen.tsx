"use client";

import { useState } from "react";
import { Eye, EyeOff, Target } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { checkEmailAccess } from "@/lib/supabase/access";

type Mode = "login" | "create" | "request";

export function LoginScreen() {
  const { supabaseReady } = useApp();
  const [mode, setMode] = useState<Mode>("login");
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

  function changeMode(next: Mode) {
    setMode(next);
    setPassword("");
    resetFeedback();
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
    if (mode !== "request" && password.length < 6) {
      setErr("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    setBusy(true);
    resetFeedback();
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      if (mode === "request") {
        const { error } = await supabase.rpc("request_demo_access", {
          p_email: trimmed,
        });
        if (error) throw error;
        setMsg(
          "Solicitação enviada. Quando o acesso for liberado, você receberá um e-mail.",
        );
        setBusy(false);
        return;
      }

      const access = await checkEmailAccess(supabase, trimmed);
      if (!access.configured) {
        setErr("O controle de acesso ainda não foi configurado.");
        setBusy(false);
        return;
      }
      if (!access.allowed) {
        setErr("Este e-mail ainda não tem acesso ao Foco.");
        setBusy(false);
        return;
      }

      if (mode === "create") {
        const { data, error } = await supabase.auth.signUp({
          email: trimmed,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/hoje`,
          },
        });
        if (error) throw error;
        setMsg(
          data.session
            ? "Acesso criado. Entrando…"
            : "Confira seu e-mail para confirmar o cadastro.",
        );
        setBusy(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmed,
        password,
      });
      if (error) {
        const invalid = error.message.toLowerCase().includes("invalid login");
        throw new Error(
          invalid ? "E-mail ou senha incorretos." : error.message,
        );
      }
      setBusy(false);
    } catch (error) {
      setBusy(false);
      setErr(
        error && typeof error === "object" && "message" in error
          ? String((error as { message: unknown }).message)
          : "Não foi possível enviar o link.",
      );
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
      const access = await checkEmailAccess(supabase, trimmed);
      if (!access.allowed) {
        setErr("Este e-mail não tem acesso ao Foco.");
        setBusy(false);
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
        redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
      });
      if (error) throw error;
      setMsg("Enviamos um link para você criar uma nova senha.");
    } catch {
      setErr("Não foi possível enviar o link de recuperação.");
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
            <p className="text-xs opacity-55">
              {mode === "login"
                ? "Entre para continuar"
                : mode === "create"
                  ? "Crie sua senha de acesso"
                  : "Solicite uma demonstração"}
            </p>
          </div>
        </div>

        <form className="mt-6 space-y-3" onSubmit={(e) => void submit(e)}>
          <p className="text-sm opacity-65">
            {mode === "login"
              ? "Seu acesso fica salvo neste aparelho. Em um aparelho novo, use o mesmo e-mail e senha."
              : mode === "create"
                ? "Disponível somente para e-mails previamente autorizados."
                : "Quer conhecer o Foco Semanal? Informe seu e-mail para pedir acesso."}
          </p>
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
          {mode !== "request" && (
            <div className="relative">
              <input
                className="input w-full pr-11"
                type={showPassword ? "text" : "password"}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                required
                minLength={6}
                placeholder={mode === "login" ? "Senha" : "Crie uma senha"}
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
          )}
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={!supabaseReady || busy}
          >
            {busy
              ? "Aguarde…"
              : mode === "login"
                ? "Entrar"
                : mode === "create"
                  ? "Criar acesso"
                  : "Solicitar acesso"}
          </button>
          {mode === "login" && (
            <button
              type="button"
              className="w-full py-1 text-sm text-[var(--signal)]"
              disabled={busy}
              onClick={() => void forgotPassword()}
            >
              Esqueci minha senha
            </button>
          )}
          {!supabaseReady && (
            <p className="text-sm text-[var(--warn)]">
              Supabase não configurado neste ambiente.
            </p>
          )}
          {err && <p className="text-sm text-[var(--warn)]">{err}</p>}
          {msg && <p className="text-sm opacity-70">{msg}</p>}
        </form>

        <div className="mt-5 border-t border-[var(--line)] pt-4 text-center text-sm">
          {mode === "login" ? (
            <div className="space-y-2">
              <button
                type="button"
                className="text-[var(--signal)]"
                onClick={() => changeMode("create")}
              >
                Primeiro acesso? Crie sua senha
              </button>
              <p>
                <button
                  type="button"
                  className="text-[color-mix(in_srgb,var(--ink)_60%,transparent)]"
                  onClick={() => changeMode("request")}
                >
                  Quer conhecer o Foco? Solicite uma demonstração
                </button>
              </p>
            </div>
          ) : (
            <button
              type="button"
              className="text-[var(--signal)]"
              onClick={() => changeMode("login")}
            >
              Voltar para o login
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
