// Shared types between server function and UI. Plain DTOs only.

export type RoundSlug =
  | "group-stage"
  | "round-of-32"
  | "round-of-16"
  | "quarterfinals"
  | "semifinals"
  | "3rd-place-match"
  | "final";

export interface TeamLite {
  id: string;
  name: string;
  abbreviation: string;
  logo: string;
  color: string;
  /** placeholder label when team is TBD (e.g. "Group A 2nd Place") */
  placeholder?: string;
}

export interface MatchSide {
  team: TeamLite;
  score: number | null;
  winner: boolean;
}

export interface Match {
  id: string;
  date: string; // ISO
  round: RoundSlug;
  group: string | null; // "A".."L" for group stage, null otherwise
  status: "pre" | "in" | "post";
  statusDetail: string;
  venue: string | null;
  home: MatchSide;
  away: MatchSide;
  /** ESPN short code, e.g. "2B @ 2A" for knockout placeholders */
  shortName: string;
}

export interface StandingRow {
  team: TeamLite;
  mp: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  gd: number;
  pts: number;
}

export interface GroupTable {
  group: string; // "A" .. "L"
  rows: StandingRow[];
}

export interface WorldCupSnapshot {
  fetchedAt: string; // ISO
  ttlSeconds: number; // how long this snapshot is valid
  source: "espn" | "fallback";
  matches: Match[];
  groups: GroupTable[];
  /** matches keyed by round, already date-sorted */
  rounds: Record<RoundSlug, Match[]>;
}
