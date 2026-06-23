export type ForecastSourceKind = "live" | "cached" | "unavailable";

export interface ForecastSourceStatus {
  status: ForecastSourceKind;
  updatedAt: string | null;
  message?: string;
}

export interface TeamTournamentSignal {
  probability: number | null;
  movement24h: number | null;
  volume24h: number | null;
  totalVolume: number | null;
}

export interface TeamMatchSignal {
  opponent: string;
  date: string;
  winProbability: number | null;
  volume: number | null;
  result: "win" | "loss" | "draw" | null;
}

export interface TeamForecast {
  team: string;
  group: string;
  tournament: TeamTournamentSignal;
  matchAverageProbability: number | null;
  matchSignals: TeamMatchSignal[];
}

export interface GroupForecast {
  group: string;
  teams: TeamForecast[];
}

export interface MarketMover {
  team: string;
  group: string;
  probability: number | null;
  movement24h: number;
}

export interface ForecastSnapshot {
  fetchedAt: string;
  ttlSeconds: number;
  sourceStatus: {
    polymarket: ForecastSourceStatus;
    matchMarkets: ForecastSourceStatus;
  };
  teamForecasts: TeamForecast[];
  groupForecasts: GroupForecast[];
  topTournamentSignals: TeamForecast[];
  movers: MarketMover[];
}
