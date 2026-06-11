import type { BallotType, Verdict } from "./types";

export interface ModeConfig {
  key: BallotType;
  slug: string;
  title: string;
  question: string;
  options: Verdict[];
  blurb: string;
  scoring: "truth" | "crowd";
}

// The ballot engine config (spec §3): adding a future type is one entry here
// plus a payload mapper.
export const MODES: ModeConfig[] = [
  {
    key: "season_allstar",
    slug: "allstar",
    title: "All-Star?",
    question: "All-Star that season?",
    options: ["YES", "NO"],
    blurb: "One season, no name. Did he make the team?",
    scoring: "truth",
  },
  {
    key: "season_allnba",
    slug: "allnba",
    title: "All-NBA?",
    question: "All-NBA that season?",
    options: ["1st", "2nd", "3rd", "NONE"],
    blurb: "First team, second, third — or none at all.",
    scoring: "truth",
  },
  {
    key: "season_mvp5",
    slug: "mvp",
    title: "Top-5 MVP?",
    question: "Top-5 MVP finish?",
    options: ["YES", "NO"],
    blurb: "Was the season that loud?",
    scoring: "truth",
  },
  {
    key: "season_roy",
    slug: "roy",
    title: "Won ROY?",
    question: "Won Rookie of the Year?",
    options: ["YES", "NO"],
    blurb: "A rookie year, blind. Your call.",
    scoring: "truth",
  },
  {
    key: "season_max",
    slug: "max",
    title: "Pay the max?",
    question: "Pay him the max next summer?",
    options: ["YES", "NO"],
    blurb: "No truth here — only the people's verdict.",
    scoring: "crowd",
  },
];

export const modeBySlug = (slug: string) => MODES.find((m) => m.slug === slug);
