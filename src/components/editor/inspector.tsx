"use client";

import { useTranslations } from "next-intl";
import { Sliders, Sparkles, Wand2, Volume2, RotateCcw, BadgeCheck } from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { formatTimecode } from "@/lib/utils";
import { SectionCard, SliderField } from "@/components/ui/primitives";

export function Inspector() {
  const t = useTranslations("editor");
  const project = useEditorStore((s) => s.project);
  const selectedClipId = useEditorStore((s) => s.selectedClipId);
  const updateClipLive = useEditorStore((s) => s.updateClipLive);
  const beginChange = useEditorStore((s) => s.beginChange);
  const endChange = useEditorStore((s) => s.endChange);

  const selected = selectedClipId
    ? project.tracks.flatMap((tr) => tr.clips).find((c) => c.id === selectedClipId) ?? null
    : null;

  if (!selected) {
    return (
      <aside className="flex w-[280px] shrink-0 flex-col border-l border-line bg-canvas">
        <header className="flex h-11 items-center gap-2 border-b border-line px-4">
          <Sliders className="size-3.5 text-ink-3" />
          <h2 className="text-xs font-bold uppercase tracking-wider text-ink-2">
            {t("inspector.header")}
          </h2>
        </header>
        <div className="flex flex-1 flex-col items-center justify-center gap-2 px-8 text-center">
          <div className="grid size-12 place-items-center rounded-2xl bg-overlay">
            <Wand2 className="size-5 text-ink-3" />
          </div>
          <p className="text-sm font-bold text-ink">{t("inspector.empty_title")}</p>
          <p className="text-xs leading-relaxed text-ink-3">{t("inspector.empty_desc")}</p>
        </div>
      </aside>
    );
  }

  const isAudioLike = selected.type === "audio";
  const ai = selected.aiMetadata;

  return (
    <aside className="flex w-[280px] shrink-0 flex-col border-l border-line bg-canvas">
      <header className="flex h-11 shrink-0 items-center gap-2 border-b border-line px-4">
        <Sliders className="size-3.5 text-ink-3" />
        <h2 className="text-xs font-bold uppercase tracking-wider text-ink-2">
          {t("inspector.header")}
        </h2>
      </header>

      <div className="scroll-thin scroll-thin-light min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
        <SectionCard title={t("inspector.section_clip")}>
          <input
            value={selected.name}
            onFocus={beginChange}
            onChange={(e) =>
              updateClipLive(selected.id, (clip) => ({ ...clip, name: e.target.value }))
            }
            onBlur={endChange}
            className="mb-2.5 h-9 w-full rounded-btn border border-line bg-canvas px-2.5 text-sm font-semibold text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            aria-label={t("inspector.field_name")}
          />
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded-lg bg-overlay px-2.5 py-2">
              <p className="font-medium text-ink-3">{t("inspector.field_start")}</p>
              <p className="font-mono font-bold text-ink">{formatTimecode(selected.startAt, project.fps)}</p>
            </div>
            <div className="rounded-lg bg-overlay px-2.5 py-2">
              <p className="font-medium text-ink-3">{t("inspector.field_duration")}</p>
              <p className="font-mono font-bold text-ink">{selected.duration.toFixed(2)}s</p>
            </div>
          </div>

          {ai ? (
            <div className="mt-2.5 space-y-1.5">
              {ai.transcript ? (
                <span className="flex items-center gap-1.5 rounded-lg bg-accent-soft px-2 py-1.5 text-[10px] font-bold text-violet-700">
                  <Sparkles className="size-3" />
                  {t("inspector.badge_transcript")}
                </span>
              ) : null}
              {ai.maskUrl ? (
                <span className="flex items-center gap-1.5 rounded-lg bg-info-soft px-2 py-1.5 text-[10px] font-bold text-cyan-700">
                  <BadgeCheck className="size-3" />
                  {t("inspector.badge_masked")}
                </span>
              ) : null}
              {ai.isCleanedSpeech ? (
                <span className="flex items-center gap-1.5 rounded-lg bg-success-soft px-2 py-1.5 text-[10px] font-bold text-emerald-700">
                  <Volume2 className="size-3" />
                  {t("inspector.badge_cleaned")}
                </span>
              ) : null}
            </div>
          ) : null}
        </SectionCard>

        {!isAudioLike ? (
          <SectionCard
            title={t("inspector.section_transform")}
            action={
              <button
                onClick={() => {
                  beginChange();
                  updateClipLive(selected.id, () => ({
                    transform: { x: 0, y: 0, scale: 1, rotation: 0 },
                  }));
                  endChange();
                }}
                title={t("inspector.reset")}
                className="text-ink-3 transition-colors hover:text-ink"
              >
                <RotateCcw className="size-3.5" />
              </button>
            }
          >
            <SliderField
              label={t("inspector.field_x")}
              value={selected.transform.x}
              min={-1000}
              max={1000}
              step={2}
              format={(v) => `${v}px`}
              onBegin={beginChange}
              onLiveChange={(v) =>
                updateClipLive(selected.id, (c) => ({ transform: { ...c.transform, x: v } }))
              }
              onEnd={endChange}
            />
            <SliderField
              label={t("inspector.field_y")}
              value={selected.transform.y}
              min={-1000}
              max={1000}
              step={2}
              format={(v) => `${v}px`}
              onBegin={beginChange}
              onLiveChange={(v) =>
                updateClipLive(selected.id, (c) => ({ transform: { ...c.transform, y: v } }))
              }
              onEnd={endChange}
            />
            <SliderField
              label={t("inspector.field_scale")}
              value={Math.round(selected.transform.scale * 100)}
              min={10}
              max={400}
              step={1}
              format={(v) => `${v}%`}
              onBegin={beginChange}
              onLiveChange={(v) =>
                updateClipLive(selected.id, (c) => ({
                  transform: { ...c.transform, scale: v / 100 },
                }))
              }
              onEnd={endChange}
            />
            <SliderField
              label={t("inspector.field_rotation")}
              value={selected.transform.rotation}
              min={-180}
              max={180}
              step={1}
              format={(v) => `${v}°`}
              onBegin={beginChange}
              onLiveChange={(v) =>
                updateClipLive(selected.id, (c) => ({
                  transform: { ...c.transform, rotation: v },
                }))
              }
              onEnd={endChange}
            />
          </SectionCard>
        ) : null}

        {!isAudioLike ? (
          <SectionCard title={t("inspector.section_composition")}>
            <SliderField
              label={t("inspector.field_opacity")}
              value={Math.round(selected.opacity * 100)}
              min={0}
              max={100}
              step={1}
              format={(v) => `${v}%`}
              onBegin={beginChange}
              onLiveChange={(v) => updateClipLive(selected.id, () => ({ opacity: v / 100 }))}
              onEnd={endChange}
            />
          </SectionCard>
        ) : null}

        <SectionCard title={t("inspector.section_audio")}>
          <SliderField
            label={t("inspector.field_volume")}
            value={Math.round(selected.volume * 100)}
            min={0}
            max={200}
            step={5}
            format={(v) => `${v}%`}
            onBegin={beginChange}
            onLiveChange={(v) => updateClipLive(selected.id, () => ({ volume: v / 100 }))}
            onEnd={endChange}
          />
          <SliderField
            label={t("inspector.field_speed")}
            value={Math.round(selected.speed * 100)}
            min={25}
            max={400}
            step={5}
            format={(v) => `${(v / 100).toFixed(2)}x`}
            onBegin={beginChange}
            onLiveChange={(v) => updateClipLive(selected.id, () => ({ speed: v / 100 }))}
            onEnd={endChange}
          />
        </SectionCard>
      </div>
    </aside>
  );
}
