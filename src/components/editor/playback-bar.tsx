"use client";

import { useTranslations } from "next-intl";
import {
  Play,
  Pause,
  ChevronFirst,
  ChevronLast,
  Rewind,
  FastForward,
  Eye,
  Maximize2,
} from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { formatTimecode } from "@/lib/utils";
import type { AspectRatio } from "@/types/timeline";

const RATIOS: AspectRatio[] = ["16:9", "9:16", "1:1", "4:5", "21:9"];

export function PlaybackBar() {
  const t = useTranslations("editor");
  const project = useEditorStore((s) => s.project);
  const isPlaying = useEditorStore((s) => s.isPlaying);
  const togglePlay = useEditorStore((s) => s.togglePlay);
  const seek = useEditorStore((s) => s.seek);
  const setAspectRatio = useEditorStore((s) => s.setAspectRatio);
  const showSafeZones = useEditorStore((s) => s.showSafeZones);
  const setShowSafeZones = useEditorStore((s) => s.setShowSafeZones);

  return (
    <div className="flex h-14 shrink-0 items-center gap-3 border-t border-line bg-card/80 px-4 backdrop-blur">
      <div className="flex items-center gap-0.5">
        <button
          title={t("playback.go_start")}
          onClick={() => seek(0)}
          className="grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-overlay hover:text-ink"
        >
          <ChevronFirst className="size-4" />
        </button>
        <button
          title={t("playback.back_1s")}
          onClick={() => seek(project.currentTime - 1)}
          className="grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-overlay hover:text-ink"
        >
          <Rewind className="size-4" />
        </button>
        <button
          title={isPlaying ? t("playback.pause") : t("playback.play")}
          onClick={togglePlay}
          className="mx-1 grid size-10 place-items-center rounded-full bg-primary text-white shadow-glow transition-all hover:bg-primary-strong active:scale-95"
        >
          {isPlaying ? <Pause className="size-4.5" /> : <Play className="ml-0.5 size-4.5" />}
        </button>
        <button
          title={t("playback.fwd_1s")}
          onClick={() => seek(project.currentTime + 1)}
          className="grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-overlay hover:text-ink"
        >
          <FastForward className="size-4" />
        </button>
        <button
          title={t("playback.go_end")}
          onClick={() => seek(project.totalDuration)}
          className="grid size-8 place-items-center rounded-lg text-ink-2 transition-colors hover:bg-overlay hover:text-ink"
        >
          <ChevronLast className="size-4" />
        </button>
      </div>

      <div className="rounded-btn bg-overlay px-3 py-1.5 font-mono text-[11px] font-medium tracking-tight text-ink">
        {formatTimecode(project.currentTime, project.fps)}
        <span className="text-ink-3">
          {" / "}
          {formatTimecode(project.totalDuration, project.fps)}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="hidden items-center rounded-xl bg-overlay p-1 md:flex" role="group" aria-label={t("canvas.aspect_ratio")}>
          {RATIOS.map((ratio) => (
            <button
              key={ratio}
              onClick={() => setAspectRatio(ratio)}
              className={`rounded-lg px-2.5 py-1.5 font-mono text-[11px] font-bold transition-colors ${
                project.aspectRatio === ratio
                  ? "bg-card text-primary-strong shadow-soft"
                  : "text-ink-2 hover:text-ink"
              }`}
            >
              {ratio}
            </button>
          ))}
        </div>
        <button
          title={t("canvas.safe_zones")}
          onClick={() => setShowSafeZones(!showSafeZones)}
          className={`grid size-9 place-items-center rounded-btn transition-colors ${
            showSafeZones
              ? "bg-primary-soft text-primary-strong"
              : "text-ink-2 hover:bg-overlay hover:text-ink"
          }`}
        >
          <Eye className="size-4" />
        </button>
        <button
          title={t("canvas.fullscreen")}
          onClick={() =>
            document.getElementById("preview-stage")?.requestFullscreen?.()
          }
          className="grid size-9 place-items-center rounded-btn text-ink-2 transition-colors hover:bg-overlay hover:text-ink"
        >
          <Maximize2 className="size-4" />
        </button>
      </div>
    </div>
  );
}
