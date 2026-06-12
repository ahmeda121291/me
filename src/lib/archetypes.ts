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

// ——— The archetype roster ———————————————————————————————————————————————
// Every analysis resolves to one of these. Each carries its own character
// design (the profile-pic avatar): same basketball-headed mascot, unique
// hat/eyes/mouth/backdrop per archetype.

export type AvatarBg = "paper" | "gold" | "sage" | "clay" | "slate";
export type AvatarHat =
  | "none" | "crown" | "laurel" | "headband" | "fedora" | "beret" | "visor" | "cap" | "halo";
export type AvatarEyes = "dot" | "line" | "wide" | "sleepy" | "star" | "monocle" | "glasses";
export type AvatarMouth = "smile" | "grin" | "flat" | "smirk" | "frown" | "open";

export interface AvatarLook {
  bg: AvatarBg;
  hat: AvatarHat;
  eyes: AvatarEyes;
  mouth: AvatarMouth;
}

export interface Archetype {
  slug: string;
  name: string;
  tagline: string;
  w: Partial<Record<keyof Spectrums, number>>;
  look: AvatarLook;
}

export const ARCHETYPES: Archetype[] = [
  { slug: "gatekeeper", name: "The Gatekeeper", tagline: "Few belong.", w: { small_big: -1.3 }, look: { bg: "slate", hat: "fedora", eyes: "line", mouth: "flat" } },
  { slug: "velvet-rope", name: "The Velvet Rope", tagline: "VIPs only.", w: { small_big: -0.9, rings_stats: -0.5 }, look: { bg: "clay", hat: "none", eyes: "monocle", mouth: "smirk" } },
  { slug: "populist", name: "The Populist", tagline: "Let ’em all in.", w: { small_big: 1.2 }, look: { bg: "gold", hat: "headband", eyes: "wide", mouth: "grin" } },
  { slug: "compilers-friend", name: "The Compiler’s Friend", tagline: "Volume is a virtue.", w: { small_big: 0.8, peak_longevity: 0.8 }, look: { bg: "sage", hat: "visor", eyes: "dot", mouth: "smile" } },
  { slug: "ring-counter", name: "The Ring Counter", tagline: "Count the hands.", w: { rings_stats: -1.3 }, look: { bg: "gold", hat: "crown", eyes: "dot", mouth: "flat" } },
  { slug: "june-theorist", name: "The June Theorist", tagline: "Only the playoffs are real.", w: { rings_stats: -0.8, peak_longevity: -0.6 }, look: { bg: "slate", hat: "cap", eyes: "line", mouth: "smirk" } },
  { slug: "accountant", name: "The Accountant", tagline: "The ledger never lies.", w: { rings_stats: 1.0, era: 0.5 }, look: { bg: "paper", hat: "none", eyes: "glasses", mouth: "flat" } },
  { slug: "spreadsheet-sicko", name: "The Spreadsheet Sicko", tagline: "Per-36 or it didn’t happen.", w: { rings_stats: 1.3, small_big: 0.3 }, look: { bg: "slate", hat: "visor", eyes: "glasses", mouth: "grin" } },
  { slug: "peak-chaser", name: "The Peak Chaser", tagline: "Give me the supernova.", w: { peak_longevity: -1.3 }, look: { bg: "gold", hat: "none", eyes: "star", mouth: "grin" } },
  { slug: "comet-watcher", name: "The Comet Watcher", tagline: "Brilliance forgives brevity.", w: { peak_longevity: -0.9, era: 0.5 }, look: { bg: "slate", hat: "halo", eyes: "wide", mouth: "smile" } },
  { slug: "marathon-man", name: "The Marathon Man", tagline: "Outlast everybody.", w: { peak_longevity: 1.3 }, look: { bg: "sage", hat: "headband", eyes: "sleepy", mouth: "smile" } },
  { slug: "longevity-lobbyist", name: "The Longevity Lobbyist", tagline: "Respect the odometer.", w: { peak_longevity: 0.9, small_big: 0.5 }, look: { bg: "paper", hat: "fedora", eyes: "sleepy", mouth: "flat" } },
  { slug: "romantic", name: "The Romantic", tagline: "It meant more back then.", w: { era: -1.0, peak_longevity: -0.6 }, look: { bg: "clay", hat: "beret", eyes: "sleepy", mouth: "smile" } },
  { slug: "old-head", name: "The Old Head", tagline: "Short shorts, hard fouls.", w: { era: -0.9, small_big: -0.6 }, look: { bg: "sage", hat: "fedora", eyes: "line", mouth: "frown" } },
  { slug: "historian", name: "The Historian", tagline: "Context is everything.", w: { era: -1.2, rings_stats: 0.4 }, look: { bg: "paper", hat: "beret", eyes: "monocle", mouth: "flat" } },
  { slug: "prisoner-of-the-moment", name: "The Prisoner of the Moment", tagline: "Best I’ve ever seen. Again.", w: { era: 1.1, peak_longevity: -0.7 }, look: { bg: "gold", hat: "cap", eyes: "wide", mouth: "open" } },
  { slug: "modernist", name: "The Modernist", tagline: "The game evolved. Keep up.", w: { era: 1.2, rings_stats: 0.5 }, look: { bg: "slate", hat: "visor", eyes: "line", mouth: "smirk" } },
  { slug: "defense-lawyer", name: "The Defense Lawyer", tagline: "Stops win souls.", w: { offense_defense: 1.3 }, look: { bg: "sage", hat: "none", eyes: "line", mouth: "frown" } },
  { slug: "stoppers-advocate", name: "The Stopper’s Advocate", tagline: "Guard somebody.", w: { offense_defense: 0.9, rings_stats: -0.4 }, look: { bg: "clay", hat: "headband", eyes: "line", mouth: "frown" } },
  { slug: "bucket-believer", name: "The Bucket Believer", tagline: "Points are the point.", w: { offense_defense: -1.2 }, look: { bg: "clay", hat: "none", eyes: "star", mouth: "grin" } },
  { slug: "showtime-disciple", name: "The Showtime Disciple", tagline: "Make it beautiful.", w: { offense_defense: -0.8, era: -0.6 }, look: { bg: "gold", hat: "laurel", eyes: "wide", mouth: "grin" } },
  { slug: "box-office-voter", name: "The Box-Office Voter", tagline: "Sell the building out.", w: { offense_defense: -0.7, small_big: 0.6 }, look: { bg: "paper", hat: "cap", eyes: "star", mouth: "open" } },
  { slug: "skeptic", name: "The Skeptic", tagline: "Prove it twice.", w: { small_big: -0.7, rings_stats: 0.7 }, look: { bg: "paper", hat: "none", eyes: "monocle", mouth: "frown" } },
  { slug: "even-hand", name: "The Even Hand", tagline: "Justice, calibrated.", w: {}, look: { bg: "sage", hat: "laurel", eyes: "dot", mouth: "smile" } },
];

// A voter with no strong lean anywhere is The Even Hand; otherwise the
// archetype with the strongest weighted alignment wins.
export function pickArchetype(s: Spectrums): Archetype {
  const flat = Object.values(s).every((v) => Math.abs(v) < 15);
  if (flat) return ARCHETYPES.find((a) => a.slug === "even-hand")!;
  let best = ARCHETYPES[0];
  let bestScore = -Infinity;
  for (const a of ARCHETYPES) {
    if (a.slug === "even-hand") continue;
    let score = 0;
    for (const [k, w] of Object.entries(a.w)) score += (s[k as keyof Spectrums] ?? 0) * (w as number);
    if (score > bestScore) {
      bestScore = score;
      best = a;
    }
  }
  return best;
}

export const archetypeBySlug = (slug: string) =>
  ARCHETYPES.find((a) => a.slug === slug);
export const archetypeByName = (name: string) =>
  ARCHETYPES.find((a) => a.name === name);

// base64url payload for the profile share card route.
export function profileShareData(
  archetype: string,
  s: Spectrums,
  hallAgreement: number | null,
  verdictCount: number,
): string {
  const json = JSON.stringify({
    a: archetype,
    s: SPECTRUM_LABELS.map((l) => s[l.key]),
    ha: hallAgreement ?? 0,
    n: verdictCount,
  });
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

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
