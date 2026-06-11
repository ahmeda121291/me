export interface SeasonLine {
  ppg: number;
  rpg: number;
  apg: number;
  spg?: number;
  bpg?: number;
  mpg: number;
  gp: number;
  fg_pct?: number;
  fg3_pct?: number;
  ft_pct?: number;
  ts_pct?: number;
}

export interface SeasonPayload extends SeasonLine {
  age: number;
  era_band: string;
  position_group?: string;
  team_win_band?: string;
  draft_class?: number;
}

export interface SeasonBallot {
  id: number;
  type: string;
  scoring: "truth" | "crowd";
  payload: SeasonPayload;
  season_end_year: number;
}
