export type BallotType =
  | "career_hof"
  | "season_allstar"
  | "season_allnba"
  | "season_mvp5"
  | "season_roy"
  | "season_max";

export type Verdict = "IN" | "OUT" | "YES" | "NO" | "1st" | "2nd" | "3rd" | "NONE";

export interface CareerLine {
  ppg: number;
  rpg: number;
  apg: number;
  spg: number | null;
  bpg: number | null;
  gp: number;
  mpg: number;
  fg_pct: number | null;
  fg3_pct: number | null;
  ft_pct: number | null;
  seasons: number;
}

export interface Accolades {
  allstar: number;
  champ: number;
  mvp: number;
  allnba: number;
  alldef: number;
  roy: boolean;
}

export interface CareerPayload {
  era_band: string;
  career: CareerLine;
  accolades: Accolades;
  sparkline: number[];
}

export interface TodayBallot {
  id: number;
  ballot_number: number;
  type: BallotType;
  scoring: "truth" | "crowd";
  payload: CareerPayload;
  live_date: string;
}

export interface Truth {
  status: "in" | "out" | "pending";
  detail: {
    inducted_year?: number;
    eligible_year?: number;
    allnba_team?: string;
    crowd?: boolean;
  };
}

export type Split = Record<string, number>;

export interface Reveal {
  ballot_id: number;
  ballot_number: number | null;
  type?: BallotType;
  season_end_year?: number | null;
  your_verdict: Verdict;
  player_name: string;
  truth: Truth;
  scoring: "truth" | "crowd";
  case_for: string | null;
  case_against: string | null;
  split: Split;
}

export interface ShareData {
  ballot_id: number;
  ballot_number: number;
  live_date: string;
  is_today: boolean;
  payload: CareerPayload;
  player_name: string;
  truth_status: "in" | "out" | "pending";
  split: Split;
}
