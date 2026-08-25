"use client";

import { useRef, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  Scissors,
  Download,
  RotateCcw,
  RotateCw,
  Languages,
  Check,
  CloudUpload,
  ChevronDown,
} from "lucide-react";
import { useRouter, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { useEditorStore } from "@/lib/store";
import { Button, IconButton } from "@/components/ui/primitives";

const LOCALE_LABELS: Record<string, string> = {
  en: "English",
  th: "ไทย",
};

function LanguageMenu() {
  const t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLButtonElement>(null);

  return (
    <div
      className="relative"
      onBlur={(e) => {
        if (!menuRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        ref={menuRef}
        title={t("language.switch")}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-btn px-2.5 text-sm font-medium text-ink-2 transition-colors hover:bg-overlay hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      >
        <Languages className="size-4" />
        <span>{LOCALE_LABELS[locale]}</span>
        <ChevronDown className="size-3.5 opacity-60" />
      </button>
      {open ? (
        <div className="anim-pop absolute right-0 top-11 z-40 w-40 rounded-xl border border-line bg-card p-1.5 shadow-pop">
          {routing.locales.map((loc) => (
            <button
              key={loc}
              onClick={() => {
                setOpen(false);
                router.replace(pathname, { locale: loc });
              }}
              className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                loc === locale
                  ? "bg-primary-soft font-semibold text-primary-strong"
                  : "text-ink-2 hover:bg-overlay hover:text-ink"
              }`}
            >
              <span>{LOCALE_LABELS[loc]}</span>
              {loc === locale ? <Check className="size-4" /> : null}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function TopBar() {
  const t = useTranslations("editor");
  const tc = useTranslations("common");
  const project = useEditorStore((s) => s.project);
  const setTitle = useEditorStore((s) => s.setTitle);
  const undo = useEditorStore((s) => s.undo);
  const redo = useEditorStore((s) => s.redo);
  const canUndo = useEditorStore((s) => s.past.length > 0);
  const canRedo = useEditorStore((s) => s.future.length > 0);
  const openExportDialog = useEditorStore((s) => s.openExportDialog);

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-card/80 px-4 backdrop-blur">
      <div className="flex items-center gap-2.5">
        <div className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
          <Scissors className="size-4.5 text-white" strokeWidth={2.2} />
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-extrabold tracking-tight text-ink">
            OmniCut <span className="text-primary">AI</span>
          </p>
          <p className="hidden text-[10px] font-medium text-ink-3 lg:block">
            {tc("app.tagline")}
          </p>
        </div>
      </div>

      <div className="mx-2 h-6 w-px bg-line" />

      <input
        value={project.title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder={t("topbar.untitled_project")}
        aria-label={t("topbar.project_title_placeholder")}
        className="h-9 w-52 rounded-btn border border-transparent bg-transparent px-2.5 text-sm font-medium text-ink placeholder:text-ink-3 hover:border-line focus:border-primary focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary/20"
      />

      <div className="flex items-center gap-0.5">
        <IconButton label={t("topbar.undo")} onClick={undo} disabled={!canUndo}>
          <RotateCcw className="size-4" />
        </IconButton>
        <IconButton label={t("topbar.redo")} onClick={redo} disabled={!canRedo}>
          <RotateCw className="size-4" />
        </IconButton>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div
          title={tc("cloud.saved")}
          className="hidden items-center gap-1.5 rounded-full bg-success-soft px-3 py-1.5 text-xs font-semibold text-success md:inline-flex"
        >
          <CloudUpload className="size-3.5" />
          <span className="max-w-44 truncate">{tc("cloud.saved")}</span>
        </div>

        <LanguageMenu />

        <Button onClick={openExportDialog}>
          <Download className="size-4" />
          <span className="hidden sm:inline">{t("topbar.export_btn")}</span>
        </Button>
      </div>
    </header>
  );
}
