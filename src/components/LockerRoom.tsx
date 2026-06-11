"use client";

import type { Reveal } from "@/lib/types";
import type { Stats } from "@/lib/scoring";
import SplitBar from "./SplitBar";
import ShareRow from "./ShareRow";
import Countdown from "./Countdown";
import { CLUB_ANNUAL_DISPLAY, CLUB_MONTHLY_DISPLAY } from "@/lib/constants";

interface Props {
  reveal: Reveal;
  stats: Stats;
}

const SLATE_MODES = [
  ["All-Star?", "One season. Did he make the team?"],
  ["All-NBA?", "1st, 2nd, 3rd — or none at all?"],
  ["Top-5 MVP?", "Was the season that loud?"],
  ["Won ROY?", "Rookie year, no name. Your call."],
  ["Pay the max?", "The people's verdict, no truth."],
] as const;

// Post-vote content layer (spec §6), in exact order: live split → case
// for/against → share row → Today's Slate (paywall surface) → your stats →
// pending tracker → countdown → footer.
export default function LockerRoom({ reveal, stats }: Props) {
  const pending =
    reveal.scoring === "truth" && reveal.truth.status === "pending";

  return (
    <div className="mt-6 flex flex-col gap-6 pb-16">
      <section className="rounded-2xl border border-line p-4">
        <h3 className="text-xs uppercase tracking-widest opacity-60">
          The room is split
        </h3>
        <div className="mt-3">
          <SplitBar
            split={reveal.split}
            yourVerdict={reveal.your_verdict}
            animate={false}
          />
        </div>
      </section>

      {(reveal.case_for || reveal.case_against) && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-line p-4">
            <h3 className="text-xs uppercase tracking-widest text-bronze">
              The case for
            </h3>
            <p className="mt-2 text-sm leading-relaxed">{reveal.case_for}</p>
          </div>
          <div className="rounded-2xl border border-line p-4">
            <h3 className="text-xs uppercase tracking-widest text-stamp">
              The case against
            </h3>
            <p className="mt-2 text-sm leading-relaxed">{reveal.case_against}</p>
          </div>
        </section>
      )}

      <ShareRow reveal={reveal} streak={stats.streak} />

      <section className="rounded-2xl border border-line p-4">
        <div className="flex items-baseline justify-between">
          <h3 className="text-xs uppercase tracking-widest opacity-60">
            Today’s Slate
          </h3>
          <span className="rounded-full border border-bronze px-2 py-0.5 text-[10px] uppercase tracking-widest text-bronze">
            The Club
          </span>
        </div>
        <ul className="mt-3 grid grid-cols-1 gap-2">
          {SLATE_MODES.map(([title, blurb]) => (
            <li
              key={title}
              className="flex items-center justify-between rounded-xl bg-faint px-3 py-2.5 opacity-80"
            >
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-xs opacity-70">{blurb}</p>
              </div>
              <span aria-hidden className="text-sm opacity-50">
                🔒
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          Unlimited play across five more modes, the full archive, and your
          Voter Profile. <span className="tabular">{CLUB_MONTHLY_DISPLAY}</span>{" "}
          or <span className="tabular">{CLUB_ANNUAL_DISPLAY}</span>.
        </p>
        <a
          href="/club"
          className="mt-3 inline-block rounded-lg bg-bronze px-5 py-2.5 text-sm font-semibold text-ivory"
        >
          Join The Club →
        </a>
      </section>

      <section className="tabular grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl border border-line p-3">
          <p className="text-2xl font-semibold">{stats.streak}</p>
          <p className="text-[10px] uppercase tracking-widest opacity-60">
            Streak
          </p>
        </div>
        <div className="rounded-2xl border border-line p-3">
          <p className="text-2xl font-semibold">
            {stats.accuracy === null ? "—" : `${(stats.accuracy * 100).toFixed(0)}%`}
          </p>
          <p className="text-[10px] uppercase tracking-widest opacity-60">
            Accuracy
          </p>
        </div>
        <div className="rounded-2xl border border-line p-3">
          <p className="text-2xl font-semibold">
            {stats.contrarian === null
              ? "—"
              : `${(stats.contrarian * 100).toFixed(0)}%`}
          </p>
          <p className="text-[10px] uppercase tracking-widest opacity-60">
            Contrarian
          </p>
        </div>
      </section>

      {pending && (
        <section className="rounded-2xl border border-dashed border-line p-4">
          <h3 className="text-xs uppercase tracking-widest opacity-60">
            Pending tracker
          </h3>
          <p className="mt-2 text-sm italic opacity-80">
            This one isn’t settled yet — eligible{" "}
            {reveal.truth.detail.eligible_year ?? "soon"}. Your verdict is on
            the record. We’ll score it when history does.
          </p>
        </section>
      )}

      <Countdown />

      <footer className="border-t border-line pt-4 text-center text-xs opacity-50">
        One career a day. No names. Your call.
      </footer>
    </div>
  );
}
