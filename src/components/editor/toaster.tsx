"use client";

import { useTranslations } from "next-intl";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useEditorStore } from "@/lib/store";

const KIND_STYLE = {
  success: { icon: CheckCircle2, cls: "text-success", soft: "bg-success-soft" },
  info: { icon: Info, cls: "text-info", soft: "bg-info-soft" },
  error: { icon: AlertTriangle, cls: "text-error", soft: "bg-error-soft" },
} as const;

export function Toaster() {
  const t = useTranslations("common");
  const toasts = useEditorStore((s) => s.toasts);
  const dismissToast = useEditorStore((s) => s.dismissToast);

  return (
    <div className="pointer-events-none fixed right-5 top-16 z-[70] flex w-72 flex-col gap-2">
      {toasts.map((toast) => {
        const { icon: Icon, cls, soft } = KIND_STYLE[toast.kind];
        return (
          <div
            key={toast.id}
            className="anim-pop pointer-events-auto flex items-start gap-2.5 rounded-xl border border-line bg-card p-3 shadow-pop"
          >
            <span className={`grid size-7 shrink-0 place-items-center rounded-lg ${soft}`}>
              <Icon className={`size-4 ${cls}`} />
            </span>
            <p className="min-w-0 flex-1 pt-1 text-xs font-semibold leading-snug text-ink">
              {toast.messageKey === "applied"
                ? t("toast.applied", { tool: String(toast.messageValues?.tool ?? "") })
                : toast.messageKey === "added_to_timeline"
                  ? t("toast.added_to_timeline")
                  : toast.messageKey === "demo_note"
                    ? t("toast.demo_note")
                    : t("toast.coming_soon")}
            </p>
            <button
              aria-label={t("actions.close")}
              onClick={() => dismissToast(toast.id)}
              className="shrink-0 rounded-md p-1 text-ink-3 transition-colors hover:bg-overlay hover:text-ink"
            >
              <X className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
