/**
 * Types for the Forecast vs. Reality archive (Step 2 of the archive plan).
 *
 * ForecastHistory  — frozen daily crowd prices for the tournament-winner
 *                    market, captured by scripts/capture-forecast-history.ts.
 * Retrospective    — the computed "crowd read vs. what happened" artifact,
 *                    built offline by scripts/build-retrospective.ts and
 *                    rendered statically. All labels are fan-facing.
 */

export interface HistoryPoint {
  date: string; // YYYY-MM-DD, UTC
  probability: number; // 0..1
}

export interface TeamHistory {
  team: string;
  points: HistoryPoint[];
}

export interface ForecastHistory {
  windowStart: string; // ISO
  windowEnd: string; // ISO
  fidelityMinutes: number;
  teams: TeamHistory[];
}

export interface MatchNote {
  opponent: string;
  result: "W" | "D" | "L";
  score: string; // e.g. "2–1"
}

export interface ChampionArcPoint {
  date: string;
  probability: number;
  match: MatchNote | null; // set on days the champion played
}

export interface RoundEveRead {
  round: string; // RoundSlug
  label: string; // fan-facing, e.g. "Quarterfinals"
  eveDate: string; // last history date before the round kicked off
  favorite: { team: string; probability: number } | null;
  championProbability: number | null;
}

export interface FinalRead {
  kickoffDate: string;
  home: { team: string; probability: number | null };
  away: { team: string; probability: number | null };
  result: string; // e.g. "Spain 1–0 Argentina (AET)"
}

export interface DaySwing {
  team: string;
  date: string; // date the move completed
  from: number;
  to: number;
  delta: number; // signed
  match: MatchNote | null; // the match that likely caused it, if one happened that day
}

export interface ResolutionMover {
  team: string;
  movement24h: number;
  probability: number | null;
}

export interface Retrospective {
  champion: string;
  finalResult: string;
  championArc: ChampionArcPoint[];
  roundEveReads: RoundEveRead[];
  finalRead: FinalRead;
  biggestSwings: DaySwing[];
  resolutionMovers: ResolutionMover[];
  source: {
    historyCapturedAt: string;
    teamsWithHistory: number;
    matchesAnalyzed: number;
  };
}
