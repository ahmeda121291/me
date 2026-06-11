"use client";

import { useEffect, useState } from "react";
import type { Reveal, TodayBallot, Verdict } from "@/lib/types";
import {
  computeStats,
  getDeviceId,
  getEntryForBallot,
  recordReveal,
  type Stats,
} from "@/lib/scoring";
import { rpcClient } from "@/lib/client-api";
import { displayDateET } from "@/lib/time";
import BallotCard from "./BallotCard";
import Basketball from "./Basketball";
import PreVoteShare from "./PreVoteShare";
import StampBar from "./StampBar";
import RevealSequence from "./RevealSequence";
import LockerRoom from "./LockerRoom";

interface Props {
  ballot: TodayBallot;
}

type Phase = "loading" | "voting" | "stamping" | "revealing" | "locker";

const STAMP_BEAT_MS = 900;

// Orchestrates the daily loop: pre-vote (one viewport, zero scroll) →
// the stamp slams down (suspense beat) → reveal takeover → Locker Room.
export default function DailyBallot({ ballot }: Props) {
  const [phase, setPhase] = useState<Phase>("loading");
  const [stamped, setStamped] = useState<Verdict | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);

  // Re-entry: if this device already voted today, skip straight to the room.
  useEffect(() => {
    const existing = getEntryForBallot(ballot.id);
    if (!existing) {
      setPhase("voting");
      rpcClient("api_log_event", {
        p_name: "ballot_view",
        p_device_id: getDeviceId(),
        p_props: { ballot_number: ballot.ballot_number },
      });
      return;
    }
    fetch(
      `/api/reveal?ballot_id=${ballot.id}&device_id=${encodeURIComponent(getDeviceId())}`,
    )
      .then((r) => r.json())
      .then((data: Reveal | null) => {
        if (data) {
          setReveal(data);
          setStats(computeStats(ballot.live_date));
          setPhase("locker");
        } else {
          setPhase("voting");
        }
      })
      .catch(() => setPhase("voting"));
  }, [ballot]);

  const castVote = async (verdict: Verdict) => {
    setError(false);
    setStamped(verdict);
    setPhase("stamping");
    const beat = new Promise((resolve) => setTimeout(resolve, STAMP_BEAT_MS));
    try {
      const res = await fetch("/api/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ballot_id: ballot.id,
          device_id: getDeviceId(),
          verdict,
        }),
      });
      if (!res.ok) throw new Error("vote failed");
      const data: Reveal = await res.json();
      await beat; // let the stamp land before the name drops
      recordReveal(ballot.live_date, data);
      setReveal(data);
      setStats(computeStats(ballot.live_date));
      setPhase("revealing");
    } catch {
      setStamped(null);
      setPhase("voting");
      setError(true);
    }
  };

  if (phase === "loading") {
    return (
      <div className="flex flex-1 items-center justify-center py-24 text-sm opacity-50">
        Opening the ballot…
      </div>
    );
  }

  if (phase === "voting" || phase === "stamping") {
    const stamping = phase === "stamping";
    const stampIn = stamped === "IN";
    return (
      <div className="flex min-h-[calc(100dvh-3.5rem)] flex-col justify-between gap-4 pb-6 pt-4">
        <div className={`relative ${stamping ? "card-thud" : ""}`}>
          <BallotCard
            payload={ballot.payload}
            ballotNumber={ballot.ballot_number}
            dateLabel={displayDateET(ballot.live_date)}
          />
          {stamping && stamped && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`stamp-drop rounded-xl border-8 px-8 py-2 text-7xl font-bold tracking-[0.2em] ${
                  stampIn ? "border-bronze text-bronze" : "border-stamp text-stamp"
                }`}
                style={{ background: "rgba(246,241,231,0.6)" }}
              >
                {stamped}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col items-center justify-center gap-3 py-1">
          <Basketball
            aria-hidden
            className={`h-20 w-20 text-bronze ${stamping ? "opacity-5" : "opacity-10"}`}
          />
          {!stamping && <PreVoteShare ballotNumber={ballot.ballot_number} />}
        </div>

        <div className={stamping ? "pointer-events-none opacity-40" : ""}>
          <p className="mb-3 text-center text-sm uppercase tracking-widest opacity-70">
            {stamping ? "Sealing your verdict…" : "Hall of Fame?"}
          </p>
          <StampBar options={["IN", "OUT"]} onConfirm={castVote} disabled={stamping} />
          {error && (
            <p className="mt-2 text-center text-xs text-stamp">
              Couldn’t reach the booth — hold to try again.
            </p>
          )}
          {!stamping && (
            <p className="mt-3 text-center text-[11px] opacity-50">
              Hold to stamp. No takebacks.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!reveal || !stats) return null;

  return (
    <div className="pt-4">
      <RevealSequence
        reveal={reveal}
        streak={stats.streak}
        accuracy={stats.accuracy}
        onDone={() => setPhase("locker")}
      />
      {phase === "locker" && <LockerRoom reveal={reveal} stats={stats} />}
    </div>
  );
}
