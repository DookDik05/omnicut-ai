"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import {
  Download,
  X,
  Loader2,
  CheckCircle2,
  MonitorPlay,
  Smartphone,
  Square,
  Settings2,
} from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { Button, ModalShell } from "@/components/ui/primitives";
import { ASPECT_DIMENSIONS } from "@/lib/utils";
import type { ComponentType } from "react";

type PresetId = "youtube_4k" | "youtube_hd" | "vertical" | "custom";

const PRESETS: Array<{ id: PresetId; icon: ComponentType<{ className?: string }> }> = [
  { id: "youtube_4k", icon: MonitorPlay },
  { id: "youtube_hd", icon: MonitorPlay },
  { id: "vertical", icon: Smartphone },
  { id: "custom", icon: Settings2 },
];

function stageKeyFor(percent: number): string {
  if (percent < 12) return "export.progress_queued";
  if (percent < 68) return "export.progress_rendering";
  if (percent < 92) return "export.progress_encoding";
  return "export.progress_uploading";
}

export function ExportDialog() {
  const t = useTranslations("export");
  const tc = useTranslations("common");
  const project = useEditorStore((s) => s.project);
  const exportTask = useEditorStore((s) => s.exportTask);
  const closeExportDialog = useEditorStore((s) => s.closeExportDialog);
  const setExportPreset = useEditorStore((s) => s.setExportPreset);
  const runExport = useEditorStore((s) => s.runExport);
  const pushToast = useEditorStore((s) => s.pushToast);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeExportDialog();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [closeExportDialog]);

  const running = exportTask.status === "running";
  const dims = ASPECT_DIMENSIONS[project.aspectRatio];
  const resolution =
    exportTask.preset === "youtube_4k"
      ? "3840 × 2160"
      : exportTask.preset === "youtube_hd"
        ? "1920 × 1080"
        : exportTask.preset === "vertical"
          ? "1080 × 1920"
          : `${dims.width} × ${dims.height}`;

  return (
    <ModalShell open onClose={closeExportDialog} maxWidth="max-w-lg">
      <header className="mb-4 flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent text-white shadow-glow">
          <Download className="size-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-base font-extrabold tracking-tight text-ink">{t("title")}</h2>
          <p className="mt-0.5 text-xs leading-relaxed text-ink-3">{t("desc")}</p>
        </div>
        <button
          onClick={closeExportDialog}
          aria-label={tc("actions.close")}
          className="grid size-8 shrink-0 place-items-center rounded-lg text-ink-3 transition-colors hover:bg-overlay hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </header>

      {exportTask.status === "done" ? (
        <div className="flex flex-col items-center gap-3 py-8">
          <CheckCircle2 className="size-12 text-success" />
          <p className="text-base font-extrabold text-ink">{t("done_title")}</p>
          <p className="-mt-1.5 text-xs text-ink-3">{t("done_desc")}</p>
          <Button
            className="mt-2"
            onClick={() => pushToast({ kind: "info", messageKey: "demo_note" })}
          >
            <Download className="size-4" />
            {t("download")}
          </Button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map(({ id, icon: Icon }) => (
              <button
                key={id}
                onClick={() => !running && setExportPreset(id)}
                disabled={running}
                className={`flex items-start gap-3 rounded-xl border-2 p-3 text-left transition-all ${
                  exportTask.preset === id
                    ? "border-primary bg-primary-soft/60 shadow-soft"
                    : "border-line bg-card hover:border-line-strong"
                } disabled:cursor-not-allowed`}
              >
                <Icon className={`mt-0.5 size-4 shrink-0 ${exportTask.preset === id ? "text-primary-strong" : "text-ink-3"}`} />
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-[13px] font-bold text-ink">
                    {t(`presets.${id}_name` as never)}
                  </span>
                  <span className="mt-0.5 block truncate text-[10px] font-medium text-ink-3">
                    {t(`presets.${id}_detail` as never)}
                  </span>
                </span>
              </button>
            ))}
          </div>

          {running ? (
            <div className="mt-4 rounded-xl bg-overlay px-4 py-4">
              <div className="mb-2 flex items-center justify-between text-xs font-semibold text-ink-2">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin text-primary" />
                  {t(stageKeyFor(exportTask.percent) as never)}
                </span>
                <span className="font-mono text-ink">{exportTask.percent}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-card">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-150"
                  style={{ width: `${exportTask.percent}%` }}
                />
              </div>
            </div>
          ) : (
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1.5 rounded-xl bg-overlay px-4 py-3 text-[11px]">
              <div className="flex justify-between">
                <dt className="font-medium text-ink-3">{t("fields.resolution")}</dt>
                <dd className="font-mono font-bold text-ink">{resolution}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-ink-3">{t("fields.fps")}</dt>
                <dd className="font-mono font-bold text-ink">{project.fps}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-ink-3">{t("fields.format")}</dt>
                <dd className="font-mono font-bold text-ink">MP4 · H.264</dd>
              </div>
              <div className="flex justify-between">
                <dt className="font-medium text-ink-3">{t("fields.audio_rate")}</dt>
                <dd className="font-mono font-bold text-ink">48 kHz</dd>
              </div>
            </dl>
          )}

          {!running ? (
            <footer className="mt-5 flex items-center justify-end gap-2">
              <p className="mr-auto text-[10px] font-medium text-ink-3">{t("note")}</p>
              <Button variant="ghost" onClick={closeExportDialog}>
                {tc("actions.cancel")}
              </Button>
              <Button onClick={() => runExport()}>
                <Square className="size-3.5 fill-current" />
                {t("submit")}
              </Button>
            </footer>
          ) : (
            <footer className="mt-5 flex justify-end">
              <Button variant="ghost" onClick={closeExportDialog}>
                {tc("actions.cancel")}
              </Button>
            </footer>
          )}
        </>
      )}
    </ModalShell>
  );
}
