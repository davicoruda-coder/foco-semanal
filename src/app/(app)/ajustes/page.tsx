"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Calendar,
  ChevronRight,
  CircleHelp,
  Download,
  GraduationCap,
  KeyRound,
  Moon,
  Sun,
  SunMoon,
  Upload,
  Volume2,
} from "lucide-react";
import { FlashcardsIcon } from "@/components/FlashcardsIcon";
import { useApp } from "@/components/AppProvider";
import { AccessManagement } from "@/components/AccessManagement";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { InstallPwaCard } from "@/components/InstallPwaCard";
import { useStudyFlow } from "@/components/StudyFlowProvider";
import {
  ALARM_TONES,
  ensureNotificationPermission,
  loadAlarmPrefs,
  previewAlarmTone,
  saveAlarmPrefs,
  type AlarmPrefs,
  type AlarmToneId,
} from "@/lib/audio";
import { backupFileError } from "@/lib/backup";
import { promptDestructivePassword } from "@/lib/destructive-guard";
import { MIN_PASSWORD_LENGTH, isValidNewPassword, newPasswordHint } from "@/lib/password";
import {
  clampInt,
  type BlockRangeSettings,
} from "@/lib/session-block";
import type { ThemePref } from "@/lib/types";
import {
  DEFAULT_SIDEBAR_TIMER_NAME,
  normalizeSidebarTimerMinutes,
  normalizeSidebarTimerName,
} from "@/lib/utils";

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
  const [confirmCloudWipe, setConfirmCloudWipe] = useState(false);
  const [passwordFormOpen, setPasswordFormOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [passwordBusy, setPasswordBusy] = useState(false);
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordErr, setPasswordErr] = useState<string | null>(null);
  const [notifPermission, setNotifPermission] = useState<
    NotificationPermission | "unsupported"
  >("default");
  const [notifMsg, setNotifMsg] = useState<string | null>(null);

  async function savePassword(e: React.FormEvent) {
    e.preventDefault();
    if (!isValidNewPassword(password)) {
      setPasswordErr(newPasswordHint());
      setPasswordMsg(null);
      return;
    }
    if (password !== passwordConfirm) {
      setPasswordErr("As senhas não coincidem.");
      setPasswordMsg(null);
      return;
    }
    setPasswordBusy(true);
    setPasswordErr(null);
    setPasswordMsg(null);
    try {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setPasswordErr(error.message);
        setPasswordBusy(false);
        return;
      }
      setPassword("");
      setPasswordConfirm("");
      setPasswordFormOpen(false);
      setPasswordMsg("Senha salva. Use-a para entrar em outro aparelho.");
      setPasswordBusy(false);
    } catch {
      setPasswordErr("Não foi possível salvar a senha.");
      setPasswordBusy(false);
    }
  }

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
    const fileError = backupFileError(file);
    if (fileError) {
      setBackupMsg(fileError);
      return;
    }
    const text = await file.text();
    const result = importBackup(text);
    setBackupMsg(result.ok ? "Backup restaurado." : result.error);
  }

  return (
    <div className="mx-auto max-w-2xl">
      <ConfirmDialog
        open={confirmLogout}
        title="Sair da conta?"
        message="Você precisará do e-mail e da senha para entrar de novo. Os dados na nuvem continuam salvos."
        confirmLabel="Sim, sair"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
      />
      <ConfirmDialog
        open={confirmCloudWipe}
        title="Apagar dados na nuvem?"
        message="Isso apaga matérias, semana, lembretes, notas e sessões na nuvem. A conta permanece conectada. Será pedida a senha de autorização. Esta ação não pode ser desfeita."
        confirmLabel="Sim, apagar"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmCloudWipe(false)}
        onConfirm={() => {
          void (async () => {
            const auth = promptDestructivePassword("apagar os dados na nuvem");
            if (auth === "cancel") {
              setConfirmCloudWipe(false);
              return;
            }
            if (auth === "wrong") {
              window.alert("Senha incorreta. Tente de novo.");
              return;
            }
            setConfirmCloudWipe(false);
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
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-bold tracking-tight md:text-3xl text-[var(--ink)]">
          Ajustes
        </h1>
        <Link
          href="/ajuda"
          className="inline-flex items-center gap-1.5 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--ink)] shadow-[var(--shadow-xs)] transition hover:border-[var(--signal)] hover:text-[var(--signal)] sm:text-sm"
        >
          <CircleHelp size={15} />
          <span>Guia & Ajuda</span>
        </Link>
      </div>
      <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_75%,transparent)] sm:text-sm leading-relaxed">
        Configure métodos de estudo, alarmes sonoros, aparência e segurança da conta.
      </p>

      {/* GRUPO 1: ESTUDO & PRODUTIVIDADE */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
          <GraduationCap size={16} />
          Estudo & Produtividade
        </div>

        <ModulosSettings />
        <SessionBlockSettings />
        <SidebarTimerSettings />
      </div>

      {/* GRUPO 2: APARÊNCIA & ALERTAS */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
          <Bell size={16} />
          Aparência & Alertas
        </div>

        <section className="surface p-4 md:p-5">
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
            <p className="mt-2 text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)] sm:text-sm">
              Automático: claro das 6h às 18h, escuro à noite.
            </p>
          )}
        </section>

        <AlarmSettings />

        <section className="surface p-4 md:p-5">
          <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
            Notificações
          </h2>
          <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_75%,transparent)] sm:text-sm leading-relaxed">
            Alarme ao terminar um temporizador e avisos de lembretes com sino.
            Funcionam com o app/aba abertos. No celular, o PWA instalado costuma
            ser mais estável que o navegador.
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
            <p className="mt-2 text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)] sm:text-sm">
              Para desativar, use o cadeado na barra de endereço do navegador →
              Notificações → Bloquear.
            </p>
          )}
          {notifPermission === "denied" && (
            <p className="mt-2 text-xs text-[var(--warn)] sm:text-sm font-medium">
              Bloqueadas neste site. Libere em Configurações do navegador →
              Notificações.
            </p>
          )}
          {notifPermission === "unsupported" && (
            <p className="mt-2 text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)] sm:text-sm">
              Este navegador não suporta notificações.
            </p>
          )}
          {notifMsg && <p className="mt-2 text-sm text-[color-mix(in_srgb,var(--ink)_85%,transparent)]">{notifMsg}</p>}
        </section>

        <InstallPwaCard />
      </div>

      {/* GRUPO 3: CONTA & SEGURANÇA */}
      <div className="mt-8 space-y-4">
        <div className="flex items-center gap-2 border-b border-[var(--line)] pb-2 text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
          <KeyRound size={16} />
          Conta & Segurança
        </div>

        <section className="surface p-4 md:p-5">
          <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
            Backup
          </h2>
          <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_75%,transparent)] sm:text-sm leading-relaxed">
            Exportar/importar um arquivo JSON de segurança. Importar só
            atualiza o que veio no arquivo — não apaga o resto na nuvem.
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

        <AccessManagement />

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
                  ? "Entre com o e-mail para sincronizar"
                  : "Supabase não configurado"}
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {cloud && (
            <div>
              {!passwordFormOpen ? (
                <button
                  type="button"
                  className="btn"
                  onClick={() => {
                    setPasswordFormOpen(true);
                    setPasswordErr(null);
                    setPasswordMsg(null);
                  }}
                >
                  <KeyRound size={16} strokeWidth={1.75} />
                  Definir / alterar senha
                </button>
              ) : (
                <form className="space-y-2" onSubmit={(e) => void savePassword(e)}>
                  <p className="text-xs text-[color-mix(in_srgb,var(--ink)_75%,transparent)] sm:text-sm leading-relaxed">
                    Defina a senha para entrar neste e-mail em outro aparelho.
                  </p>
                  <input
                    className="input w-full"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    placeholder="Nova senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <input
                    className="input w-full"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={MIN_PASSWORD_LENGTH}
                    placeholder="Confirmar senha"
                    value={passwordConfirm}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                  />
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={passwordBusy}
                    >
                      {passwordBusy ? "Salvando…" : "Salvar senha"}
                    </button>
                    <button
                      type="button"
                      className="btn"
                      disabled={passwordBusy}
                      onClick={() => {
                        setPasswordFormOpen(false);
                        setPassword("");
                        setPasswordConfirm("");
                        setPasswordErr(null);
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              )}
              {passwordErr && (
                <p className="mt-2 text-sm text-[var(--warn)]">{passwordErr}</p>
              )}
              {passwordMsg && (
                <p className="mt-2 text-sm opacity-70">{passwordMsg}</p>
              )}
            </div>
          )}
          <button type="button" className="btn" onClick={() => setConfirmLogout(true)}>
            Sair
          </button>
          {cloud && (
            <div className="border-t border-[var(--line)] pt-3">
              <p className="text-xs text-[color-mix(in_srgb,var(--ink)_75%,transparent)] sm:text-sm leading-relaxed">
                Apaga matérias, semana, lembretes, notas e sessões na nuvem. A
                conta permanece conectada. Pede a senha de autorização.
              </p>
              <button
                type="button"
                className="btn mt-2 text-[var(--warn)]"
                disabled={cloudWipeBusy}
                onClick={() => {
                  setCloudWipeMsg(null);
                  setConfirmCloudWipe(true);
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

      {/* Rodapé: Central de Ajuda & Tutoriais */}
      <div className="surface flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 md:p-5 rounded-[var(--radius)] border-[var(--line)]">
        <div className="flex items-center gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)]">
            <CircleHelp size={18} />
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--ink)]">
              Dúvidas sobre ciclo ou metodologia de estudos?
            </p>
            <p className="text-xs text-[color-mix(in_srgb,var(--ink)_75%,transparent)] sm:text-sm">
              Consulte as regras de ouro, conceitos de rodízio e tutoriais passo a passo.
            </p>
          </div>
        </div>
        <Link
          href="/ajuda"
          className="inline-flex shrink-0 items-center gap-1 rounded-[var(--radius-btn)] border border-[var(--line)] bg-[var(--surface)] px-3 py-1.5 text-xs font-semibold text-[var(--signal)] shadow-sm hover:border-[var(--signal)] sm:text-sm self-start sm:self-auto"
        >
          Acessar Guia <ChevronRight size={15} />
        </Link>
      </div>
      </div>
    </div>
  );
}

function SidebarTimerSettings() {
  const { data, updateSettings } = useApp();
  const name =
    data.session_settings?.sidebar_timer_name ?? DEFAULT_SIDEBAR_TIMER_NAME;
  const minutes = normalizeSidebarTimerMinutes(
    data.session_settings?.sidebar_timer_minutes,
  );
  const [draftName, setDraftName] = useState(name);
  const [draftMinutes, setDraftMinutes] = useState(String(minutes));
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    setDraftName(name);
    setDraftMinutes(String(minutes));
  }, [name, minutes]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#temporizador") return;
    document
      .getElementById("temporizador")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  function onSave() {
    updateSettings({
      sidebar_timer_name: normalizeSidebarTimerName(draftName),
      sidebar_timer_minutes: normalizeSidebarTimerMinutes(draftMinutes),
    });
    setDraftName(normalizeSidebarTimerName(draftName));
    setDraftMinutes(String(normalizeSidebarTimerMinutes(draftMinutes)));
    setSavedMsg("Temporizador salvo.");
  }

  return (
    <section id="temporizador" className="surface mt-4 scroll-mt-24 p-4 md:p-5">
      <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
        Temporizador
      </h2>
      <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_75%,transparent)] sm:text-sm leading-relaxed">
        Nome e duração do temporizador da tela Hoje. O tempo conta nas
        estatísticas e não altera o ciclo.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="opacity-70">Nome</span>
          <input
            className="input mt-1 w-full"
            maxLength={40}
            value={draftName}
            onChange={(e) => {
              setDraftName(e.target.value);
              setSavedMsg(null);
            }}
          />
        </label>
        <label className="block text-sm">
          <span className="opacity-70">Tempo (min)</span>
          <input
            type="number"
            min={1}
            max={180}
            className="input mt-1 w-full"
            value={draftMinutes}
            onChange={(e) => {
              setDraftMinutes(e.target.value);
              setSavedMsg(null);
            }}
          />
        </label>
      </div>
      <button type="button" className="btn btn-primary mt-3" onClick={onSave}>
        Salvar
      </button>
      {savedMsg && <p className="mt-2 text-sm opacity-70">{savedMsg}</p>}
    </section>
  );
}

function SessionBlockSettings() {
  const { settings, saveSettings, refreshSettings } = useStudyFlow();
  const [draft, setDraft] = useState<BlockRangeSettings>(settings);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  useEffect(() => {
    setDraft(settings);
  }, [settings]);

  function patch<K extends keyof BlockRangeSettings>(
    key: K,
    value: number,
  ) {
    setDraft((prev) => ({ ...prev, [key]: value }));
    setSavedMsg(null);
  }

  function onSave() {
    let min = clampInt(draft.minMinutes, 10, 120);
    let max = clampInt(draft.maxMinutes, min, 180);
    const target = clampInt(draft.targetMinutes, min, max);
    const rest = clampInt(draft.restMinutes, 1, 60);
    if (min > max) {
      min = max;
    }
    saveSettings({
      minMinutes: min,
      maxMinutes: max,
      targetMinutes: target,
      restMinutes: rest,
    });
    setSavedMsg("Tempos da sessão salvos.");
  }

  return (
    <section className="surface mt-4 p-4 md:p-5">
      <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
        Sessão de estudos
      </h2>
      <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_75%,transparent)] sm:text-sm leading-relaxed">
        Meta e faixa usadas para montar o bloco do botão Iniciar sessão. O
        descanso não entra nas estatísticas.
      </p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="opacity-70">Meta (min)</span>
          <input
            type="number"
            min={10}
            max={180}
            className="input mt-1 w-full"
            value={draft.targetMinutes}
            onChange={(e) => patch("targetMinutes", Number(e.target.value))}
          />
        </label>
        <label className="block text-sm">
          <span className="opacity-70">Descanso (min)</span>
          <input
            type="number"
            min={1}
            max={60}
            className="input mt-1 w-full"
            value={draft.restMinutes}
            onChange={(e) => patch("restMinutes", Number(e.target.value))}
          />
        </label>
        <label className="block text-sm">
          <span className="opacity-70">Mínimo do bloco (min)</span>
          <input
            type="number"
            min={10}
            max={120}
            className="input mt-1 w-full"
            value={draft.minMinutes}
            onChange={(e) => patch("minMinutes", Number(e.target.value))}
          />
        </label>
        <label className="block text-sm">
          <span className="opacity-70">Máximo do bloco (min)</span>
          <input
            type="number"
            min={10}
            max={180}
            className="input mt-1 w-full"
            value={draft.maxMinutes}
            onChange={(e) => patch("maxMinutes", Number(e.target.value))}
          />
        </label>
      </div>
      <button type="button" className="btn btn-primary mt-3" onClick={onSave}>
        Salvar
      </button>
      {savedMsg && <p className="mt-2 text-sm opacity-70">{savedMsg}</p>}
    </section>
  );
}

function AlarmSettings() {
  const [alarm, setAlarm] = useState<AlarmPrefs>({
    volume: 0.7,
    tone: "acorde",
  });

  useEffect(() => {
    setAlarm(loadAlarmPrefs());
  }, []);

  function updateAlarm(next: AlarmPrefs) {
    setAlarm(next);
    saveAlarmPrefs(next);
  }

  return (
    <section className="surface mt-4 p-4 md:p-5">
      <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
        Alarme
      </h2>
      <p className="mt-1 text-xs text-[color-mix(in_srgb,var(--ink)_75%,transparent)] sm:text-sm leading-relaxed">
        Vale para o fim das matérias na sessão e lembretes com sino neste
        aparelho.
      </p>

      <label className="mt-4 flex items-center gap-3">
        <Volume2 size={18} strokeWidth={1.75} className="shrink-0 opacity-60" />
        <span className="w-16 shrink-0 text-sm opacity-70">Volume</span>
        <input
          type="range"
          min={0}
          max={100}
          value={Math.round(alarm.volume * 100)}
          className="w-full accent-[var(--signal)]"
          onChange={(e) =>
            updateAlarm({
              ...alarm,
              volume: Number(e.target.value) / 100,
            })
          }
        />
        <span className="font-mono-num w-10 shrink-0 text-right text-sm opacity-60">
          {Math.round(alarm.volume * 100)}%
        </span>
      </label>

      <p className="mt-4 text-sm font-medium opacity-70">Toque</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ALARM_TONES.map(({ id, label }) => {
          const active = alarm.tone === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => updateAlarm({ ...alarm, tone: id as AlarmToneId })}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-[var(--signal-soft)] text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_40%,transparent)]"
                  : "bg-[color-mix(in_srgb,var(--ink)_6%,transparent)] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] hover:text-[var(--ink)]"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        className="btn mt-4"
        onClick={() => previewAlarmTone(alarm.tone, alarm.volume)}
      >
        Ouvir
      </button>
    </section>
  );
}

function ModulosSettings() {
  const [adminModules, setAdminModules] = useState<{revisao: boolean, semana: boolean} | null>(null);
  const [revisaoAtivo, setRevisaoAtivo] = useState(true);
  const [semanaAtivo, setSemanaAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      const { data, error } = await supabase.rpc("get_my_modules");
      let adminAllowed = { revisao: true, semana: true };
      if (!error && data) {
        adminAllowed = typeof data === "string" ? JSON.parse(data) : data;
      }
      setAdminModules(adminAllowed);
    })();
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const storedRev = localStorage.getItem("foco_modulo_revisao");
      if (storedRev !== null) {
        setRevisaoAtivo(storedRev !== "false");
      }
      const storedSem = localStorage.getItem("foco_modulo_semana");
      if (storedSem !== null) {
        setSemanaAtivo(storedSem !== "false");
      }
    }
    (async () => {
      try {
        const store = await import("@/lib/revisao/revisao-store");
        const p = await store.loadPerfil();
        if (p?.modulos_ativos?.revisao !== undefined) {
          setRevisaoAtivo(p.modulos_ativos.revisao);
          localStorage.setItem(
            "foco_modulo_revisao",
            String(p.modulos_ativos.revisao),
          );
        }
      } catch {
        // offline / guest
      }
    })();
  }, []);

  async function toggleRevisao(ativo: boolean) {
    setSalvando(true);
    setRevisaoAtivo(ativo);
    if (typeof window !== "undefined") {
      localStorage.setItem("foco_modulo_revisao", String(ativo));
      window.dispatchEvent(new Event("foco-modulo-changed"));
    }
    try {
      const store = await import("@/lib/revisao/revisao-store");
      await store.setModuloAtivo("revisao", ativo);
      setMensagem(
        ativo ? "Módulo Revisão ativado!" : "Módulo Revisão desativado.",
      );
    } catch {
      setMensagem("Salvo localmente neste aparelho.");
    } finally {
      setSalvando(false);
      setTimeout(() => setMensagem(null), 3000);
    }
  }

  function toggleSemana(ativo: boolean) {
    setSalvando(true);
    setSemanaAtivo(ativo);
    if (typeof window !== "undefined") {
      localStorage.setItem("foco_modulo_semana", String(ativo));
      window.dispatchEvent(new Event("foco-modulo-changed"));
    }
    setMensagem(ativo ? "Módulo Semana ativado!" : "Módulo Semana desativado.");
    setSalvando(false);
    setTimeout(() => setMensagem(null), 3000);
  }

  if (adminModules && !adminModules.revisao && !adminModules.semana) {
    return null; // Nada a exibir se ambos estiverem bloqueados pelo admin
  }

  return (
    <div className="space-y-4">
      {adminModules?.revisao !== false && (
        <section className="surface mt-4 p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)]">
                <FlashcardsIcon size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-semibold tracking-tight text-[var(--ink)] md:text-lg">
                    Revisão & Flashcards
                  </h2>
                  <span className="rounded-full bg-[var(--signal-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--signal)]">
                    Opcional
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed max-w-xl">
                  Caderno de erros com repetição espaçada, captura de falhas em questões e diagnóstico de retenção.
                </p>
              </div>
            </div>

            <label className="relative inline-flex cursor-pointer items-center shrink-0 self-end sm:self-center">
              <input
                type="checkbox"
                checked={revisaoAtivo}
                disabled={salvando}
                onChange={(e) => toggleRevisao(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-[var(--line)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--signal)] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
            </label>
          </div>
        </section>
      )}

      {adminModules?.semana !== false && (
        <section className="surface mt-4 p-4 md:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="mt-0.5 grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--signal-soft)] text-[var(--signal)]">
                <Calendar size={20} />
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-base font-semibold tracking-tight text-[var(--ink)] md:text-lg">
                    Planejamento Semanal
                  </h2>
                  <span className="rounded-full bg-[var(--signal-soft)] px-2 py-0.5 text-[10px] font-semibold text-[var(--signal)]">
                    Opcional
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[color-mix(in_srgb,var(--ink)_75%,transparent)] leading-relaxed max-w-xl">
                  Grade de horários da semana e metas de horas. Desative se preferir um visual minimalista focado apenas no Hoje.
                </p>
              </div>
            </div>

            <label className="relative inline-flex cursor-pointer items-center shrink-0 self-end sm:self-center">
              <input
                type="checkbox"
                checked={semanaAtivo}
                disabled={salvando}
                onChange={(e) => toggleSemana(e.target.checked)}
                className="peer sr-only"
              />
              <div className="peer h-6 w-11 rounded-full bg-[var(--line)] after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-[var(--signal)] peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none" />
            </label>
          </div>
        </section>
      )}

      {mensagem && (
        <p className="mt-3 text-xs font-medium text-[var(--signal)] sm:text-sm">
          {mensagem}
        </p>
      )}
    </div>
  );
}
