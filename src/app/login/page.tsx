"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import { useApp } from "@/components/AppProvider";

export default function LoginPage() {
  const { user, ready, loginDemo, supabaseReady } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (ready && user) router.replace("/hoje");
  }, [ready, user, router]);

  async function loginGoogle() {
    if (!supabaseReady) {
      alert(
        "Supabase ainda não está configurado. Use o modo demo por enquanto, ou siga o SETUP.md.",
      );
      return;
    }
    const { createClient } = await import("@/lib/supabase/client");
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "https://www.googleapis.com/auth/drive.readonly",
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
  }

  function enterDemo() {
    loginDemo();
    router.push("/hoje");
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
          Uma semana, um ritmo.
        </p>

        <div className="mt-8 space-y-3">
          <button type="button" className="btn btn-primary w-full" onClick={loginGoogle}>
            Entrar com Google
          </button>
        </div>

        <div className="my-8 flex items-center gap-3 text-xs uppercase tracking-wider text-[color-mix(in_srgb,var(--ink)_40%,transparent)]">
          <span className="h-px flex-1 bg-[var(--line)]" />
          ou
          <span className="h-px flex-1 bg-[var(--line)]" />
        </div>

        <button type="button" className="btn w-full" onClick={enterDemo}>
          Continuar em modo demo
        </button>
      </div>
    </div>
  );
}
