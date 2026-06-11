import type { Split, Verdict } from "@/lib/types";

interface Props {
  split: Split;
  yourVerdict?: Verdict;
  animate?: boolean;
}

// Community split as a two-sided bar. The positive option (IN/YES) renders
// bronze, the negative (OUT/NO) renders stamp-red.
export default function SplitBar({ split, yourVerdict, animate = true }: Props) {
  const entries = Object.entries(split).sort((a, b) =>
    ["IN", "YES"].includes(a[0]) ? -1 : ["IN", "YES"].includes(b[0]) ? 1 : 0,
  );
  const total = entries.reduce((sum, [, n]) => sum + n, 0);
  if (total === 0) return null;

  // Early returns stay sealed — a young split reads as empty, not exciting.
  if (total < 10) {
    return (
      <div>
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-faint">
          <span className="h-full w-full bg-line opacity-40" />
        </div>
        <p className="mt-2 text-xs italic opacity-70">
          Early returns — the room is still filing in. The split unseals at 10
          verdicts{yourVerdict ? `, and your ${yourVerdict} is on the record` : ""}.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-faint">
        {entries.map(([verdict, n]) => (
          <span
            key={verdict}
            className={`${animate ? "bar-grow" : ""} h-full ${
              ["IN", "YES", "1st"].includes(verdict) ? "bg-bronze" : "bg-stamp"
            }`}
            style={{ width: `${(n / total) * 100}%` }}
          />
        ))}
      </div>
      <div className="tabular mt-2 flex justify-between text-xs">
        {entries.map(([verdict, n]) => (
          <span
            key={verdict}
            className={verdict === yourVerdict ? "font-semibold" : "opacity-70"}
          >
            {verdict} {((n / total) * 100).toFixed(0)}%
            {verdict === yourVerdict ? " — you" : ""}
          </span>
        ))}
      </div>
      <p className="tabular mt-1 text-[10px] uppercase tracking-widest opacity-50">
        {total.toLocaleString()} verdict{total === 1 ? "" : "s"} cast
      </p>
    </div>
  );
}
