"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Verdict } from "@/lib/types";

interface Props {
  options: Verdict[];
  onConfirm: (verdict: Verdict) => void;
  disabled?: boolean;
}

const HOLD_MS = 500;

// Hold-to-confirm verdict stamps (spec §12): 500ms press-and-hold fill,
// then the 150ms slam handled by the parent reveal.
export default function StampBar({ options, onConfirm, disabled }: Props) {
  const [holding, setHolding] = useState<Verdict | null>(null);
  const [progress, setProgress] = useState(0);
  const raf = useRef<number>(0);
  const start = useRef<number>(0);
  const confirmed = useRef(false);

  const cancel = useCallback(() => {
    cancelAnimationFrame(raf.current);
    setHolding(null);
    setProgress(0);
  }, []);

  const begin = (verdict: Verdict) => {
    if (disabled || confirmed.current) return;
    setHolding(verdict);
    start.current = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start.current) / HOLD_MS, 1);
      setProgress(p);
      if (p >= 1) {
        confirmed.current = true;
        if (navigator.vibrate) navigator.vibrate(20);
        onConfirm(verdict);
        cancel();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const palette: Record<string, string> = {
    IN: "border-bronze text-bronze",
    YES: "border-bronze text-bronze",
    OUT: "border-stamp text-stamp",
    NO: "border-stamp text-stamp",
  };

  const fill: Record<string, string> = {
    IN: "bg-bronze",
    YES: "bg-bronze",
    OUT: "bg-stamp",
    NO: "bg-stamp",
  };

  return (
    <div className="flex w-full gap-3" role="group" aria-label="Cast your verdict">
      {options.map((v) => (
        <button
          key={v}
          disabled={disabled}
          className={`relative h-20 flex-1 touch-none select-none overflow-hidden rounded-xl border-2 text-3xl font-semibold tracking-widest transition-transform active:scale-[0.98] disabled:opacity-40 ${palette[v] ?? "border-line"}`}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            begin(v);
          }}
          onPointerUp={cancel}
          onPointerCancel={cancel}
          onPointerLeave={() => holding === v && cancel()}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={`Hold to vote ${v}`}
        >
          <span
            aria-hidden
            className={`absolute inset-y-0 left-0 opacity-20 ${fill[v] ?? "bg-ink"}`}
            style={{ width: holding === v ? `${progress * 100}%` : "0%" }}
          />
          <span className="relative">{v}</span>
        </button>
      ))}
    </div>
  );
}
