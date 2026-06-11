// Archetype + spectrum config (spec §9). Kept in sync with the
// voter-narrative edge function's mapping.
export interface Spectrums {
  small_big: number;
  rings_stats: number;
  peak_longevity: number;
  era: number;
  offense_defense: number;
}

export const SPECTRUM_LABELS: Array<{
  key: keyof Spectrums;
  left: string;
  right: string;
}> = [
  { key: "small_big", left: "Small hall", right: "Big hall" },
  { key: "rings_stats", left: "Rings", right: "Stats" },
  { key: "peak_longevity", left: "Peak", right: "Longevity" },
  { key: "era", left: "Era romantic", right: "Era neutral" },
  { key: "offense_defense", left: "Offense", right: "Defense" },
];

// Project the voter's philosophy onto a card's attributes (Famous Cases —
// clearly labeled a projection in the UI).
export function projectVerdict(
  s: Spectrums,
  attrs: Record<string, number>,
): { verdict: "IN" | "OUT"; lean: number } {
  const rings = (attrs.rings ?? 0) / 4;
  const offense = ((attrs.scoring_index ?? 0) + (attrs.playmaking_index ?? 0)) / 2;
  const oldEra = (attrs.era_decade ?? 2000) <= 1980 ? 1 : 0;

  let lean = s.small_big / 100; // base generosity
  lean += (-s.rings_stats / 100) * (rings - 0.4) * 2;
  lean += (s.rings_stats / 100) * ((attrs.scoring_index ?? 0) - 0.6) * 2;
  lean += (-s.peak_longevity / 100) * ((attrs.peak_index ?? 0) - 0.7) * 2;
  lean += (s.peak_longevity / 100) * ((attrs.longevity_index ?? 0) - 0.6) * 2;
  lean += (-s.era / 100) * (oldEra - 0.3) * 1.5;
  lean += (s.offense_defense / 100) * ((attrs.defense_index ?? 0) - 0.5) * 2;
  lean -= (s.offense_defense / 100) * (offense - 0.5);

  return { verdict: lean >= 0 ? "IN" : "OUT", lean };
}
