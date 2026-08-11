"use client";

import { useEffect, useRef, useState } from "react";
import { Bell, Download, Moon, Sun, SunMoon, Upload } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ensureNotificationPermission } from "@/lib/audio";
import type { ThemePref } from "@/lib/types";

const OPTIONS: { value: ThemePref; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "auto", label: "Automático", icon: SunMoon },
];

export default function AjustesPage() {
  const {
    themePref,
    setTheme,
    user,
    cloud,
    supabaseReady,
    exportBackup,
    importBackup,
    resetCloudData,
    logout,
  } = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);
  const [cloudWipeBusy, setCloudWipeBusy] = useState(false);
  const [cloudWipeMsg, setCloudWipeMsg] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);
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

  return (
    <div className="mx-auto max-w-2xl">
      <ConfirmDialog
        open={confirmLogout}
        title="Sair da conta?"
        message="Você precisará abrir o link do e-mail de novo para entrar. Os dados na nuvem continuam salvos."
        confirmLabel="Sim, sair"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
      />

      <h1 className="font-display pb-0.5 text-2xl font-semibold leading-normal tracking-tight md:text-3xl">
        Ajustes
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
            Notificações → Bloquear.
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
          Backup
        </h2>
        <p className="mt-1 text-xs opacity-55">
          Exportar/importar um arquivo JSON de segurança.
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
        </div>
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
          Conta
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
            <p className="truncate text-xs opacity-60">{user?.email}</p>
            <p className="mt-0.5 text-xs opacity-50">
              {cloud
                ? "Conectado · alterações salvam na nuvem"
                : supabaseReady
                  ? "Sessão local temporária"
                  : "Supabase não configurado"}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <button type="button" className="btn" onClick={() => setConfirmLogout(true)}>
            Sair
          </button>
          {cloud && (
            <div className="border-t border-[var(--line)] pt-3">
              <p className="text-xs opacity-55">
                Apaga matérias, semana, lembretes, notas e sessões na nuvem. A
                conta permanece conectada.
              </p>
              <button
                type="button"
                className="btn mt-2 text-[var(--warn)]"
                disabled={cloudWipeBusy}
                onClick={() => {
                  void (async () => {
                    if (
                      !confirm(
                        "Isso apaga TODOS os dados na nuvem. Continuar?",
                      )
                    ) {
                      return;
                    }
                    const typed = window.prompt(
                      "Para confirmar, digite APAGAR (em maiúsculas):",
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
          )}
        </div>
      </section>
    </div>
  );
}
