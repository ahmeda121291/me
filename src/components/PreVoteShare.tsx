"use client";

import { useEffect, useState } from "react";
import { SITE_NAME } from "@/lib/constants";
import { rpcClient } from "@/lib/client-api";
import { getDeviceId } from "@/lib/scoring";
import ShareMenu from "./ShareMenu";

interface Props {
  ballotNumber: number;
}

// Pre-vote share — the "what do you guys think?" loop. Posts the blind card
// before any verdict exists; the /b/[n] link unfurls the spoiler-safe OG
// image on X, Reddit, Discord, iMessage, anywhere that reads OG tags.
export default function PreVoteShare({ ballotNumber }: Props) {
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);
  if (!origin) return null;

  return (
    <ShareMenu
      text={`${SITE_NAME} No. ${ballotNumber} — one career, no name. Hall of Fame: IN or OUT? What do you think?`}
      url={`${origin}/b/${ballotNumber}`}
      trigger="Share the mystery →"
      triggerClassName="rounded-full border border-line px-4 py-1.5 text-xs tracking-wide opacity-60 transition-opacity hover:opacity-100"
      imageUrl={`/api/og/ballot/${ballotNumber}?spoiler=1`}
      imageFileName={`first-ballot-${ballotNumber}-mystery.png`}
      onShare={(target) =>
        rpcClient("api_log_event", {
          p_name: "share_click",
          p_device_id: getDeviceId(),
          p_props: { ballot_number: ballotNumber, pre_vote: true, target },
        })
      }
    />
  );
}
