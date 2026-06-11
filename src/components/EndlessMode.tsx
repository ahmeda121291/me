"use client";

import { useCallback, useEffect, useState } from "react";
import { MODES } from "@/lib/modes";
import type { SeasonBallot } from "@/lib/season-types";
import type { BallotType, Reveal, Verdict } from "@/lib/types";
import { getDeviceId } from "@/lib/scoring";
import { getSupabase } from "@/lib/supabase-browser";
import { verdictMatchesTruth } from "@/lib/truth-copy";
import { truthLine } from "@/lib/truth-copy";
import SeasonBallotCard from "./SeasonBallotCard";
import StampBar from "./StampBar";
import SplitBar from "./SplitBar";
import VerdictFlourish from "./VerdictFlourish";

interface Props {
  modeKey: BallotType;
}

type State =
  | { phase: "loading" }
  | { phase: "locked"; reason: "auth" | "member" }
  | { phase: "ballot"; ballot: SeasonBallot }
  | { phase: "reveal"; ballot: SeasonBallot; reveal: Reveal }
  | { phase: "exhausted" };

// Endless play (spec §6): ballot → verdict → quick reveal → next, with a
// persistent session tally and a share card every 10 ballots.
export default function EndlessMode({ modeKey }: Props) {
  const config = MODES.find((m) => m.key === modeKey)!;
  const [state, setState] = useState<State>({ phase: "loading" });
  const [tally, setTally] = useState({ right: 0, total: 0, crowd: 0 });
  const [copied, setCopied] = useState(false);

  const next = useCallback(async () => {
    setState({ phase: "loading" });
    const supabase = getSupabase();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) {
      setState({ phase: "locked", reason: "auth" });
      return;
    }
    const { data, error } = await supabase.rpc("api_next_season_ballot", {
      p_mode: modeKey,
      p_device_id: getDeviceId(),
    });
    if (error) {
      setState({ phase: "locked", reason: error.message.includes("membership") ? "member" : "auth" });
      return;
    }
    if (!data) {
      setState({ phase: "exhausted" });
      return;
    }
    setState({ phase: "ballot", ballot: data as SeasonBallot });
  }, [modeKey]);

  useEffect(() => {
    next();
  }, [next]);

  const vote = async (verdict: Verdict) => {
    if (state.phase !== "ballot") return;
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("api_vote", {
      p_ballot_id: state.ballot.id,
      p_device_id: getDeviceId(),
      p_verdict: verdict,
    });
    if (error || !data) return;
    const reveal = data as Reveal;
    const correct = verdictMatchesTruth(reveal);
    setTally((t) => ({
      right: t.right + (correct === true ? 1 : 0),
      total: t.total + (correct === null ? 0 : 1),
      crowd: t.crowd + (correct === null ? 1 : 0),
    }));
    setState({ phase: "reveal", ballot: state.ballot, reveal });
  };

  const share = async () => {
    const origin = window.location.origin;
    const text = `${config.title.replace("?", "")} Ballots: ${tally.right}/${tally.total} — can you read a season blind? ${origin}/play`;
    if (navigator.share) {
      try {
        await navigator.share({ text });
        return;
      } catch {
        /* fall through */
      }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const header = (
    <div className="mb-4 flex items-baseline justify-between">
      <div>
        <h1 className="text-2xl font-semibold">{config.question}</h1>
        {config.scoring === "crowd" && (
          <p className="text-xs italic text-bronze">
            Crowd-scored — there is no right answer, only the room.
          </p>
        )}
      </div>
      <p className="tabular text-sm opacity-70">
        {config.scoring === "crowd"
          ? `${tally.crowd} cast`
          : `${tally.right}/${tally.total}`}
      </p>
    </div>
  );

  if (state.phase === "loading") {
    return (
      <div>
        {header}
        <p className="py-16 text-center text-sm opacity-50">Pulling a season…</p>
      </div>
    );
  }

  if (state.phase === "locked") {
    return (
      <div>
        {header}
        <div className="rounded-2xl border border-bronze p-6 text-center">
          {state.reason === "auth" ? (
            <>
              <p className="font-semibold">Sign in to play the modes.</p>
              <a href="/signin" className="mt-4 inline-block rounded-lg bg-bronze px-6 py-3 font-semibold text-ivory">
                Sign in →
              </a>
            </>
          ) : (
            <>
              <p className="font-semibold">This mode belongs to The Club.</p>
              <p className="mt-1 text-sm opacity-80">
                Unlimited play, the archive, your Voter Profile.
              </p>
              <a href="/club" className="mt-4 inline-block rounded-lg bg-bronze px-6 py-3 font-semibold text-ivory">
                Join The Club →
              </a>
            </>
          )}
        </div>
      </div>
    );
  }

  if (state.phase === "exhausted") {
    return (
      <div>
        {header}
        <div className="rounded-2xl border border-line p-6 text-center">
          <p className="font-semibold">You’ve cleared the pool.</p>
          <p className="mt-1 text-sm opacity-70">
            Every {config.title.toLowerCase().replace("?", "")} ballot, stamped.
            New ones mint regularly.
          </p>
          <button onClick={share} className="mt-4 rounded-lg bg-bronze px-6 py-3 font-semibold text-ivory">
            {copied ? "Copied" : "Share the run"}
          </button>
        </div>
      </div>
    );
  }

  if (state.phase === "ballot") {
    return (
      <div>
        {header}
        <SeasonBallotCard payload={state.ballot.payload} />
        <div className="mt-5">
          <StampBar options={config.options} onConfirm={vote} />
        </div>
      </div>
    );
  }

  // reveal (compressed, spec §8)
  const t = truthLine(state.reveal);
  const correct = verdictMatchesTruth(state.reveal);
  return (
    <div>
      {header}
      <div className="rounded-2xl border border-line bg-faint p-6">
        <p className="text-xs uppercase tracking-widest opacity-60">
          {state.reveal.season_end_year} season of
        </p>
        <h2 className="rise-in mt-1 text-3xl font-semibold">
          {state.reveal.player_name}
        </h2>
        <p
          className={`rise-in mt-3 text-xl font-medium ${t.className} ${
            correct === false ? "miss-shake" : ""
          }`}
        >
          {t.text}
          <VerdictFlourish correct={correct} />
        </p>
        {correct === false && (
          <p className="tabular mt-1 text-sm text-stamp">
            You said {state.reveal.your_verdict} — history disagreed.
          </p>
        )}
        <div className="mt-4">
          <SplitBar split={state.reveal.split} yourVerdict={state.reveal.your_verdict} animate={false} />
        </div>
      </div>

      <div className="mt-5 flex items-center gap-3">
        <button
          onClick={next}
          className="flex-1 rounded-xl bg-bronze py-4 text-lg font-semibold text-ivory"
        >
          Next ballot →
        </button>
        {tally.total > 0 && (tally.total + tally.crowd) % 10 === 0 && (
          <button onClick={share} className="rounded-xl border border-line px-4 py-4 text-sm">
            {copied ? "Copied" : "Share"}
          </button>
        )}
      </div>
    </div>
  );
}
