"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  FileText,
  Loader2,
  LogOut,
  Settings,
  Shield,
  Trash2,
  X,
  CircleHelp,
} from "lucide-react";
import { useApp } from "@/components/AppProvider";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { DialogFrame } from "@/components/DialogFrame";

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

/**
 * Comprime e recorta a imagem para um avatar circular de 160x160px.
 * Mantém alta nitidez em telas retina mas gera um arquivo de ~10 a 15 KB (WebP).
 */
function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler o arquivo de imagem."));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Arquivo de imagem corrompido ou inválido."));
      img.onload = () => {
        const size = 160;
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("Canvas não suportado."));

        // Recorte centralizado quadrado proporcional (cover)
        const minSide = Math.min(img.width, img.height);
        const sx = (img.width - minSide) / 2;
        const sy = (img.height - minSide) / 2;

        ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
        try {
          const dataUrl = canvas.toDataURL("image/webp", 0.85);
          resolve(dataUrl);
        } catch {
          // Fallback para JPEG caso WebP não seja gerado pelo browser
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          resolve(dataUrl);
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function UserAccountMenu() {
  const { user, logout, updateUserAvatar } = useApp();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      if (!file.type.startsWith("image/")) {
        throw new Error("Selecione um arquivo de imagem válido (JPG, PNG ou WebP).");
      }
      const dataUrl = await compressAvatar(file);
      const ok = await updateUserAvatar(dataUrl);
      if (!ok) throw new Error("Não foi possível salvar a foto no perfil.");
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : "Erro ao carregar foto.",
      );
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      await updateUserAvatar(null);
    } catch {
      setAvatarError("Não foi possível remover a foto.");
    } finally {
      setUploadingAvatar(false);
    }
  }

  async function handleDeleteAccount() {
    if (!deletePassword.trim()) {
      setDeleteError("Digite sua senha para autorizar a exclusão.");
      return;
    }
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: deletePassword }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Não foi possível excluir a conta.");
      }
      setConfirmDelete(false);
      setDeletePassword("");
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
      {/* Input oculto para seleção de foto */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />

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
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt={user.name || "Foto de perfil"}
            className="size-8.5 rounded-full object-cover ring-1 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)] transition group-hover:ring-[var(--signal)]"
          />
        ) : (
          <span className="flex size-8.5 items-center justify-center rounded-full bg-[var(--signal-soft)] text-xs font-semibold tracking-tight text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)] transition group-hover:ring-[var(--signal)]">
            {initials}
          </span>
        )}
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
          {/* Cabeçalho do Menu com Dados do Usuário e Foto */}
          <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--line)]">
            <div className="flex items-center gap-3 min-w-0">
              {/* Avatar com ação de foto */}
              <div className="relative shrink-0">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name || "Foto de perfil"}
                    className="size-11 rounded-full object-cover ring-1 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)]"
                  />
                ) : (
                  <div className="flex size-11 items-center justify-center rounded-full bg-[var(--signal-soft)] text-sm font-bold text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)]">
                    {initials}
                  </div>
                )}
                {/* Botão de Câmera sobreposto */}
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAvatar}
                  className="absolute -bottom-1 -right-1 flex size-5.5 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--signal)] shadow-sm ring-1 ring-[var(--line)] transition hover:bg-[var(--signal-soft)] hover:ring-[var(--signal)] disabled:opacity-50"
                  title="Trocar foto de perfil"
                  aria-label="Trocar foto de perfil"
                >
                  {uploadingAvatar ? (
                    <Loader2 size={11} className="animate-spin" />
                  ) : (
                    <Camera size={11} strokeWidth={2.2} />
                  )}
                </button>
              </div>

              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[var(--ink)]">
                  {user.name || "Estudante"}
                </p>
                <p className="truncate text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
                  {user.email}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] px-2 py-0.5 text-[10px] font-semibold text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)]">
                    Plano Gratuito
                  </span>
                  {user.avatarUrl && (
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={uploadingAvatar}
                      className="text-[10px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] transition hover:text-[var(--warn)] underline underline-offset-2"
                    >
                      Remover foto
                    </button>
                  )}
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

          {avatarError && (
            <p className="mt-2 text-[11px] font-medium text-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_8%,transparent)] p-1.5 rounded">
              {avatarError}
            </p>
          )}

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
                setDeletePassword("");
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

      {/* Modal de Exclusão Definitiva com confirmação de senha */}
      <DialogFrame
        open={confirmDelete}
        onClose={() => {
          if (!deleteBusy) {
            setConfirmDelete(false);
            setDeletePassword("");
            setDeleteError(null);
          }
        }}
        labelledBy="delete-account-title"
        cardClassName="surface w-full max-w-md p-6 shadow-[var(--shadow-lg)] border border-[var(--line)]"
      >
        <div className="flex items-center gap-3 text-[var(--warn)]">
          <div className="flex size-10 items-center justify-center rounded-xl bg-[color-mix(in_srgb,var(--warn)_15%,transparent)]">
            <Trash2 size={20} />
          </div>
          <div>
            <h2
              id="delete-account-title"
              className="font-display text-lg font-bold text-[var(--ink)]"
            >
              Excluir conta permanentemente?
            </h2>
            <p className="text-xs text-[var(--warn)] font-medium">
              Ação irreversível
            </p>
          </div>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-[color-mix(in_srgb,var(--ink)_75%,transparent)]">
          Todas as suas matérias, blocos de ciclo, registros de tempo, anotações
          e lembretes serão <strong>apagados para sempre</strong> e sua conta
          no FocoHub será encerrada.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleDeleteAccount();
          }}
          className="mt-4 space-y-3"
        >
          <div>
            <label
              htmlFor="delete-account-password"
              className="block text-xs font-semibold text-[var(--ink)] mb-1"
            >
              Confirme sua senha para autorizar:
            </label>
            <input
              id="delete-account-password"
              type="password"
              autoComplete="current-password"
              placeholder="Digite sua senha de acesso…"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              className="input w-full px-3 py-2 text-sm"
              disabled={deleteBusy}
              autoFocus
            />
          </div>

          {deleteError && (
            <p className="text-xs font-medium text-[var(--warn)]" role="alert">
              {deleteError}
            </p>
          )}

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-[var(--line)]">
            <button
              type="button"
              className="btn"
              disabled={deleteBusy}
              onClick={() => {
                setConfirmDelete(false);
                setDeletePassword("");
                setDeleteError(null);
              }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={deleteBusy || deletePassword.trim().length === 0}
              className="btn border-[var(--warn)] bg-[color-mix(in_srgb,var(--warn)_14%,var(--surface))] text-[var(--warn)] font-semibold hover:bg-[var(--warn)] hover:text-white disabled:opacity-40"
            >
              {deleteBusy ? "Excluindo…" : "Excluir permanentemente"}
            </button>
          </div>
        </form>
      </DialogFrame>
    </div>
  );
}
