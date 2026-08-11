"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Download, Moon, Sun, SunMoon, Upload } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ensureNotificationPermission } from "@/lib/audio";
import { markMigrateLocalOnNextCloudLogin } from "@/lib/demo-store";
import type { ThemePref } from "@/lib/types";

const OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "auto", label: "Automático", icon: SunMoon },
];

export default function ConfiguracoesPage() {
  const {
    themePref,
    setTheme,
    user,
    cloud,
    supabaseReady,
    exportBackup,
    importBackup,
    resetDemoData,
    resetCloudData,
    logout,
  } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [cloudBusy, setCloudBusy] = useState(false);
  const [cloudMsg, setCloudMsg] = useState<string | null>(null);
  const [cloudErr, setCloudErr] = useState<string | null>(null);
  const [cloudWipeBusy, setCloudWipeBusy] = useState(false);
  const [cloudWipeMsg, setCloudWipeMsg] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setNotifPermission("unsupported");
      return;
    }
    setNotifPermission(Notification.permission);
  }, []);

  function downloadBackup() {
    const blob = new Blob([exportBackup()], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `foco-semanal-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setBackupMsg("Backup baixado.");
  }

  async function onImportFile(file: File) {
    const text = await file.text();
    const result = importBackup(text);
    setBackupMsg(result.ok ? "Backup restaurado." : result.error);
  }

  async function sendMagicLink(e: React.FormEvent) {
    e.preventDefault();
    if (!supabaseReady) {
      setCloudErr("Supabase não configurado neste deploy.");
      return;
    }
    const trimmed = email.trim();
    if (!trimmed) {
      setCloudErr("Informe um e-mail.");
      return;
    }
    setCloudBusy(true);
    setCloudErr(null);
    setCloudMsg(null);
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
        setCloudErr(error.message);
        setCloudBusy(false);
        return;
      }
      setCloudMsg(
        "Enviamos um link de confirmação para o seu e-mail. Abra o link neste aparelho para ativar a nuvem.",
      );
      setCloudBusy(false);
    } catch (err) {
      setCloudBusy(false);
      setCloudErr(
        err && typeof err === "object" && "message" in err
          ? String((err as { message: unknown }).message)
          : "Não foi possível enviar o link.",
      );
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display pb-0.5 text-2xl font-semibold leading-normal tracking-tight md:text-3xl">
        Configurações
      </h1>

      <section className="surface mt-5 p-4 md:p-5">
        <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
          Aparência
        </h2>
        <div className="mt-3 grid gap-2.5 sm:grid-cols-3">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = themePref === value;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setTheme(value)}
                className={`flex items-center gap-3 rounded-[var(--radius)] border px-3.5 py-3 text-left transition ${
                  active
                    ? "border-[var(--signal)] bg-[var(--signal-soft)]"
                    : "border-[var(--line)] bg-[var(--surface)] hover:border-[color-mix(in_srgb,var(--signal)_30%,var(--line))]"
                }`}
              >
                <span
                  className={`grid h-8 w-8 shrink-0 place-items-center rounded-full ${
                    active
                      ? "bg-[var(--signal)] text-white"
                      : "bg-[var(--mist)] text-[var(--ink)]"
                  }`}
                >
                  <Icon size={16} strokeWidth={1.75} />
                </span>
                <span className="text-sm font-medium">{label}</span>
              </button>
            );
          })}
        </div>
        {themePref === "auto" && (
          <p className="mt-2 text-xs opacity-55">
            Automático: claro das 6h às 18h, escuro à noite.
          </p>
        )}
      </section>

      <section className="surface mt-4 p-4 md:p-5">
        <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
          Notificações
        </h2>
        <p className="mt-1 text-xs opacity-55">
          Alarme ao terminar um temporizador e avisos de lembretes com sino.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {notifPermission === "granted" ? (
            <div className="inline-flex items-center gap-2 rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,var(--ok)_35%,var(--line))] bg-[color-mix(in_srgb,var(--ok)_12%,var(--surface))] px-3.5 py-2.5 text-sm font-medium text-[var(--ok)]">
              <Bell size={16} strokeWidth={1.75} />
              Notificações ativas
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              disabled={notifPermission === "unsupported"}
              onClick={async () => {
                const ok = await ensureNotificationPermission();
                if (typeof window !== "undefined" && "Notification" in window) {
                  setNotifPermission(Notification.permission);
                }
                setNotifMsg(
                  ok
                    ? "Notificações permitidas."
                    : "Não foi possível permitir. Confira o cadeado na barra de endereço.",
                );
              }}
            >
              <Bell size={16} strokeWidth={1.75} />
              Permitir notificações do navegador
            </button>
          )}
        </div>
        {notifPermission === "granted" && (
          <p className="mt-2 text-xs opacity-55">
            Para desativar, use o cadeado na barra de endereço do navegador →
            Notificações → Bloquear. O site não consegue revogar sozinho.
          </p>
        )}
        {notifPermission === "denied" && (
          <p className="mt-2 text-xs text-[var(--warn)]">
            Bloqueadas neste site. Libere em Configurações do navegador →
            Notificações.
          </p>
        )}
        {notifPermission === "unsupported" && (
          <p className="mt-2 text-xs opacity-55">
            Este navegador não suporta notificações.
          </p>
        )}
        {notifMsg && <p className="mt-2 text-sm opacity-70">{notifMsg}</p>}
      </section>

      <section className="surface mt-4 p-4 md:p-5">
        <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
          Backup neste aparelho
        </h2>
        <p className="mt-1 text-xs opacity-55">
          Exportar/importar um arquivo JSON — não precisa de e-mail.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button type="button" className="btn btn-primary" onClick={downloadBackup}>
            <Download size={16} strokeWidth={1.75} /> Exportar
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => fileRef.current?.click()}
          >
            <Upload size={16} strokeWidth={1.75} /> Importar
          </button>
          <button
            type="button"
            className="btn text-[var(--warn)]"
            onClick={() => {
              if (cloud) {
                setBackupMsg(
                  "Com a nuvem conectada o reset local fica desligado. Desconecte a nuvem se quiser zerar só este aparelho.",
                );
                return;
              }
              if (confirm("Resetar todos os dados deste navegador?")) {
                resetDemoData();
                setBackupMsg("Dados resetados.");
              }
            }}
          >
            Resetar
          </button>
        </div>
        {cloud && (
          <p className="mt-2 text-xs opacity-55">
            Resetar só funciona no modo local (sem nuvem).
          </p>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void onImportFile(f);
            e.target.value = "";
          }}
        />
        {backupMsg && (
          <p className="mt-3 text-sm opacity-70">{backupMsg}</p>
        )}
      </section>

      <section className="surface mt-4 p-4 md:p-5">
        <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
          Nuvem (opcional)
        </h2>
        <div className="mt-3 flex items-center gap-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-sm font-semibold"
            style={{ background: "var(--signal-soft)", color: "var(--signal)" }}
          >
            {(user?.name || user?.email || "?").trim().charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{user?.name}</p>
            <p className="truncate text-xs opacity-60">
              {cloud ? user?.email : "neste aparelho"}
            </p>
            <p className="mt-0.5 text-xs opacity-50">
              {cloud
                ? "Conectado · alterações salvam na nuvem"
                : "Local · use o link por e-mail para sincronizar"}
            </p>
          </div>
        </div>

        {cloud ? (
          <div className="mt-4 space-y-3">
            <button type="button" className="btn" onClick={() => logout()}>
              Desconectar nuvem
            </button>
            <div className="border-t border-[var(--line)] pt-3">
              <p className="text-xs opacity-55">
                Apaga matérias, semana, lembretes, notas e sessões na nuvem e
                neste aparelho. A conta permanece conectada.
              </p>
              <button
                type="button"
                className="btn mt-2 text-[var(--warn)]"
                disabled={cloudWipeBusy}
                onClick={() => {
                  void (async () => {
                    if (
                      !confirm(
                        "Isso apaga TODOS os dados na nuvem e neste aparelho. Continuar?",
                      )
                    ) {
                      return;
                    }
                    const typed = window.prompt(
                      'Para confirmar, digite APAGAR (em maiúsculas):',
                    );
                    if (typed !== "APAGAR") {
                      setCloudWipeMsg(
                        typed == null
                          ? null
                          : "Cancelado — digite exatamente APAGAR.",
                      );
                      return;
                    }
                    setCloudWipeBusy(true);
                    setCloudWipeMsg(null);
                    const result = await resetCloudData();
                    setCloudWipeBusy(false);
                    setCloudWipeMsg(
                      result.ok
                        ? "Dados na nuvem apagados. Estado inicial restaurado."
                        : result.error,
                    );
                  })();
                }}
              >
                {cloudWipeBusy ? "Apagando…" : "Apagar dados na nuvem"}
              </button>
              {cloudWipeMsg && (
                <p className="mt-2 text-sm opacity-70">{cloudWipeMsg}</p>
              )}
            </div>
          </div>
        ) : (
          <form className="mt-4 space-y-3" onSubmit={(e) => void sendMagicLink(e)}>
            <p className="text-xs opacity-55">
              Digite seu e-mail. Enviamos um link de confirmação — só quem abre o
              e-mail conecta a conta. Depois, as alterações salvam na nuvem
              automaticamente.
            </p>
            <input
              className="input w-full"
              type="email"
              autoComplete="email"
              required
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!supabaseReady || cloudBusy}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={!supabaseReady || cloudBusy}
            >
              {cloudBusy ? "Enviando…" : "Enviar link de confirmação"}
            </button>
            {!supabaseReady && (
              <p className="text-sm text-[var(--warn)]">
                Supabase não configurado neste ambiente.
              </p>
            )}
            {cloudErr && (
              <p className="text-sm text-[var(--warn)]">{cloudErr}</p>
            )}
            {cloudMsg && <p className="text-sm opacity-70">{cloudMsg}</p>}
          </form>
        )}
      </section>
    </div>
  );
}
