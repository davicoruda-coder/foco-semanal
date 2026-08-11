"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Download, Moon, Sun, Upload } from "lucide-react";
import { useApp } from "@/components/AppProvider";
import type { Theme } from "@/lib/types";

const OPTIONS: { value: Theme; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
];

export default function ConfiguracoesPage() {
  const {
    theme,
    setTheme,
    user,
    cloud,
    exportBackup,
    importBackup,
    resetDemoData,
    logout,
  } = useApp();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

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

  function sair() {
    logout();
    router.push("/login");
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
        <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
          {OPTIONS.map(({ value, label, icon: Icon }) => {
            const active = theme === value;
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
      </section>

      <section className="surface mt-4 p-4 md:p-5">
        <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
          Backup
        </h2>
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
            disabled={cloud}
            onClick={() => {
              if (cloud) return;
              if (confirm("Resetar todos os dados deste navegador?")) {
                resetDemoData();
                setBackupMsg("Dados resetados.");
              }
            }}
          >
            Resetar
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
            <p className="truncate text-xs opacity-60">
              {cloud ? user?.email : "neste aparelho"}
            </p>
            <p className="mt-0.5 text-xs opacity-50">
              {cloud ? "Conta · nuvem (Supabase)" : "Local · neste navegador"}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {cloud ? (
            <button type="button" className="btn" onClick={sair}>
              Sair da conta
            </button>
          ) : (
            <Link href="/login" className="btn btn-primary">
              Entrar ou criar conta
            </Link>
          )}
        </div>
        {!cloud && (
          <p className="mt-2 text-xs opacity-55">
            Sem conta, os dados ficam só neste navegador. Com e-mail e senha,
            sincronizam na nuvem (Supabase).
          </p>
        )}
      </section>
    </div>
  );
}
