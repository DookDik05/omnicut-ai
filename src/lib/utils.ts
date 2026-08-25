import type { AspectRatio } from "@/types/timeline";

export const ASPECT_DIMENSIONS: Record<
  AspectRatio,
  { width: number; height: number }
> = {
  "16:9": { width: 1920, height: 1080 },
  "9:16": { width: 1080, height: 1920 },
  "1:1": { width: 1080, height: 1080 },
  "4:5": { width: 1080, height: 1350 },
  "21:9": { width: 2560, height: 1080 },
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function formatTimecode(seconds: number, fps: number): string {
  const safe = Math.max(0, seconds);
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = Math.floor(safe % 60);
  const f = Math.floor((safe - Math.floor(safe)) * fps);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}:${pad(f)}`;
}

export function formatShortTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = Math.floor(safe % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function uid(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().slice(0, 8)
      : Math.random().toString(36).slice(2, 10);
  return `${prefix}-${rand}`;
}

const SNAP_CANDIDATE_EPSILON_DEFAULT = 0.12;

export function snapToCandidates(
  value: number,
  candidates: number[],
  threshold = SNAP_CANDIDATE_EPSILON_DEFAULT
): { value: number; snapped: boolean } {
  let best = value;
  let bestDist = threshold;
  let snapped = false;
  for (const c of candidates) {
    const dist = Math.abs(c - value);
    if (dist < bestDist) {
      best = c;
      bestDist = dist;
      snapped = true;
    }
  }
  return { value: best, snapped };
}

export function hashHue(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export function pseudoWaveform(seed: string, bars: number): number[] {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  }
  const out: number[] = [];
  for (let i = 0; i < bars; i += 1) {
    state = (state * 1103515245 + 12345) >>> 0;
    const base = 0.35 + 0.65 * Math.abs(Math.sin(i / 3 + seed.length));
    const value = clamp(((state % 1000) / 1000) * base, 0.08, 1);
    out.push(Math.round(value * 1000) / 1000);
  }
  return out;
}
