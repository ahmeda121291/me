"use client";

import { useEffect, useState } from "react";
import { getEntryForBallot, type HistoryEntry } from "@/lib/scoring";

interface Props {
  ballotId: number;
  playerName: string;
}

// On a past ballot's landing page: show the visitor's own result if this
// device played it; otherwise keep it a locked teaser (spec §6).
export default function PastBallotStatus({ ballotId, playerName }: Props) {
  const [entry, setEntry] = useState<HistoryEntry | null | undefined>(undefined);

  useEffect(() => {
    setEntry(getEntryForBallot(ballotId));
  }, [ballotId]);

  if (entry === undefined) return <p className="mt-4 text-sm opacity-50">…</p>;

  if (!entry) {
    return (
      <div className="mt-4">
        <p className="text-3xl font-semibold tracking-[0.3em]">█████</p>
        <p className="mt-3 text-sm italic opacity-70">
          This one’s in the archive. Members replay every past ballot — for
          everyone else, the name stays sealed.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="text-3xl font-semibold">{playerName}</p>
      <p className="tabular mt-2 text-sm">
        You stamped{" "}
        <span
          className={
            entry.v === "IN" || entry.v === "YES" ? "text-bronze" : "text-stamp"
          }
        >
          {entry.v}
        </span>
        {entry.correct !== null && (
          <span className="ml-2 opacity-70">
            — {entry.correct ? "and history agreed." : "history disagreed."}
          </span>
        )}
      </p>
    </div>
  );
}
