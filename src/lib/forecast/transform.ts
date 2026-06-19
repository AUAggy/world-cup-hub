import type {
  ForecastSnapshot,
  ForecastSourceStatus,
  GroupForecast,
  MarketMover,
  TeamForecast,
  TeamMatchSignal,
} from "../forecast-types";
import type { KalshiMarket, PolymarketEvent, PolymarketMarket } from "./schema";
import { FORECAST_GROUPS, normalizeTeamName } from "./teams";

export const FORECAST_TTL_SECONDS = 120;
export const MOVER_THRESHOLD = 0.005;

interface ProviderStatuses {
  polymarket: ForecastSourceStatus;
  kalshi: ForecastSourceStatus;
}

interface PolySignal {
  probability: number;
  movement24h: number | null;
  volume24h: number;
  totalVolume: number;
}

interface KalshiGame {
  eventTicker: string;
  date: string;
  status: "active" | "finalized";
  result: "teamA" | "teamB" | "draw" | null;
  teamA: KalshiGameSide;
  teamB: KalshiGameSide;
}

interface KalshiGameSide {
  code: string;
  name: string;
  probability: number | null;
  volume: number;
  won: boolean;
}

export function assembleForecastSnapshot(input: {
  polymarket: PolymarketEvent | null;
  kalshiMarkets: KalshiMarket[];
  statuses: ProviderStatuses;
  now?: Date;
}): ForecastSnapshot {
  const fetchedAt = (input.now ?? new Date()).toISOString();
  const polyMap = buildPolymarketMap(input.polymarket);
  const kalshiMap = buildKalshiTeamSignals(parseKalshiGames(input.kalshiMarkets));

  const teamForecasts: TeamForecast[] = FORECAST_GROUPS.flatMap((group) =>
    group.teams.map((team) => {
      const poly = polyMap.get(team);
      const matchSignals = kalshiMap.get(team) ?? [];
      const activeProbabilities = matchSignals
        .map((signal) => signal.winProbability)
        .filter((value): value is number => value !== null);
      const matchAverageProbability =
        activeProbabilities.length > 0
          ? activeProbabilities.reduce((sum, value) => sum + value, 0) / activeProbabilities.length
          : null;

      return {
        team,
        group: group.id,
        tournament: {
          probability: poly?.probability ?? null,
          movement24h: poly?.movement24h ?? null,
          volume24h: poly?.volume24h ?? null,
          totalVolume: poly?.totalVolume ?? null,
        },
        matchAverageProbability,
        matchSignals,
      };
    }),
  );

  const groupForecasts: GroupForecast[] = FORECAST_GROUPS.map((group) => ({
    group: group.id,
    teams: teamForecasts.filter((team) => team.group === group.id),
  }));

  const topTournamentSignals = [...teamForecasts]
    .filter((team) => team.tournament.probability !== null)
    .sort((a, b) => (b.tournament.probability ?? 0) - (a.tournament.probability ?? 0))
    .slice(0, 12);

  const movers: MarketMover[] = teamForecasts
    .flatMap((team) => {
      const movement = team.tournament.movement24h;
      if (movement === null || Math.abs(movement) <= MOVER_THRESHOLD) return [];
      return [
        {
          team: team.team,
          group: team.group,
          probability: team.tournament.probability,
          movement24h: movement,
        },
      ];
    })
    .sort((a, b) => Math.abs(b.movement24h) - Math.abs(a.movement24h));

  return {
    fetchedAt,
    ttlSeconds: FORECAST_TTL_SECONDS,
    sourceStatus: input.statuses,
    teamForecasts,
    groupForecasts,
    topTournamentSignals,
    movers,
  };
}

export function parsePolymarketProbability(market: PolymarketMarket): number {
  try {
    const prices = JSON.parse(market.outcomePrices);
    const first = Array.isArray(prices) ? Number(prices[0]) : NaN;
    if (Number.isFinite(first)) return clampProbability(first);
  } catch {
    // Fall through to last trade price.
  }
  return clampProbability(market.lastTradePrice);
}

function buildPolymarketMap(event: PolymarketEvent | null): Map<string, PolySignal> {
  const map = new Map<string, PolySignal>();
  if (!event) return map;

  for (const market of event.markets) {
    const team = normalizeTeamName(market.groupItemTitle);
    if (!team || team.startsWith("Team ") || team === "Other") continue;
    map.set(team, {
      probability: parsePolymarketProbability(market),
      movement24h: market.oneDayPriceChange,
      volume24h: market.volume24hr,
      totalVolume: market.volumeNum,
    });
  }

  return map;
}

export function parseKalshiGames(markets: KalshiMarket[]): KalshiGame[] {
  const byEvent = new Map<string, KalshiMarket[]>();

  for (const market of markets) {
    if (!market.event_ticker || market.ticker.endsWith("-TIE")) continue;
    const current = byEvent.get(market.event_ticker) ?? [];
    current.push(market);
    byEvent.set(market.event_ticker, current);
  }

  const games: KalshiGame[] = [];

  for (const [eventTicker, sides] of byEvent) {
    if (sides.length !== 2) continue;
    const tieMarket = markets.find(
      (market) => market.event_ticker === eventTicker && market.ticker.endsWith("-TIE"),
    );
    const status = sides.some((side) => side.status === "finalized") ? "finalized" : "active";
    const result = resultFromMarkets(sides[0], sides[1], tieMarket);

    games.push({
      eventTicker,
      date: eventTicker.split("-")[1] ?? "",
      status,
      result,
      teamA: sideFromMarket(sides[0], result === "teamA"),
      teamB: sideFromMarket(sides[1], result === "teamB"),
    });
  }

  return games;
}

function buildKalshiTeamSignals(games: KalshiGame[]): Map<string, TeamMatchSignal[]> {
  const map = new Map<string, TeamMatchSignal[]>();

  for (const game of games) {
    addTeamSignal(map, game, game.teamA, game.teamB);
    addTeamSignal(map, game, game.teamB, game.teamA);
  }

  return map;
}

function addTeamSignal(
  map: Map<string, TeamMatchSignal[]>,
  game: KalshiGame,
  side: KalshiGameSide,
  opponent: KalshiGameSide,
): void {
  const team = normalizeTeamName(side.name);
  const signals = map.get(team) ?? [];

  let result: TeamMatchSignal["result"] = null;
  if (game.status === "finalized") {
    if (game.result === "draw") result = "draw";
    else result = side.won ? "win" : "loss";
  }

  signals.push({
    opponent: normalizeTeamName(opponent.name),
    date: game.date,
    winProbability: side.probability,
    volume: side.volume,
    result,
  });

  map.set(team, signals);
}

function sideFromMarket(market: KalshiMarket, won: boolean): KalshiGameSide {
  const code = market.ticker.split("-").pop() ?? "";
  return {
    code,
    name: market.yes_sub_title ?? market.subtitle ?? code,
    probability:
      market.status === "finalized"
        ? market.result === "yes"
          ? 1
          : 0
        : clampProbability(Number(market.last_price_dollars)),
    volume: Number(market.volume_fp) || 0,
    won,
  };
}

function resultFromMarkets(
  sideA: KalshiMarket,
  sideB: KalshiMarket,
  tieMarket: KalshiMarket | undefined,
): KalshiGame["result"] {
  const aWon = sideA.status === "finalized" && sideA.result === "yes";
  const bWon = sideB.status === "finalized" && sideB.result === "yes";

  if (aWon && !bWon) return "teamA";
  if (bWon && !aWon) return "teamB";
  if (tieMarket?.status === "finalized" && tieMarket.result === "yes") return "draw";
  return null;
}

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
