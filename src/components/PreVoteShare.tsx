"use client";

import { useState } from "react";
import { SITE_NAME } from "@/lib/constants";
import { rpcClient } from "@/lib/client-api";
import { getDeviceId } from "@/lib/scoring";

interface Props {
  ballotNumber: number;
}

// Pre-vote share — the "what do you guys think?" loop. Posts the blind card
// before any verdict exists; the /b/[n] link unfurls the spoiler-safe OG
// image on X, Reddit, Discord, iMessage, anywhere that reads OG tags.
export default function PreVoteShare({ ballotNumber }: Props) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    rpcClient("api_log_event", {
      p_name: "share_click",
      p_device_id: getDeviceId(),
      p_props: { ballot_number: ballotNumber, pre_vote: true },
    });
    const url = `${window.location.origin}/b/${ballotNumber}`;
    const text = `${SITE_NAME} No. ${ballotNumber} — one career, no name. Hall of Fame: IN or OUT? What do you think? ${url}`;
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

  return (
    <button
      onClick={share}
      className="rounded-full border border-line px-4 py-1.5 text-xs tracking-wide opacity-60 transition-opacity hover:opacity-100"
    >
      {copied ? "Copied — go start the argument" : "Share the mystery →"}
    </button>
  );
}
