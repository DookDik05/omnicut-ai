"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Eye,
  EyeOff,
  Film,
  Lock,
  Music,
  Type,
  Unlock,
  Volume2,
  VolumeX,
} from "lucide-react";
import { collectSnapCandidates, useEditorStore } from "@/lib/store";
import { TRACK_IDS } from "@/lib/sample-data";
import { formatShortTime, hashHue, pseudoWaveform } from "@/lib/utils";
import type { TimelineClip } from "@/types/timeline";

const RULER_H = 32;
const ROW_H = 56;

type DragState =
  | { kind: "seek"; lastT: number }
  | { kind: "move"; clipId: string; grabOffset: number; candidates: number[] }
  | {
      kind: "trim";
      clipId: string;
      edge: "left" | "right";
      candidates: number[];
      lastT: number;
    };

function accentFor(type: TimelineClip["type"]): string {
  switch (type) {
    case "audio":
      return "#34d399";
    case "subtitle":
    case "text":
      return "#a78bfa";
    case "effect":
      return "#fbbf24";
    default:
      return "#818cf8";
  }
}

const ClipView = memo(function ClipView({
  clip,
  pps,
  selected,
  onBodyDown,
  onHandleDown,
}: {
  clip: TimelineClip;
  pps: number;
  selected: boolean;
  onBodyDown: (e: React.PointerEvent, clip: TimelineClip) => void;
  onHandleDown: (
    e: React.PointerEvent,
    clip: TimelineClip,
    edge: "left" | "right"
  ) => void;
}) {
  const width = Math.max(6, clip.duration * pps);
  const isAudio = clip.type === "audio";
  const isTextLike = clip.type === "text" || clip.type === "subtitle";
  const hue = hashHue(clip.id);
  const bars = useMemo(
    () =>
      isAudio
        ? pseudoWaveform(clip.id, Math.min(180, Math.max(8, Math.floor(width / 4))))
        : [],
    [isAudio, clip.id, width]
  );

  return (
    <div
      data-clip-id={clip.id}
      className={`group absolute top-1.5 h-[calc(100%-12px)] overflow-hidden rounded-trackclip transition-shadow ${
        selected ? "z-10 shadow-glow ring-2 ring-indigo-400" : "ring-1 ring-white/10 hover:ring-white/25"
      }`}
      style={{
        left: clip.startAt * pps,
        width,
        background: isTextLike
          ? `linear-gradient(135deg, hsl(${hue} 45% 32%), hsl(${(hue + 40) % 360} 50% 26%))`
          : `linear-gradient(135deg, #3b465c, #303a4d)`,
      }}
      onPointerDown={(e) => onBodyDown(e, clip)}
    >
      {!isAudio ? (
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 12px, transparent 12px, transparent 24px)",
          }}
        />
      ) : null}
      {isAudio ? (
        <svg
          className="pointer-events-none absolute inset-x-1 bottom-0 h-[55%] w-[calc(100%-8px)]"
          viewBox={`0 0 ${bars.length} 100`}
          preserveAspectRatio="none"
        >
          {bars.map((b, i) => {
            const barH = Math.round(b * 92 * 100) / 100;
            const barY = Math.round((50 - b * 46) * 100) / 100;
            return (
              <rect
                key={i}
                x={i + 0.15}
                y={barY}
                width={0.7}
                height={barH}
                rx={0.35}
                fill="rgba(148, 163, 184, 0.55)"
              />
            );
          })}
        </svg>
      ) : null}
      <span
        className="absolute inset-y-0 left-0 w-[3px]"
        style={{ background: accentFor(clip.type) }}
      />
      <span className="pointer-events-none absolute inset-x-2 top-1 flex items-center gap-1 truncate text-[10px] font-bold text-slate-200">
        {clip.type === "audio" ? (
          <Music className="size-3 shrink-0 opacity-70" />
        ) : isTextLike ? (
          <Type className="size-3 shrink-0 opacity-70" />
        ) : (
          <Film className="size-3 shrink-0 opacity-70" />
        )}
        <span className="truncate">{clip.name}</span>
      </span>
      <div
        role="separator"
        className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "rgba(129, 140, 248, 0.75)" }}
        onPointerDown={(e) => onHandleDown(e, clip, "left")}
      />
      <div
        role="separator"
        className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize opacity-0 transition-opacity group-hover:opacity-100"
        style={{ background: "rgba(129, 140, 248, 0.75)" }}
        onPointerDown={(e) => onHandleDown(e, clip, "right")}
      />
      {selected ? (
        <>
          <div
            role="separator"
            className="absolute inset-y-0 left-0 z-10 w-2 cursor-ew-resize bg-indigo-400/90"
            onPointerDown={(e) => onHandleDown(e, clip, "left")}
          />
          <div
            role="separator"
            className="absolute inset-y-0 right-0 z-10 w-2 cursor-ew-resize bg-indigo-400/90"
            onPointerDown={(e) => onHandleDown(e, clip, "right")}
          />
        </>
      ) : null}
    </div>
  );
});

function TrackFlags({ trackId }: { trackId: string }) {
  const t = useTranslations("editor");
  const track = useEditorStore((s) => s.project.tracks.find((tr) => tr.id === trackId));
  const toggleTrackFlag = useEditorStore((s) => s.toggleTrackFlag);
  if (!track) return null;

  return (
    <div className="mt-1 flex items-center gap-0.5">
      <button
        title={track.isMuted ? t("timeline.unmute_track") : t("timeline.mute_track")}
        onClick={() => toggleTrackFlag(trackId, "isMuted")}
        className={`grid size-6 place-items-center rounded-md transition-colors ${
          track.isMuted ? "bg-error/20 text-red-300" : "text-slate-400 hover:bg-white/10 hover:text-slate-100"
        }`}
      >
        {track.isMuted ? <VolumeX className="size-3" /> : <Volume2 className="size-3" />}
      </button>
      <button
        title={track.isHidden ? t("timeline.show_track") : t("timeline.hide_track")}
        onClick={() => toggleTrackFlag(trackId, "isHidden")}
        disabled={track.type === "audio"}
        className={`grid size-6 place-items-center rounded-md transition-colors disabled:opacity-25 ${
          track.isHidden ? "bg-warning/20 text-amber-300" : "text-slate-400 hover:bg-white/10 hover:text-slate-100"
        }`}
      >
        {track.isHidden ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
      </button>
      <button
        title={track.isLocked ? t("timeline.unlock_track") : t("timeline.lock_track")}
        onClick={() => toggleTrackFlag(trackId, "isLocked")}
        className={`grid size-6 place-items-center rounded-md transition-colors ${
          track.isLocked ? "bg-info/20 text-cyan-300" : "text-slate-400 hover:bg-white/10 hover:text-slate-100"
        }`}
      >
        {track.isLocked ? <Lock className="size-3" /> : <Unlock className="size-3" />}
      </button>
    </div>
  );
}

function Playhead({
  scrollerRef,
  contentHeight,
  onGripDown,
}: {
  scrollerRef: React.RefObject<HTMLDivElement | null>;
  contentHeight: number;
  onGripDown: (e: React.PointerEvent) => void;
}) {
  const time = useEditorStore((s) => s.project.currentTime);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const pps = useEditorStore((s) => s.pxPerSecond);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el || !isPlaying) return;
    const x = time * pps;
    if (x < el.scrollLeft + 70) {
      el.scrollLeft = Math.max(0, x - 70);
    } else if (x > el.scrollLeft + el.clientWidth - 90) {
      el.scrollLeft = x - 90;
    }
  }, [time, isPlaying, pps, scrollerRef]);

  return (
    <div
      className="pointer-events-none absolute bottom-0 z-20 w-px bg-indigo-400"
      style={{ left: time * pps, top: RULER_H - 6, height: contentHeight - RULER_H + 6 }}
    >
      <div
        className="pointer-events-auto absolute -top-0 left-1/2 size-2.5 -translate-x-1/2 rotate-45 cursor-ew-resize rounded-[3px] bg-indigo-400 shadow"
        onPointerDown={onGripDown}
      />
    </div>
  );
}

export function TimelineBody() {
  const t = useTranslations("editor");
  const project = useEditorStore((s) => s.project);
  const pps = useEditorStore((s) => s.pxPerSecond);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const selectClip = useEditorStore((s) => s.selectClip);
  const seek = useEditorStore((s) => s.seek);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportW, setViewportW] = useState(900);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => setViewportW(el.clientWidth));
    observer.observe(el);
    setViewportW(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const contentSec = Math.max(project.totalDuration + 8, viewportW / pps);
  const contentWidth = contentSec * pps;
  const contentHeight = RULER_H + project.tracks.length * ROW_H;

  const getTimeFromClientX = useCallback((clientX: number): number => {
    const el = scrollerRef.current;
    if (!el) return 0;
    const rect = el.getBoundingClientRect();
    return Math.max(0, (clientX - rect.left + el.scrollLeft) / useEditorStore.getState().pxPerSecond);
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const t = getTimeFromClientX(e.clientX);
      const { snapping, moveClipWithSnap, trimClip, seek: doSeek } =
        useEditorStore.getState();
      if (drag.kind === "seek") {
        doSeek(t);
        drag.lastT = t;
      } else if (drag.kind === "move") {
        moveClipWithSnap(drag.clipId, t - drag.grabOffset, drag.candidates);
      } else {
        trimClip(
          drag.clipId,
          drag.edge,
          t - drag.lastT,
          snapping,
          drag.candidates
        );
        drag.lastT = t;
      }
    };
    const onUp = () => {
      if (!dragRef.current) return;
      dragRef.current = null;
      useEditorStore.getState().endChange();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [getTimeFromClientX]);

  const startSeekDrag = (e: React.PointerEvent) => {
    e.preventDefault();
    dragRef.current = { kind: "seek", lastT: getTimeFromClientX(e.clientX) };
    seek(dragRef.current.lastT);
  };

  const startMoveDrag = (e: React.PointerEvent, clip: TimelineClip) => {
    const track = project.tracks.find((tr) => tr.clips.some((c) => c.id === clip.id));
    if (track?.isLocked) return;
    e.preventDefault();
    selectClip(clip.id);
    useEditorStore.getState().beginChange();
    dragRef.current = {
      kind: "move",
      clipId: clip.id,
      grabOffset: getTimeFromClientX(e.clientX) - clip.startAt,
      candidates: collectSnapCandidates(useEditorStore.getState().project, clip.id),
    };
  };

  const startTrimDrag = (
    e: React.PointerEvent,
    clip: TimelineClip,
    edge: "left" | "right"
  ) => {
    const track = project.tracks.find((tr) => tr.clips.some((c) => c.id === clip.id));
    if (track?.isLocked) return;
    e.preventDefault();
    e.stopPropagation();
    selectClip(clip.id);
    useEditorStore.getState().beginChange();
    dragRef.current = {
      kind: "trim",
      clipId: clip.id,
      edge,
      candidates: collectSnapCandidates(useEditorStore.getState().project, clip.id),
      lastT: getTimeFromClientX(e.clientX),
    };
  };

  const ticks = useMemo(() => {
    const steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 15, 30, 60, 120, 300];
    const step = steps.find((s) => s * pps >= 74) ?? 600;
    const majors: Array<{ t: number; minor: boolean }> = [];
    const minorStep = step / 5;
    const showMinors = minorStep * pps >= 11;
    for (let t = 0; t <= contentSec; t += minorStep) {
      const isMajor = Math.abs(t / step - Math.round(t / step)) < 1e-6;
      if (isMajor) majors.push({ t, minor: false });
      else if (showMinors) majors.push({ t, minor: true });
    }
    return { majors, step };
  }, [pps, contentSec]);

  return (
    <div className="flex min-h-0 min-w-0 flex-1">
      <div className="w-44 shrink-0 overflow-hidden border-r border-white/5 bg-tl-bg">
        <div style={{ transform: `translateY(${-scrollTop}px)` }}>
          <div style={{ height: RULER_H }} className="border-b border-white/5" />
          {project.tracks.map((track) => (
            <div
              key={track.id}
              style={{ height: ROW_H }}
              className="flex items-center gap-2 border-b border-white/5 px-3"
            >
              <span
                className="grid size-5 shrink-0 place-items-center rounded-md text-[9px] font-extrabold"
                style={{
                  background: `${accentFor(track.type)}22`,
                  color: accentFor(track.type),
                }}
              >
                {track.name}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[11px] font-bold text-slate-300">
                  {track.id === TRACK_IDS.overlay
                    ? t("timeline.track_overlay")
                    : track.id === TRACK_IDS.main
                      ? t("timeline.track_main")
                      : track.id === TRACK_IDS.audio
                        ? t("timeline.track_audio")
                        : t("timeline.track_music")}
                </p>
                <TrackFlags trackId={track.id} />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div
        ref={scrollerRef}
        className="scroll-thin scroll-thin-dark relative min-w-0 flex-1 overflow-auto"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        <div style={{ width: contentWidth, minHeight: contentHeight }} className="relative no-select">
          <div
            className="sticky top-0 z-30 border-b border-white/5 bg-tl-bg/95 backdrop-blur"
            style={{ height: RULER_H }}
            onPointerDown={startSeekDrag}
          >
            {ticks.majors.map(({ t, minor }, i) => (
              <div
                key={i}
                className="absolute bottom-0"
                style={{ left: t * pps }}
              >
                <div
                  className={minor ? "h-1.5 w-px bg-white/15" : "h-2.5 w-px bg-white/30"}
                  style={{ marginBottom: 0 }}
                />
                {!minor ? (
                  <span className="absolute bottom-3 left-1 -translate-x-0 font-mono text-[9px] text-slate-500">
                    {ticks.step < 1 ? `${t.toFixed(1)}s` : formatShortTime(t)}
                  </span>
                ) : null}
              </div>
            ))}
          </div>

          {project.tracks.map((track, rowIndex) => (
            <div
              key={track.id}
              style={{ height: ROW_H }}
              className={`relative border-b border-white/5 ${
                rowIndex % 2 === 0 ? "bg-tl-track/70" : "bg-tl-track/40"
              } ${track.isHidden && track.type !== "audio" ? "opacity-40" : ""}`}
              onPointerDown={() => selectClip(null)}
            >
              {!track.isLocked
                ? track.clips.map((clip) => (
                    <ClipView
                      key={clip.id}
                      clip={clip}
                      pps={pps}
                      selected={clip.id === selectedClipId}
                      onBodyDown={startMoveDrag}
                      onHandleDown={startTrimDrag}
                    />
                  ))
                : null}
            </div>
          ))}

          <Playhead
            scrollerRef={scrollerRef}
            contentHeight={contentHeight}
            onGripDown={(e) => {
              e.stopPropagation();
              startSeekDrag(e);
            }}
          />
        </div>
      </div>
    </div>
  );
}
