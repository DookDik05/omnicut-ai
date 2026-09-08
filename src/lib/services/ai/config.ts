export interface AiProviderConfig {
  openaiApiKey: string | null;
  openaiBaseUrl: string;
  openaiModel: string;
  elevenLabsApiKey: string | null;
  elevenLabsVoiceIds: Record<string, string>;
  replicateApiKey: string | null;
  runcomfyApiKey: string | null;
}

function env(name: string): string | null {
  const value = process.env[name];
  if (!value || value.trim() === "") return null;
  return value.trim();
}

export function getAiProviderConfig(): AiProviderConfig {
  return {
    openaiApiKey: env("OPENAI_API_KEY"),
    openaiBaseUrl: env("OPENAI_BASE_URL") ?? "https://api.openai.com/v1",
    openaiModel: env("OPENAI_WHISPER_MODEL") ?? "whisper-1",
    elevenLabsApiKey: env("ELEVENLABS_API_KEY"),
    elevenLabsVoiceIds: {
      aria: env("ELEVENLABS_VOICE_ARIA") ?? "",
      prem: env("ELEVENLABS_VOICE_PREM") ?? "",
      kaito: env("ELEVENLABS_VOICE_KAITO") ?? "",
    },
    replicateApiKey: env("REPLICATE_API_TOKEN"),
    runcomfyApiKey: env("RUNCOMFY_API_KEY"),
  };
}

export function isAiConfigured(kind: "transcribe" | "tts" | "cutout" | "broll" | "enhancer"): boolean {
  const cfg = getAiProviderConfig();
  switch (kind) {
    case "transcribe":
      return cfg.openaiApiKey !== null;
    case "tts":
      return cfg.elevenLabsApiKey !== null;
    case "cutout":
      return cfg.replicateApiKey !== null;
    case "broll":
      return cfg.runcomfyApiKey !== null;
    case "enhancer":
      return cfg.replicateApiKey !== null;
    default:
      return false;
  }
}