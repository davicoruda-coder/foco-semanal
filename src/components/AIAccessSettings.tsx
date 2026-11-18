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
  Zap,
  Cpu,
  Brain,
  Globe,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  AI_PROVIDERS,
  PROVIDER_LIST,
  detectProvider,
  getDefaultModelForProvider,
} from "@/lib/ai/providers";
import type { AIProviderId, AIProviderMeta } from "@/lib/ai/types";

export function getProviderIcon(providerId: AIProviderId) {
  switch (providerId) {
    case "google":
      return <Sparkles size={16} className="text-amber-500" />;
    case "groq":
      return <Zap size={16} className="text-emerald-500" />;
    case "openai":
      return <Bot size={16} className="text-sky-500" />;
    case "anthropic":
      return <Brain size={16} className="text-amber-600 dark:text-amber-400" />;
    case "deepseek":
      return <Cpu size={16} className="text-indigo-500" />;
    case "openrouter":
    default:
      return <Globe size={16} className="text-purple-500" />;
  }
}

export function getModelDisplayName(modelId?: string | null, providerId?: AIProviderId): string {
  if (!modelId) return "Padrão do Sistema";
  if (providerId && AI_PROVIDERS[providerId]) {
    const match = AI_PROVIDERS[providerId].models.find((m) => m.id === modelId);
    if (match) return match.label;
  }
  for (const p of PROVIDER_LIST) {
    const match = p.models.find((m) => m.id === modelId);
    if (match) return `${match.label} (${p.name})`;
  }
  return modelId;
}

interface MemberAIConfig {
  configured: boolean;
  provider?: AIProviderId;
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
  const [selectedProvider, setSelectedProvider] = useState<AIProviderId>("google");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [selectedModel, setSelectedModel] = useState("gemini-2.5-flash");
  const [customModel, setCustomModel] = useState("");
  const [limitEnabled, setLimitEnabled] = useState(true);
  const [dailyLimit, setDailyLimit] = useState(15);
  const [customPrompt, setCustomPrompt] = useState("");

  // Status state
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [sourceInfo, setSourceInfo] = useState<string | null>(null);

  const currentProviderMeta: AIProviderMeta = AI_PROVIDERS[selectedProvider] || AI_PROVIDERS.google;

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
        const prov = (data.provider as AIProviderId) || "google";
        setSelectedProvider(prov);
        setApiKey(data.apiKey || "");
        setLimitEnabled(data.limitEnabled ?? true);
        setDailyLimit(data.dailyLimit || 15);
        setCustomPrompt(data.customPrompt || "");

        const loadedModel = data.model || getDefaultModelForProvider(prov);
        const meta = AI_PROVIDERS[prov];
        const isPreset = meta?.models.some((o) => o.id === loadedModel);

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
    const id = window.setTimeout(() => void loadConfig(), 0);
    return () => window.clearTimeout(id);
  }, [loadConfig]);

  // Ao trocar o provedor manualmente
  const handleProviderChange = (newProv: AIProviderId) => {
    setSelectedProvider(newProv);
    const meta = AI_PROVIDERS[newProv];
    setSelectedModel(meta.defaultModel);
    setCustomModel("");
    setTestResult(null);
  };

  // Auto-detecção de chave ao colar
  const handleKeyChange = (val: string) => {
    setApiKey(val);
    const trimmed = val.trim();
    if (!trimmed) return;

    const detected = detectProvider(trimmed, selectedModel, null);
    if (detected !== selectedProvider) {
      setSelectedProvider(detected);
      setSelectedModel(getDefaultModelForProvider(detected));
      setCustomModel("");
    }
  };

  // Testar conexão
  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestResult({ ok: false, msg: "Digite a chave de API antes de testar." });
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
          provider: selectedProvider,
          apiKey: apiKey.trim(),
          model: modelToTest,
          testOnly: true,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, msg: data.message || "Conexão estabelecida com sucesso!" });
      } else {
        setTestResult({ ok: false, msg: data.error || "Falha ao validar com o provedor." });
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
          provider: selectedProvider,
          apiKey: apiKey.trim(),
          model: finalModel,
          limitEnabled,
          dailyLimit: Number(dailyLimit) || 15,
          customPrompt: customPrompt.trim(),
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

  // --- Visão de Membro Comum (Visualizar Provedor e Cota de IA) ---
  if (!isAdmin) {
    const activeProv = memberConfig?.provider || "google";
    const provMeta = AI_PROVIDERS[activeProv] || AI_PROVIDERS.google;

    return (
      <section id="ia" className="surface mt-4 p-4 md:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3">
          <div className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--signal-soft)] text-[var(--signal)]">
              <Sparkles size={18} />
            </div>
            <div>
              <h2 className="font-display text-base font-semibold tracking-tight md:text-lg">
                Inteligência Artificial (Estudos & Revisão)
              </h2>
              <p className="text-xs opacity-60">
                Arquiteto de ciclos, elaboração de flashcards, quizzes e resolução didática de dúvidas.
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
              {getProviderIcon(activeProv)}
              {provMeta.name}
            </p>
            <p className="mt-1 text-xs text-[var(--ink-soft)]">
              {provMeta.description}
            </p>
            <p className="mt-2 text-[11px] opacity-60">
              Gerenciado pelo Administrador Master da plataforma.
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

  // --- Visão de Administrador Master (Configurar Provedor e Modelo) ---
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
              Inteligência Artificial (Multi-Provedores)
            </h2>
            <p className="text-xs opacity-60">
              Escolha seu provedor preferido (Google Gemini Grátis, Groq, OpenAI, Anthropic, DeepSeek ou OpenRouter) e configure a chave central.
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

      {/* Banner de Provedor & Modelo Ativo */}
      <div className="mt-3.5 rounded-xl border border-[var(--signal)]/30 bg-[var(--signal-soft)]/30 p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1 rounded-lg bg-[var(--surface)] shrink-0">
            {getProviderIcon(selectedProvider)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--signal)]">
                {currentProviderMeta.name}
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                {currentProviderMeta.badge}
              </span>
            </div>
            <p className="text-xs font-semibold text-[var(--ink)] mt-0.5">
              {getModelDisplayName(currentActiveModelId, selectedProvider)}
            </p>
            <p className="font-mono text-[11px] text-[var(--ink-soft)]">
              {currentActiveModelId || "Nenhum modelo selecionado"}
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={(e) => void handleSave(e)} className="mt-4 space-y-4">
        {/* Seletor de Provedor */}
        <div>
          <label className="text-xs font-semibold text-[var(--ink)] mb-2 flex items-center gap-1.5">
            <Globe size={14} className="text-[var(--signal)]" />
            Selecione o Provedor de IA
          </label>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PROVIDER_LIST.map((prov) => {
              const isSelected = selectedProvider === prov.id;
              return (
                <button
                  type="button"
                  key={prov.id}
                  onClick={() => handleProviderChange(prov.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    isSelected
                      ? "border-[var(--signal)] bg-[var(--signal-soft)]/20 shadow-sm ring-1 ring-[var(--signal)]"
                      : "border-[var(--line)] bg-[var(--surface-soft)] hover:bg-[var(--surface-hover)]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1.5">
                      {getProviderIcon(prov.id)}
                      <span className="text-xs font-semibold text-[var(--ink)] leading-tight">
                        {prov.name.split(" ")[0]}
                      </span>
                    </div>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-[var(--surface)] text-[var(--ink-soft)] border border-[var(--line)]">
                      {prov.badge.split(" ")[0]}
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--ink-soft)] line-clamp-2 leading-tight">
                    {prov.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* API Key */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-[var(--ink)] flex items-center gap-1.5">
              <Key size={14} className="text-[var(--signal)]" />
              {currentProviderMeta.keyLabel}
            </label>
            <a
              href={currentProviderMeta.keyHelpUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--signal)] hover:underline inline-flex items-center gap-1"
            >
              Obter chave {currentProviderMeta.name.split(" ")[0]} <ExternalLink size={11} />
            </a>
          </div>

          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              required
              placeholder={currentProviderMeta.keyPlaceholder}
              value={apiKey}
              onChange={(e) => handleKeyChange(e.target.value)}
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
            {currentProviderMeta.keyPrefixHint}. A chave é criptografada e armazenada com segurança no banco.
          </p>
        </div>

        {/* Modelo */}
        <div>
          <label className="text-xs font-medium text-[var(--ink)] mb-1.5 flex items-center gap-1.5">
            <Sliders size={14} className="text-[var(--signal)]" />
            Escolher Modelo ({currentProviderMeta.name})
          </label>
          <select
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            className="input w-full text-xs sm:text-sm"
          >
            {currentProviderMeta.models.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
            <option value="custom">Outro modelo (digitar identificador)</option>
          </select>

          {selectedModel === "custom" && (
            <div className="mt-2">
              <input
                type="text"
                required
                placeholder="Ex: gemini-2.5-flash ou gpt-4o"
                value={customModel}
                onChange={(e) => setCustomModel(e.target.value)}
                className="input w-full font-mono text-xs sm:text-sm"
              />
              <p className="mt-1 text-[11px] opacity-50">
                Insira o identificador exato do modelo aceito pelo provedor selecionado.
              </p>
            </div>
          )}
        </div>

        {/* Diretrizes & Comportamento Personalizado da IA */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-[var(--ink)] flex items-center gap-1.5">
              <Bot size={15} className="text-[var(--signal)]" />
              Diretrizes & Comportamento da IA (Opcional)
            </label>
            <span className="text-[10px] font-mono text-[color-mix(in_srgb,var(--ink)_50%,transparent)]">
              {customPrompt.length}/2000
            </span>
          </div>

          <p className="text-[11px] text-[color-mix(in_srgb,var(--ink)_65%,transparent)] leading-relaxed">
            Instruções pedagógicas adicionais sobre como a IA deve responder dúvidas e gerar flashcards (ex: focar em bancas como FGV/Cebraspe, tom didático ou instruções específicas).
          </p>

          <textarea
            rows={3}
            maxLength={2000}
            placeholder="Ex: Priorize explicações didáticas com foco em concursos e faculdade. Se o aluno enviar uma dúvida fora do escopo de estudos, responda com cordialidade orientando o retorno ao foco."
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            className="input w-full text-xs sm:text-sm py-2 leading-relaxed resize-y font-normal"
          />

          <p className="text-[10px] text-[var(--signal)] flex items-center gap-1">
            <Sparkles size={11} className="shrink-0" />
            <span>As regras estruturais de segurança e formatação JSON continuam garantidas em todos os provedores.</span>
          </p>
        </div>

        {/* Limite Diário */}
        <div className="rounded-xl border border-[var(--line)] bg-[var(--surface-soft)] p-3.5 space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <div className="pr-4">
              <span className="text-xs sm:text-sm font-medium text-[var(--ink)] block">
                Ativar limite diário por usuário
              </span>
              <span className="text-[11px] opacity-60 block">
                Controla o total de vezes que cada aluno/membro pode usar a IA (Ciclo, Flashcards, Quiz e Tira-Dúvidas) por dia.
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
                  Cota compartilhada por aluno entre gerar flashcards, quizzes e tirar dúvidas.
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
              ✓ Limite desativado: todos os usuários podem usar os recursos de IA livremente.
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
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
          >
            {testing ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Wifi size={14} />
            )}
            {testing ? "Testando conexão..." : "Testar Conexão"}
          </button>

          <button
            type="submit"
            disabled={saving || testing || !apiKey.trim()}
            className="btn btn-primary btn-sm flex items-center gap-1.5"
          >
            {saving ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Save size={14} />
            )}
            {saving ? "Salvando..." : "Salvar Configurações"}
          </button>
        </div>
      </form>
    </section>
  );
}
