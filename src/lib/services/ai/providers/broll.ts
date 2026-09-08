import { uid } from "@/lib/utils";
import type { BRollSuggestion } from "../types";

interface StockMatch {
  nameKey: string;
  hue: number;
  duration: number;
}

const TOPIC_KEYWORDS: Array<{ keyword: string; match: StockMatch; locale: "th" | "en" }> = [
  { keyword: "city", match: { nameKey: "item_city", hue: 215, duration: 3.5 }, locale: "en" },
  { keyword: "urban", match: { nameKey: "item_city", hue: 215, duration: 3.5 }, locale: "en" },
  { keyword: "table", match: { nameKey: "item_desk", hue: 262, duration: 3 }, locale: "en" },
  { keyword: "desk", match: { nameKey: "item_desk", hue: 262, duration: 3 }, locale: "en" },
  { keyword: "nature", match: { nameKey: "item_nature", hue: 152, duration: 4 }, locale: "en" },
  { keyword: "drone", match: { nameKey: "item_nature", hue: 152, duration: 4 }, locale: "en" },
  { keyword: "abstract", match: { nameKey: "item_gradient", hue: 285, duration: 3 }, locale: "en" },
  { keyword: "gradient", match: { nameKey: "item_gradient", hue: 285, duration: 3 }, locale: "en" },
  // Thai keywords
  { keyword: "เมือง", match: { nameKey: "item_city", hue: 215, duration: 3.5 }, locale: "th" },
  { keyword: "โต๊ะ", match: { nameKey: "item_desk", hue: 262, duration: 3 }, locale: "th" },
  { keyword: "ธรรมชาติ", match: { nameKey: "item_nature", hue: 152, duration: 4 }, locale: "th" },
  { keyword: "โดรน", match: { nameKey: "item_nature", hue: 152, duration: 4 }, locale: "th" },
];

const DEFAULT_SUGGESTIONS: StockMatch[] = [
  { nameKey: "item_city", hue: 215, duration: 3.5 },
  { nameKey: "item_desk", hue: 262, duration: 3 },
  { nameKey: "item_nature", hue: 152, duration: 4 },
  { nameKey: "item_gradient", hue: 285, duration: 3 },
];

/**
 * Suggest B-Roll footage ideas based on the transcript content.
 *
 * Pure, deterministic and testable: it scores transcript words against a
 * keyword table and returns the highest-scoring matches. Falls back to a
 * default set when nothing matches.
 */
export function suggestBRollFromTranscript(
  transcriptWords: string[]
): BRollSuggestion[] {
  const text = transcriptWords.join(" ").toLowerCase();
  const scored = new Map<string, { match: StockMatch; score: number }>();

  for (const { keyword, match } of TOPIC_KEYWORDS) {
    if (text.includes(keyword)) {
      const existing = scored.get(match.nameKey);
      scored.set(match.nameKey, {
        match,
        score: (existing?.score ?? 0) + 1,
      });
    }
  }

  const ordered = [...scored.values()]
    .sort((a, b) => b.score - a.score)
    .map((s) => s.match);

  const chosen = ordered.length > 0 ? ordered : DEFAULT_SUGGESTIONS;

  return chosen.slice(0, 4).map((m) => ({
    id: uid("broll"),
    nameKey: m.nameKey,
    hue: m.hue,
    duration: m.duration,
  }));
}