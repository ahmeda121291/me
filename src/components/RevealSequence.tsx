"use client";

import { useEffect, useState } from "react";
import type { Reveal } from "@/lib/types";
import { truthLine, verdictMatchesTruth } from "@/lib/truth-copy";
import SplitBar from "./SplitBar";
import VerdictFlourish from "./VerdictFlourish";

interface Props {
  reveal: Reveal;
  streak: number;
  accuracy: number | null;
  compressed?: boolean; // endless-mode 1.2s variant
  onDone?: () => void;
}

// Four beats, ~600ms each, skippable on tap (spec §8):
// (1) name in large serif, (2) community split, (3) truth line, (4) streak tick.
export default function RevealSequence({
  reveal,
  streak,
  accuracy,
  compressed,
  onDone,
}: Props) {
  const beatMs = compressed ? 300 : 600;
  const [beat, setBeat] = useState(1);

  useEffect(() => {
    if (beat >= 4) {
      onDone?.();
      return;
    }
    const t = setTimeout(() => setBeat((b) => b + 1), beatMs);
    return () => clearTimeout(t);
  }, [beat, beatMs, onDone]);

  const truth = truthLine(reveal);
  const stampIn = reveal.your_verdict === "IN" || reveal.your_verdict === "YES";

  return (
    <button
      type="button"
      className="block w-full cursor-pointer text-left"
      onClick={() => setBeat(4)}
      aria-label="Skip reveal animation"
    >
      <div className="relative rounded-2xl border border-line bg-faint p-6">
        <span
          aria-hidden
          className={`stamp-slam absolute right-4 top-4 rounded border-4 px-3 py-1 text-2xl font-bold tracking-widest ${
            stampIn ? "border-bronze text-bronze" : "border-stamp text-stamp"
          }`}
        >
          {reveal.your_verdict}
        </span>

        <p className="text-xs uppercase tracking-widest opacity-60">
          The name on the ballot
        </p>
        <h2 className="rise-in mt-2 pr-20 text-4xl font-semibold leading-tight">
          {reveal.player_name}
        </h2>

        {beat >= 2 && (
          <div className="rise-in mt-6">
            <SplitBar split={reveal.split} yourVerdict={reveal.your_verdict} />
          </div>
        )}

        {beat >= 3 && (
          <p
            className={`rise-in mt-6 text-2xl font-medium ${truth.className} ${
              verdictMatchesTruth(reveal) === false ? "miss-shake" : ""
            }`}
          >
            {truth.text}
            <VerdictFlourish correct={verdictMatchesTruth(reveal)} />
          </p>
        )}

        {beat >= 4 && (
          <p className="rise-in tabular mt-5 border-t border-line pt-4 text-sm">
            <span className="text-bronze">▲</span> Streak: {streak} day
            {streak === 1 ? "" : "s"}
            {accuracy !== null && (
              <span className="ml-4 opacity-80">
                Accuracy: {(accuracy * 100).toFixed(0)}%
              </span>
            )}
          </p>
        )}
      </div>
    </button>
  );
}
