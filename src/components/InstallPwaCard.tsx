"use client";

import { useEffect, useState } from "react";
import { Download, Share } from "lucide-react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandaloneDisplay() {
  if (typeof window === "undefined") return false;
  const mq = window.matchMedia("(display-mode: standalone)").matches;
  const iosStandalone =
    "standalone" in navigator &&
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);
  return mq || iosStandalone;
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/** Card para instalar o Foco como app (PWA). */
export function InstallPwaCard() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [installed, setInstalled] = useState(false);
  const [iosHint, setIosHint] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isStandaloneDisplay()) {
      setInstalled(true);
      return;
    }
    setIosHint(isIos());

    const onBip = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    setBusy(true);
    setMsg(null);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") {
        setInstalled(true);
        setMsg("App instalado.");
      }
      setDeferred(null);
    } catch {
      setMsg("Não foi possível abrir o instalador neste navegador.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="surface mt-4 p-4 md:p-5 lg:hidden">
      <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
        Instalar app
      </h2>
      <p className="mt-1 text-xs opacity-55">
        Use o Foco como aplicativo na tela inicial (PWA). Timers e lembretes
        funcionam melhor com o app aberto.
      </p>

      {installed ? (
        <p className="mt-3 text-sm text-[var(--ok)]">Já está instalado neste aparelho.</p>
      ) : deferred ? (
        <button
          type="button"
          className="btn btn-primary mt-3"
          disabled={busy}
          onClick={() => void install()}
        >
          <Download size={16} strokeWidth={1.75} />
          {busy ? "Abrindo…" : "Instalar Foco"}
        </button>
      ) : iosHint ? (
        <div className="mt-3 rounded-[var(--radius-tag)] border border-[var(--line)] bg-[var(--mist)]/50 px-3 py-2.5 text-sm">
          <p className="inline-flex items-center gap-1.5 font-medium">
            <Share size={15} strokeWidth={1.75} /> No iPhone / iPad (Safari)
          </p>
          <ol className="mt-1.5 list-decimal space-y-0.5 pl-5 text-xs opacity-70">
            <li>Toque em Compartilhar</li>
            <li>Escolha “Adicionar à Tela de Início”</li>
            <li>Confirme Adicionar</li>
          </ol>
        </div>
      ) : (
        <p className="mt-3 text-sm opacity-65">
          No Chrome Android: menu ⋮ → “Instalar app” ou “Adicionar à tela
          inicial”. Se o botão não aparecer, abra o site no navegador (não em
          aba anônima).
        </p>
      )}
      {msg && <p className="mt-2 text-sm opacity-70">{msg}</p>}
    </section>
  );
}
