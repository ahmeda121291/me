import type { CareerPayload } from "@/lib/types";
import Sparkline from "./Sparkline";

interface Props {
  payload: CareerPayload;
  ballotNumber: number;
  dateLabel: string;
}

function pct(v: number | null): string {
  return v === null || v === undefined ? "—" : `${(v * 100).toFixed(1)}%`;
}

function eraClass(eraBand: string): string {
  const m = eraBand.match(/(\d{4})s/);
  return m ? `era-${m[1]}s` : "era-2000s";
}

function accoladeLine(p: CareerPayload): string {
  const a = p.accolades;
  const parts = [
    `${a.allstar}× All-Star`,
    `${a.champ}× champion`,
    a.mvp > 0 ? `${a.mvp}× MVP` : "0 MVPs",
  ];
  if (a.allnba > 0) parts.push(`${a.allnba}× All-NBA`);
  if (a.alldef > 0) parts.push(`${a.alldef}× All-Defense`);
  if (a.roy) parts.push("Rookie of the Year");
  return parts.join(" · ");
}

// The anonymized career résumé (spec §1): per-game stats, GP, accolade
// counts, era band, sparkline. No name, no team, no photo.
export default function BallotCard({ payload, ballotNumber, dateLabel }: Props) {
  const c = payload.career;
  const stats: Array<[string, string]> = [
    ["PPG", c.ppg.toFixed(1)],
    ["RPG", c.rpg.toFixed(1)],
    ["APG", c.apg.toFixed(1)],
    ["SPG", c.spg === null ? "—" : c.spg.toFixed(1)],
    ["BPG", c.bpg === null ? "—" : c.bpg.toFixed(1)],
    ["MPG", c.mpg.toFixed(1)],
  ];

  return (
    <section
      className={`${eraClass(payload.era_band)} rounded-2xl border border-line p-5 shadow-sm`}
      aria-label={`Ballot number ${ballotNumber}`}
    >
      <div className="flex items-baseline justify-between text-xs uppercase tracking-widest opacity-70">
        <span className="tabular">Ballot No. {ballotNumber}</span>
        <span>{dateLabel}</span>
      </div>

      <p className="mt-3 text-sm italic opacity-80">{payload.era_band}</p>

      <dl className="tabular mt-4 grid grid-cols-3 gap-x-4 gap-y-3">
        {stats.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[10px] uppercase tracking-widest opacity-60">
              {label}
            </dt>
            <dd className="text-2xl font-medium">{value}</dd>
          </div>
        ))}
      </dl>

      <div className="tabular mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-line pt-3 text-xs opacity-80">
        <span>{c.gp.toLocaleString()} GP</span>
        <span>{c.seasons} seasons</span>
        <span>FG {pct(c.fg_pct)}</span>
        <span>3P {pct(c.fg3_pct)}</span>
        <span>FT {pct(c.ft_pct)}</span>
      </div>

      <p className="mt-3 text-sm font-medium">{accoladeLine(payload)}</p>

      <Sparkline
        values={payload.sparkline}
        className="mt-4 h-9 w-full text-bronze"
      />
    </section>
  );
}
