"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Subtitles,
  Scissors,
  Mic,
  Wand2,
  ImagePlus,
  Volume2,
  X,
  Sparkles,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { useEditorStore } from "@/lib/store";
import {
  Button,
  ModalShell,
  SelectField,
  SliderField,
  Switch,
} from "@/components/ui/primitives";
import type { AiTaskKind } from "@/types/timeline";

const KIND_ICONS: Record<AiTaskKind, typeof Sparkles> = {
  auto_subtitle: Subtitles,
  silence: Scissors,
  tts: Mic,
  cutout: Wand2,
  broll: ImagePlus,
  enhancer: Volume2,
};

const STAGE_KEYS: Record<string, string> = {
  upload: "dialog.stage_upload",
  analyze: "dialog.stage_analyze",
  generate: "dialog.stage_generate",
  finalize: "dialog.stage_finalize",
};

function ProgressView() {
  const ta = useTranslations("ai_tools");
  const task = useEditorStore((s) => s.aiTask)!;
  return (
    <div className="py-6">
      <div className="mb-3 flex items-center justify-between text-xs font-semibold text-ink-2">
        <span className="flex items-center gap-1.5">
          <Loader2 className="size-3.5 animate-spin text-primary" />
          {ta(STAGE_KEYS[task.stage] as never)}
        </span>
        <span className="font-mono text-ink">{task.percent}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-overlay">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-150"
          style={{ width: `${task.percent}%` }}
        />
      </div>
    </div>
  );
}

function BRollResult({
  items,
}: {
  items: NonNullable<ReturnType<typeof useEditorStore.getState>["aiTask"]>["brollResult"];
}) {
  const ta = useTranslations("ai_tools");
  const patchAiForm = useEditorStore((s) => s.patchAiForm);
  const picked = useEditorStore((s) => s.aiTask?.brollPicked ?? 0);
  const list = items ?? [];

  return (
    <div className="py-3">
      <p className="mb-2 text-xs font-bold text-ink-2">{ta("broll.result_suggestions")}</p>
      <div className="grid grid-cols-4 gap-2">
        {list.map((item: { id: string; nameKey: string; hue: number; duration: number }, i: number) => (
          <button
            key={item.id}
            onClick={() => patchAiForm({ brollPicked: i })}
            className={`overflow-hidden rounded-xl border-2 transition-all ${
              picked === i
                ? "border-primary shadow-glow"
                : "border-transparent hover:border-line-strong"
            }`}
          >
            <div
              className="h-12 w-full"
              style={{
                background: `linear-gradient(135deg, hsl(${item.hue} 65% 55%), hsl(${(item.hue + 60) % 360} 70% 40%))`,
              }}
            />
            <p className="truncate px-1 py-1.5 text-[9px] font-bold text-ink">
              {ta(`broll.${item.nameKey}` as never)}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

export function AiTaskDialog() {
  const t = useTranslations("common");
  const ta = useTranslations("ai_tools");
  const te = useTranslations("editor");
  const task = useEditorStore((s) => s.aiTask);
  const closeAiTask = useEditorStore((s) => s.closeAiTask);
  const patchAiForm = useEditorStore((s) => s.patchAiForm);
  const runAiTask = useEditorStore((s) => s.runAiTask);
  const applyAiResult = useEditorStore((s) => s.applyAiResult);

  useEffect(() => {
    if (task?.status === "applied") {
      const timer = setTimeout(closeAiTask, 650);
      return () => clearTimeout(timer);
    }
  }, [task?.status, closeAiTask]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeAiTask();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeAiTask]);

  if (!task) return null;

  const Icon = KIND_ICONS[task.kind];
  const running = task.status === "running";

  let body: React.ReactNode = null;
  if (running || task.status === "applied") {
    body =
      task.status === "applied" ? (
        <div className="flex flex-col items-center gap-2 py-8 text-success">
          <CheckCircle2 className="size-10" />
          <p className="text-sm font-bold">{t("actions.done")}</p>
        </div>
      ) : (
        <ProgressView />
      );
  } else if (task.status === "done") {
    body = (
      <div className="py-2">
        {task.kind === "auto_subtitle" && task.transcriptResult ? (
          <p className="rounded-xl bg-primary-soft px-3.5 py-3 text-sm font-semibold text-primary-strong">
            {ta("auto_subtitle.result_count", {
              count: task.transcriptResult.length > 0
                ? Math.max(2, Math.ceil(task.transcriptResult.length / 4))
                : 0,
            })}
          </p>
        ) : null}
        {task.kind === "silence" && task.silenceResult ? (
          <p
            className={`rounded-xl px-3.5 py-3 text-sm font-semibold ${
              task.silenceResult.length > 0
                ? "bg-success-soft text-emerald-700"
                : "bg-overlay text-ink-2"
            }`}
          >
            {task.silenceResult.length > 0
              ? ta("silence.result_found", {
                  count: task.silenceResult.length,
                  seconds: Math.round(
                    task.silenceResult.reduce((sum, r) => sum + (r.end - r.start), 0)
                  ),
                })
              : ta("silence.result_empty")}
          </p>
        ) : null}
        {task.kind === "tts" && task.voiceoverResult ? (
          <p className="rounded-xl bg-success-soft px-3.5 py-3 text-sm font-semibold text-emerald-700">
            {ta("tts.result_ready", { duration: task.voiceoverResult.duration })}
          </p>
        ) : null}
        {task.kind === "cutout" ? (
          <p className="rounded-xl bg-info-soft px-3.5 py-3 text-sm font-semibold text-cyan-700">
            {ta("cutout.result_done")}
          </p>
        ) : null}
        {task.kind === "broll" ? <BRollResult items={task.brollResult} /> : null}
        {task.kind === "enhancer" ? (
          <p className="rounded-xl bg-warning-soft px-3.5 py-3 text-sm font-semibold text-amber-700">
            {ta("enhancer.result_done")}
          </p>
        ) : null}
      </div>
    );
  } else {
    body = (
      <div className="py-1">
        {task.kind === "auto_subtitle" ? (
          <>
            <SelectField
              label={ta("auto_subtitle.language_label")}
              value={task.subtitleLang}
              onChange={(v) => patchAiForm({ subtitleLang: v as typeof task.subtitleLang })}
              options={[
                { value: "auto", label: ta("auto_subtitle.language_auto") },
                { value: "th", label: "ไทย" },
                { value: "en", label: "English" },
              ]}
            />
            <SelectField
              label={ta("auto_subtitle.style_label")}
              value={task.captionStyle}
              onChange={(v) => patchAiForm({ captionStyle: v as typeof task.captionStyle })}
              options={[
                { value: "karaoke", label: ta("auto_subtitle.style_karaoke") },
                { value: "pop", label: ta("auto_subtitle.style_pop") },
                { value: "minimal", label: ta("auto_subtitle.style_minimal") },
              ]}
            />
          </>
        ) : null}
        {task.kind === "silence" ? (
          <>
            <SliderField
              label={ta("silence.threshold_label")}
              value={task.silenceThreshold}
              min={0.3}
              max={2}
              step={0.05}
              format={(v) => `${v.toFixed(2)}s`}
              onLiveChange={(v) => patchAiForm({ silenceThreshold: v })}
            />
            <div className="mt-2 flex items-center justify-between rounded-xl bg-overlay px-3.5 py-3">
              <span className="text-xs font-medium text-ink-2">{ta("silence.remove_fillers")}</span>
              <Switch
                label={ta("silence.remove_fillers")}
                checked={task.removeFillers}
                onCheckedChange={(v) => patchAiForm({ removeFillers: v })}
              />
            </div>
          </>
        ) : null}
        {task.kind === "tts" ? (
          <>
            <label className="block py-1.5">
              <span className="mb-1 block text-xs font-medium text-ink-2">{ta("tts.script_label")}</span>
              <textarea
                value={task.ttsScript}
                onChange={(e) => patchAiForm({ ttsScript: e.target.value })}
                rows={3}
                className="w-full resize-none rounded-btn border border-line bg-card px-3 py-2.5 text-sm text-ink focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </label>
            <SelectField
              label={ta("tts.voice_label")}
              value={task.ttsVoice}
              onChange={(v) => patchAiForm({ ttsVoice: v as typeof task.ttsVoice })}
              options={[
                { value: "aria", label: ta("tts.voice_aria") },
                { value: "prem", label: ta("tts.voice_prem") },
                { value: "kaito", label: ta("tts.voice_kaito") },
              ]}
            />
            <SliderField
              label={ta("tts.speed_label")}
              value={task.ttsSpeed * 100}
              min={50}
              max={150}
              step={5}
              format={(v) => `${(v / 100).toFixed(2)}x`}
              onLiveChange={(v) => patchAiForm({ ttsSpeed: v / 100 })}
            />
          </>
        ) : null}
        {task.kind === "enhancer" ? (
          <SliderField
            label={ta("enhancer.strength_label")}
            value={task.enhancerStrength}
            min={0}
            max={100}
            step={5}
            format={(v) => `${v}%`}
            onLiveChange={(v) => patchAiForm({ enhancerStrength: v })}
          />
        ) : null}
        {task.kind === "cutout" || task.kind === "broll" ? (
          <p className="rounded-xl bg-overlay px-3.5 py-3 text-xs font-medium leading-relaxed text-ink-2">
            {ta(`${task.kind}.desc` as never)}
          </p>
        ) : null}
        <p className="mt-3 text-[11px] font-medium text-ink-3">{ta("dialog.idle_hint")}</p>
      </div>
    );
  }

  return (
    <ModalShell open onClose={closeAiTask}>
      <header className="mb-4 flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
          <Icon className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold tracking-tight text-ink">
            {ta(`${task.kind}.title` as never)}
          </h2>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-ink-3">
            {te("ai_panel.subtitle")}
          </p>
        </div>
        <button
          onClick={closeAiTask}
          aria-label={t("actions.close")}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-overlay hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </header>

      {body}

      <footer className="mt-5 flex justify-end gap-2">
        {task.status !== "applied" ? (
          <Button variant="ghost" onClick={closeAiTask}>
            {t("actions.cancel")}
          </Button>
        ) : null}
        {task.status === "idle" ? (
          <Button onClick={() => runAiTask()}>
            <Sparkles className="size-4" />
            {t("actions.run")}
          </Button>
        ) : null}
        {task.status === "done" ? (
          <Button onClick={() => applyAiResult()}>{t("actions.apply")}</Button>
        ) : null}
      </footer>
    </ModalShell>
  );
}
