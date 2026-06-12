"use client";

import { useCallback, useEffect, useState } from "react";
import { MODES } from "@/lib/modes";
import type { SeasonBallot } from "@/lib/season-types";
import type { BallotType, CareerContext, Reveal, Verdict } from "@/lib/types";
import { SITE_URL } from "@/lib/constants";
import { getDeviceId } from "@/lib/scoring";
import { getSupabase } from "@/lib/supabase-browser";
import { verdictMatchesTruth } from "@/lib/truth-copy";
import { truthLine } from "@/lib/truth-copy";
import SeasonBallotCard from "./SeasonBallotCard";
import ShareMenu from "./ShareMenu";
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
  | { phase: "stamping"; ballot: SeasonBallot; stamped: Verdict }
  | { phase: "reveal"; ballot: SeasonBallot; reveal: Reveal }
  | { phase: "exhausted" };

const STAMP_BEAT_MS = 700;

function accoladeChips(c: CareerContext): string[] {
  const chips: string[] = [];
  if (c.allstar > 0) chips.push(`${c.allstar}× All-Star`);
  if (c.allnba > 0) chips.push(`${c.allnba}× All-NBA`);
  if (c.mvp > 0) chips.push(c.mvp > 1 ? `${c.mvp}× MVP` : "MVP");
  if (c.dpoy > 0) chips.push(c.dpoy > 1 ? `${c.dpoy}× DPOY` : "Defensive POY");
  if (c.roy) chips.push("Rookie of the Year");
  return chips;
}

// Endless play (spec §6), at the daily-ballot standard: stamp suspense beat →
// name reveal with the full career dossier → split → next. Persistent session
// scoreboard with a running streak, share card every 10 ballots.
export default function EndlessMode({ modeKey }: Props) {
  const config = MODES.find((m) => m.key === modeKey)!;
  const [state, setState] = useState<State>({ phase: "loading" });
  const [tally, setTally] = useState({ right: 0, total: 0, crowd: 0, run: 0, bestRun: 0 });

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
    const ballot = state.ballot;
    setState({ phase: "stamping", ballot, stamped: verdict });
    const beat = new Promise((resolve) => setTimeout(resolve, STAMP_BEAT_MS));
    const supabase = getSupabase();
    const { data, error } = await supabase.rpc("api_vote", {
      p_ballot_id: ballot.id,
      p_device_id: getDeviceId(),
      p_verdict: verdict,
    });
    if (error || !data) {
      setState({ phase: "ballot", ballot });
      return;
    }
    await beat; // let the stamp land before the name drops
    const reveal = data as Reveal;
    const correct = verdictMatchesTruth(reveal);
    setTally((t) => {
      const run = correct === true ? t.run + 1 : correct === false ? 0 : t.run;
      return {
        right: t.right + (correct === true ? 1 : 0),
        total: t.total + (correct === null ? 0 : 1),
        crowd: t.crowd + (correct === null ? 1 : 0),
        run,
        bestRun: Math.max(t.bestRun, run),
      };
    });
    setState({ phase: "reveal", ballot, reveal });
  };

  // The run card: the session result as a shareable image.
  const runImageUrl = `/api/og/run/${btoa(
    JSON.stringify({
      q: config.question,
      r: tally.right,
      t: tally.total,
      k: tally.bestRun,
      c: tally.crowd,
    }),
  )
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "")}`;
  const shareText =
    config.scoring === "crowd"
      ? `${tally.crowd} verdicts cast on ${config.question.replace("?", "")} — no right answers, only the room.`
      : `${config.title.replace("?", "")} ${tally.right}/${tally.total} called blind — can you read a season without the name?`;
  const runShare = (trigger: string, triggerClassName: string) => (
    <ShareMenu
      trigger={trigger}
      triggerClassName={triggerClassName}
      text={shareText}
      url={`${SITE_URL}/play`}
      imageUrl={runImageUrl}
      imageFileName="first-ballot-run.png"
    />
  );

  const header = (
    <div className="mb-4 flex items-baseline justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">{config.question}</h1>
        {config.scoring === "crowd" && (
          <p className="text-xs italic text-bronze">
            Crowd-scored — there is no right answer, only the room.
          </p>
        )}
      </div>
      <div className="tabular flex shrink-0 items-baseline gap-3 text-sm">
        {config.scoring === "crowd" ? (
          <span className="opacity-70">{tally.crowd} cast</span>
        ) : (
          <>
            <span className="opacity-70">{tally.right}/{tally.total}</span>
            {tally.run >= 2 && (
              <span className="text-bronze">▲ {tally.run} straight</span>
            )}
          </>
        )}
      </div>
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
          <div className="mt-4">
            {runShare(
              "Share the run",
              "rounded-lg bg-bronze px-6 py-3 font-semibold text-ivory",
            )}
          </div>
        </div>
      </div>
    );
  }

  if (state.phase === "ballot" || state.phase === "stamping") {
    const stamping = state.phase === "stamping";
    const stamped = stamping ? state.stamped : null;
    const stampPositive = stamped !== null && stamped !== "OUT" && stamped !== "NO" && stamped !== "NONE";
    return (
      <div>
        {header}
        <div className={`relative ${stamping ? "card-thud" : ""}`}>
          <SeasonBallotCard payload={state.ballot.payload} />
          {stamping && stamped && (
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className={`stamp-drop rounded-xl border-8 px-7 py-2 text-6xl font-bold tracking-[0.18em] ${
                  stampPositive ? "border-bronze text-bronze" : "border-stamp text-stamp"
                }`}
                style={{ background: "rgba(246,241,231,0.6)" }}
              >
                {stamped}
              </span>
            </div>
          )}
        </div>
        <div className={`mt-5 ${stamping ? "pointer-events-none opacity-40" : ""}`}>
          {stamping && (
            <p className="mb-3 text-center text-sm uppercase tracking-widest opacity-70">
              Sealing your verdict…
            </p>
          )}
          <StampBar options={config.options} onConfirm={vote} disabled={stamping} />
          {!stamping && (
            <p className="mt-3 text-center text-[11px] opacity-50">
              Hold to stamp. No takebacks.
            </p>
          )}
        </div>
      </div>
    );
  }

  // reveal: the name, the truth, and the full career behind the line
  const t = truthLine(state.reveal);
  const correct = verdictMatchesTruth(state.reveal);
  const career = state.reveal.career ?? null;
  const chips = career ? accoladeChips(career) : [];
  return (
    <div>
      {header}
      <div className="rounded-2xl border border-line bg-faint p-6">
        <p className="text-xs uppercase tracking-widest opacity-60">
          {state.reveal.season_end_year} season of
        </p>
        <h2 className="rise-in mt-1 text-4xl font-semibold">
          {state.reveal.player_name}
        </h2>
        {career?.team && (
          <p className="tabular mt-1 text-xs uppercase tracking-widest opacity-60">
            {career.team} · age {state.ballot.payload.age}
          </p>
        )}
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

        {career && (
          <div className="mt-5 border-t border-line pt-4">
            <p className="text-xs uppercase tracking-widest opacity-60">
              The full career
            </p>
            <p className="tabular mt-1 text-sm opacity-80">
              {career.from_year}–{career.to_year} · {career.seasons} seasons ·{" "}
              {career.gp.toLocaleString()} GP
            </p>
            <dl className="tabular mt-3 grid grid-cols-3 gap-x-4">
              {(
                [
                  [career.ppg.toFixed(1), "PPG"],
                  [career.rpg.toFixed(1), "RPG"],
                  [career.apg.toFixed(1), "APG"],
                ] as const
              ).map(([v, label]) => (
                <div key={label}>
                  <dd className="text-2xl font-medium">{v}</dd>
                  <dt className="text-[10px] uppercase tracking-widest opacity-60">
                    {label} <span className="normal-case">career</span>
                  </dt>
                </div>
              ))}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {career.hof !== null && (
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    career.hof
                      ? "bg-bronze text-ivory"
                      : "border border-line opacity-70"
                  }`}
                >
                  {career.hof ? "✦ Hall of Famer" : "Not in the Hall"}
                </span>
              )}
              {chips.map((label) => (
                <span key={label} className="rounded-full border border-line px-3 py-1 text-xs">
                  {label}
                </span>
              ))}
              {chips.length === 0 && (
                <span className="rounded-full border border-line px-3 py-1 text-xs opacity-70">
                  No major hardware
                </span>
              )}
            </div>
          </div>
        )}

        <div className="mt-4">
          <SplitBar split={state.reveal.split} yourVerdict={state.reveal.your_verdict} animate={false} />
        </div>
      </div>

      <div className="mt-5">
        <button
          onClick={next}
          className="w-full rounded-xl bg-bronze py-4 text-lg font-semibold text-ivory"
        >
          Next ballot →
        </button>
        <div className="mt-3 text-center">
          {runShare(
            "Share this run 🖼",
            "rounded-full border border-line px-4 py-2 text-xs hover:border-bronze",
          )}
        </div>
      </div>
    </div>
  );
}
