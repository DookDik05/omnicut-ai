import type { EnhanceResult } from "../types";
import { getAiProviderConfig } from "../config";

/**
 * Enhance/clean audio using Replicate (e.g. voice isolation / denoiser).
 * Server-side only — requires REPLICATE_API_TOKEN.
 */
export async function enhanceWithReplicate(
  audioDataUrl: string,
  strength: number
): Promise<EnhanceResult> {
  const cfg = getAiProviderConfig();
  if (!cfg.replicateApiKey) {
    throw new Error("REPLICATE_API_TOKEN is not configured");
  }

  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.replicateApiKey}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      // adieuhd/voicecraft or a denoiser; the version must be configured per
      // deployment. Using a well-known audio denoising version placeholder.
      version: "placeholder-denoise",
      input: { audio: audioDataUrl, strength: strength / 100 },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate enhancer failed (${res.status}): ${text}`);
  }

  return { strengthApplied: true };
}

/**
 * Deterministic local fallback: mark the clip as cleaned without a provider.
 */
export function localEnhancePlaceholder(): EnhanceResult {
  return { strengthApplied: true };
}