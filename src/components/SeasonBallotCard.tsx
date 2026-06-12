import type { SeasonPayload } from "@/lib/season-types";
import Basketball from "./Basketball";

interface Props {
  payload: SeasonPayload;
}

function pct(v?: number): string {
  return v === undefined || v === null ? "—" : `${(v * 100).toFixed(1)}%`;
}

function eraClass(eraBand: string): string {
  const m = eraBand.match(/(\d{4})s/);
  return m ? `era-${m[1]}s` : "era-2000s";
}

// Single-season anonymized line (spec §3 payload table), dressed to the same
// standard as the daily career card: kicker, watermark, full chrome.
export default function SeasonBallotCard({ payload }: Props) {
  const stats: Array<[string, string]> = [
    ["PPG", payload.ppg.toFixed(1)],
    ["RPG", payload.rpg.toFixed(1)],
    ["APG", payload.apg.toFixed(1)],
    ["SPG", payload.spg === undefined ? "—" : payload.spg.toFixed(1)],
    ["BPG", payload.bpg === undefined ? "—" : payload.bpg.toFixed(1)],
    ["MPG", payload.mpg.toFixed(1)],
  ];

  return (
    <section
      className={`${eraClass(payload.era_band)} relative overflow-hidden rounded-2xl border border-line p-5 shadow-sm`}
    >
      <Basketball
        aria-hidden
        className="pointer-events-none absolute -bottom-7 -right-7 h-36 w-36 text-bronze opacity-[0.07]"
      />

      <div className="flex items-baseline justify-between text-xs uppercase tracking-widest opacity-70">
        <span>The season on the ballot</span>
        <span className="tabular">Age {payload.age}</span>
      </div>

      <p className="mt-3 text-sm italic opacity-80">{payload.era_band}</p>

      <dl className="tabular mt-4 grid grid-cols-3 gap-x-4 gap-y-3">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] uppercase tracking-widest opacity-60">{label}</dt>
            <dd className="text-2xl font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="tabular mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs opacity-80">
        <span>{payload.gp} GP</span>
        <span>FG {pct(payload.fg_pct)}</span>
        <span>3P {pct(payload.fg3_pct)}</span>
        <span>FT {pct(payload.ft_pct)}</span>
        {payload.ts_pct !== undefined && <span>TS {pct(payload.ts_pct)}</span>}
      </div>

      {(payload.position_group || payload.team_win_band || payload.draft_class) && (
        <p className="mt-3 text-sm font-medium">
          {[
            payload.position_group,
            payload.team_win_band,
            payload.draft_class ? `Draft class of ${payload.draft_class}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      )}

      <p className="mt-3 border-t border-line pt-3 text-[11px] italic opacity-50">
        One season. No name. Your call.
      </p>
    </section>
  );
}
