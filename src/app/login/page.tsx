"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import { useApp } from "@/components/AppProvider";

type Mode = "signin" | "signup" | "forgot";

function authErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    const msg = String((err as { message: unknown }).message);
    if (msg) return msg;
  }
  if (typeof err === "string" && err) return err;
  return "Falha ao autenticar. Tente de novo.";
}

export default function LoginPage() {
  const { user, ready, cloud, supabaseReady, loginDemo } = useApp();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (ready && user && cloud) router.replace("/hoje");
  }, [ready, user, cloud, router]);

  async function submitEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseReady) {
      setErr(
        "Supabase não configurado neste deploy. Verifique as variáveis NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();

      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/auth/callback?next=/redefinir-senha`,
        });
        if (error) setErr(error.message);
        else setMsg("Se o e-mail existir, enviamos um link para redefinir a senha.");
        setBusy(false);
        return;
      }

      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          setErr(error.message);
          setBusy(false);
          return;
        }
        if (data.session) {
          window.location.assign("/hoje");
          return;
        }
        setMsg("Conta criada. Confira seu e-mail para confirmar e depois entre.");
        setMode("signin");
        setBusy(false);
        return;
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
      window.location.assign("/hoje");
    } catch (e) {
      setBusy(false);
      setErr(authErrorMessage(e));
    }
  }

  function enterGuest() {
    loginDemo();
    router.push("/hoje");
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center text-[color-mix(in_srgb,var(--ink)_55%,transparent)]">
        Carregando…
      </div>
    );
  }

  return (
    <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
      <div className="surface w-full max-w-md p-8 md:p-10">
        <div
          className="mb-5 grid h-12 w-12 place-items-center rounded-2xl text-white"
          style={{
            background: "linear-gradient(135deg, var(--signal), var(--accent-2))",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <Target size={24} strokeWidth={2.25} />
        </div>
        <p className="font-display text-4xl font-semibold tracking-tight">Foco Semanal</p>
        <p className="mt-2 text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
          Crie uma conta para salvar seus dados na nuvem.
        </p>

        <form className="mt-8 space-y-3" onSubmit={(e) => void submitEmail(e)}>
          <input
            className="input w-full"
            type="email"
            autoComplete="email"
            required
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {mode !== "forgot" && (
            <input
              className="input w-full"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              required
              minLength={6}
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          )}
          <button type="submit" className="btn btn-primary w-full" disabled={busy || !supabaseReady}>
            {busy
              ? "Aguarde…"
              : mode === "signup"
                ? "Criar conta"
                : mode === "forgot"
                  ? "Enviar link"
                  : "Entrar"}
          </button>
        </form>

        {!supabaseReady && (
          <p className="mt-3 text-sm text-[var(--warn)]">
            Supabase não configurado neste ambiente.
          </p>
        )}

        <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-sm">
          {mode !== "signin" && (
            <button
              type="button"
              className="text-[var(--signal)]"
              onClick={() => {
                setMode("signin");
                setErr(null);
                setMsg(null);
              }}
            >
              Já tenho conta
            </button>
          )}
          {mode !== "signup" && (
            <button
              type="button"
              className="text-[var(--signal)]"
              onClick={() => {
                setMode("signup");
                setErr(null);
                setMsg(null);
              }}
            >
              Criar conta
            </button>
          )}
          {mode !== "forgot" && (
            <button
              type="button"
              className="opacity-70"
              onClick={() => {
                setMode("forgot");
                setErr(null);
                setMsg(null);
              }}
            >
              Esqueci a senha
            </button>
          )}
        </div>

        {err && <p className="mt-3 text-sm text-[var(--warn)]">{err}</p>}
        {msg && <p className="mt-3 text-sm opacity-70">{msg}</p>}

        <button
          type="button"
          className="mt-8 w-full text-center text-sm opacity-50 transition hover:opacity-80"
          onClick={enterGuest}
        >
          Continuar sem conta (só neste aparelho)
        </button>
      </div>
    </div>
  );
}
