"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { clamp } from "@/lib/utils";
import { TimelineToolbar } from "./timeline-toolbar";
import { TimelineBody } from "./timeline-body";

const MIN_H = 220;
const MAX_H = 420;
const DEFAULT_H = 280;

export function TimelineDock() {
  const [height, setHeight] = useState(DEFAULT_H);
  const dragRef = useRef<{ startY: number; startH: number } | null>(null);

  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!dragRef.current) return;
    const delta = dragRef.current.startY - e.clientY;
    setHeight(clamp(dragRef.current.startH + delta, MIN_H, MAX_H));
  }, []);

  const onPointerUp = useCallback(() => {
    dragRef.current = null;
  }, []);

  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  return (
    <section
      className="relative flex shrink-0 flex-col border-t border-line bg-tl-bg"
      style={{ height }}
    >
      <div
        role="separator"
        aria-orientation="horizontal"
        className="absolute -top-1 left-0 z-30 h-2 w-full cursor-row-resize transition-colors hover:bg-primary/25"
        onPointerDown={(e) => {
          e.preventDefault();
          dragRef.current = { startY: e.clientY, startH: height };
        }}
      />
      <TimelineToolbar />
      <div className="flex min-h-0 flex-1">
        <TimelineBody />
      </div>
    </section>
  );
}
