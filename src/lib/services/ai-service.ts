import type { SilenceRange, TranscriptWord } from "@/types/timeline";
import type {
  BRollSuggestion,
  CutoutResult,
  EnhanceResult,
  ProgressCallback,
  VoiceoverResult,
} from "./ai/types";
import { detectSpeechGaps, detectSilenceFromSamples } from "./ai/providers/silence";
import { suggestBRollFromTranscript } from "./ai/providers/broll";
import { localCutoutPlaceholder } from "./ai/providers/cutout";
import { localEnhancePlaceholder } from "./ai/providers/enhancer";
import {
  simulateBRoll as mockBRoll,
  simulateSilenceDetect as mockSilenceDetect,
  simulateTranscribe as mockTranscribe,
  simulateVoiceover as mockVoiceover,
} from "./mock-ai-service";

export type { ProgressCallback };

// Re-export JobProgress for compatibility with existing imports.
export type { JobProgress } from "./mock-ai-service";

/**
 * A callback that adapts a percentage to a synthetic stage.
 * Kept here so callers that only know a "percent" can still report progress.
 */
function makeProgress(onProgress: ProgressCallback, stage: "upload" | "analyze" | "generate" | "finalize") {
  return (percent: number) => onProgress({ stage, percent });
}

/**
 * Post to the server-side AI route. Returns the parsed result, or null on a
 * 503 (not configured) so callers can fall back to local mock behavior.
 */
async function postAiTask<T>(kind: string, body: unknown): Promise<T | null> {
  try {
    const res = await fetch(`/api/ai/${kind}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.status === 503) return null;

    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      throw new Error(data?.error ?? `AI task failed (${res.status})`);
    }

    const data = (await res.json()) as { result?: T };
    return (data.result as T) ?? null;
  } catch (error) {
    // Network errors or server misconfigurations fall back to mock so the
    // demo never hard-crashes. Re-throw only for non-network failures we
    // explicitly marked (already handled above).
    if (error instanceof Error && error.message.startsWith("AI task failed")) {
      throw error;
    }
    return null;
  }
}

/**
 * Real (if configured) transcription, falling back to the mock.
 */
export async function transcribe(
  onProgress: ProgressCallback,
  language: "auto" | "th" | "en" = "auto"
): Promise<TranscriptWord[]> {
  const real = await postAiTask<TranscriptWord[]>("auto_subtitle", {
    kind: "auto_subtitle",
    language,
  });
  if (real) return real;
  return mockTranscribe(onProgress);
}

/**
 * Real silence detection: prefers client-side sample analysis when samples
 * are provided, otherwise transcript gap detection, else mock.
 */
export async function detectSilence(
  onProgress: ProgressCallback,
  transcript: TranscriptWord[],
  threshold: number,
  removeFillers: boolean,
  samples?: Float32Array,
  sampleRate?: number
): Promise<SilenceRange[]> {
  if (samples && sampleRate) {
    return detectSilenceFromSamples(samples, sampleRate, threshold);
  }

  if (transcript.length > 0) {
    return detectSpeechGaps(transcript, threshold, removeFillers);
  }

  return mockSilenceDetect(onProgress, transcript, threshold, removeFillers);
}

/**
 * Real (if configured) voiceover via ElevenLabs, falling back to the mock.
 */
export async function voiceover(
  onProgress: ProgressCallback,
  script: string,
  voice: string,
  speed: number
): Promise<VoiceoverResult> {
  const real = await postAiTask<VoiceoverResult>("tts", {
    kind: "tts",
    script,
    voice,
    speed,
  });
  if (real) return real;
  return mockVoiceover(onProgress, script, voice, speed);
}

/**
 * Real (if configured) cutout, else a local placeholder mask.
 */
export async function cutout(onProgress: ProgressCallback): Promise<CutoutResult> {
  const real = await postAiTask<CutoutResult>("cutout", {
    kind: "cutout",
  });
  if (real) return real;
  await stageDelay(onProgress, "analyze");
  return localCutoutPlaceholder();
}

/**
 * B-Roll suggestions from transcript context (deterministic, no API key
 * required), falling back to mock.
 */
export async function broll(
  onProgress: ProgressCallback,
  transcript: TranscriptWord[] = []
): Promise<BRollSuggestion[]> {
  if (transcript.length > 0) {
    return suggestBRollFromTranscript(transcript.map((t) => t.word));
  }
  const real = await postAiTask<BRollSuggestion[]>("broll", {
    kind: "broll",
    transcript: [],
  });
  if (real) return real;
  return mockBRoll(onProgress);
}

/**
 * Real (if configured) enhancement, else a local placeholder.
 */
export async function enhance(
  onProgress: ProgressCallback,
  strength: number
): Promise<EnhanceResult> {
  const real = await postAiTask<EnhanceResult>("enhancer", {
    kind: "enhancer",
    strength,
  });
  if (real) return real;
  await stageDelay(onProgress, "finalize");
  return localEnhancePlaceholder();
}

async function stageDelay(onProgress: ProgressCallback, stage: "analyze" | "finalize"): Promise<void> {
  const report = makeProgress(onProgress, stage);
  for (let i = 1; i <= 8; i += 1) {
    await new Promise((r) => setTimeout(r, 100));
    report(i * 12);
  }
}