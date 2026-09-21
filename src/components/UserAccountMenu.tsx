"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  ChartColumn,
  ChevronDown,
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
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [imgError, setImgError] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Se o avatar mudar, reseta o estado de erro
  useEffect(() => {
    setImgError(false);
  }, [user?.avatarUrl]);

  // Trava o scroll do body no mobile enquanto o bottom sheet estiver aberto
  useEffect(() => {
    if (!open) return;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 1024;
    if (!isMobile) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  // Fecha o dropdown ao clicar fora no desktop ou fora do bottom sheet no mobile
  useEffect(() => {
    if (!open) return;
    function handleDocClick(e: MouseEvent) {
      const target = e.target as Node | null;
      if (!target) return;
      if (containerRef.current?.contains(target)) return;
      if (sheetRef.current?.contains(target)) return;
      setOpen(false);
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
  const showCustomPhoto = Boolean(user.avatarUrl && !imgError);
  const firstName = (() => {
    const clean = (user.name || "").trim();
    if (clean && !clean.includes("@")) {
      return clean.split(/\s+/)[0];
    }
    const em = (user.email || "").trim();
    return em.split("@")[0] || "Conta";
  })();

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
      setImgError(false);
    } catch (err) {
      setAvatarError(
        err instanceof Error ? err.message : "Erro ao carregar foto.",
      );
    } finally {
      setUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function handleRemoveAvatar() {
    setUploadingAvatar(true);
    setAvatarError(null);
    try {
      await updateUserAvatar(null);
      setImgError(false);
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

  // Conteúdo do Menu compartilhado entre Desktop (popover) e Mobile (bottom sheet)
  const MenuContent = () => (
    <>
      {/* Cabeçalho com Dados do Usuário e Foto */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-[var(--line)]">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar com label nativo e input transparente sobreposto para toque garantido no mobile */}
          <label
            className="group/avatar relative block size-12 shrink-0 rounded-full cursor-pointer select-none"
            title={user.avatarUrl ? "Trocar foto de perfil" : "Adicionar foto de perfil"}
          >
            {showCustomPhoto ? (
              <img
                src={user.avatarUrl}
                alt="Foto de perfil"
                onError={() => setImgError(true)}
                className="size-12 rounded-full object-cover ring-2 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)] transition group-hover/avatar:ring-[var(--signal)] pointer-events-none"
              />
            ) : (
              <div className="flex size-12 items-center justify-center rounded-full bg-[var(--signal-soft)] text-sm font-bold text-[var(--signal)] ring-2 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)] transition group-hover/avatar:ring-[var(--signal)] pointer-events-none">
                {initials}
              </div>
            )}

            {/* Ícone de Câmera sobreposto */}
            <span
              className="absolute -bottom-1 -right-1 flex size-5.5 items-center justify-center rounded-full bg-[var(--surface)] text-[var(--signal)] shadow-md ring-1 ring-[var(--line)] transition group-hover/avatar:bg-[var(--signal-soft)] group-hover/avatar:ring-[var(--signal)] pointer-events-none"
              title={user.avatarUrl ? "Trocar foto" : "Adicionar foto"}
            >
              {uploadingAvatar ? (
                <Loader2 size={11} className="animate-spin" />
              ) : (
                <Camera size={11} strokeWidth={2.2} />
              )}
            </span>

            {/* Input nativo transparente posicionado sobre toda a área do avatar */}
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 z-20 size-full cursor-pointer opacity-0 rounded-full"
              onChange={handleFileChange}
              disabled={uploadingAvatar}
              title={user.avatarUrl ? "Trocar foto de perfil" : "Adicionar foto de perfil"}
              aria-label={user.avatarUrl ? "Trocar foto de perfil" : "Adicionar foto de perfil"}
            />
          </label>

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--ink)]">
              {user.name || "Estudante"}
            </p>
            <p className="truncate text-xs text-[color-mix(in_srgb,var(--ink)_65%,transparent)]">
              {user.email}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center rounded-full bg-[color-mix(in_srgb,var(--signal)_12%,var(--surface))] px-2 py-0.5 text-[10px] font-semibold text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--signal)_30%,transparent)]">
                Plano Gratuito
              </span>
              {user.avatarUrl && (
                <button
                  type="button"
                  onClick={handleRemoveAvatar}
                  disabled={uploadingAvatar}
                  className="text-[11px] text-[color-mix(in_srgb,var(--ink)_55%,transparent)] transition hover:text-[var(--warn)] underline underline-offset-2"
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
          href="/estatisticas"
          onClick={() => setOpen(false)}
          className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 font-medium transition hover:bg-[var(--mist)]"
        >
          <ChartColumn size={15} strokeWidth={1.8} className="opacity-70" />
          <span>Estatísticas de Foco</span>
        </Link>

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
            setOpen(false);
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
    </>
  );

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {/* Botão de Perfil — Cápsula Elegante no Desktop e Bolinha com Tap Target Ergonômico no Mobile */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`group relative inline-flex items-center gap-2 rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--signal)] focus-visible:ring-offset-2 active:scale-95 ${
          open
            ? "border-[color-mix(in_srgb,var(--signal)_50%,var(--line))] bg-[var(--surface)] shadow-xs"
            : "border-[var(--line)] bg-[var(--surface)]/80 hover:border-[color-mix(in_srgb,var(--signal)_35%,var(--line))] hover:bg-[var(--mist)] hover:shadow-xs"
        } max-sm:size-9 max-sm:justify-center max-sm:border-transparent max-sm:bg-transparent max-sm:p-0 sm:h-8.5 sm:px-1.5`}
        title={`Conta: ${user.name || user.email}`}
        aria-label="Menu de conta do usuário"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        {showCustomPhoto ? (
          <img
            src={user.avatarUrl}
            alt="Foto de perfil"
            onError={() => setImgError(true)}
            className="size-7 rounded-full object-cover ring-1 ring-[color-mix(in_srgb,var(--ink)_14%,transparent)] transition-all duration-200 group-hover:scale-105 group-hover:ring-[var(--signal)] shadow-xs"
          />
        ) : (
          <span className="flex size-7 items-center justify-center rounded-full bg-[var(--signal-soft)] text-[11px] font-bold tracking-tight text-[var(--signal)] ring-1 ring-[color-mix(in_srgb,var(--ink)_14%,transparent)] transition-all duration-200 group-hover:scale-105 group-hover:ring-[var(--signal)] shadow-xs">
            {initials}
          </span>
        )}

        <span className="hidden sm:inline-block max-w-[120px] truncate text-xs font-semibold tracking-tight text-[var(--ink)] transition-colors group-hover:text-[var(--signal)]">
          {firstName}
        </span>

        <ChevronDown
          size={13}
          strokeWidth={2.2}
          className={`hidden sm:inline-block text-[color-mix(in_srgb,var(--ink)_45%,transparent)] transition-transform duration-200 ${
            open ? "rotate-180 text-[var(--signal)]" : "group-hover:text-[var(--ink)]"
          }`}
          aria-hidden="true"
        />
      </button>

      {/* Desktop Popover (ancorado logo abaixo do avatar) */}
      {open && (
        <div
          role="dialog"
          aria-label="Gerenciamento de Conta"
          className="hidden lg:block absolute right-0 top-full mt-2 w-80 z-50 rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow-lg)]"
        >
          <MenuContent />
        </div>
      )}

      {/* Mobile Bottom Sheet (renderizado no body via Portal para não ser preso pelo header) */}
      {mounted &&
        open &&
        createPortal(
          <div className="lg:hidden">
            <div
              className="fixed inset-0 z-40 bg-black/50 backdrop-blur-xs transition-opacity"
              onClick={() => setOpen(false)}
              aria-hidden="true"
            />
            <div
              ref={sheetRef}
              role="dialog"
              aria-modal="true"
              aria-label="Gerenciamento de Conta"
              className="fixed inset-x-0 bottom-0 z-50 rounded-t-[24px] border-t border-[var(--line)] bg-[var(--surface)] p-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[var(--line)]" />
              <MenuContent />
            </div>
          </div>,
          document.body,
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
