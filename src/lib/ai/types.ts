export type AIProviderId =
  | "google"
  | "openai"
  | "anthropic"
  | "groq"
  | "deepseek"
  | "openrouter";

export interface AIModelOption {
  id: string;
  label: string;
  badge?: string;
  recommended?: boolean;
}

export interface AIProviderMeta {
  id: AIProviderId;
  name: string;
  badge: string;
  description: string;
  keyHelpUrl: string;
  keyLabel: string;
  keyPlaceholder: string;
  keyPrefixHint: string;
  supportsVision: boolean;
  supportsJsonFormat: boolean;
  defaultModel: string;
  models: AIModelOption[];
}

export interface AIMessageContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string; // Pode ser data:image/...;base64,... ou URL pública
  };
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string | AIMessageContentPart[];
}

export interface AIChatOptions {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  responseFormat?: "json_object" | "text";
  systemPromptOverride?: string;
  customPrompt?: string;
}

export interface AIChatResponse {
  content: string;
  tokensUsed: number;
  modelUsed: string;
  providerUsed: AIProviderId;
}

export interface AISettingsConfig {
  provider: AIProviderId;
  api_key: string;
  model: string;
  limit_enabled: boolean;
  daily_limit: number;
  custom_prompt?: string;
}
