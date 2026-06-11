"use client";

import { useEffect } from "react";

interface Props {
  correct: boolean | null; // null = pending/crowd — no flourish
}

const SPARKS = 8;

// The payoff beat for a correct call: "✓ Called it" pops in with a one-shot
// bronze spark burst. A wrong call gets nothing here — the truth line's
// gentle shake (applied by the parent) is punishment enough.
export default function VerdictFlourish({ correct }: Props) {
  useEffect(() => {
    if (correct && navigator.vibrate) navigator.vibrate([12, 40, 18]);
  }, [correct]);

  if (correct !== true) return null;

  return (
    <span className="relative ml-3 inline-flex align-middle">
      <span
        aria-hidden
        className="absolute inset-0 flex items-center justify-center overflow-visible"
      >
        {Array.from({ length: SPARKS }, (_, i) => {
          const angle = (i / SPARKS) * 2 * Math.PI;
          const dist = 34 + (i % 2) * 14;
          return (
            <span
              key={i}
              className="spark"
              style={
                {
                  "--dx": `${Math.cos(angle) * dist}px`,
                  "--dy": `${Math.sin(angle) * dist}px`,
                  animationDelay: `${60 + (i % 3) * 30}ms`,
                } as React.CSSProperties
              }
            />
          );
        })}
      </span>
      <span className="chip-pop relative rounded-md border-2 border-bronze px-2 py-0.5 text-sm font-bold tracking-wide text-bronze">
        ✓ Called it
      </span>
    </span>
  );
}
