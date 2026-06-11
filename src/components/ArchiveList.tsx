"use client";

import { useEffect, useState } from "react";
import type { Reveal, TodayBallot, Verdict } from "@/lib/types";
import { computeStats, getDeviceId, recordReveal } from "@/lib/scoring";
import { displayDateET, todayET } from "@/lib/time";
import { truthLine } from "@/lib/truth-copy";
import { getSupabase } from "@/lib/supabase-browser";
import BallotCard from "./BallotCard";
import StampBar from "./StampBar";
import SplitBar from "./SplitBar";

interface ArchiveEntry {
  id: number;
  ballot_number: number;
  live_date: string;
  played: boolean;
  your_verdict: Verdict | null;
  player_name: string | null;
  truth_status: string | null;
}

export default function ArchiveList() {
  const [entries, setEntries] = useState<ArchiveEntry[] | null>(null);
  const [member, setMember] = useState(false);
  const [playing, setPlaying] = useState<TodayBallot | null>(null);
  const [reveal, setReveal] = useState<Reveal | null>(null);

  const load = async () => {
    const supabase = getSupabase();
    const { data } = await supabase.rpc("api_archive", { p_device_id: getDeviceId() });
    setEntries((data as ArchiveEntry[]) ?? []);
    const { data: m } = await supabase.rpc("api_is_member");
    setMember(Boolean(m));
  };

  useEffect(() => {
    load();
  }, []);

  const play = async (id: number) => {
    const { data } = await getSupabase().rpc("api_past_ballot", { p_ballot_id: id });
    if (data) {
      setPlaying(data as TodayBallot);
      setReveal(null);
    }
  };

  const vote = async (verdict: Verdict) => {
    if (!playing) return;
    const { data } = await getSupabase().rpc("api_vote", {
      p_ballot_id: playing.id,
      p_device_id: getDeviceId(),
      p_verdict: verdict,
    });
    if (data) {
      const r = data as Reveal;
      recordReveal(playing.live_date, r);
      computeStats(todayET());
      setReveal(r);
    }
  };

  if (entries === null) return <p className="py-8 text-sm opacity-50">Opening the vault…</p>;

  if (playing) {
    const t = reveal ? truthLine(reveal) : null;
    return (
      <div className="mt-5 pb-16">
        <button
          onClick={() => {
            setPlaying(null);
            load();
          }}
          className="mb-4 text-sm underline opacity-70"
        >
          ← back to the archive
        </button>
        {!reveal ? (
          <>
            <BallotCard
              payload={playing.payload}
              ballotNumber={playing.ballot_number}
              dateLabel={displayDateET(playing.live_date)}
            />
            <div className="mt-5">
              <p className="mb-3 text-center text-sm uppercase tracking-widest opacity-70">
                Hall of Fame?
              </p>
              <StampBar options={["IN", "OUT"]} onConfirm={vote} />
            </div>
          </>
        ) : (
          <div className="rounded-2xl border border-line bg-faint p-6">
            <h2 className="rise-in text-3xl font-semibold">{reveal.player_name}</h2>
            {t && <p className={`rise-in mt-3 text-xl font-medium ${t.className}`}>{t.text}</p>}
            <div className="mt-4">
              <SplitBar split={reveal.split} yourVerdict={reveal.your_verdict} animate={false} />
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="mt-5 flex flex-col gap-2 pb-16">
      {entries.length === 0 && (
        <p className="text-sm opacity-60">
          Nothing in the vault yet — the archive starts filling tomorrow.
        </p>
      )}
      {entries.map((e) => (
        <div
          key={e.id}
          className="tabular flex items-center justify-between rounded-xl border border-line px-4 py-3 text-sm"
        >
          <span>
            No. {e.ballot_number}
            <span className="ml-2 text-xs opacity-50">{displayDateET(e.live_date)}</span>
          </span>
          {e.played ? (
            <span>
              {e.player_name}{" "}
              <span className={e.your_verdict === "IN" ? "text-bronze" : "text-stamp"}>
                {e.your_verdict}
              </span>
            </span>
          ) : member ? (
            <button onClick={() => play(e.id)} className="rounded-lg bg-bronze px-4 py-1.5 font-semibold text-ivory">
              Play →
            </button>
          ) : (
            <a href="/club" className="opacity-60">
              █████ 🔒
            </a>
          )}
        </div>
      ))}
      {!member && entries.some((e) => !e.played) && (
        <p className="mt-2 text-center text-xs opacity-60">
          The sealed names open with <a href="/club" className="underline text-bronze">The Club</a>.
        </p>
      )}
    </div>
  );
}
