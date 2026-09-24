"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Save,
  Sliders,
  Sparkles,
  Wifi,
  Bot,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export const MODEL_OPTIONS = [
  {
    id: "google/gemini-2.5-flash",
    label: "Google Gemini 2.5 Flash (Recomendado — Rápido, Inteligente e Econômico)",
    badge: "Recomendado",
  },
  {
    id: "google/gemini-2.5-flash-lite",
    label: "Google Gemini 2.5 Flash Lite (Ultra Rápido e Muito Barato)",
    badge: "Mais Rápido",
  },
  {
    id: "google/gemini-3.8-flash",
    label: "Google Gemini 3.8 Flash (Nova Geração)",
    badge: "Novo",
  },
  {
    id: "deepseek/deepseek-chat",
    label: "DeepSeek V3 (Excelente para provas e concursos em português)",
    badge: "Alta Qualidade",
  },
  {
    id: "openai/gpt-4o-mini",
    label: "OpenAI GPT-4o Mini (Alta confiabilidade)",
    badge: "OpenAI",
  },
  {
    id: "custom",
    label: "Outro modelo (digitar identificador do OpenRouter)",
    badge: "Personalizado",
  },
];

export function getModelDisplayName(modelId?: string | null): string {
  if (!modelId) return "Google Gemini 2.5 Flash";
  const match = MODEL_OPTIONS.find((m) => m.id === modelId);
  if (match && match.id !== "custom") return match.label;
  if (modelId === "google/gemini-2.0-flash-001") return "Google Gemini 2.5 Flash (atualizado)";
  return modelId;
}

interface MemberAIConfig {
  configured: boolean;
  isMaster: boolean;
  limitEnabled: boolean;
  dailyLimit: number;
  generationsToday: number;
  remaining: number | null;
  model?: string;
}

export function AIAccessSettings() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [memberConfig, setMemberConfig] = useState<MemberAIConfig | null>(null);

  // Form state (Master)
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-flash");
  const [customModel, setCustomModel] = useState("");
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(15);

  // Status state
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sourceInfo, setSourceInfo] = useState<string | null>(null);

  // Carregar dados
  const loadConfig = useCallback(async () => {
    try {
      const supabase = createClient();
      const { data: admin, error: adminError } = await supabase.rpc(
        "current_user_is_access_admin",
      );

      if (adminError || !admin) {
        setIsAdmin(false);
        // Membros buscam configuração pública
        try {
          const res = await fetch("/api/revisao/config-ia");
          if (res.ok) {
            const data = (await res.json()) as MemberAIConfig;
            setMemberConfig(data);
          }
        } catch {
          // ignore
        }
        setLoading(false);
        return;
      }

      setIsAdmin(true);

      const res = await fetch("/api/admin/ai-settings");
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.apiKey || "");
        setLimitEnabled(data.limitEnabled ?? true);
        setDailyLimit(data.dailyLimit || 15);

        let loadedModel = data.model || "google/gemini-2.5-flash";
        // Migração de modelos descontinuados
        if (loadedModel === "google/gemini-2.0-flash-001" || loadedModel === "anthropic/claude-3.5-haiku") {
          loadedModel = "google/gemini-2.5-flash";
        }

        const isPreset = MODEL_OPTIONS.some((o) => o.id === loadedModel);
        if (isPreset) {
          setSelectedModel(loadedModel);
        } else {
          setSelectedModel("custom");
          setCustomModel(loadedModel);
        }

        if (data.source === "database") {
          setSourceInfo("Configurações ativas carregadas do banco de dados.");
        } else if (data.source === "env") {
          setSourceInfo("Carregado inicialmente de variáveis de ambiente (.env).");
        }
      }
    } catch (err) {
      console.error("[AIAccessSettings] erro ao carregar:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadConfig();
  }, [loadConfig]);

  // Testar conexão
  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({ ok: false, msg: "Digite a API Key antes de testar." });
      return;
    }

    setTesting(true);
    setTestResult(null);

    const modelToTest = selectedModel === "custom" ? customModel.trim() : selectedModel;

    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          model: modelToTest,
          testOnly: true,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, msg: data.message || "Conexão estabelecida com sucesso!" });
      } else {
        setTestResult({ ok: false, msg: data.error || "Falha ao validar com o OpenRouter." });
      }
    } catch {
      setTestResult({ ok: false, msg: "Erro de conexão ao testar com o servidor." });
    } finally {
      setTesting(false);
    }
  };

  // Salvar
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!apiKey.trim()) {
      setSaveResult({ ok: false, msg: "A chave de API não pode ficar vazia." });
      return;
    }

    const finalModel = selectedModel === "custom" ? customModel.trim() : selectedModel;
    if (!finalModel) {
      setSaveResult({ ok: false, msg: "Informe o identificador do modelo." });
      return;
    }

    setSaving(true);
    setSaveResult(null);

    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim(),
          model: finalModel,
          limitEnabled,
          dailyLimit: Number(dailyLimit) || 15,
          testOnly: false,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setSaveResult({ ok: true, msg: "Configurações salvas com sucesso no banco!" });
        setSourceInfo("Salvo no banco de dados.");
        setTimeout(() => setSaveResult(null), 4000);
      } else {
        setSaveResult({ ok: false, msg: data.error || "Erro ao salvar as configurações." });
      }
    } catch {
      setSaveResult({ ok: false, msg: "Falha de rede ao tentar salvar." });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return null;
  }

  // --- Visão de Membro Comum (Visualizar Modelo de IA) ---
  if (!isAdmin) {
    return (
      <section id="ia" className="surface mt-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--signal-soft)] text-[var(--signal)]">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
                Inteligência Artificial (Revisão & Flashcards)
              </h2>
              <p className="text-xs opacity-60">
                Recursos inteligentes para elaboração de flashcards e resolução didática de dúvidas.
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[var(--surface-soft)] px-2.5 py-0.5 text-xs font-medium text-[var(--ink-soft)]">
            Membro
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {/* Card do Motor de IA */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3.5">
            <span className="text-[11px] font-semibold text-[var(--signal)] uppercase tracking-wider block mb-1">
              Motor de IA Integrado
            </span>
            <p className="text-sm font-semibold text-[var(--ink)] flex items-center gap-1.5">
              <Bot size={16} className="text-[var(--signal)]" />
              IA FocoHub
            </p>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              Pronta para criar flashcards, resumos e explicar dúvidas com passo a passo.
            </p>
            <p className="mt-2 text-[11px] opacity-60">
              Otimizado e gerenciado pelo Administrador da plataforma.
            </p>
          </div>

          {/* Card de Cotas / Limites */}
          <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3.5">
            <span className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider block mb-1">
              Seu Limite de Gerações
            </span>
            <p className="text-sm font-semibold text-[var(--ink)]">
              {!memberConfig?.limitEnabled
                ? "Gerações Ilimitadas"
                : `${memberConfig?.remaining ?? 0} restante${(memberConfig?.remaining ?? 0) !== 1 ? "s" : ""} hoje`}
            </p>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              {!memberConfig?.limitEnabled
                ? "Uso liberado sem limite diário."
                : `Permite ${memberConfig?.dailyLimit ?? 15} gerações por dia.`}
            </p>
          </div>
        </div>
      </section>
    );
  }

  // --- Visão de Administrador Master (Escolher e Configurar Modelo) ---
  const currentActiveModelId = selectedModel === "custom" ? customModel : selectedModel;

  return (
    <section id="ia" className="surface mt-4 p-4 md:p-5">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
        <div className="flex items-center gap-2">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--signal-soft)] text-[var(--signal)]">
            <Sparkles size={18} />
          </div>
          <div>
            <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
              Inteligência Artificial (Flashcards & Tira-Dúvidas)
            </h2>
            <p className="text-xs opacity-60">
              Configure a chave da API e escolha o modelo central que abastecerá tanto os Flashcards quanto o Tira-Dúvidas.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-[var(--signal-soft)] px-2.5 py-0.5 text-xs font-semibold text-[var(--signal)]">
          Acesso Master
        </span>
      </div>

      {sourceInfo && (
        <p className="mt-2 text-xs opacity-50 italic">{sourceInfo}</p>
      )}

      {/* Banner de Modelo Ativo */}
      <div className="mt-3.5 rounded-xl border border-[var(--signal)]/30 bg-[var(--signal-soft)]/30 p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Bot size={18} className="text-[var(--signal)] shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--signal)]">
                Modelo Ativo no Sistema (Flashcards & Tira-Dúvidas)
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Pronto para Responder
              </span>
            </div>
            <p className="text-xs font-semibold text-[var(--ink)] mt-0.5">
              {getModelDisplayName(currentActiveModelId)}
            </p>
            <p className="font-mono text-[11px] text-[var(--ink-soft)]">
              {currentActiveModelId || "Nenhum modelo selecionado"}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={(e) => void handleSave(e)} className="mt-4 space-y-4">
        {/* API Key */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-[var(--ink)] flex items-center gap-1.5">
              <Key size={14} className="text-[var(--signal)]" />
              OpenRouter API Key
            </label>
            <a
              href="https://openrouter.ai/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--signal)] hover:underline inline-flex items-center gap-1"
            >
              Obter chave no OpenRouter <ExternalLink size={11} />
            </a>
          </div>

          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              required
              placeholder="sk-or-v1-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input w-full pr-11 font-mono text-xs sm:text-sm"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="button"
              title={showKey ? "Ocultar chave" : "Mostrar chave"}
              aria-label={showKey ? "Ocultar chave" : "Mostrar chave"}
              className="absolute inset-y-0 right-1 grid w-10 place-items-center opacity-50 transition hover:opacity-100"
              onClick={() => setShowKey((v) => !v)}
            >
              {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <p className="mt-1 text-[11px] opacity-60">
            A chave é armazenada com segurança no banco e nunca é compartilhada com membros comuns.
          </p>
        </div>

        {/* Modelo */}
        <div>
          <label className="text-xs font-medium text-[var(--ink)] mb-1.5 flex items-center gap-1.5">
            <Sliders size={14} className="text-[var(--signal)]" />
            Escolher Modelo de IA (Flashcards & Tira-Dúvidas)
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="input w-full text-xs sm:text-sm"
          >
            {MODEL_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
          <p className="mt-1 text-[11px] opacity-60">
            Este modelo único alimentará tanto a criação de Flashcards quanto o Professor IA / Tira-Dúvidas.
          </p>

          {selectedModel === "custom" && (
            <div className="mt-2">
              <input
                type="text"
                required
                placeholder="Ex: meta-llama/llama-3.3-70b-instruct"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                className="input w-full font-mono text-xs sm:text-sm"
              />
              <p className="mt-1 text-[11px] opacity-50">
                Insira o ID exato do modelo conforme listado no catálogo do OpenRouter.
              </p>
            </div>
          )}
        </div>

        {/* Limite Diário */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3.5 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="pr-4">
              <span className="text-xs sm:text-sm font-medium text-[var(--ink)] block">
                Ativar limite diário por usuário
              </span>
              <span className="text-[11px] opacity-60 block">
                Controla o total de vezes que cada aluno/membro pode usar a IA (Flashcards + Tira-Dúvidas) por dia.
              </span>
            </div>
            <input
              type="checkbox"
              className="toggle h-5 w-5 accent-[var(--signal)] cursor-pointer"
              checked={limitEnabled}
              onChange={(e) => setLimitEnabled(e.target.checked)}
            />
          </label>

          {limitEnabled ? (
            <div className="pt-2 border-t border-[var(--line)] flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--ink)]">
                  Gerações permitidas por dia:
                </label>
                <span className="text-[11px] opacity-50">
                  Cota compartilhada por aluno entre gerar flashcards e tirar dúvidas.
                </span>
              </div>
              <input
                type="number"
                min={1}
                max={100}
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="input w-24 text-center font-bold"
              />
            </div>
          ) : (
            <p className="text-xs text-[var(--signal)] font-medium pt-1">
              ✓ Limite desativado: todos os usuários podem usar Flashcards e Tira-Dúvidas livremente.
            </p>
          )}

          <div className="rounded-lg bg-[var(--signal-soft)]/50 px-2.5 py-1.5 text-[11px] text-[var(--signal)] flex items-center gap-1.5">
            <Sparkles size={12} className="shrink-0" />
            <span>
              <strong>Nota Master:</strong> Você (proprietário) sempre terá uso ilimitado, independente desta regra.
            </span>
          </div>
        </div>

        {/* Mensagens de feedback de Teste e Salvar */}
        {testResult && (
          <div
            className={`flex items-center gap-2 rounded-lg p-2.5 text-xs ${
              testResult.ok
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/20"
            }`}
          >
            {testResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{testResult.msg}</span>
          </div>
        )}

        {saveResult && (
          <div
            className={`flex items-center gap-2 rounded-lg p-2.5 text-xs ${
              saveResult.ok
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                : "bg-[var(--warn-soft)] text-[var(--warn)] border border-[var(--warn)]/20"
            }`}
          >
            {saveResult.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
            <span>{saveResult.msg}</span>
          </div>
        )}

        {/* Botões de Ação */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          <button
            type="button"
            onClick={() => void handleTest()}
            disabled={testing || saving || !apiKey.trim()}
            className="btn btn-secondary text-xs sm:text-sm flex items-center gap-1.5"
          >
            {testing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Wifi size={15} />
            )}
            {testing ? "Testando conexão e modelo..." : "Testar Conexão"}
          </button>

          <button
            type="submit"
            disabled={saving || testing || !apiKey.trim()}
            className="btn btn-primary text-xs sm:text-sm flex items-center gap-1.5"
          >
            {saving ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Save size={15} />
            )}
            {saving ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </form>
    </section>
  );
}
