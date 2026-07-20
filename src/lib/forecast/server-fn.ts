import { createServerFn } from "@tanstack/react-start";
import type { ForecastSnapshot, ForecastSourceStatus } from "../forecast-types";
import { ARCHIVE_MODE } from "../archive-mode";
import { frozenForecastSnapshot } from "../frozen";
import { getCached, setCached } from "./cache";
import { fetchPolymarketEvent, fetchPolymarketMatchEvents } from "./polymarket-fetch";
import type { PolymarketEvent } from "./schema";
import { assembleForecastSnapshot, FORECAST_TTL_SECONDS } from "./transform";

const SNAPSHOT_CACHE_KEY = "forecast-snapshot-v2-polymarket-matches";
const POLY_TOURNAMENT_LAST_CONFIRMED_KEY = "forecast-polymarket-tournament-last-confirmed-v1";
const POLY_MATCH_LAST_CONFIRMED_KEY = "forecast-polymarket-matches-last-confirmed-v1";
const CACHE_TTL_MS = FORECAST_TTL_SECONDS * 1000;
const DEGRADED_SNAPSHOT_TTL_MS = 10 * 1000;
const LAST_CONFIRMED_TTL_MS = 24 * 60 * 60 * 1000;

interface Stored<T> {
  data: T;
  updatedAt: string;
}

let inflight: Promise<ForecastSnapshot> | null = null;

export const getForecast = createServerFn({ method: "GET" }).handler(
  async (): Promise<ForecastSnapshot> => {
    if (ARCHIVE_MODE) return frozenForecastSnapshot;

    const cached = getCached<ForecastSnapshot>(SNAPSHOT_CACHE_KEY);
    if (cached) return cached;

    inflight ??= refreshForecast().finally(() => {
      inflight = null;
    });

    return inflight;
  },
);

async function refreshForecast(): Promise<ForecastSnapshot> {
  const [tournament, matches] = await Promise.all([resolveTournament(), resolveMatchMarkets()]);
  const snapshot = assembleForecastSnapshot({
    polymarket: tournament.event,
    polymarketMatchEvents: matches.events,
    statuses: {
      polymarket: tournament.status,
      matchMarkets: matches.status,
    },
  });

  setCached(SNAPSHOT_CACHE_KEY, snapshot, snapshotCacheTtl(snapshot));
  return snapshot;
}

async function resolveTournament(): Promise<{
  event: PolymarketEvent | null;
  status: ForecastSourceStatus;
}> {
  const result = await fetchPolymarketEvent();
  if (result.ok) {
    const updatedAt = new Date().toISOString();
    setCached<Stored<PolymarketEvent>>(
      POLY_TOURNAMENT_LAST_CONFIRMED_KEY,
      { data: result.event, updatedAt },
      LAST_CONFIRMED_TTL_MS,
    );
    return { event: result.event, status: { status: "live", updatedAt } };
  }

  console.warn(
    "[forecast] Polymarket tournament fetch failed",
    result.status ?? "network",
    result.message,
  );
  const cached = getCached<Stored<PolymarketEvent>>(POLY_TOURNAMENT_LAST_CONFIRMED_KEY);
  if (cached) {
    return {
      event: cached.data,
      status: {
        status: "cached",
        updatedAt: cached.updatedAt,
        message: "Tournament markets are delayed; showing last confirmed data.",
      },
    };
  }

  return {
    event: null,
    status: {
      status: "unavailable",
      updatedAt: null,
      message: "Tournament markets are unavailable.",
    },
  };
}

async function resolveMatchMarkets(): Promise<{
  events: PolymarketEvent[];
  status: ForecastSourceStatus;
}> {
  const result = await fetchPolymarketMatchEvents();
  if (result.ok) {
    const updatedAt = new Date().toISOString();
    if (result.events.length > 0) {
      setCached<Stored<PolymarketEvent[]>>(
        POLY_MATCH_LAST_CONFIRMED_KEY,
        { data: result.events, updatedAt },
        LAST_CONFIRMED_TTL_MS,
      );
    }
    return {
      events: result.events,
      status: {
        status: "live",
        updatedAt,
        message:
          result.events.length === 0
            ? "No listed World Cup match markets are open yet."
            : undefined,
      },
    };
  }

  console.warn(
    "[forecast] Polymarket match fetch failed",
    result.status ?? "network",
    result.message,
  );
  const cached = getCached<Stored<PolymarketEvent[]>>(POLY_MATCH_LAST_CONFIRMED_KEY);
  if (cached) {
    return {
      events: cached.data,
      status: {
        status: "cached",
        updatedAt: cached.updatedAt,
        message: "Match markets are delayed; showing last confirmed data.",
      },
    };
  }

  return {
    events: [],
    status: {
      status: "unavailable",
      updatedAt: null,
      message: "Match markets are unavailable.",
    },
  };
}

function snapshotCacheTtl(snapshot: ForecastSnapshot): number {
  return snapshot.sourceStatus.matchMarkets.status === "live"
    ? CACHE_TTL_MS
    : DEGRADED_SNAPSHOT_TTL_MS;
}
