import type {
  MediaAssetInfo,
  TimelineClip,
  TimelineTrack,
  TranscriptWord,
  VideoProjectState,
} from "@/types/timeline";

export const TRACK_IDS = {
  overlay: "trk-v2-overlay",
  main: "trk-v1-main",
  audio: "trk-a1-voice",
  music: "trk-a2-music",
} as const;

const interviewTranscript: TranscriptWord[] = [
  { word: "สวัสดี", start: 0.0, end: 0.62, confidence: 0.97 },
  { word: "ครับ", start: 0.62, end: 1.02, confidence: 0.98 },
  { word: "วันนี้", start: 1.24, end: 1.68, confidence: 0.95 },
  { word: "เรา", start: 1.68, end: 1.94, confidence: 0.93 },
  { word: "จะ", start: 1.94, end: 2.14, confidence: 0.96 },
  { word: "พา", start: 2.14, end: 2.38, confidence: 0.97 },
  { word: "ดู", start: 2.38, end: 2.62, confidence: 0.94 },
  { word: "เอ่อ", start: 2.62, end: 3.08, confidence: 0.81 },
  { word: "วิธี", start: 3.22, end: 3.58, confidence: 0.96 },
  { word: "ทำ", start: 3.58, end: 3.82, confidence: 0.95 },
  { word: "วิดีโอ", start: 3.82, end: 4.42, confidence: 0.97 },
  { word: "ให้", start: 4.42, end: 4.66, confidence: 0.92 },
  { word: "ดู", start: 4.66, end: 4.88, confidence: 0.9 },
  { word: "อาชีพ", start: 4.88, end: 5.52, confidence: 0.95 },
  { word: "um", start: 5.52, end: 6.04, confidence: 0.78 },
  { word: "กับการ", start: 6.2, end: 6.78, confidence: 0.94 },
  { word: "ตัดต่อ", start: 6.78, end: 7.36, confidence: 0.97 },
  { word: "แบบ", start: 7.36, end: 7.66, confidence: 0.93 },
  { word: "มืออาชีพ", start: 7.66, end: 8.44, confidence: 0.98 },
  { word: "ขั้นแรก", start: 8.9, end: 9.58, confidence: 0.96 },
  { word: "เลือก", start: 9.58, end: 10.02, confidence: 0.95 },
  { word: "ซอฟต์แวร์", start: 10.02, end: 10.82, confidence: 0.96 },
  { word: "ที่", start: 10.82, end: 11.0, confidence: 0.91 },
  { word: "ใช่", start: 11.0, end: 11.34, confidence: 0.89 },
  { word: "และ", start: 12.1, end: 12.44, confidence: 0.94 },
  { word: "ฝึก", start: 12.44, end: 12.86, confidence: 0.95 },
  { word: "ล้มแล้ว", start: 12.86, end: 13.5, confidence: 0.93 },
  { word: "ลุกใหม่", start: 13.5, end: 14.2, confidence: 0.94 },
];

function makeClip(partial: Partial<TimelineClip> & {
  id: string;
  trackId: string;
  type: TimelineClip["type"];
  name: string;
  startAt: number;
  duration: number;
}): TimelineClip {
  return {
    sourceUrl: "#",
    mediaDuration: partial.duration,
    offsetStart: 0,
    volume: 1,
    speed: 1,
    opacity: 1,
    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
    ...partial,
  } as TimelineClip;
}

export function buildInitialProject(): VideoProjectState {
  const tracks: TimelineTrack[] = [
    {
      id: TRACK_IDS.overlay,
      index: 0,
      type: "subtitle",
      name: "V2",
      isMuted: false,
      isLocked: false,
      isHidden: false,
      clips: [],
    },
    {
      id: TRACK_IDS.main,
      index: 1,
      type: "video",
      name: "V1",
      isMuted: false,
      isLocked: false,
      isHidden: false,
      clips: [
        makeClip({
          id: "clip-intro-hook",
          trackId: TRACK_IDS.main,
          type: "video",
          name: "Opening_Hook.mp4",
          startAt: 0,
          duration: 5.5,
        }),
        makeClip({
          id: "clip-interview",
          trackId: TRACK_IDS.main,
          type: "video",
          name: "Interview_Take3.mov",
          startAt: 5.5,
          duration: 14.5,
          aiMetadata: { transcript: interviewTranscript },
        }),
        makeClip({
          id: "clip-broll-product",
          trackId: TRACK_IDS.main,
          type: "video",
          name: "Product_Broll.mp4",
          startAt: 20,
          duration: 5.5,
        }),
      ],
    },
    {
      id: TRACK_IDS.audio,
      index: 2,
      type: "audio",
      name: "A1",
      isMuted: false,
      isLocked: false,
      isHidden: false,
      clips: [
        makeClip({
          id: "clip-voiceover",
          trackId: TRACK_IDS.audio,
          type: "audio",
          name: "Voiceover_Master.wav",
          startAt: 0.4,
          duration: 17,
        }),
      ],
    },
    {
      id: TRACK_IDS.music,
      index: 3,
      type: "audio",
      name: "A2",
      isMuted: false,
      isLocked: false,
      isHidden: false,
      clips: [
        makeClip({
          id: "clip-music-lofi",
          trackId: TRACK_IDS.music,
          type: "audio",
          name: "Lofi_Sunset.mp3",
          startAt: 0,
          duration: 25.5,
          volume: 0.35,
        }),
      ],
    },
  ];

  const totalDuration = Math.max(
    ...tracks.flatMap((t) => t.clips.map((c) => c.startAt + c.duration))
  );

  return {
    id: "proj-demo-001",
    title: "",
    aspectRatio: "16:9",
    fps: 30,
    canvasWidth: 1920,
    canvasHeight: 1080,
    currentTime: 0,
    totalDuration,
    tracks,
  };
}

export const SAMPLE_ASSETS: MediaAssetInfo[] = [
  { id: "asset-1", name: "Opening_Hook.mp4", kind: "video", duration: 5.5, hue: 234 },
  { id: "asset-2", name: "Interview_Take3.mov", kind: "video", duration: 14.5, hue: 262 },
  { id: "asset-3", name: "Product_Broll.mp4", kind: "video", duration: 5.5, hue: 190 },
  { id: "asset-4", name: "Voiceover_Master.wav", kind: "audio", duration: 17, hue: 152 },
  { id: "asset-5", name: "Lofi_Sunset.mp3", kind: "audio", duration: 25.5, hue: 38 },
  { id: "asset-6", name: "Thumbnail_Cover.png", kind: "image", duration: 0, hue: 340 },
];
