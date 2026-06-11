"use client";

import { useState } from "react";
import { SITE_NAME } from "@/lib/constants";
import { rpcClient } from "@/lib/client-api";
import { getDeviceId } from "@/lib/scoring";
import type { Reveal } from "@/lib/types";

interface Props {
  reveal: Reveal;
  streak: number;
}

// Native share API with copy fallback (spec §8). All links resolve to /b/[n].
export default function ShareRow({ reveal, streak }: Props) {
  const [copied, setCopied] = useState(false);

  const url = `${typeof window !== "undefined" ? window.location.origin : ""}/b/${reveal.ballot_number}`;
  const total = Object.values(reveal.split).reduce((a, b) => a + b, 0);
  const agreed = total
    ? Math.round(((reveal.split[reveal.your_verdict] ?? 0) / total) * 100)
    : 0;
  const text = `${SITE_NAME} No. ${reveal.ballot_number} — I voted ${reveal.your_verdict}. ${agreed}% agreed. Streak: ${streak}. ${url}`;

  const share = async () => {
    rpcClient("api_log_event", {
      p_name: "share_click",
      p_device_id: getDeviceId(),
      p_props: { ballot_number: reveal.ballot_number },
    });
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        // fall through to copy
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const ogBase = `/api/og/ballot/${reveal.ballot_number}?v=${reveal.your_verdict}&s=${streak}&spoiler=1`;

  return (
    <div className="rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium">Make your verdict public.</p>
        <button
          onClick={share}
          className="rounded-lg bg-bronze px-4 py-2 text-sm font-semibold text-ivory"
        >
          {copied ? "Copied" : "Share"}
        </button>
      </div>
      <div className="tabular mt-2 flex gap-4 text-xs opacity-70">
        <a href={ogBase} target="_blank" className="underline">
          Card image
        </a>
        <a href={`${ogBase}&fmt=story`} target="_blank" className="underline">
          Story format
        </a>
      </div>
      <p className="mt-2 text-[11px] italic opacity-60">
        Spoiler-safe until midnight — the name stays hidden on shared cards.
      </p>
    </div>
  );
}
