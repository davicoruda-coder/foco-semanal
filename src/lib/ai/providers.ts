import type { AIProviderId, AIProviderMeta } from "./types";

export const AI_PROVIDERS: Record<AIProviderId, AIProviderMeta> = {
  google: {
    id: "google",
    name: "Google Gemini (AI Studio)",
    badge: "Grátis & Recomendado",
    description: "Plano gratuito oficial com centenas de requisições por dia. Rápido, inteligente e excelente para estudos.",
    keyHelpUrl: "https://aistudio.google.com/app/apikey",
    keyLabel: "Chave de API do Google AI Studio",
    keyPlaceholder: "AIzaSy...",
    keyPrefixHint: "Inicia geralmente com AIzaSy...",
    supportsVision: true,
    supportsJsonFormat: true,
    defaultModel: "gemini-2.5-flash",
    models: [
      {
        id: "gemini-2.5-flash",
        label: "Gemini 2.5 Flash (Recomendado — Alta velocidade, raciocínio e visão)",
        badge: "Recomendado",
        recommended: true,
      },
      {
        id: "gemini-2.5-flash-lite",
        label: "Gemini 2.5 Flash Lite (Ultra Rápido e Leve)",
        badge: "Mais Rápido",
      },
      {
        id: "gemini-1.5-pro",
        label: "Gemini 1.5 Pro (Raciocínio Profundo para Textos Longos e PDFs)",
        badge: "Avançado",
      },
      {
        id: "gemini-2.0-flash",
        label: "Gemini 2.0 Flash (Geração 2.0)",
      },
    ],
  },
  groq: {
    id: "groq",
    name: "Groq (Llama / DeepSeek)",
    badge: "Ultra Rápido",
    description: "Hardware especializado com respostas quase instantâneas. Possui plano gratuito generoso.",
    keyHelpUrl: "https://console.groq.com/keys",
    keyLabel: "Chave de API da Groq",
    keyPlaceholder: "gsk_...",
    keyPrefixHint: "Inicia geralmente com gsk_...",
    supportsVision: true,
    supportsJsonFormat: true,
    defaultModel: "llama-3.3-70b-versatile",
    models: [
      {
        id: "llama-3.3-70b-versatile",
        label: "Llama 3.3 70B Versatile (Muito inteligente e rápido)",
        badge: "Recomendado",
        recommended: true,
      },
      {
        id: "llama-3.1-8b-instant",
        label: "Llama 3.1 8B Instant (Velocidade Extrema)",
        badge: "Ultra Rápido",
      },
      {
        id: "deepseek-r1-distill-llama-70b",
        label: "DeepSeek R1 Distill 70B (Raciocínio Lógico e Passo a Passo)",
        badge: "Raciocínio",
      },
      {
        id: "llama-3.2-11b-vision-preview",
        label: "Llama 3.2 11B Vision (Multimodal / Imagens)",
        badge: "Visão",
      },
    ],
  },
  openai: {
    id: "openai",
    name: "OpenAI (ChatGPT)",
    badge: "Oficial",
    description: "Modelos oficiais GPT-4o e GPT-4o Mini da OpenAI com excelente suporte a JSON e visão.",
    keyHelpUrl: "https://platform.openai.com/api-keys",
    keyLabel: "Chave de API da OpenAI",
    keyPlaceholder: "sk-...",
    keyPrefixHint: "Inicia com sk- ou sk-proj-...",
    supportsVision: true,
    supportsJsonFormat: true,
    defaultModel: "gpt-4o-mini",
    models: [
      {
        id: "gpt-4o-mini",
        label: "GPT-4o Mini (Recomendado — Rápido, Inteligente e Econômico)",
        badge: "Recomendado",
        recommended: true,
      },
      {
        id: "gpt-4o",
        label: "GPT-4o (Modelo Topo de Linha)",
        badge: "Avançado",
      },
      {
        id: "o3-mini",
        label: "o3-mini (Raciocínio Analítico para Provas Complexas)",
        badge: "Raciocínio",
      },
    ],
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic (Claude)",
    badge: "Alta Precisão",
    description: "Modelos Claude 3.5 com excelente capacidade de redação, didática e análise de enunciados.",
    keyHelpUrl: "https://console.anthropic.com/settings/keys",
    keyLabel: "Chave de API da Anthropic",
    keyPlaceholder: "sk-ant-...",
    keyPrefixHint: "Inicia com sk-ant-...",
    supportsVision: true,
    supportsJsonFormat: true,
    defaultModel: "claude-3-5-haiku-latest",
    models: [
      {
        id: "claude-3-5-haiku-latest",
        label: "Claude 3.5 Haiku (Rápido, Didático e Econômico)",
        badge: "Recomendado",
        recommended: true,
      },
      {
        id: "claude-3-5-sonnet-latest",
        label: "Claude 3.5 Sonnet (Máxima Precisão e Raciocínio)",
        badge: "Avançado",
      },
    ],
  },
  deepseek: {
    id: "deepseek",
    name: "DeepSeek (Direto)",
    badge: "Custo Ultrabaixo",
    description: "Modelos DeepSeek V3 e R1 direto da fonte. Custo ínfimo e excelente rendimento em português.",
    keyHelpUrl: "https://platform.deepseek.com/api_keys",
    keyLabel: "Chave de API da DeepSeek",
    keyPlaceholder: "sk-...",
    keyPrefixHint: "Inicia com sk-...",
    supportsVision: false,
    supportsJsonFormat: true,
    defaultModel: "deepseek-chat",
    models: [
      {
        id: "deepseek-chat",
        label: "DeepSeek V3 (Excelente para provas, exames e estudos em português)",
        badge: "Recomendado",
        recommended: true,
      },
      {
        id: "deepseek-reasoner",
        label: "DeepSeek R1 (Raciocínio Profundo / Chain of Thought)",
        badge: "Raciocínio",
      },
    ],
  },
  openrouter: {
    id: "openrouter",
    name: "OpenRouter (Hub Universal)",
    badge: "Universal",
    description: "Acesso unificado a centenas de modelos usando apenas uma única conta/saldo.",
    keyHelpUrl: "https://openrouter.ai/keys",
    keyLabel: "Chave de API do OpenRouter",
    keyPlaceholder: "sk-or-v1-...",
    keyPrefixHint: "Inicia com sk-or-v1-...",
    supportsVision: true,
    supportsJsonFormat: true,
    defaultModel: "google/gemini-2.5-flash",
    models: [
      {
        id: "google/gemini-2.5-flash",
        label: "Google Gemini 2.5 Flash via OpenRouter",
        badge: "Recomendado",
        recommended: true,
      },
      {
        id: "deepseek/deepseek-chat",
        label: "DeepSeek V3 via OpenRouter",
        badge: "Econômico",
      },
      {
        id: "openai/gpt-4o-mini",
        label: "OpenAI GPT-4o Mini via OpenRouter",
      },
      {
        id: "anthropic/claude-3.5-haiku",
        label: "Claude 3.5 Haiku via OpenRouter",
      },
    ],
  },
};

export const PROVIDER_LIST: AIProviderMeta[] = Object.values(AI_PROVIDERS);

/** Detecta automaticamente o provedor baseado no formato da chave ou no modelo selecionado */
export function detectProvider(
  apiKey: string,
  model?: string | null,
  explicitProvider?: string | null,
): AIProviderId {
  const cleanExplicit = explicitProvider?.trim() as AIProviderId | undefined;
  if (cleanExplicit && AI_PROVIDERS[cleanExplicit]) {
    return cleanExplicit;
  }

  const key = apiKey.trim();
  const m = (model || "").trim();

  if (key.startsWith("AIzaSy") || key.startsWith("AIza")) {
    return "google";
  }
  if (key.startsWith("sk-ant-")) {
    return "anthropic";
  }
  if (key.startsWith("gsk_")) {
    return "groq";
  }
  if (key.startsWith("sk-or-")) {
    return "openrouter";
  }

  // Se o modelo tem prefixo de barra comum no OpenRouter (ex: "google/gemini-...", "deepseek/...")
  if (m.includes("/")) {
    return "openrouter";
  }

  if (m.startsWith("gemini-")) {
    return "google";
  }
  if (m.startsWith("gpt-") || m.startsWith("o3-")) {
    return "openai";
  }
  if (m.startsWith("claude-")) {
    return "anthropic";
  }
  if (m.startsWith("llama-") || m.includes("distill")) {
    return "groq";
  }
  if (m.startsWith("deepseek-")) {
    return "deepseek";
  }

  return "google";
}

/** Retorna o modelo padrão apropriado para um provedor */
export function getDefaultModelForProvider(providerId: AIProviderId): string {
  return AI_PROVIDERS[providerId]?.defaultModel || "gemini-2.5-flash";
}

/** Mapeamento de modelos legados ou obsoletos para versões atuais */
export const DEPRECATED_MODEL_MAP: Record<string, string> = {
  "google/gemini-2.0-flash-001": "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku": "google/gemini-2.5-flash",
  "anthropic/claude-3.5-haiku-20241022": "google/gemini-2.5-flash",
  "gemini-2.0-flash-001": "gemini-2.5-flash",
  "claude-3-5-haiku": "claude-3-5-haiku-latest",
  "claude-3-5-sonnet": "claude-3-5-sonnet-latest",
};

export function resolveAIModel(rawModel?: string | null, providerId?: AIProviderId): string {
  const trimmed = rawModel?.trim();
  if (!trimmed) {
    return providerId ? getDefaultModelForProvider(providerId) : "gemini-2.5-flash";
  }
  return DEPRECATED_MODEL_MAP[trimmed] || trimmed;
}
