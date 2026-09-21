"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  LogOut,
  Settings,
  Shield,
  Trash2,
  X,
  CircleHelp,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";

function getInitials(name: string, email: string) {
  const clean = (name || "").trim();
  if (clean && !clean.includes("@")) {
    const parts = clean.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return clean.slice(0, 2).toUpperCase();
  }
  const em = (email || "").trim();
  return (em[0] || "U").toUpperCase();
}

export function UserAccountMenu() {
  const { user, logout } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Fecha o dropdown ao clicar fora no desktop
  useEffect(() => {
    if (!open) return;
    function handleDocClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleDocClick);
    return () => document.removeEventListener("mousedown", handleDocClick);
  }, [open]);

  // Fecha ao pressionar Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [open]);

  if (!user) return null;

  const initials = getInitials(user.name, user.email);

  async function handleDeleteAccount() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Não foi possível excluir a conta.");
      }
      setConfirmDelete(false);
      setOpen(false);
      // Limpeza completa do cache local
      if (typeof window !== "undefined") {
        try {
          localStorage.clear();
          sessionStorage.clear();
        } catch {
          // ignore
        }
      }
      logout();
      router.push("/login");
    } catch (err) {
      setDeleteError(
        err instanceof Error ? err.message : "Erro ao excluir conta.",
      );
      setDeleteBusy(false);
    }
  }

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* Botão do Avatar — área de clique acessível (mínimo 44x44px) */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="group relative flex h-10 w-10 items-center justify-center rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] focus-visible:ring-offset-2"
        title={`Conta: ${user.name || user.email}`}
        aria-label="Menu de conta do usuário"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <span className="flex size-8.5 items-center justify-center rounded-full bg-[var(--signal-soft)] text-xs font-semibold tracking-tight text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)] transition group-hover:ring-[var(--signal)]">
          {initials}
        </span>
      </button>

      {/* Backdrop no mobile */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-xs lg:hidden"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Popover / Dropdown (Desktop) ou Bottom Sheet (Mobile) */}
      {open && (
        <div
          role="dialog"
          aria-label="Gerenciamento de Conta"
          className="fixed inset-x-3 bottom-4 z-50 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)] transition-all sm:inset-x-auto sm:right-0 sm:top-12 sm:bottom-auto sm:w-80 lg:absolute lg:right-0 lg:top-full lg:mt-2"
        >
          {/* Cabeçalho do Menu com Dados do Usuário */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--signal-soft)] text-sm font-bold text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)]">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                  {user.name || "Estudante"}
                </p>
                <p className="truncate text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
                  {user.email}
                </p>
                <div className="mt-1">
                  <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] px-2 py-0.5 text-[10px] font-semibold text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)]">
                    Plano Gratuito
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setOpen(false)}
              className="inline-flex size-7 items-center justify-center rounded-md text-[color-mix(in_srgb,var(--ink)_55%,transparent)] transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
              title="Fechar menu"
              aria-label="Fechar menu"
            >
              <X size={16} strokeWidth={2} />
            </button>
          </div>

          {/* Seção de Navegação e Configurações */}
          <div className="py-2 space-y-0.5 text-xs text-[var(--ink)]">
            <Link
              href="/ajustes"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium transition hover:bg-[var(--mist)]"
            >
              <Settings size={15} strokeWidth={1.8} className="opacity-70" />
              <span>Ajustes & Notificações</span>
            </Link>

            <Link
              href="/ajuda"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium transition hover:bg-[var(--mist)]"
            >
              <CircleHelp size={15} strokeWidth={1.8} className="opacity-70" />
              <span>Ajuda & Guia de Estudos</span>
            </Link>
          </div>

          {/* Links Legais (Obrigatórios Google Play Store) */}
          <div className="border-t border-[var(--line)] py-2 space-y-0.5 text-xs text-[color-mix(in_srgb,var(--ink)_75%,transparent)]">
            <Link
              href="/privacidade"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
            >
              <Shield size={14} strokeWidth={1.8} className="opacity-60" />
              <span>Política de Privacidade</span>
            </Link>

            <Link
              href="/termos"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 transition hover:bg-[var(--mist)] hover:text-[var(--ink)]"
            >
              <FileText size={14} strokeWidth={1.8} className="opacity-60" />
              <span>Termos de Uso</span>
            </Link>
          </div>

          {/* Ações de Segurança e Conta */}
          <div className="border-t border-[var(--line)] pt-2 space-y-1">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setConfirmLogout(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--ink)] transition hover:bg-[var(--mist)]"
            >
              <LogOut size={15} strokeWidth={1.8} className="opacity-70" />
              <span>Sair da conta</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setDeleteError(null);
                setConfirmDelete(true);
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-[var(--warn)] transition hover:bg-[color-mix(in_srgb,var(--warn)_10%,transparent)]"
            >
              <Trash2 size={15} strokeWidth={1.8} />
              <span>Excluir conta definitivamente</span>
            </button>
          </div>
        </div>
      )}

      {/* Diálogo de confirmação de Logout */}
      <ConfirmDialog
        open={confirmLogout}
        title="Sair da conta?"
        message="Você precisará do e-mail e da senha para entrar de novo. Os seus dados na nuvem continuam seguros."
        confirmLabel="Sim, sair"
        cancelLabel="Cancelar"
        onCancel={() => setConfirmLogout(false)}
        onConfirm={() => {
          setConfirmLogout(false);
          logout();
        }}
      />

      {/* Diálogo de confirmação de Exclusão Definitiva (Google Play Account Deletion) */}
      <ConfirmDialog
        open={confirmDelete}
        title="Excluir conta permanentemente?"
        message={
          deleteError
            ? `Erro: ${deleteError}`
            : "Esta ação é irreversível. Todas as suas matérias, ciclos, sessões registradas e notas serão apagadas permanentemente do servidor e o seu login será desativado."
        }
        confirmLabel={deleteBusy ? "Excluindo…" : "Excluir permanentemente"}
        cancelLabel="Cancelar"
        onCancel={() => {
          if (!deleteBusy) {
            setConfirmDelete(false);
            setDeleteError(null);
          }
        }}
        onConfirm={handleDeleteAccount}
      />
    </div>
  );
}
