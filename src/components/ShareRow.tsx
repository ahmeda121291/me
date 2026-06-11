"use client";

import { useEffect, useState } from "react";
import { SITE_NAME } from "@/lib/constants";
import { rpcClient } from "@/lib/client-api";
import { getDeviceId } from "@/lib/scoring";
import type { Reveal } from "@/lib/types";
import ShareMenu from "./ShareMenu";

interface Props {
  reveal: Reveal;
  streak: number;
}

// Post-vote share (spec §8): platform buttons + device sheet; all links
// resolve to /b/[n] with the spoiler-safe OG card.
export default function ShareRow({ reveal, streak }: Props) {
  const [origin, setOrigin] = useState("");
  const [showName, setShowName] = useState(false);
  useEffect(() => setOrigin(window.location.origin), []);

  const url = `${origin}/b/${reveal.ballot_number}`;
  const total = Object.values(reveal.split).reduce((a, b) => a + b, 0);
  const agreed = total
    ? Math.round(((reveal.split[reveal.your_verdict] ?? 0) / total) * 100)
    : 0;
  // Don't brag about the split until the room has filled.
  const text =
    total >= 10
      ? `${SITE_NAME} No. ${reveal.ballot_number} — I voted ${reveal.your_verdict}. ${agreed}% agreed. Streak: ${streak}.`
      : `${SITE_NAME} No. ${reveal.ballot_number} — I voted ${reveal.your_verdict}. One career, no name. Think you can read it blind?`;

  const ogBase = `/api/og/ballot/${reveal.ballot_number}?v=${reveal.your_verdict}&s=${streak}${showName ? "" : "&spoiler=1"}`;

  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="mb-3 text-sm font-medium">Make your verdict public.</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={ogBase}
        alt="Your shareable verdict card"
        className="mb-3 w-full rounded-xl border border-line"
        loading="lazy"
      />
      {origin && (
        <ShareMenu
          text={text}
          url={url}
          trigger="Share →"
          triggerClassName="w-full rounded-lg bg-bronze px-4 py-2.5 text-sm font-semibold text-ivory"
          imageUrl={ogBase}
          imageFileName={`first-ballot-${reveal.ballot_number}.png`}
          onShare={(target) =>
            rpcClient("api_log_event", {
              p_name: "share_click",
              p_device_id: getDeviceId(),
              p_props: { ballot_number: reveal.ballot_number, target },
            })
          }
        />
      )}
      <div className="tabular mt-3 flex flex-wrap items-center gap-4 text-xs opacity-70">
        <a href={`${ogBase}&fmt=story`} target="_blank" className="underline">
          Story format (for IG)
        </a>
        <label className="flex cursor-pointer items-center gap-1.5">
          <input
            type="checkbox"
            checked={showName}
            onChange={(e) => setShowName(e.target.checked)}
            className="accent-[#9C6B2F]"
          />
          reveal the name
        </label>
      </div>
      <p className="mt-2 text-[11px] italic opacity-60">
        {showName
          ? "Spoiler mode off — the card shows the name. Courteous to wait until midnight."
          : "Spoiler-safe — the name stays hidden on shared cards until you say otherwise."}
      </p>
    </div>
  );
}
