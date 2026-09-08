import type { TranscriptWord } from "@/types/timeline";
import { getAiProviderConfig } from "../config";

/**
 * Transcribe audio using OpenAI Whisper API.
 * Server-side only — requires OPENAI_API_KEY.
 */
export async function transcribeWithWhisper(
  audioBuffer: ArrayBuffer,
  language: "auto" | "th" | "en"
): Promise<TranscriptWord[]> {
  const cfg = getAiProviderConfig();
  if (!cfg.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }

  const body = new FormData();
  const blob = new Blob([audioBuffer], { type: "audio/mpeg" });
  body.append("file", blob, "audio.mp3");
  body.append("model", cfg.openaiModel);
  body.append("response_format", "verbose_json");
  body.append("timestamp_granularities[]", "word");
  if (language !== "auto") {
    body.append("language", language);
  }

  const res = await fetch(`${cfg.openaiBaseUrl}/audio/transcriptions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.openaiApiKey}`,
    },
    body,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Whisper transcription failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as {
    words?: Array<{ word: string; start: number; end: number; confidence?: number }>;
    text?: string;
  };

  if (json.words && json.words.length > 0) {
    return json.words.map((w) => ({
      word: w.word.trim(),
      start: w.start,
      end: w.end,
      confidence: w.confidence ?? 0.9,
    }));
  }

  // Fallback: no word-level timestamps, synthesize one word from full text.
  if (json.text) {
    return [
      {
        word: json.text.trim(),
        start: 0,
        end: Math.max(1, (json.text.trim().split(/\s+/).length || 1) * 0.4),
        confidence: 0.9,
      },
    ];
  }

  throw new Error("Whisper returned an empty transcription");
}