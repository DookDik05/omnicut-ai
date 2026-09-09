import { create } from "zustand";
import type {
  AiTaskKind,
  AspectRatio,
  MediaAssetInfo,
  SilenceRange,
  TimelineClip,
  ToastItem,
  TrackType,
  TranscriptWord,
  VideoProjectState,
} from "@/types/timeline";
import { buildInitialProject, TRACK_IDS } from "@/lib/sample-data";
import { ASPECT_DIMENSIONS, clamp, snapToCandidates, uid } from "@/lib/utils";
import {
  broll as simulateBRoll,
  cutout as simulateCutout,
  enhance as simulateEnhance,
  detectSilence as simulateSilenceDetect,
  transcribe as simulateTranscribe,
  voiceover as simulateVoiceover,
} from "@/lib/services/ai-service";
import type { BRollSuggestion as BRollPayload, VoiceoverResult as VoiceoverPayload } from "@/lib/services/ai/types";
import type { JobProgress, ProgressCallback } from "@/lib/services/mock-ai-service";

const MAX_HISTORY = 60;
const MIN_PIECE_SEC = 0.08;

type AiStage = "upload" | "analyze" | "generate" | "finalize";

export interface AiTaskState {
  kind: AiTaskKind;
  status: "idle" | "running" | "done" | "applied";
  percent: number;
  stage: AiStage;
  subtitleLang: "auto" | "th" | "en";
  captionStyle: "karaoke" | "pop" | "minimal";
  silenceThreshold: number;
  removeFillers: boolean;
  ttsScript: string;
  ttsVoice: "aria" | "prem" | "kaito";
  ttsSpeed: number;
  enhancerStrength: number;
  brollPicked: number;
  transcriptResult?: Awaited<ReturnType<typeof simulateTranscribe>>;
  silenceResult?: SilenceRange[];
  voiceoverResult?: VoiceoverPayload;
  cutoutResult?: { maskUrl: string };
  brollResult?: BRollPayload[];
}

interface ExportTaskState {
  preset: "youtube_4k" | "youtube_hd" | "vertical" | "custom";
  status: "idle" | "running" | "done";
  percent: number;
}

type TrackFlag = "isMuted" | "isHidden" | "isLocked";

interface EditorStore {
  project: VideoProjectState;
  selectedClipId: string | null;
  isPlaying: boolean;
  pxPerSecond: number;
  snapping: boolean;
  activeTab: "media" | "ai" | "text" | "audio" | "effects";
  showSafeZones: boolean;
  past: VideoProjectState[];
  future: VideoProjectState[];
  aiTask: AiTaskState | null;
  exportTask: ExportTaskState;
  toasts: ToastItem[];

  beginChange: () => void;
  endChange: () => void;

  setTitle: (title: string) => void;
  setAspectRatio: (ratio: AspectRatio) => void;
  setActiveTab: (tab: EditorStore["activeTab"]) => void;
  setShowSafeZones: (show: boolean) => void;

  selectClip: (clipId: string | null) => void;
  seek: (time: number) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  tick: (dt: number) => void;

  setSnapping: (on: boolean) => void;
  setZoom: (pps: number) => void;
  zoomFit: (viewportWidth: number) => void;

  updateClipLive: (
    clipId: string,
    patch: Partial<TimelineClip> | ((clip: TimelineClip) => Partial<TimelineClip>)
  ) => void;

  splitSelectedAtPlayhead: () => boolean;
  deleteSelected: (ripple: boolean) => boolean;
  moveClipWithSnap: (
    clipId: string,
    newStartAt: number,
    candidates: number[]
  ) => void;
  trimClip: (
    clipId: string,
    edge: "left" | "right",
    deltaTime: number,
    snapping: boolean,
    candidates: number[]
  ) => void;

  addAssetToTimeline: (asset: MediaAssetInfo) => void;
  addTextClip: (kind: "title" | "caption", text: string) => void;
  addMusicClip: (name: string, duration: number) => void;

  toggleTrackFlag: (trackId: string, flag: TrackFlag) => void;

  undo: () => void;
  redo: () => void;

  openAiTask: (kind: AiTaskKind) => void;
  closeAiTask: () => void;
  patchAiForm: (patch: Partial<AiTaskState>) => void;
  runAiTask: () => Promise<void>;
  applyAiResult: () => Promise<void>;

  openExportDialog: () => void;
  closeExportDialog: () => void;
  setExportPreset: (preset: ExportTaskState["preset"]) => void;
  runExport: () => Promise<void>;

  pushToast: (toast: Omit<ToastItem, "id">) => void;
  dismissToast: (id: string) => void;
}

let snapshotBuffer: VideoProjectState | null = null;
let snapshotDirty = false;

function cloneProject(project: VideoProjectState): VideoProjectState {
  return structuredClone(project);
}

function recalcDuration(project: VideoProjectState): void {
  let max = 0;
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      max = Math.max(max, clip.startAt + clip.duration);
    }
  }
  project.totalDuration = max;
}

function makeBaseClip(
  trackId: string,
  type: TrackType,
  name: string,
  startAt: number,
  duration: number,
  extra?: Partial<TimelineClip>
): TimelineClip {
  return {
    id: uid("clip"),
    trackId,
    type,
    name,
    sourceUrl: "#",
    mediaDuration: duration,
    startAt,
    duration,
    offsetStart: 0,
    volume: 1,
    speed: 1,
    opacity: 1,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    ...extra,
  };
}

function findTrack(
  project: VideoProjectState,
  trackId: string
): ReturnType<VideoProjectState["tracks"]["find"]> {
  return project.tracks.find((t) => t.id === trackId);
}

function findClip(
  project: VideoProjectState,
  clipId: string
): { clip: TimelineClip; trackIndex: number } | null {
  for (let i = 0; i < project.tracks.length; i += 1) {
    const clip = project.tracks[i].clips.find((c) => c.id === clipId);
    if (clip) return { clip, trackIndex: i };
  }
  return null;
}

function getTrackCandidates(project: VideoProjectState, excludeClipId: string | null): number[] {
  const points: number[] = [0];
  for (const track of project.tracks) {
    for (const clip of track.clips) {
      if (clip.id === excludeClipId) continue;
      points.push(clip.startAt, clip.startAt + clip.duration);
    }
  }
  points.push(project.currentTime);
  return points;
}

function subtractRangesFromSpan(
  startAt: number,
  duration: number,
  ranges: SilenceRange[]
): Array<{ startAt: number; duration: number }> {
  const end = startAt + duration;
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const pieces: Array<{ startAt: number; duration: number }> = [];
  let cursor = startAt;
  for (const range of sorted) {
    const rs = Math.max(range.start, startAt);
    const re = Math.min(range.end, end);
    if (re <= rs) continue;
    if (rs - cursor >= MIN_PIECE_SEC) {
      pieces.push({ startAt: cursor, duration: rs - cursor });
    }
    cursor = Math.max(cursor, re);
  }
  if (end - cursor >= MIN_PIECE_SEC) {
    pieces.push({ startAt: cursor, duration: end - cursor });
  }
  return pieces;
}

function mergeRanges(ranges: SilenceRange[]): SilenceRange[] {
  const sorted = [...ranges]
    .filter((r) => r.end - r.start > 0.02)
    .sort((a, b) => a.start - b.start);
  const merged: SilenceRange[] = [];
  for (const r of sorted) {
    const last = merged[merged.length - 1];
    if (last && r.start <= last.end) {
      last.end = Math.max(last.end, r.end);
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

function chunkTranscriptIntoCaptions(transcript: TranscriptWord[]): TranscriptWord[][] {
  const chunks: TranscriptWord[][] = [];
  let current: TranscriptWord[] = [];
  for (const word of transcript) {
    const startCurrent = current[0]?.start ?? word.start;
    const tooLong = word.end - startCurrent > 3.5;
    const tooMany = current.length >= 9;
    const gapTooBig = current.length > 0 && word.start - current[current.length - 1].end > 0.6;
    if ((tooLong || tooMany || gapTooBig) && current.length > 0) {
      chunks.push(current);
      current = [];
    }
    current.push(word);
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

export function getTargetClip(
  project: VideoProjectState,
  selectedClipId: string | null
): TimelineClip | null {
  if (selectedClipId) {
    const found = findClip(project, selectedClipId);
    if (found) return found.clip;
  }
  const mainTrack = findTrack(project, TRACK_IDS.main);
  if (!mainTrack) return null;
  const t = project.currentTime;
  const under = mainTrack.clips.find(
    (c) => t >= c.startAt && t < c.startAt + c.duration
  );
  return under ?? mainTrack.clips[0] ?? null;
}

export const useEditorStore = create<EditorStore>((set, get) => {
  const ensureSnapshot = () => {
    if (!snapshotBuffer) {
      snapshotBuffer = cloneProject(get().project);
      snapshotDirty = false;
    }
  };

  const commitSnapshot = () => {
    if (snapshotBuffer && snapshotDirty) {
      const { past } = get();
      set({
        past: [...past.slice(-(MAX_HISTORY - 1)), snapshotBuffer],
        future: [],
      });
    }
    snapshotBuffer = null;
    snapshotDirty = false;
  };

  const mutate = (fn: (draft: VideoProjectState) => void) => {
    ensureSnapshot();
    const draft = cloneProject(get().project);
    fn(draft);
    recalcDuration(draft);
    snapshotDirty = true;
    set({ project: draft });
  };

  return {
    project: buildInitialProject(),
    selectedClipId: null,
    isPlaying: false,
    pxPerSecond: 52,
    snapping: true,
    activeTab: "media",
    showSafeZones: false,
    past: [],
    future: [],
    aiTask: null,
    exportTask: { preset: "youtube_hd", status: "idle", percent: 0 },
    toasts: [],

    beginChange: () => ensureSnapshot(),
    endChange: () => commitSnapshot(),

    setTitle: (title) =>
      set((s) => ({ project: { ...s.project, title } })),

    setAspectRatio: (ratio) => {
      mutate((draft) => {
        draft.aspectRatio = ratio;
        const dims = ASPECT_DIMENSIONS[ratio];
        draft.canvasWidth = dims.width;
        draft.canvasHeight = dims.height;
      });
      commitSnapshot();
    },

    setActiveTab: (tab) => set({ activeTab: tab }),
    setShowSafeZones: (show) => set({ showSafeZones: show }),

    selectClip: (clipId) => set({ selectedClipId: clipId }),

    seek: (time) =>
      set((s) => ({
        project: {
          ...s.project,
          currentTime: clamp(time, 0, s.project.totalDuration),
        },
      })),

    play: () =>
      set((s) => ({
        isPlaying: s.project.totalDuration > 0 ? true : false,
      })),
    pause: () => set({ isPlaying: false }),
    togglePlay: () =>
      set((s) => ({
        isPlaying: s.project.totalDuration > 0 ? !s.isPlaying : false,
      })),

    tick: (dt) => {
      const { project, isPlaying } = get();
      if (!isPlaying) return;
      const next = project.currentTime + dt;
      if (next >= project.totalDuration) {
        set({
          project: { ...project, currentTime: project.totalDuration },
          isPlaying: false,
        });
      } else {
        set({ project: { ...project, currentTime: next } });
      }
    },

    setSnapping: (on) => set({ snapping: on }),
    setZoom: (pps) => set({ pxPerSecond: clamp(pps, 4, 260) }),
    zoomFit: (viewportWidth) => {
      const { project } = get();
      const width = Math.max(320, viewportWidth - 220);
      set({
        pxPerSecond: clamp(width / Math.max(2, project.totalDuration + 2), 4, 260),
      });
    },

    updateClipLive: (clipId, patch) => {
      mutate((draft) => {
        const found = findClip(draft, clipId);
        if (!found) return;
        const resolved =
          typeof patch === "function" ? patch(found.clip) : patch;
        Object.assign(found.clip, resolved);
      });
    },

    splitSelectedAtPlayhead: () => {
      const { project, selectedClipId } = get();
      const target = getTargetClip(project, selectedClipId);
      if (!target) return false;
      const t = project.currentTime;
      if (t <= target.startAt + MIN_PIECE_SEC || t >= target.startAt + target.duration - MIN_PIECE_SEC) {
        return false;
      }
      mutate((draft) => {
        const found = findClip(draft, target.id);
        if (!found) return;
        const track = draft.tracks[found.trackIndex];
        const index = track.clips.findIndex((c) => c.id === target.id);
        const leftDuration = t - found.clip.startAt;
        const rightPart: TimelineClip = {
          ...structuredClone(found.clip),
          id: uid("clip"),
          startAt: t,
          duration: found.clip.duration - leftDuration,
          offsetStart: found.clip.offsetStart + leftDuration * found.clip.speed,
        };
        found.clip.duration = leftDuration;
        track.clips.splice(index + 1, 0, rightPart);
      });
      commitSnapshot();
      return true;
    },

    deleteSelected: (ripple) => {
      const { selectedClipId } = get();
      if (!selectedClipId) return false;
      let removed = false;
      mutate((draft) => {
        for (const track of draft.tracks) {
          const index = track.clips.findIndex((c) => c.id === selectedClipId);
          if (index === -1) continue;
          const [clip] = track.clips.splice(index, 1);
          removed = true;
          if (ripple) {
            const end = clip.startAt + clip.duration;
            for (const other of track.clips) {
              if (other.startAt >= end - 1e-6) {
                other.startAt -= clip.duration;
              }
            }
          }
          break;
        }
      });
      if (removed) {
        commitSnapshot();
        set({ selectedClipId: null });
      }
      return removed;
    },

    moveClipWithSnap: (clipId, newStartAt, candidates) => {
      const { snapping } = get();
      const value = snapping
        ? snapToCandidates(newStartAt, candidates).value
        : newStartAt;
      mutate((draft) => {
        const found = findClip(draft, clipId);
        if (!found) return;
        found.clip.startAt = Math.max(0, value);
      });
    },

    trimClip: (clipId, edge, deltaTime, snapping, candidates) => {
      mutate((draft) => {
        const found = findClip(draft, clipId);
        if (!found) return;
        const clip = found.clip;
        if (edge === "left") {
          const proposed = clip.startAt + deltaTime;
          const snapped = snapping ? snapToCandidates(proposed, candidates).value : proposed;
          const maxLeft = clip.startAt + clip.duration - MIN_PIECE_SEC;
          const minLeft = Math.max(0, clip.startAt - clip.offsetStart / clip.speed);
          const nextStart = clamp(snapped, minLeft, maxLeft);
          const delta = nextStart - clip.startAt;
          clip.startAt = nextStart;
          clip.offsetStart += delta * clip.speed;
          clip.duration -= delta;
        } else {
          const proposed = clip.startAt + clip.duration + deltaTime;
          const snapped = snapping ? snapToCandidates(proposed, candidates).value : proposed;
          const maxRight = clip.startAt + (clip.mediaDuration - clip.offsetStart) / clip.speed;
          clip.duration = clamp(snapped, clip.startAt + MIN_PIECE_SEC, maxRight) - clip.startAt;
        }
      });
    },

    addAssetToTimeline: (asset) => {
      const { project } = get();
      const type: TrackType = asset.kind === "audio" ? "audio" : asset.kind === "image" ? "text" : "video";
      const track =
        project.tracks.find((t) => t.type === type && t.id === TRACK_IDS.main) ??
        project.tracks.find((t) => t.type === type);
      if (!track) return;
      const tail = track.clips.reduce((m, c) => Math.max(m, c.startAt + c.duration), 0);
      mutate((draft) => {
        const target = findTrack(draft, track.id);
        if (!target) return;
        target.clips.push(
          makeBaseClip(target.id, type, asset.name, tail, Math.max(1, asset.duration))
        );
      });
      commitSnapshot();
      get().pushToast({ kind: "success", messageKey: "added_to_timeline" });
    },

    addTextClip: (kind, text) => {
      const { project } = get();
      const overlay = findTrack(project, TRACK_IDS.overlay) ?? project.tracks.find((t) => t.type === "subtitle");
      if (!overlay) return;
      mutate((draft) => {
        const track = findTrack(draft, overlay.id);
        if (!track) return;
        const duration = kind === "title" ? 4 : 3;
        track.clips.push(
          makeBaseClip(track.id, "subtitle", text, draft.currentTime, duration, {
            aiMetadata: { captionStyle: kind === "title" ? "pop" : "minimal" },
          })
        );
      });
      commitSnapshot();
      get().pushToast({ kind: "success", messageKey: "added_to_timeline" });
    },

    addMusicClip: (name, duration) => {
      const { project } = get();
      const music = findTrack(project, TRACK_IDS.music);
      if (!music) return;
      const tail = music.clips.reduce((m, c) => Math.max(m, c.startAt + c.duration), 0);
      mutate((draft) => {
        const track = findTrack(draft, music.id);
        if (!track) return;
        track.clips.push(
          makeBaseClip(track.id, "audio", name, tail, duration, { volume: 0.5 })
        );
      });
      commitSnapshot();
      get().pushToast({ kind: "success", messageKey: "added_to_timeline" });
    },

    toggleTrackFlag: (trackId, flag) => {
      mutate((draft) => {
        const track = findTrack(draft, trackId);
        if (track) track[flag] = !track[flag];
      });
      commitSnapshot();
    },

    undo: () => {
      const { past, project, future } = get();
      if (past.length === 0) return;
      const previous = past[past.length - 1];
      set({
        past: past.slice(0, -1),
        future: [cloneProject(project), ...future],
        project: previous,
        isPlaying: false,
      });
      const stillExists = findClip(previous, get().selectedClipId ?? "");
      if (!stillExists) set({ selectedClipId: null });
    },

    redo: () => {
      const { future, project, past } = get();
      if (future.length === 0) return;
      const next = future[0];
      set({
        future: future.slice(1),
        past: [...past, cloneProject(project)],
        project: next,
        isPlaying: false,
      });
    },

    openAiTask: (kind) =>
      set({
        aiTask: {
          kind,
          status: "idle",
          percent: 0,
          stage: "upload",
          subtitleLang: "auto",
          captionStyle: "karaoke",
          silenceThreshold: 0.45,
          removeFillers: true,
          ttsScript: "สวัสดีครับ ยินดีต้อนรับสู่ OmniCut AI เริ่มตัดต่อวิดีโอของคุณได้เลย",
          ttsVoice: "prem",
          ttsSpeed: 1,
          enhancerStrength: 70,
          brollPicked: 0,
        },
      }),

    closeAiTask: () => set({ aiTask: null }),

    patchAiForm: (patch) =>
      set((s) => (s.aiTask ? { aiTask: { ...s.aiTask, ...patch } } : s)),

    runAiTask: async () => {
      const { aiTask, project, selectedClipId } = get();
      if (!aiTask || aiTask.status === "running") return;
      const onProgress: ProgressCallback = (p: JobProgress) => {
        set((s) =>
          s.aiTask
            ? { aiTask: { ...s.aiTask, status: "running", percent: p.percent, stage: p.stage } }
            : s
        );
      };
      try {
        if (aiTask.kind === "auto_subtitle") {
          const target = getTargetClip(project, selectedClipId);
          const transcript = target?.aiMetadata?.transcript?.length
            ? target.aiMetadata.transcript
            : await simulateTranscribe(onProgress, aiTask.subtitleLang);
          set((s) =>
            s.aiTask
              ? { aiTask: { ...s.aiTask, status: "done", percent: 100, transcriptResult: transcript } }
              : s
          );
        } else if (aiTask.kind === "silence") {
          const target = getTargetClip(project, selectedClipId);
          const transcript = target?.aiMetadata?.transcript ?? [];
          const ranges = await simulateSilenceDetect(
            onProgress,
            transcript,
            aiTask.silenceThreshold,
            aiTask.removeFillers
          );
          set((s) =>
            s.aiTask
              ? { aiTask: { ...s.aiTask, status: "done", percent: 100, silenceResult: ranges } }
              : s
          );
        } else if (aiTask.kind === "tts") {
          const result = await simulateVoiceover(
            onProgress,
            aiTask.ttsScript,
            aiTask.ttsVoice,
            aiTask.ttsSpeed
          );
          set((s) =>
            s.aiTask
              ? { aiTask: { ...s.aiTask, status: "done", percent: 100, voiceoverResult: result } }
              : s
          );
        } else if (aiTask.kind === "cutout") {
          const result = await simulateCutout(onProgress);
          set((s) =>
            s.aiTask
              ? { aiTask: { ...s.aiTask, status: "done", percent: 100, cutoutResult: result } }
              : s
          );
        } else if (aiTask.kind === "broll") {
          const target = getTargetClip(project, selectedClipId);
          const transcript = target?.aiMetadata?.transcript ?? [];
          const result = await simulateBRoll(onProgress, transcript);
          set((s) =>
            s.aiTask
              ? { aiTask: { ...s.aiTask, status: "done", percent: 100, brollResult: result } }
              : s
          );
        } else {
          await simulateEnhance(onProgress, aiTask.enhancerStrength);
          set((s) =>
            s.aiTask ? { aiTask: { ...s.aiTask, status: "done", percent: 100 } } : s
          );
        }
      } catch {
        set((s) => (s.aiTask ? { aiTask: { ...s.aiTask, status: "idle", percent: 0 } } : s));
      }
    },

    applyAiResult: async () => {
      const { aiTask, project, selectedClipId } = get();
      if (!aiTask || aiTask.status !== "done") return;
      const pushToast = get().pushToast;

      if (aiTask.kind === "auto_subtitle" && aiTask.transcriptResult) {
        const target = getTargetClip(project, selectedClipId);
        const chunks = chunkTranscriptIntoCaptions(aiTask.transcriptResult);
        mutate((draft) => {
          if (target) {
            const found = findClip(draft, target.id);
            if (found) found.clip.aiMetadata = { ...found.clip.aiMetadata, transcript: aiTask.transcriptResult! };
          }
          let overlay = findTrack(draft, TRACK_IDS.overlay);
          if (!overlay) {
            overlay = {
              id: TRACK_IDS.overlay,
              index: 0,
              type: "subtitle",
              name: "V2",
              isMuted: false,
              isLocked: false,
              isHidden: false,
              clips: [],
            };
            draft.tracks.unshift(overlay);
          }
          overlay.clips = chunks.map((chunk) =>
            makeBaseClip(overlay!.id, "subtitle", chunk.map((w) => w.word).join(" "), chunk[0].start, chunk[chunk.length - 1].end - chunk[0].start, {
              aiMetadata: {
                transcript: chunk,
                captionStyle: aiTask.captionStyle,
              },
            })
          );
        });
        commitSnapshot();
        pushToast({ kind: "success", messageKey: "applied", messageValues: { tool: "Auto Subtitle" } });
      }

      if (aiTask.kind === "silence" && aiTask.silenceResult) {
        const target = getTargetClip(project, selectedClipId);
        if (target && aiTask.silenceResult.length > 0) {
          const baseOffset = target.startAt - target.offsetStart / target.speed;
          const globalRanges = mergeRanges(
            aiTask.silenceResult.map((r) => ({
              start: baseOffset + r.start * target.speed,
              end: baseOffset + r.end * target.speed,
              kind: r.kind,
            }))
          );
          mutate((draft) => {
            let removedTotal = 0;
            for (const range of globalRanges) removedTotal += range.end - range.start;
            for (const track of draft.tracks) {
              if (track.type !== "video" && track.type !== "audio") continue;
              const affected = track.clips.filter(
                (c) => c.startAt < Math.max(...globalRanges.map((r) => r.end)) &&
                  c.startAt + c.duration > Math.min(...globalRanges.map((r) => r.start))
              );
              if (affected.length === 0) continue;
              const rebuilt: TimelineClip[] = [];
              for (const clip of track.clips) {
                const intersects = globalRanges.some(
                  (r) => r.start < clip.startAt + clip.duration - 1e-6 && r.end > clip.startAt + 1e-6
                );
                if (!intersects) {
                  rebuilt.push(clip);
                  continue;
                }
                const pieces = subtractRangesFromSpan(
                  clip.startAt,
                  clip.duration,
                  globalRanges.filter(
                    (r) => r.start < clip.startAt + clip.duration && r.end > clip.startAt
                  )
                );
                pieces.forEach((piece, idx) => {
                  rebuilt.push(
                    idx === 0
                      ? { ...clip, startAt: piece.startAt, duration: piece.duration }
                      : {
                          ...structuredClone(clip),
                          id: uid("clip"),
                          startAt: piece.startAt,
                          duration: piece.duration,
                          offsetStart: clip.offsetStart + (piece.startAt - clip.startAt) * clip.speed,
                        }
                  );
                });
              }
              rebuilt.sort((a, b) => a.startAt - b.startAt);
              const lastAffectedEnd = Math.max(
                ...affected.map((c) => c.startAt + c.duration)
              );
              for (const clip of rebuilt) {
                if (clip.startAt >= lastAffectedEnd - 1e-6) {
                  clip.startAt = Math.max(0, clip.startAt - removedTotal);
                }
              }
              track.clips = rebuilt;
            }
          });
          commitSnapshot();
          const savedSecs = Math.round(globalRanges.reduce((sum, r) => sum + (r.end - r.start), 0));
          pushToast({ kind: "success", messageKey: "applied", messageValues: { tool: `-${savedSecs}s` } });
        } else {
          pushToast({ kind: "info", messageKey: "coming_soon" });
        }
      }

      if (aiTask.kind === "tts" && aiTask.voiceoverResult) {
        const vo: VoiceoverPayload = aiTask.voiceoverResult;
        mutate((draft) => {
          const track = findTrack(draft, TRACK_IDS.audio) ?? draft.tracks.find((t) => t.type === "audio");
          if (!track) return;
          track.clips.push(makeBaseClip(track.id, "audio", vo.name, draft.currentTime, vo.duration));
        });
        commitSnapshot();
        pushToast({ kind: "success", messageKey: "added_to_timeline" });
      }

      if (aiTask.kind === "cutout" && aiTask.cutoutResult) {
        const target = getTargetClip(project, selectedClipId);
        if (target) {
          mutate((draft) => {
            const found = findClip(draft, target.id);
            if (found) {
              found.clip.aiMetadata = { ...found.clip.aiMetadata, maskUrl: aiTask.cutoutResult!.maskUrl };
            }
          });
          commitSnapshot();
          pushToast({ kind: "success", messageKey: "applied", messageValues: { tool: "Smart Cutout" } });
        }
      }

      if (aiTask.kind === "broll" && aiTask.brollResult) {
        const chosen =
          aiTask.brollResult[aiTask.brollPicked] ?? aiTask.brollResult[0];
        mutate((draft) => {
          const overlay = findTrack(draft, TRACK_IDS.overlay);
          if (!overlay) return;
          overlay.clips.push(
            makeBaseClip(overlay.id, "subtitle", `broll:${chosen.nameKey}`, draft.currentTime, chosen.duration, {
              aiMetadata: { captionStyle: "minimal" },
            })
          );
        });
        commitSnapshot();
        pushToast({ kind: "success", messageKey: "added_to_timeline" });
      }

      if (aiTask.kind === "enhancer") {
        const target = getTargetClip(project, selectedClipId);
        if (target) {
          mutate((draft) => {
            const found = findClip(draft, target.id);
            if (found) {
              found.clip.aiMetadata = { ...found.clip.aiMetadata, isCleanedSpeech: true };
            }
          });
          commitSnapshot();
          pushToast({ kind: "success", messageKey: "applied", messageValues: { tool: "Audio Enhancer" } });
        }
      }

      set((s) => (s.aiTask ? { aiTask: { ...s.aiTask, status: "applied" } } : s));
    },

    openExportDialog: () =>
      set({ exportTask: { preset: get().exportTask.preset, status: "idle", percent: 0 } }),
    closeExportDialog: () =>
      set((s) =>
        s.exportTask.status === "running"
          ? s
          : { exportTask: { ...s.exportTask, status: "idle", percent: 0 } }
      ),
    setExportPreset: (preset) =>
      set((s) => ({ exportTask: { ...s.exportTask, preset } })),
    runExport: async () => {
      if (get().exportTask.status === "running") return;
      const stages: Array<{ until: number; ms: number }> = [
        { until: 12, ms: 500 },
        { until: 68, ms: 1800 },
        { until: 92, ms: 900 },
        { until: 100, ms: 500 },
      ];
      set({ exportTask: { ...get().exportTask, status: "running", percent: 0 } });
      for (const step of stages) {
        const steps = 6;
        for (let i = 1; i <= steps; i += 1) {
          await new Promise((r) => setTimeout(r, step.ms / steps));
          const prev = stages[stages.indexOf(step) - 1]?.until ?? 0;
          set((s) => ({
            exportTask: {
              ...s.exportTask,
              percent: Math.round(prev + ((step.until - prev) * i) / steps),
            },
          }));
        }
      }
      set((s) => ({ exportTask: { ...s.exportTask, status: "done", percent: 100 } }));
    },

    pushToast: (toast) => {
      const id = uid("toast");
      set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
      }, 3600);
    },
    dismissToast: (id) =>
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
  };
});

export function collectSnapCandidates(
  project: VideoProjectState,
  excludeClipId: string | null
): number[] {
  return getTrackCandidates(project, excludeClipId);
}
