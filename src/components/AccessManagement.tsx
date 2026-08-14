"use client";

import { useCallback, useEffect, useState } from "react";
import { MailPlus, RefreshCw, Trash2, UserCheck } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type AllowedEmail = {
  email: string;
  role: "owner" | "member";
  added_at: string;
};

type AccessRequest = {
  email: string;
  requested_at: string;
};

function shortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function AccessManagement() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState<AllowedEmail[]>([]);
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [email, setEmail] = useState("");
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const { data: admin, error: adminError } = await supabase.rpc(
      "current_user_is_access_admin",
    );
    if (adminError || !admin) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    setIsAdmin(true);
    const [allowRes, requestsRes] = await Promise.all([
      supabase
        .from("access_allowlist")
        .select("email, role, added_at")
        .order("added_at"),
      supabase
        .from("access_requests")
        .select("email, requested_at")
        .order("requested_at"),
    ]);
    setAllowed((allowRes.data ?? []) as AllowedEmail[]);
    setRequests((requestsRes.data ?? []) as AccessRequest[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(id);
  }, [load]);

  async function invite(rawEmail: string) {
    const normalized = rawEmail.trim().toLowerCase();
    if (!normalized) return;
    setBusyEmail(normalized);
    setMessage(null);
    try {
      const response = await fetch("/api/access/invite", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: normalized }),
      });
      const result = (await response.json()) as {
        error?: string;
        message?: string;
      };
      if (!response.ok) throw new Error(result.error ?? "Falha ao liberar.");
      setEmail("");
      setMessage(result.message ?? "Acesso liberado.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Não foi possível liberar.",
      );
    } finally {
      setBusyEmail(null);
    }
  }

  async function revoke(item: AllowedEmail) {
    if (item.role === "owner") return;
    if (!window.confirm(`Remover o acesso de ${item.email}?`)) return;
    setBusyEmail(item.email);
    setMessage(null);
    const supabase = createClient();
    const { error } = await supabase
      .from("access_allowlist")
      .delete()
      .eq("email", item.email);
    setBusyEmail(null);
    setMessage(
      error ? "Não foi possível remover o acesso." : "Acesso removido.",
    );
    if (!error) await load();
  }

  if (loading || !isAdmin) return null;

  return (
    <section className="surface mt-4 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
            Acessos
          </h2>
          <p className="mt-1 text-xs opacity-55">
            Só os e-mails desta lista podem usar o Foco.
          </p>
        </div>
        <button
          type="button"
          title="Atualizar lista"
          aria-label="Atualizar lista"
          className="rounded-full p-2 opacity-55 transition hover:bg-[var(--mist)] hover:opacity-100"
          onClick={() => void load()}
        >
          <RefreshCw size={16} />
        </button>
      </div>

      {requests.length > 0 && (
        <div className="mt-4 rounded-[var(--radius-btn)] border border-[color-mix(in_srgb,var(--signal)_30%,var(--line))] bg-[color-mix(in_srgb,var(--signal)_8%,var(--surface))] p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-[var(--signal)]">
            Pedidos de demonstração
          </p>
          <div className="mt-2 space-y-2">
            {requests.map((request) => (
              <div
                key={request.email}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{request.email}</p>
                  <p className="text-xs opacity-50">
                    Solicitado em {shortDate(request.requested_at)}
                  </p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary px-3 py-2 text-xs"
                  disabled={busyEmail === request.email}
                  onClick={() => void invite(request.email)}
                >
                  <UserCheck size={14} />
                  Liberar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <form
        className="mt-4 flex flex-col gap-2 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          void invite(email);
        }}
      >
        <input
          className="input min-w-0 flex-1"
          type="email"
          required
          placeholder="E-mail para liberar"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
        />
        <button type="submit" className="btn btn-primary" disabled={Boolean(busyEmail)}>
          <MailPlus size={16} />
          Liberar e convidar
        </button>
      </form>

      <div className="mt-4 divide-y divide-[var(--line)] border-t border-[var(--line)]">
        {allowed.map((item) => (
          <div
            key={item.email}
            className="flex items-center justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{item.email}</p>
              <p className="text-xs opacity-50">
                {item.role === "owner" ? "Proprietário" : "Acesso desde"}{" "}
                {shortDate(item.added_at)}
              </p>
            </div>
            {item.role !== "owner" && (
              <button
                type="button"
                title="Remover acesso"
                aria-label={`Remover acesso de ${item.email}`}
                className="rounded-full p-2 text-[var(--warn)] transition hover:bg-[var(--warn-soft)]"
                disabled={busyEmail === item.email}
                onClick={() => void revoke(item)}
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        ))}
      </div>

      {message && <p className="mt-3 text-sm opacity-70">{message}</p>}
    </section>
  );
}
