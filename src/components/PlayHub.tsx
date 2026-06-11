"use client";

import { useEffect, useState } from "react";
import { MODES } from "@/lib/modes";
import { getDeviceId } from "@/lib/scoring";
import { getSupabase } from "@/lib/supabase-browser";

type Counts = Record<string, { total: number; played: number }>;

// Members' hub (spec §6): six modes as cards; non-members see everything
// locked with the Club pitch.
export default function PlayHub() {
  const [member, setMember] = useState<boolean | null>(null);
  const [counts, setCounts] = useState<Counts>({});

  useEffect(() => {
    const supabase = getSupabase();
    supabase.rpc("api_is_member").then(({ data }) => setMember(Boolean(data)));
    supabase
      .rpc("api_mode_counts", { p_device_id: getDeviceId() })
      .then(({ data }) => setCounts((data as Counts) ?? {}));
  }, []);

  return (
    <div className="mt-6 flex flex-col gap-3 pb-16">
      <a
        href="/"
        className="flex items-center justify-between rounded-2xl border border-bronze p-4"
      >
        <div>
          <p className="font-semibold">The Daily Ballot</p>
          <p className="text-xs opacity-70">Hall of Fame? One a day, free forever.</p>
        </div>
        <span aria-hidden>→</span>
      </a>

      {MODES.map((m) => {
        const c = counts[m.key];
        const locked = member === false;
        return (
          <a
            key={m.key}
            href={locked ? "/club" : `/play/${m.slug}`}
            className={`flex items-center justify-between rounded-2xl border border-line p-4 ${
              locked ? "opacity-70" : ""
            }`}
          >
            <div>
              <p className="font-semibold">
                {m.title}{" "}
                {m.scoring === "crowd" && (
                  <span className="text-xs font-normal italic text-bronze">
                    crowd-scored
                  </span>
                )}
              </p>
              <p className="text-xs opacity-70">{m.blurb}</p>
              {c && (
                <p className="tabular mt-1 text-[10px] uppercase tracking-widest opacity-50">
                  {c.played}/{c.total} played
                </p>
              )}
            </div>
            <span aria-hidden>{locked ? "🔒" : "→"}</span>
          </a>
        );
      })}

      {member === false && (
        <div className="mt-2 rounded-2xl border border-bronze p-4 text-sm">
          <p className="font-semibold">These belong to The Club.</p>
          <p className="mt-1 opacity-80">
            Unlimited play across all five modes, the full archive, and your
            Voter Profile.
          </p>
          <a
            href="/club"
            className="mt-3 inline-block rounded-lg bg-bronze px-5 py-2.5 font-semibold text-ivory"
          >
            Join The Club →
          </a>
        </div>
      )}
    </div>
  );
}
