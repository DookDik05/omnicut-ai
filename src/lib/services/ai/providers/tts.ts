import { uid } from "@/lib/utils";
import type { VoiceoverResult } from "../types";
import { getAiProviderConfig } from "../config";

const ELEVENLABS_VOICE_IDS: Record<string, string> = {
  aria: "9BWtsMINqrJLrRacOk9x", // Aria (EN)
  prem: "pNInz6obpgDQGcFmaJgB", // Prem (TH) — placeholder with reasonable defaults
  kaito: "JBFqnCBsd6RMkjVDRZzb", // Kaito (EN)
};

function resolveVoiceId(voice: string): string {
  const cfg = getAiProviderConfig();
  const custom = cfg.elevenLabsVoiceIds[voice];
  if (custom) return custom;
  return ELEVENLABS_VOICE_IDS[voice] ?? ELEVENLABS_VOICE_IDS.aria;
}

/**
 * Generate a voiceover using the ElevenLabs Text-to-Speech API.
 * Server-side only — requires ELEVENLABS_API_KEY.
 */
export async function synthesizeVoiceover(
  script: string,
  voice: string,
  speed: number,
  stability = 0.5,
  similarityBoost = 0.75
): Promise<VoiceoverResult & { audio: ArrayBuffer; mimeType: string }> {
  const cfg = getAiProviderConfig();
  if (!cfg.elevenLabsApiKey) {
    throw new Error("ELEVENLABS_API_KEY is not configured");
  }

  const voiceId = resolveVoiceId(voice);
  const res = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      method: "POST",
      headers: {
        "xi-api-key": cfg.elevenLabsApiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: script,
        model_id: "eleven_multilingual_v2",
        voice_settings: {
          stability,
          similarity_boost: similarityBoost,
          speed: speed,
        },
      }),
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${text}`);
  }

  const audio = await res.arrayBuffer();
  const clipId = uid("clip-vo");
  const words = script.trim().split(/\s+/).filter(Boolean).length || 1;

  return {
    clipId,
    name: `VO_${voice}_${clipId}.mp3`,
    // Estimate duration from word count as a fallback; real duration is set
    // by the client once the audio is decoded.
    duration: Math.max(1, Math.round((words * 0.42) / speed)),
    voiceId,
    audio,
    mimeType: "audio/mpeg",
  };
}