"use client";

import { useTranslations } from "next-intl";
import {
  Film,
  Sparkles,
  Type,
  Music,
  Wand2,
  Upload,
  Plus,
  AudioLines,
  Subtitles,
  Scissors,
  Mic,
  ImagePlus,
  Volume2,
  Image as ImageIcon,
  Blend,
} from "lucide-react";
import type { AiTaskKind, MediaAssetInfo } from "@/types/timeline";
import { useEditorStore } from "@/lib/store";
import { SAMPLE_ASSETS } from "@/lib/sample-data";
import { formatShortTime } from "@/lib/utils";

type TabId = "media" | "ai" | "text" | "audio" | "effects";

function AssetRow({ asset }: { asset: MediaAssetInfo }) {
  const t = useTranslations("editor");
  const addAssetToTimeline = useEditorStore((s) => s.addAssetToTimeline);
  const KindIcon = asset.kind === "audio" ? Music : asset.kind === "image" ? ImageIcon : Film;

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-transparent p-2 transition-all hover:border-line hover:bg-card hover:shadow-soft">
      <div
        className="grid size-11 shrink-0 place-items-center rounded-lg"
        style={{
          background: `linear-gradient(135deg, hsl(${asset.hue} 70% 92%), hsl(${(asset.hue + 40) % 360} 70% 84%))`,
        }}
      >
        <KindIcon
          className="size-4.5"
          style={{ color: `hsl(${asset.hue} 55% 45%)` }}
        />
      </div>
      <div className="min-w-0 flex-1 leading-tight">
        <p className="truncate text-[13px] font-semibold text-ink">{asset.name}</p>
        <p className="font-mono text-[10px] text-ink-3">
          {asset.duration > 0 ? `${formatShortTime(asset.duration)}` : "Still"}
        </p>
      </div>
      <button
        title={t("media.add_to_timeline")}
        onClick={() => addAssetToTimeline(asset)}
        className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 opacity-0 transition-all hover:bg-primary-soft hover:text-primary-strong group-hover:opacity-100 focus-visible:opacity-100"
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}

function MediaPanel() {
  const t = useTranslations("editor");
  return (
    <div>
      <button className="flex w-full flex-col items-center gap-2 rounded-card border-2 border-dashed border-line-strong bg-card/50 px-4 py-7 text-ink-2 transition-colors hover:border-primary hover:bg-primary-soft/40 hover:text-primary-strong">
        <Upload className="size-6" />
        <span className="text-sm font-semibold">{t("media.import")}</span>
        <span className="text-[10px] font-medium tracking-wide text-ink-3">
          {t("media.supported")}
        </span>
      </button>
      <h3 className="mb-1 mt-5 px-1 text-[11px] font-bold uppercase tracking-wider text-ink-3">
        {t("media.library_title")}
      </h3>
      <div className="space-y-0.5">
        {SAMPLE_ASSETS.map((asset) => (
          <AssetRow key={asset.id} asset={asset} />
        ))}
      </div>
    </div>
  );
}

const AI_TOOLS: Array<{
  kind: AiTaskKind;
  icon: typeof Sparkles;
  key: string;
  hue: number;
}> = [
  { kind: "auto_subtitle", icon: Subtitles, key: "auto_subtitle", hue: 239 },
  { kind: "silence", icon: Scissors, key: "silence", hue: 174 },
  { kind: "tts", icon: Mic, key: "tts", hue: 262 },
  { kind: "cutout", icon: Wand2, key: "cutout", hue: 199 },
  { kind: "broll", icon: ImagePlus, key: "broll", hue: 152 },
  { kind: "enhancer", icon: Volume2, key: "enhancer", hue: 38 },
];

function AiToolsPanel() {
  const t = useTranslations("editor");
  const ta = useTranslations("ai_tools");
  const openAiTask = useEditorStore((s) => s.openAiTask);

  return (
    <div>
      <h3 className="px-1 text-sm font-bold text-ink">{t("ai_panel.header")}</h3>
      <p className="mb-3 px-1 text-xs text-ink-3">{t("ai_panel.subtitle")}</p>
      <div className="space-y-2">
        {AI_TOOLS.map(({ kind, icon: Icon, key, hue }) => (
          <button
            key={kind}
            onClick={() => openAiTask(kind)}
            className="group flex w-full items-start gap-3 rounded-xl border border-line bg-card p-3 text-left shadow-soft transition-all hover:-translate-y-px hover:shadow-pop"
          >
            <span
              className="grid size-9 shrink-0 place-items-center rounded-lg"
              style={{ background: `hsl(${hue} 80% 95%)`, color: `hsl(${hue} 60% 48%)` }}
            >
              <Icon className="size-4.5" />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-bold text-ink">
                {ta(`${key}.title`)}
              </span>
              <span className="mt-0.5 line-clamp-2 block text-[11px] text-ink-3">
                {ta(`${key}.desc`)}
              </span>
            </span>
            <Sparkles className="mt-1 size-3.5 shrink-0 text-ink-3 opacity-0 transition-opacity group-hover:opacity-100" />
          </button>
        ))}
      </div>
    </div>
  );
}

function TextPanel() {
  const t = useTranslations("editor");
  const addTextClip = useEditorStore((s) => s.addTextClip);
  const titleText = t("text.title_placeholder");
  const captionText = t("text.caption_placeholder");

  return (
    <div className="space-y-3">
      <button
        onClick={() => addTextClip("title", titleText)}
        className="w-full rounded-xl bg-gradient-to-br from-primary to-accent p-4 text-left shadow-soft transition-transform hover:-translate-y-0.5"
      >
        <Type className="mb-2 size-4 text-white/80" />
        <p className="text-lg font-extrabold text-white">{titleText}</p>
        <p className="mt-1 text-xs font-semibold text-white/75">{t("text.add_title")}</p>
      </button>
      <button
        onClick={() => addTextClip("caption", captionText)}
        className="w-full rounded-xl border border-line bg-card p-4 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-pop"
      >
        <Subtitles className="mb-2 size-4 text-ink-3" />
        <p className="inline-block rounded-md bg-ink/85 px-2.5 py-1 text-sm font-semibold text-white">
          {captionText}
        </p>
        <p className="mt-2 text-xs font-semibold text-ink-2">{t("text.add_caption")}</p>
      </button>
    </div>
  );
}

const MUSIC_ITEMS = [
  { name: "Lofi_Sunset.mp3", duration: 25.5, tag: "Chill", hue: 38 },
  { name: "Corporate_Upbeat.mp3", duration: 18, tag: "Energetic", hue: 215 },
  { name: "Ambient_Focus.mp3", duration: 32, tag: "Calm", hue: 262 },
];

const SFX_ITEMS = [
  { name: "Whoosh.wav", duration: 1.2, hue: 174 },
  { name: "Pop.wav", duration: 0.6, hue: 340 },
  { name: "Riser.wav", duration: 2.4, hue: 280 },
];

function AudioPanel() {
  const t = useTranslations("editor");
  const addMusicClip = useEditorStore((s) => s.addMusicClip);
  const openAiTask = useEditorStore((s) => s.openAiTask);

  return (
    <div className="space-y-5">
      <button
        onClick={() => openAiTask("tts")}
        className="flex w-full items-center gap-3 rounded-xl bg-gradient-to-r from-accent to-primary p-3.5 text-left shadow-soft transition-transform hover:-translate-y-0.5"
      >
        <Mic className="size-5 shrink-0 text-white" />
        <span className="text-sm font-bold text-white">{t("audio.record_voiceover")}</span>
        <AudioLines className="ml-auto size-4 text-white/70" />
      </button>

      <section>
        <h3 className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-ink-3">
          {t("audio.music_header")}
        </h3>
        <div className="space-y-0.5">
          {MUSIC_ITEMS.map((item) => (
            <div
              key={item.name}
              className="group flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-card hover:shadow-soft"
            >
              <div
                className="grid size-10 shrink-0 place-items-center rounded-lg"
                style={{ background: `hsl(${item.hue} 70% 93%)` }}
              >
                <Music className="size-4" style={{ color: `hsl(${item.hue} 55% 45%)` }} />
              </div>
              <div className="min-w-0 flex-1 leading-tight">
                <p className="truncate text-[13px] font-semibold text-ink">{item.name}</p>
                <p className="font-mono text-[10px] text-ink-3">
                  {formatShortTime(item.duration)} · {item.tag}
                </p>
              </div>
              <button
                title={t("audio.add_track")}
                onClick={() => addMusicClip(item.name, item.duration)}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 opacity-0 transition-all hover:bg-primary-soft hover:text-primary-strong group-hover:opacity-100"
              >
                <Plus className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h3 className="mb-1.5 px-1 text-[11px] font-bold uppercase tracking-wider text-ink-3">
          {t("audio.sfx_header")}
        </h3>
        <div className="grid grid-cols-3 gap-2">
          {SFX_ITEMS.map((item) => (
            <button
              key={item.name}
              onClick={() => addMusicClip(item.name, item.duration)}
              className="rounded-xl border border-line bg-card p-2.5 text-center shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-pop"
            >
              <AudioLines
                className="mx-auto mb-1 size-4"
                style={{ color: `hsl(${item.hue} 55% 50%)` }}
              />
              <p className="truncate text-[10px] font-bold text-ink">
                {item.name.replace(".wav", "")}
              </p>
              <p className="font-mono text-[9px] text-ink-3">{item.duration}s</p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

const TRANSITIONS = ["cross_dissolve", "directional_blur", "push", "zoom", "light_leak"] as const;
const FILTERS = [
  { key: "warm", gradient: "linear-gradient(135deg,#fbbf24,#f97316)" },
  { key: "cool", gradient: "linear-gradient(135deg,#67e8f9,#3b82f6)" },
  { key: "mono", gradient: "linear-gradient(135deg,#e2e8f0,#334155)" },
  { key: "vivid", gradient: "linear-gradient(135deg,#a78bfa,#ec4899)" },
] as const;

function EffectsPanel() {
  const t = useTranslations("editor");
  const pushToast = useEditorStore((s) => s.pushToast);

  return (
    <div className="space-y-5">
      <p className="rounded-xl bg-info-soft px-3 py-2.5 text-[11px] font-medium leading-relaxed text-cyan-700">
        {t("effects.applied_note")}
      </p>
      <section>
        <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-ink-3">
          {t("effects.transitions_header")}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {TRANSITIONS.map((key) => (
            <button
              key={key}
              onClick={() => pushToast({ kind: "success", messageKey: "applied", messageValues: { tool: t(`effects.transition_${key}`) } })}
              className="flex items-center gap-2 rounded-xl border border-line bg-card p-2.5 text-left shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-pop"
            >
              <Blend className="size-4 shrink-0 text-primary" />
              <span className="truncate text-[11px] font-bold text-ink">
                {t(`effects.transition_${key}`)}
              </span>
            </button>
          ))}
        </div>
      </section>
      <section>
        <h3 className="mb-2 px-1 text-[11px] font-bold uppercase tracking-wider text-ink-3">
          {t("effects.filters_header")}
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter.key}
              onClick={() => pushToast({ kind: "success", messageKey: "applied", messageValues: { tool: t(`effects.filter_${filter.key}`) } })}
              className="overflow-hidden rounded-xl border border-line bg-card shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-pop"
            >
              <div className="h-12 w-full" style={{ background: filter.gradient }} />
              <p className="truncate px-2.5 py-2 text-[11px] font-bold text-ink">
                {t(`effects.filter_${filter.key}`)}
              </p>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

const TABS: Array<{ id: TabId; labelKey: string; icon: typeof Film }> = [
  { id: "media", labelKey: "tabs.media", icon: Film },
  { id: "ai", labelKey: "tabs.ai", icon: Sparkles },
  { id: "text", labelKey: "tabs.text", icon: Type },
  { id: "audio", labelKey: "tabs.audio", icon: Music },
  { id: "effects", labelKey: "tabs.effects", icon: Wand2 },
];

export function LeftPanel() {
  const t = useTranslations("editor");
  const activeTab = useEditorStore((s) => s.activeTab);
  const setActiveTab = useEditorStore((s) => s.setActiveTab);

  return (
    <aside className="flex w-80 shrink-0 flex-col border-r border-line bg-canvas">
      <nav className="flex gap-1 overflow-x-auto border-b border-line p-2">
        {TABS.map(({ id, labelKey, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-xs font-bold transition-colors ${
              activeTab === id
                ? "bg-primary-soft text-primary-strong"
                : "text-ink-2 hover:bg-overlay hover:text-ink"
            }`}
          >
            <Icon className="size-3.5" />
            <span>{t(labelKey as never)}</span>
          </button>
        ))}
      </nav>
      <div className="scroll-thin scroll-thin-light min-h-0 flex-1 overflow-y-auto p-3">
        {activeTab === "media" ? <MediaPanel /> : null}
        {activeTab === "ai" ? <AiToolsPanel /> : null}
        {activeTab === "text" ? <TextPanel /> : null}
        {activeTab === "audio" ? <AudioPanel /> : null}
        {activeTab === "effects" ? <EffectsPanel /> : null}
      </div>
    </aside>
  );
}
