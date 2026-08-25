"use client";

import { useTranslations } from "next-intl";
import {
  Scissors,
  Trash2,
  ChevronsLeft,
  Magnet,
  Sparkles,
  Subtitles,
  ZoomIn,
  ZoomOut,
  Maximize2,
} from "lucide-react";
import { useRef } from "react";
import { useEditorStore } from "@/lib/store";
import { DarkIconButton } from "@/components/ui/primitives";

export function TimelineToolbar() {
  const t = useTranslations("editor");
  const splitSelectedAtPlayhead = useEditorStore((s) => s.splitSelectedAtPlayhead);
  const deleteSelected = useEditorStore((s) => s.deleteSelected);
  const snapping = useEditorStore((s) => s.snapping);
  const setSnapping = useEditorStore((s) => s.setSnapping);
  const openAiTask = useEditorStore((s) => s.openAiTask);
  const pxPerSecond = useEditorStore((s) => s.pxPerSecond);
  const setZoom = useEditorStore((s) => s.setZoom);
  const zoomFit = useEditorStore((s) => s.zoomFit);
  const sliderRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex h-11 shrink-0 items-center gap-1 border-b border-white/5 px-3">
      <DarkIconButton label={t("timeline.split")} onClick={() => splitSelectedAtPlayhead()}>
        <Scissors className="size-4" />
      </DarkIconButton>
      <DarkIconButton label={t("timeline.delete")} onClick={() => deleteSelected(false)}>
        <Trash2 className="size-4" />
      </DarkIconButton>
      <DarkIconButton label={t("timeline.ripple_delete")} onClick={() => deleteSelected(true)}>
        <ChevronsLeft className="size-4" />
      </DarkIconButton>

      <div className="mx-1.5 h-5 w-px bg-white/10" />

      <DarkIconButton
        label={t("timeline.snap_toggle")}
        active={snapping}
        onClick={() => setSnapping(!snapping)}
      >
        <Magnet className="size-4" />
      </DarkIconButton>

      <div className="mx-1.5 h-5 w-px bg-white/10" />

      <button
        onClick={() => openAiTask("silence")}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/5 px-2.5 text-[11px] font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Sparkles className="size-3.5 text-indigo-300" />
        <span className="hidden xl:inline">{t("timeline.silence_detect")}</span>
      </button>
      <button
        onClick={() => openAiTask("auto_subtitle")}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white/5 px-2.5 text-[11px] font-bold text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
      >
        <Subtitles className="size-3.5 text-violet-300" />
        <span className="hidden xl:inline">{t("timeline.auto_subtitle")}</span>
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <DarkIconButton
          label={t("timeline.zoom_out")}
          onClick={() => setZoom(pxPerSecond / 1.4)}
        >
          <ZoomOut className="size-4" />
        </DarkIconButton>
        <input
          ref={sliderRef}
          type="range"
          min={4}
          max={260}
          step={1}
          value={pxPerSecond}
          onChange={(e) => setZoom(Number(e.target.value))}
          aria-label={t("timeline.zoom_in")}
          className="h-1 w-24 cursor-pointer appearance-none rounded-full bg-white/15 [&::-webkit-slider-thumb]:size-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-slate-200"
        />
        <DarkIconButton label={t("timeline.zoom_in")} onClick={() => setZoom(pxPerSecond * 1.4)}>
          <ZoomIn className="size-4" />
        </DarkIconButton>
        <DarkIconButton
          label={t("timeline.zoom_fit")}
          onClick={() => {
            const el = sliderRef.current?.closest("section");
            zoomFit(el ? el.clientWidth : 1200);
          }}
        >
          <Maximize2 className="size-4" />
        </DarkIconButton>
      </div>
    </div>
  );
}
