import type { SeasonPayload } from "@/lib/season-types";

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

// Single-season anonymized line (spec §3 payload table).
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
    <section className={`${eraClass(payload.era_band)} rounded-2xl border border-line p-5 shadow-sm`}>
      <div className="flex items-baseline justify-between text-xs uppercase tracking-widest opacity-70">
        <span className="italic normal-case tracking-normal">{payload.era_band}</span>
        <span className="tabular">Age {payload.age}</span>
      </div>

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
    </section>
  );
}
