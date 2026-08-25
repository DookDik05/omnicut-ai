export type TrackType = "video" | "audio" | "text" | "subtitle" | "effect";

export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:5" | "21:9";

export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface AiMetadata {
  transcript?: TranscriptWord[];
  maskUrl?: string;
  isCleanedSpeech?: boolean;
  captionStyle?: "karaoke" | "pop" | "minimal";
}

export interface ClipTransform {
  x: number;
  y: number;
  scale: number;
  rotation: number;
}

export interface TimelineClip {
  id: string;
  trackId: string;
  type: TrackType;
  name: string;
  sourceUrl: string;
  mediaDuration: number;
  startAt: number;
  duration: number;
  offsetStart: number;
  volume: number;
  speed: number;
  opacity: number;
  transform: ClipTransform;
  aiMetadata?: AiMetadata;
}

export interface TimelineTrack {
  id: string;
  index: number;
  type: TrackType;
  name: string;
  isMuted: boolean;
  isLocked: boolean;
  isHidden: boolean;
  clips: TimelineClip[];
}

export interface VideoProjectState {
  id: string;
  title: string;
  aspectRatio: AspectRatio;
  fps: 24 | 30 | 60;
  canvasWidth: number;
  canvasHeight: number;
  currentTime: number;
  totalDuration: number;
  tracks: TimelineTrack[];
}

export interface SilenceRange {
  start: number;
  end: number;
  kind: "silence" | "filler";
  word?: string;
}

export type MediaKind = "video" | "audio" | "image";

export interface MediaAssetInfo {
  id: string;
  name: string;
  kind: MediaKind;
  duration: number;
  hue: number;
}

export type AiTaskKind =
  | "auto_subtitle"
  | "silence"
  | "tts"
  | "cutout"
  | "broll"
  | "enhancer";

export type TaskStatus = "idle" | "running" | "done" | "applied";

export interface ToastItem {
  id: string;
  kind: "success" | "info" | "error";
  messageKey: string;
  messageValues?: Record<string, string | number>;
}
