"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";

export default function RedefinirSenhaPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      setErr("A senha precisa ter pelo menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setErr("As senhas não coincidem.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setErr(error.message);
        setBusy(false);
        return;
      }
      setOk(true);
      setBusy(false);
      window.setTimeout(() => router.replace("/hoje"), 1200);
    } catch {
      setBusy(false);
      setErr("Não foi possível atualizar a senha.");
    }
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
        <p className="font-display text-3xl font-semibold tracking-tight">Nova senha</p>
        <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--ink)_60%,transparent)]">
          Defina uma nova senha para a sua conta.
        </p>

        <form className="mt-8 space-y-3" onSubmit={(e) => void onSubmit(e)}>
          <input
            className="input w-full"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Nova senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            className="input w-full"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            placeholder="Confirmar senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <button type="submit" className="btn btn-primary w-full" disabled={busy}>
            {busy ? "Salvando…" : "Salvar senha"}
          </button>
        </form>
        {err && <p className="mt-3 text-sm text-[var(--warn)]">{err}</p>}
        {ok && <p className="mt-3 text-sm opacity-70">Senha atualizada. Entrando…</p>}
      </div>
    </div>
  );
}
