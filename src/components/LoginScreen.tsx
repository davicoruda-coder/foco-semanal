"use client";

import { useState } from "react";
import { Target } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { markMigrateLocalOnNextCloudLogin } from "@/lib/demo-store";

/** Tela de entrada — só nuvem via magic link. */
export function LoginScreen() {
  const { supabaseReady } = useApp();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseReady) {
      setErr("Supabase não configurado neste deploy.");
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      setErr("Informe um e-mail.");
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      markMigrateLocalOnNextCloudLogin();
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: trimmed,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/hoje`,
          shouldCreateUser: true,
        },
      });
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
      setMsg(
        "Enviamos um link de confirmação. Abra o e-mail neste aparelho para entrar.",
      );
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
            <p className="text-xs opacity-55">Entre com seu e-mail para continuar</p>
          </div>
        </div>

        <form className="mt-6 space-y-3" onSubmit={(e) => void sendMagicLink(e)}>
          <p className="text-sm opacity-65">
            Enviamos um link de confirmação — só quem abre o e-mail acessa a
            conta. Seus dados ficam na nuvem.
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
          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={!supabaseReady || busy}
          >
            {busy ? "Enviando…" : "Enviar link de confirmação"}
          </button>
          {!supabaseReady && (
            <p className="text-sm text-[var(--warn)]">
              Supabase não configurado neste ambiente.
            </p>
          )}
          {err && <p className="text-sm text-[var(--warn)]">{err}</p>}
          {msg && <p className="text-sm opacity-70">{msg}</p>}
        </form>
      </div>
    </div>
  );
}
