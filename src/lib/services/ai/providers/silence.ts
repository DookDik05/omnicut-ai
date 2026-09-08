import type { SilenceRange, TranscriptWord } from "@/types/timeline";

const FILLER_WORDS = ["uh", "um", "er", "ah", "เอ่อ", "อ่า", "อือ"];

/**
 * Detect silence gaps and filler words from a word-level transcript.
 *
 * Pure function — no I/O, fully testable. Gaps between consecutive words
 * that exceed `minSilenceSec` become "silence" ranges; filler words become
 * "filler" ranges when `includeFillers` is true.
 */
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

/**
 * Analyze raw audio samples (client-side Web Audio) to detect silence.
 * Samples are mono float in [-1, 1]. Returns ranges where RMS < threshold.
 */
export function detectSilenceFromSamples(
  samples: Float32Array,
  sampleRate: number,
  minSilenceSec: number,
  rmsThreshold = 0.02
): SilenceRange[] {
  const windowSize = Math.floor(sampleRate * 0.1); // 100ms windows
  if (windowSize <= 0) return [];

  const ranges: SilenceRange[] = [];
  let silenceStart: number | null = null;

  for (let i = 0; i < samples.length; i += windowSize) {
    let sum = 0;
    const end = Math.min(i + windowSize, samples.length);
    for (let j = i; j < end; j += 1) {
      sum += samples[j] * samples[j];
    }
    const rms = Math.sqrt(sum / (end - i));
    const t = i / sampleRate; // seconds

    if (rms < rmsThreshold) {
      if (silenceStart === null) silenceStart = t;
    } else if (silenceStart !== null) {
      if (t - silenceStart >= minSilenceSec) {
        ranges.push({ start: silenceStart, end: t, kind: "silence" });
      }
      silenceStart = null;
    }
  }

  // Close trailing silence
  if (silenceStart !== null) {
    const totalTime = samples.length / sampleRate;
    if (totalTime - silenceStart >= minSilenceSec) {
      ranges.push({ start: silenceStart, end: totalTime, kind: "silence" });
    }
  }

  return ranges;
}