"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { Film } from "lucide-react";
import { useEditorStore } from "@/lib/store";
import { TRACK_IDS } from "@/lib/sample-data";
import { formatTimecode, hashHue } from "@/lib/utils";
import type { TimelineClip } from "@/types/timeline";

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function ellipseBlob(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  rotation: number
) {
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, rotation, 0, Math.PI * 2);
  ctx.fill();
}

export function PreviewCanvas() {
  const t = useTranslations("editor");
  const ta = useTranslations("ai_tools");
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hasVideo = useEditorStore((s) =>
    s.project.tracks.some((tr) => tr.id === TRACK_IDS.main && tr.clips.length > 0)
  );

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const canvas = canvasRef.current;
      const wrap = wrapRef.current;
      if (!canvas || !wrap) return;
      const dpr = window.devicePixelRatio || 1;
      const w = wrap.clientWidth;
      const h = wrap.clientHeight;
      if (canvas.width !== Math.round(w * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);

      const { project, showSafeZones } = useEditorStore.getState();
      const pad = 24;
      const ratio = project.canvasWidth / project.canvasHeight;
      let fw = w - pad * 2;
      let fh = fw / ratio;
      if (fh > h - pad * 2) {
        fh = h - pad * 2;
        fw = fh * ratio;
      }
      const fx = (w - fw) / 2;
      const fy = (h - fh) / 2;
      const now = project.currentTime;

      ctx.save();
      roundRect(ctx, fx, fy, fw, fh, 18);
      ctx.shadowColor = "rgba(15, 23, 42, 0.16)";
      ctx.shadowBlur = 44;
      ctx.shadowOffsetY = 14;
      ctx.fillStyle = "#0b1220";
      ctx.fill();
      ctx.restore();

      ctx.save();
      roundRect(ctx, fx, fy, fw, fh, 18);
      ctx.clip();

      const mainTrack = project.tracks.find((tr) => tr.id === TRACK_IDS.main);
      const videoClip = mainTrack?.clips.find(
        (c) => now >= c.startAt && now < c.startAt + c.duration
      );

      if (videoClip) {
        const hue = hashHue(videoClip.id);
        const grad = ctx.createLinearGradient(fx, fy, fx + fw, fy + fh);
        grad.addColorStop(0, `hsl(${hue} 42% 32%)`);
        grad.addColorStop(1, `hsl(${(hue + 55) % 360} 52% 21%)`);
        ctx.fillStyle = grad;
        ctx.fillRect(fx, fy, fw, fh);

        const drift = ((now % 12) / 12) * fw * 0.25;
        ctx.fillStyle = `hsla(${(hue + 90) % 360}, 75%, 72%, 0.16)`;
        ellipseBlob(ctx, fx + fw * 0.72 - drift, fy + fh * 0.28, fw * 0.3, fh * 0.34, 0.4);
        ctx.fillStyle = `hsla(${hue}, 85%, 88%, 0.1)`;
        ellipseBlob(ctx, fx + fw * 0.18 + drift * 0.5, fy + fh * 0.82, fw * 0.24, fh * 0.3, -0.5);

        ctx.fillStyle = "rgba(255, 255, 255, 0.92)";
        ctx.font = `600 ${Math.max(13, Math.round(fw * 0.021))}px var(--font-app), sans-serif`;
        ctx.textBaseline = "top";
        ctx.fillText(videoClip.name, fx + 18, fy + 16);

        ctx.fillStyle = "rgba(255, 255, 255, 0.55)";
        ctx.font = `500 ${Math.max(11, Math.round(fw * 0.016))}px var(--font-code), monospace`;
        ctx.textAlign = "right";
        ctx.fillText(formatTimecode(now, project.fps), fx + fw - 16, fy + 17);
        ctx.textAlign = "left";

        const slatW = Math.max(26, fw * 0.03);
        ctx.fillStyle = "rgba(255, 255, 255, 0.06)";
        for (let sx = fx; sx < fx + fw; sx += slatW * 2) {
          ctx.fillRect(sx, fy, slatW, fh);
        }
      }

      const overlayTrack = project.tracks.find((tr) => tr.id === TRACK_IDS.overlay);
      const overlayClips =
        overlayTrack && !overlayTrack.isHidden
          ? overlayTrack.clips.filter(
              (c: TimelineClip) => now >= c.startAt && now < c.startAt + c.duration
            )
          : [];

      for (const clip of overlayClips) {
        if (clip.name.startsWith("broll:")) {
          const key = clip.name.slice(6);
          const bw = fw * 0.27;
          const bh = bw * 0.5625;
          const bx = fx + fw - bw - fw * 0.04;
          const by = fy + fh - bh - fh * 0.06;
          const bhue = hashHue(key);
          ctx.save();
          roundRect(ctx, bx, by, bw, bh, 10);
          ctx.clip();
          const bgrad = ctx.createLinearGradient(bx, by, bx + bw, by + bh);
          bgrad.addColorStop(0, `hsl(${bhue} 60% 45%)`);
          bgrad.addColorStop(1, `hsl(${(bhue + 60) % 360} 65% 35%)`);
          ctx.fillStyle = bgrad;
          ctx.fillRect(bx, by, bw, bh);
          ctx.fillStyle = "rgba(255,255,255,0.92)";
          ctx.font = `700 ${Math.max(11, Math.round(bw * 0.07))}px var(--font-app), sans-serif`;
          ctx.fillText(ta(`broll.${key}` as never), bx + 10, by + bh / 2 - 6);
          ctx.restore();
          continue;
        }

        const style = clip.aiMetadata?.captionStyle ?? "minimal";
        const elapsed = now - clip.startAt;
        const fontSize = Math.max(14, Math.round(fw * 0.028));
        ctx.font = `700 ${fontSize}px var(--font-app), sans-serif`;
        ctx.textBaseline = "middle";

        const words = clip.aiMetadata?.transcript;
        const spaceW = ctx.measureText(" ").width;
        let totalW = 0;

        if (words && words.length > 0) {
          for (let i = 0; i < words.length; i += 1) {
            totalW += ctx.measureText(words[i].word).width;
            if (i < words.length - 1) totalW += spaceW;
          }
        } else {
          totalW = ctx.measureText(clip.name).width;
        }

        const pillX = fx + fw / 2 - totalW / 2 - fontSize;
        const pillY = fy + fh * 0.84;
        const pillH = fontSize * 1.9;
        ctx.fillStyle =
          style === "minimal" ? "rgba(15, 23, 42, 0.66)" : "rgba(15, 23, 42, 0.45)";
        roundRect(ctx, pillX, pillY - pillH / 2, totalW + fontSize * 2, pillH, pillH / 2);
        ctx.fill();

        let cursorX = fx + fw / 2 - totalW / 2;
        if (words && words.length > 0) {
          for (const wd of words) {
            ctx.fillStyle =
              style === "karaoke" && elapsed >= wd.start ? "#a5b4fc" : "#ffffff";
            ctx.fillText(wd.word, cursorX, pillY);
            cursorX += ctx.measureText(wd.word).width + spaceW;
          }
        } else {
          ctx.fillStyle = "#ffffff";
          ctx.fillText(clip.name, cursorX, pillY);
        }
      }

      if (showSafeZones) {
        ctx.strokeStyle = "rgba(255, 255, 255, 0.34)";
        ctx.lineWidth = 1.5;
        ctx.setLineDash([8, 6]);
        const actionInset = fw * 0.035;
        roundRect(ctx, fx + actionInset, fy + actionInset, fw - actionInset * 2, fh - actionInset * 2, 8);
        ctx.stroke();
        const titleInset = fw * 0.08;
        roundRect(ctx, fx + titleInset, fy + titleInset, fw - titleInset * 2, fh - titleInset * 2, 8);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      const progress = project.totalDuration > 0 ? now / project.totalDuration : 0;
      const barH = Math.max(4, fh * 0.008);
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      ctx.fillRect(fx, fy + fh - barH, fw, barH);
      const barGrad = ctx.createLinearGradient(fx, 0, fx + fw, 0);
      barGrad.addColorStop(0, "#6366f1");
      barGrad.addColorStop(1, "#8b5cf6");
      ctx.fillStyle = barGrad;
      ctx.fillRect(fx, fy + fh - barH, fw * progress, barH);

      ctx.restore();
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [ta]);

  return (
    <div ref={wrapRef} id="preview-stage" className="relative min-h-0 flex-1 overflow-hidden bg-stage">
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      {!hasVideo ? (
        <div className="pointer-events-none absolute inset-0 grid place-items-center">
          <div className="flex flex-col items-center gap-2 text-ink-3">
            <Film className="size-8 opacity-60" />
            <p className="text-sm font-bold">{t("canvas.empty_title")}</p>
            <p className="text-xs">{t("canvas.empty_desc")}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
