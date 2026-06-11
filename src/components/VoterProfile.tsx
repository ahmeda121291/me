"use client";

import { useEffect, useState } from "react";
import {
  projectVerdict,
  SPECTRUM_LABELS,
  type Spectrums,
} from "@/lib/archetypes";
import { getDeviceId } from "@/lib/scoring";
import { getSupabase, invokeFunction } from "@/lib/supabase-browser";

interface ProfileNumbers {
  verdict_count: number;
  resolved: number;
  eligible: boolean;
  accuracy: number | null;
  hall_agreement: number | null;
  spectrums: Spectrums;
}

interface NarrativeResponse {
  eligible: boolean;
  resolved?: number;
  archetype?: string;
  narrative?: string;
  profile?: ProfileNumbers;
}

interface FamousCase {
  name: string;
  attributes: Record<string, number>;
  truth_status: string;
}

// Voter DNA radar: the five spectrums as a pentagon (spec §9).
function Radar({ s }: { s: Spectrums }) {
  const values = SPECTRUM_LABELS.map(({ key }) => (s[key] + 100) / 200); // 0..1
  const cx = 110, cy = 100, r = 78;
  const point = (i: number, scale: number) => {
    const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    return `${cx + Math.cos(angle) * r * scale},${cy + Math.sin(angle) * r * scale}`;
  };
  const ring = (scale: number) =>
    Array.from({ length: 5 }, (_, i) => point(i, scale)).join(" ");

  return (
    <svg viewBox="0 0 220 200" className="mx-auto w-full max-w-xs" role="img" aria-label="Voter DNA radar">
      {[0.33, 0.66, 1].map((sc) => (
        <polygon key={sc} points={ring(sc)} fill="none" stroke="currentColor" opacity={0.15} />
      ))}
      <polygon
        points={values.map((v, i) => point(i, Math.max(0.08, v))).join(" ")}
        fill="var(--bronze)"
        fillOpacity={0.3}
        stroke="var(--bronze)"
        strokeWidth={2}
      />
      {SPECTRUM_LABELS.map((l, i) => {
        const angle = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
        const x = cx + Math.cos(angle) * (r + 16);
        const y = cy + Math.sin(angle) * (r + 14);
        return (
          <text key={l.key} x={x} y={y} textAnchor="middle" fontSize="9" fill="currentColor" opacity={0.7}>
            {l.right}
          </text>
        );
      })}
    </svg>
  );
}

export default function VoterProfile() {
  const [state, setState] = useState<
    | { phase: "loading" }
    | { phase: "anon"; resolved: number }
    | { phase: "locked"; resolved: number }
    | { phase: "ready"; data: NarrativeResponse; member: boolean; cases: FamousCase[] | null }
  >({ phase: "loading" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    (async () => {
      const supabase = getSupabase();
      const { data: session } = await supabase.auth.getSession();
      const { data: raw } = await supabase.rpc("api_voter_profile", {
        p_device_id: getDeviceId(),
      });
      const numbers = raw as ProfileNumbers | null;
      if (!session.session) {
        setState({ phase: "anon", resolved: numbers?.resolved ?? 0 });
        return;
      }
      if (!numbers?.eligible) {
        setState({ phase: "locked", resolved: numbers?.resolved ?? 0 });
        return;
      }
      const { data } = await invokeFunction<NarrativeResponse>("voter-narrative", {
        device_id: getDeviceId(),
      });
      if (!data?.eligible) {
        setState({ phase: "locked", resolved: numbers.resolved });
        return;
      }
      const { data: member } = await supabase.rpc("api_is_member");
      let cases: FamousCase[] | null = null;
      if (member) {
        const { data: fc } = await supabase.rpc("api_famous_cases");
        cases = fc as FamousCase[] | null;
      }
      setState({ phase: "ready", data, member: Boolean(member), cases });
    })();
  }, []);

  if (state.phase === "loading") {
    return <p className="py-8 text-center text-sm opacity-50">Reading your ballots…</p>;
  }

  if (state.phase === "anon" || state.phase === "locked") {
    const need = Math.max(0, 15 - state.resolved);
    return (
      <section className="rounded-2xl border border-dashed border-line p-5 text-sm">
        <p className="font-semibold">Your Voter Profile</p>
        <p className="mt-1 opacity-75">
          {state.phase === "anon"
            ? "Sign in and keep stamping — the profile unlocks at 15 resolvable verdicts."
            : need > 0
              ? `${need} more resolvable verdict${need === 1 ? "" : "s"} and the analysis begins.`
              : "Crunching…"}
        </p>
        <div className="tabular mt-3 h-2 w-full overflow-hidden rounded-full bg-faint">
          <span
            className="block h-full bg-bronze"
            style={{ width: `${Math.min(100, (state.resolved / 15) * 100)}%` }}
          />
        </div>
      </section>
    );
  }

  const { data, member, cases } = state;
  const p = data.profile!;
  const share = async () => {
    const text = `I'm ${data.archetype} — based on ${p.verdict_count} blind verdicts on First Ballot. What's your voter DNA? ${window.location.origin}`;
    if (navigator.share) {
      try { await navigator.share({ text }); return; } catch { /* fallthrough */ }
    }
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <section className="rounded-2xl border border-bronze p-5">
      <p className="text-xs uppercase tracking-widest text-bronze">Voter Profile</p>
      <h2 className="mt-1 text-3xl font-semibold">{data.archetype}</h2>
      <p className="mt-3 text-sm leading-relaxed">{data.narrative}</p>

      <div className="mt-5">
        <Radar s={p.spectrums} />
      </div>

      <div className="mt-4 flex flex-col gap-2.5">
        {SPECTRUM_LABELS.map(({ key, left, right }) => {
          const v = p.spectrums[key];
          return (
            <div key={key}>
              <div className="flex justify-between text-[10px] uppercase tracking-widest opacity-60">
                <span>{left}</span>
                <span>{right}</span>
              </div>
              <div className="relative mt-0.5 h-2 w-full rounded-full bg-faint">
                <span
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-bronze"
                  style={{ left: `calc(${(v + 100) / 2}% - 7px)` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="tabular mt-5 flex flex-wrap gap-x-5 gap-y-1 border-t border-line pt-3 text-sm">
        {p.hall_agreement !== null && (
          <span>Hall agreement {Math.round(p.hall_agreement * 100)}%</span>
        )}
        {p.accuracy !== null && <span>Accuracy {Math.round(p.accuracy * 100)}%</span>}
        <span className="opacity-60">based on {p.verdict_count} blind verdicts</span>
      </div>

      <button
        onClick={share}
        className="mt-4 w-full rounded-xl bg-bronze py-3 font-semibold text-ivory"
      >
        {copied ? "Copied" : "Share your voter DNA"}
      </button>

      {member && cases && cases.length > 0 && (
        <div className="mt-6 border-t border-line pt-4">
          <h3 className="text-xs uppercase tracking-widest opacity-60">
            The Famous Cases
          </h3>
          <p className="mt-1 text-[11px] italic opacity-60">
            A projection: how your modeled philosophy would have voted. Not your actual ballots.
          </p>
          <ul className="tabular mt-3 flex flex-col gap-1.5 text-sm">
            {cases.map((c) => {
              const proj = projectVerdict(p.spectrums, c.attributes);
              const agrees =
                c.truth_status === "pending" ||
                (c.truth_status === "in") === (proj.verdict === "IN");
              return (
                <li key={c.name} className="flex items-center justify-between">
                  <span>{c.name}</span>
                  <span className={proj.verdict === "IN" ? "text-bronze" : "text-stamp"}>
                    {proj.verdict}
                    <span className="ml-2 text-xs opacity-50">
                      {c.truth_status === "pending" ? "pending" : agrees ? "✓ history" : "✗ history"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
