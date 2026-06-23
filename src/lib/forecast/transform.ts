import type {
  ForecastSnapshot,
  ForecastSourceStatus,
  GroupForecast,
  MarketMover,
  TeamForecast,
  TeamMatchSignal,
} from "../forecast-types";
import type { PolymarketEvent, PolymarketMarket } from "./schema";
import { FORECAST_GROUPS, normalizeTeamName } from "./teams";

export const FORECAST_TTL_SECONDS = 120;
export const MOVER_THRESHOLD = 0.005;

interface ProviderStatuses {
  polymarket: ForecastSourceStatus;
  matchMarkets: ForecastSourceStatus;
}

interface PolySignal {
  probability: number;
  movement24h: number | null;
  volume24h: number;
  totalVolume: number;
}

export function assembleForecastSnapshot(input: {
  polymarket: PolymarketEvent | null;
  polymarketMatchEvents: PolymarketEvent[];
  statuses: ProviderStatuses;
  now?: Date;
}): ForecastSnapshot {
  const fetchedAt = (input.now ?? new Date()).toISOString();
  const polyMap = buildPolymarketMap(input.polymarket);
  const matchSignalMap = buildPolymarketMatchTeamSignals(input.polymarketMatchEvents);

  const teamForecasts: TeamForecast[] = FORECAST_GROUPS.flatMap((group) =>
    group.teams.map((team) => {
      const poly = polyMap.get(team);
      const matchSignals = matchSignalMap.get(team) ?? [];
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

function buildPolymarketMatchTeamSignals(
  events: PolymarketEvent[],
): Map<string, TeamMatchSignal[]> {
  const map = new Map<string, TeamMatchSignal[]>();

  for (const event of events) {
    const sides = parseMatchTitle(event.title);
    const date = dateFromPolymarketMatchSlug(event.slug);
    if (!sides || !date) continue;

    const teamMarkets = event.markets.filter((market) => !isDrawMarket(market));
    for (const market of teamMarkets) {
      const team = normalizeTeamName(market.groupItemTitle);
      if (!team) continue;

      const opponent = otherSide(team, sides, teamMarkets);
      if (!opponent) continue;

      const signals = map.get(team) ?? [];
      signals.push({
        opponent,
        date,
        winProbability: parsePolymarketProbability(market),
        volume: market.volumeNum,
        result: null,
      });
      map.set(team, signals);
    }
  }

  return map;
}

function parseMatchTitle(title: string): [string, string] | null {
  const parts = title.split(/\s+vs\.?\s+/i).map((part) => normalizeTeamName(part));
  return parts.length === 2 && parts[0] && parts[1] ? [parts[0], parts[1]] : null;
}

function dateFromPolymarketMatchSlug(slug: string): string | null {
  return slug.match(/-(2026-\d{2}-\d{2})$/)?.[1] ?? null;
}

function isDrawMarket(market: PolymarketMarket): boolean {
  return market.groupItemTitle.toLowerCase().startsWith("draw");
}

function otherSide(
  team: string,
  sides: [string, string],
  markets: PolymarketMarket[],
): string | null {
  if (sides[0] === team) return sides[1];
  if (sides[1] === team) return sides[0];

  const marketOpponent = markets
    .map((market) => normalizeTeamName(market.groupItemTitle))
    .find((candidate) => candidate && candidate !== team);
  return marketOpponent ?? null;
}

function clampProbability(value: number): number {
  if (!Number.isFinite(value)) return 0;
  if (value < 0) return 0;
  if (value > 1) return 1;
  return value;
}
