import { uid } from "@/lib/utils";
import type { CutoutResult } from "../types";
import { getAiProviderConfig } from "../config";

/**
 * Generate a subject mask for a clip using Replicate (e.g. SAM2 / BiRefNet).
 * Server-side only — requires REPLICATE_API_TOKEN.
 *
 * This returns a mask reference. When no provider is configured, the caller
 * should fall back to a locally-computed mask placeholder so the editor can
 * still demonstrate the workflow.
 */
export async function generateCutoutMask(
  imageDataUrl: string
): Promise<CutoutResult> {
  const cfg = getAiProviderConfig();
  if (!cfg.replicateApiKey) {
    throw new Error("REPLICATE_API_TOKEN is not configured");
  }

  // birefnet is a strong, widely-available background-removal model.
  const res = await fetch("https://api.replicate.com/v1/predictions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.replicateApiKey}`,
      "Content-Type": "application/json",
      Prefer: "wait",
    },
    body: JSON.stringify({
      version:
        "f7de861e5f9f9d9d1726f46b4314f26b2a6a1f3b9e5e5d3a7a9d0f2a2e1e9f",
      input: { image: imageDataUrl },
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Replicate cutout failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as { output?: string | string[] };
  const output = Array.isArray(json.output) ? json.output[0] : json.output;

  if (!output) {
    throw new Error("Replicate cutout returned no mask output");
  }

  return { maskUrl: output };
}

/**
 * Local fallback: produce a deterministic placeholder mask reference so the
 * editor works without a provider. Not a real matting model.
 */
export function localCutoutPlaceholder(): CutoutResult {
  return { maskUrl: `mask://local-${uid("sam2")}` };
}