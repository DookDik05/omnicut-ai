import type { SilenceRange, TranscriptWord } from "@/types/timeline";
import { clamp, uid } from "@/lib/utils";

export interface JobProgress {
  stage: "upload" | "analyze" | "generate" | "finalize";
  percent: number;
}

export type ProgressCallback = (progress: JobProgress) => void;

const FILLER_WORDS = ["uh", "um", "er", "ah", "เอ่อ", "อ่า", "อือ"];

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runStages(
  onProgress: ProgressCallback,
  stages: Array<{ stage: JobProgress["stage"]; until: number; ms: number }>
): Promise<void> {
  for (const step of stages) {
    const startPercent =
      stages[stages.indexOf(step) - 1]?.until ?? 0;
    const steps = 8;
    for (let i = 1; i <= steps; i += 1) {
      await wait(step.ms / steps);
      onProgress({
        stage: step.stage,
        percent: Math.round(startPercent + ((step.until - startPercent) * i) / steps),
      });
    }
  }
}

export function detectSpeechGaps(
  transcript: TranscriptWord[],
  minSilenceSec: number,
  includeFillers: boolean
): SilenceRange[] {
  const ranges: SilenceRange[] = [];
  if (transcript.length === 0) return ranges;

  for (let i = 0; i < transcript.length - 1; i += 1) {
    const gap = transcript[i + 1].start - transcript[i].end;
    if (gap >= minSilenceSec) {
      ranges.push({
        start: transcript[i].end,
        end: transcript[i + 1].start,
        kind: "silence",
      });
    }
  }

  if (includeFillers) {
    for (const word of transcript) {
      if (FILLER_WORDS.includes(word.word.toLowerCase())) {
        ranges.push({ start: word.start, end: word.end, kind: "filler", word: word.word });
      }
    }
  }

  return ranges.sort((a, b) => a.start - b.start);
}

export async function simulateTranscribe(
  onProgress: ProgressCallback
): Promise<TranscriptWord[]> {
  await runStages(onProgress, [
    { stage: "upload", until: 20, ms: 420 },
    { stage: "analyze", until: 78, ms: 1400 },
    { stage: "finalize", until: 100, ms: 380 },
  ]);
  return [
    { word: "ยินดี", start: 0.0, end: 0.7, confidence: 0.97 },
    { word: "ต้อนรับ", start: 0.7, end: 1.5, confidence: 0.96 },
    { word: "สู่", start: 1.6, end: 1.95, confidence: 0.94 },
    { word: "OmniCut", start: 2.05, end: 2.9, confidence: 0.98 },
    { word: "AI", start: 2.9, end: 3.3, confidence: 0.99 },
    { word: "เริ่ม", start: 3.6, end: 4.05, confidence: 0.95 },
    { word: "ตัดต่อ", start: 4.05, end: 4.7, confidence: 0.97 },
    { word: "ได้เลย", start: 4.7, end: 5.4, confidence: 0.96 },
  ];
}

export async function simulateSilenceDetect(
  onProgress: ProgressCallback,
  transcript: TranscriptWord[],
  threshold: number,
  includeFillers: boolean
): Promise<SilenceRange[]> {
  await runStages(onProgress, [
    { stage: "upload", until: 15, ms: 300 },
    { stage: "analyze", until: 85, ms: 1100 },
    { stage: "finalize", until: 100, ms: 250 },
  ]);
  return detectSpeechGaps(transcript, threshold, includeFillers);
}

export interface VoiceoverResult {
  clipId: string;
  name: string;
  duration: number;
  voiceId: string;
}

export async function simulateVoiceover(
  onProgress: ProgressCallback,
  script: string,
  voiceId: string,
  speed: number
): Promise<VoiceoverResult> {
  await runStages(onProgress, [
    { stage: "upload", until: 10, ms: 200 },
    { stage: "generate", until: 82, ms: 1500 },
    { stage: "finalize", until: 100, ms: 320 },
  ]);
  const words = script.trim().split(/\s+/).filter(Boolean).length || 1;
  const duration = clamp((words * 0.42) / speed, 1.5, 120);
  return {
    clipId: uid("clip-vo"),
    name: `VO_${voiceId}_${new Date().toISOString().slice(11, 19).replace(/:/g, "")}.wav`,
    duration: Math.round(duration * 10) / 10,
    voiceId,
  };
}

export async function simulateCutout(
  onProgress: ProgressCallback
): Promise<{ maskUrl: string }> {
  await runStages(onProgress, [
    { stage: "upload", until: 18, ms: 400 },
    { stage: "analyze", until: 70, ms: 1300 },
    { stage: "generate", until: 95, ms: 600 },
    { stage: "finalize", until: 100, ms: 200 },
  ]);
  return { maskUrl: `mask://${uid("sam2")}` };
}

export interface BRollSuggestion {
  id: string;
  nameKey: string;
  hue: number;
  duration: number;
}

export async function simulateBRoll(
  onProgress: ProgressCallback
): Promise<BRollSuggestion[]> {
  await runStages(onProgress, [
    { stage: "upload", until: 12, ms: 260 },
    { stage: "analyze", until: 60, ms: 900 },
    { stage: "generate", until: 100, ms: 700 },
  ]);
  return [
    { id: uid("broll"), nameKey: "item_city", hue: 215, duration: 3.5 },
    { id: uid("broll"), nameKey: "item_desk", hue: 262, duration: 3 },
    { id: uid("broll"), nameKey: "item_nature", hue: 152, duration: 4 },
    { id: uid("broll"), nameKey: "item_gradient", hue: 285, duration: 3 },
  ];
}

export async function simulateEnhance(
  onProgress: ProgressCallback
): Promise<{ strengthApplied: boolean }> {
  await runStages(onProgress, [
    { stage: "upload", until: 15, ms: 280 },
    { stage: "analyze", until: 75, ms: 950 },
    { stage: "finalize", until: 100, ms: 270 },
  ]);
  return { strengthApplied: true };
}
