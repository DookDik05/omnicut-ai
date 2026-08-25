"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/lib/store";
import { TopBar } from "./top-bar";
import { LeftPanel } from "./left-panel";
import { PreviewCanvas } from "./preview-canvas";
import { PlaybackBar } from "./playback-bar";
import { Inspector } from "./inspector";
import { TimelineDock } from "./timeline/timeline-dock";
import { AiTaskDialog } from "./ai-task-dialog";
import { ExportDialog } from "./export-dialog";
import { Toaster } from "./toaster";

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.tagName === "SELECT" ||
    target.isContentEditable
  );
}

export function EditorWorkspace() {
  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now;
      const state = useEditorStore.getState();
      if (state.isPlaying) state.tick(dt);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;
      const s = useEditorStore.getState();
      const mod = e.ctrlKey || e.metaKey;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) s.redo();
        else s.undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "y") {
        e.preventDefault();
        s.redo();
        return;
      }
      if (mod) return;

      switch (e.key) {
        case " ":
          e.preventDefault();
          s.togglePlay();
          break;
        case "s":
        case "S":
          e.preventDefault();
          s.splitSelectedAtPlayhead();
          break;
        case "Delete":
        case "Backspace":
          e.preventDefault();
          s.deleteSelected(false);
          break;
        case "ArrowLeft":
          e.preventDefault();
          s.seek(s.project.currentTime - 1 / s.project.fps);
          break;
        case "ArrowRight":
          e.preventDefault();
          s.seek(s.project.currentTime + 1 / s.project.fps);
          break;
        case "Home":
          e.preventDefault();
          s.seek(0);
          break;
        case "End":
          e.preventDefault();
          s.seek(s.project.totalDuration);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-canvas">
      <TopBar />
      <main className="flex min-h-0 flex-1">
        <LeftPanel />
        <section className="flex min-w-0 flex-1 flex-col">
          <PreviewCanvas />
          <PlaybackBar />
        </section>
        <Inspector />
      </main>
      <TimelineDock />
      <AiTaskDialog />
      <ExportDialog />
      <Toaster />
    </div>
  );
}
