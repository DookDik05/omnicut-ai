import { NextRequest, NextResponse } from "next/server";
import { detectSpeechGaps } from "@/lib/services/ai/providers/silence";
import { suggestBRollFromTranscript } from "@/lib/services/ai/providers/broll";
import { transcribeWithWhisper } from "@/lib/services/ai/providers/transcription";
import { synthesizeVoiceover } from "@/lib/services/ai/providers/tts";
import { generateCutoutMask, localCutoutPlaceholder } from "@/lib/services/ai/providers/cutout";
import { enhanceWithReplicate, localEnhancePlaceholder } from "@/lib/services/ai/providers/enhancer";
import { isAiConfigured } from "@/lib/services/ai/config";
import type { AiTaskRequest, AiTaskResponse } from "@/lib/services/ai/types";

export const runtime = "nodejs";
export const maxDuration = 300;

function ok(body: unknown) {
  return NextResponse.json(body);
}

function fail(status: number, message: string) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ task: string[] }> }
) {
  const { task } = await context.params;
  const kind = task[0];

  let body: AiTaskRequest;
  try {
    body = (await req.json()) as AiTaskRequest;
  } catch {
    return fail(400, "Invalid JSON body");
  }

  try {
    switch (kind) {
      case "auto_subtitle": {
        if (!isAiConfigured("transcribe")) {
          return fail(503, "Transcription is not configured (OPENAI_API_KEY)");
        }
        const { language, audioBase64 } = body as {
          language: "auto" | "th" | "en";
          audioBase64?: string;
        };
        if (!audioBase64) {
          return fail(400, "audioBase64 (base64-encoded audio) is required");
        }
        const audioBuffer = Buffer.from(audioBase64, "base64");
        const result = await transcribeWithWhisper(
          audioBuffer.buffer.slice(
            audioBuffer.byteOffset,
            audioBuffer.byteOffset + audioBuffer.byteLength
          ) as ArrayBuffer,
          language
        );
        return ok({ kind, result } satisfies AiTaskResponse<unknown>);
      }

      case "silence": {
        const { threshold, removeFillers, transcript } = body as {
          threshold: number;
          removeFillers: boolean;
          transcript: Array<{ word: string; start: number; end: number; confidence?: number }>;
        };
        const words = transcript.map((w) => ({
          word: w.word,
          start: w.start,
          end: w.end,
          confidence: w.confidence ?? 0.9,
        }));
        const result = detectSpeechGaps(words, threshold, removeFillers);
        return ok({ kind, result } satisfies AiTaskResponse<unknown>);
      }

      case "tts": {
        if (!isAiConfigured("tts")) {
          return fail(503, "TTS is not configured (ELEVENLABS_API_KEY)");
        }
        const { script, voice, speed } = body as {
          script: string;
          voice: string;
          speed: number;
        };
        const result = await synthesizeVoiceover(script, voice, speed);
        return ok({ kind, result } satisfies AiTaskResponse<unknown>);
      }

      case "cutout": {
        const bodyWithImage = body as { imageDataUrl?: string };
        if (!isAiConfigured("cutout") || !bodyWithImage.imageDataUrl) {
          return ok({ kind, result: localCutoutPlaceholder() } satisfies AiTaskResponse<unknown>);
        }
        const result = await generateCutoutMask(bodyWithImage.imageDataUrl);
        return ok({ kind, result } satisfies AiTaskResponse<unknown>);
      }

      case "broll": {
        const { transcript } = body as {
          transcript: Array<{ word: string; start: number; end: number }>;
        };
        const words = transcript.map((t) => t.word);
        const result = suggestBRollFromTranscript(words);
        return ok({ kind, result } satisfies AiTaskResponse<unknown>);
      }

      case "enhancer": {
        const bodyWithAudio = body as { audioDataUrl?: string; strength: number };
        if (!isAiConfigured("enhancer") || !bodyWithAudio.audioDataUrl) {
          return ok({ kind, result: localEnhancePlaceholder() } satisfies AiTaskResponse<unknown>);
        }
        const result = await enhanceWithReplicate(bodyWithAudio.audioDataUrl, bodyWithAudio.strength);
        return ok({ kind, result } satisfies AiTaskResponse<unknown>);
      }

      default:
        return fail(404, `Unknown AI task: ${kind}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return fail(500, message);
  }
}