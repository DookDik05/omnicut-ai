import type { SilenceRange, TranscriptWord } from "@/types/timeline";

export type AiTaskKind =
  | "auto_subtitle"
  | "silence"
  | "tts"
  | "cutout"
  | "broll"
  | "enhancer";

export interface JobProgress {
  stage: "upload" | "analyze" | "generate" | "finalize";
  percent: number;
}

export type ProgressCallback = (progress: JobProgress) => void;

export interface VoiceoverResult {
  clipId: string;
  name: string;
  duration: number;
  voiceId: string;
  audioUrl?: string;
}

export interface CutoutResult {
  maskUrl: string;
}

export interface BRollSuggestion {
  id: string;
  nameKey: string;
  hue: number;
  duration: number;
}

export interface EnhanceResult {
  strengthApplied: boolean;
}

export interface TranscribeRequest {
  kind: "auto_subtitle";
  language: "auto" | "th" | "en";
}

export interface SilienceRequest {
  kind: "silence";
  threshold: number;
  removeFillers: boolean;
  transcript: TranscriptWord[];
}

export interface TtsRequest {
  kind: "tts";
  script: string;
  voice: string;
  speed: number;
}

export interface CutoutRequest {
  kind: "cutout";
}

export interface BrollRequest {
  kind: "broll";
  transcript: TranscriptWord[];
}

export interface EnhancerRequest {
  kind: "enhancer";
  strength: number;
}

export type AiTaskRequest =
  | TranscribeRequest
  | SilienceRequest
  | TtsRequest
  | CutoutRequest
  | BrollRequest
  | EnhancerRequest;

export interface AiTaskResponse<T = unknown> {
  kind: AiTaskKind;
  result: T;
}

export type TranscribeResponse = AiTaskResponse<TranscriptWord[]>;
export type SilienceResponse = AiTaskResponse<SilenceRange[]>;
export type TtsResponse = AiTaskResponse<VoiceoverResult>;
export type CutoutResponse = AiTaskResponse<CutoutResult>;
export type BrollResponse = AiTaskResponse<BRollSuggestion[]>;
export type EnhanceResponse = AiTaskResponse<EnhanceResult>;