import type { Reveal } from "./types";

// The truth line per ballot type (spec §8 beat 3).
export function truthLine(reveal: Reveal): { text: string; className: string } {
  if (reveal.scoring === "crowd") {
    return { text: "The people’s verdict", className: "italic text-bronze" };
  }

  const yr = reveal.season_end_year;
  const made = reveal.truth.status === "in";

  switch (reveal.type) {
    case "season_allstar":
      return made
        ? { text: `All-Star, ${yr}`, className: "text-bronze" }
        : { text: `Not an All-Star in ${yr}`, className: "text-ink" };
    case "season_allnba":
      return made
        ? {
            text: `All-NBA ${reveal.truth.detail.allnba_team ?? ""} Team, ${yr}`.replace("  ", " "),
            className: "text-bronze",
          }
        : { text: `Missed All-NBA in ${yr}`, className: "text-ink" };
    case "season_mvp5":
      return made
        ? { text: `Top-5 MVP finish, ${yr}`, className: "text-bronze" }
        : { text: `Outside the MVP top five in ${yr}`, className: "text-ink" };
    case "season_roy":
      return made
        ? { text: `Rookie of the Year, ${yr}`, className: "text-bronze" }
        : { text: "Didn’t win Rookie of the Year", className: "text-ink" };
    default:
      // career_hof
      switch (reveal.truth.status) {
        case "in":
          return {
            text: `Inducted ${reveal.truth.detail.inducted_year ?? ""}`.trim(),
            className: "text-bronze",
          };
        case "out":
          return { text: "Not in the Hall", className: "text-ink" };
        default:
          return {
            text: `Eligible ${reveal.truth.detail.eligible_year ?? "soon"} — verdict pending`,
            className: "italic opacity-80",
          };
      }
  }
}

// Verdict ↔ truth match for season modes (used by client scoring).
export function verdictMatchesTruth(reveal: Reveal): boolean | null {
  if (reveal.scoring === "crowd" || reveal.truth.status === "pending") return null;
  const made = reveal.truth.status === "in";
  const v = reveal.your_verdict;
  if (reveal.type === "season_allnba") {
    if (made) return v === (reveal.truth.detail.allnba_team ?? "");
    return v === "NONE";
  }
  const saidYes = v === "IN" || v === "YES";
  return made === saidYes;
}
