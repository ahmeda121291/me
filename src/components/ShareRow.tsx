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
  useEffect(() => setOrigin(window.location.origin), []);

  const url = `${origin}/b/${reveal.ballot_number}`;
  const total = Object.values(reveal.split).reduce((a, b) => a + b, 0);
  const agreed = total
    ? Math.round(((reveal.split[reveal.your_verdict] ?? 0) / total) * 100)
    : 0;
  const text = `${SITE_NAME} No. ${reveal.ballot_number} — I voted ${reveal.your_verdict}. ${agreed}% agreed. Streak: ${streak}.`;

  const ogBase = `/api/og/ballot/${reveal.ballot_number}?v=${reveal.your_verdict}&s=${streak}&spoiler=1`;

  return (
    <div className="rounded-2xl border border-line p-4">
      <p className="mb-3 text-sm font-medium">Make your verdict public.</p>
      {origin && (
        <ShareMenu
          text={text}
          url={url}
          trigger="Share →"
          triggerClassName="w-full rounded-lg bg-bronze px-4 py-2.5 text-sm font-semibold text-ivory"
          onShare={(target) =>
            rpcClient("api_log_event", {
              p_name: "share_click",
              p_device_id: getDeviceId(),
              p_props: { ballot_number: reveal.ballot_number, target },
            })
          }
        />
      )}
      <div className="tabular mt-3 flex gap-4 text-xs opacity-70">
        <a href={ogBase} target="_blank" className="underline">
          Card image
        </a>
        <a href={`${ogBase}&fmt=story`} target="_blank" className="underline">
          Story format (for IG)
        </a>
      </div>
      <p className="mt-2 text-[11px] italic opacity-60">
        Spoiler-safe until midnight — the name stays hidden on shared cards.
      </p>
    </div>
  );
}
