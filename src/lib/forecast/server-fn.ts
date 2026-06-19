import { createServerFn } from "@tanstack/react-start";
import type { ForecastSnapshot, ForecastSourceStatus } from "../forecast-types";
import { getCached, getDurableCached, setCached, setDurableCached } from "./cache";
import { fetchKalshiMarkets } from "./kalshi-fetch";
import { fetchPolymarketEvent } from "./polymarket-fetch";
import type { KalshiMarket, PolymarketEvent } from "./schema";
import { assembleForecastSnapshot, FORECAST_TTL_SECONDS } from "./transform";

const SNAPSHOT_CACHE_KEY = "forecast-snapshot-v1";
const POLY_LAST_CONFIRMED_KEY = "forecast-polymarket-last-confirmed-v1";
const KALSHI_LAST_CONFIRMED_KEY = "forecast-kalshi-last-confirmed-v1";
const CACHE_TTL_MS = FORECAST_TTL_SECONDS * 1000;
const LAST_CONFIRMED_TTL_MS = 24 * 60 * 60 * 1000;
const KALSHI_BACKGROUND_REFRESH_AFTER_MS = 5 * 60 * 1000;

interface Stored<T> {
  data: T;
  updatedAt: string;
}

let inflight: Promise<ForecastSnapshot> | null = null;

export const getForecast = createServerFn({ method: "GET" }).handler(
  async (): Promise<ForecastSnapshot> => {
    const cached = getCached<ForecastSnapshot>(SNAPSHOT_CACHE_KEY);
    if (cached) return cached;

    inflight ??= refreshForecast().finally(() => {
      inflight = null;
    });

    return inflight;
  },
);

async function refreshForecast(): Promise<ForecastSnapshot> {
  const [polymarket, kalshi] = await Promise.all([resolvePolymarket(), resolveKalshi()]);
  const snapshot = assembleForecastSnapshot({
    polymarket: polymarket.event,
    kalshiMarkets: kalshi.markets,
    statuses: {
      polymarket: polymarket.status,
      kalshi: kalshi.status,
    },
  });

  setCached(SNAPSHOT_CACHE_KEY, snapshot, CACHE_TTL_MS);
  return snapshot;
}

async function resolvePolymarket(): Promise<{
  event: PolymarketEvent | null;
  status: ForecastSourceStatus;
}> {
  const result = await fetchPolymarketEvent();
  if (result.ok) {
    const updatedAt = new Date().toISOString();
    setCached<Stored<PolymarketEvent>>(
      POLY_LAST_CONFIRMED_KEY,
      { data: result.event, updatedAt },
      LAST_CONFIRMED_TTL_MS,
    );
    return { event: result.event, status: { status: "live", updatedAt } };
  }

  console.warn("[forecast] Polymarket fetch failed", result.status ?? "network", result.message);
  const cached = getCached<Stored<PolymarketEvent>>(POLY_LAST_CONFIRMED_KEY);
  if (cached) {
    return {
      event: cached.data,
      status: {
        status: "cached",
        updatedAt: cached.updatedAt,
        message: "Polymarket is delayed; showing last confirmed data.",
      },
    };
  }

  return {
    event: null,
    status: {
      status: "unavailable",
      updatedAt: null,
      message: "Polymarket is unavailable.",
    },
  };
}

async function resolveKalshi(): Promise<{
  markets: KalshiMarket[];
  status: ForecastSourceStatus;
}> {
  const cached = await getDurableCached<Stored<KalshiMarket[]>>(KALSHI_LAST_CONFIRMED_KEY);
  if (cached && cached.data.length > 0) {
    maybeRefreshKalshiInBackground(cached.updatedAt);
    return {
      markets: cached.data,
      status: {
        status: "cached",
        updatedAt: cached.updatedAt,
        message: "Kalshi is delayed; showing last confirmed data.",
      },
    };
  }

  return fetchAndStoreKalshi();
}

async function fetchAndStoreKalshi(): Promise<{
  markets: KalshiMarket[];
  status: ForecastSourceStatus;
}> {
  const result = await fetchKalshiMarkets();
  if (result.ok && result.markets.length > 0) {
    const updatedAt = new Date().toISOString();
    if (!result.partial) {
      await setDurableCached<Stored<KalshiMarket[]>>(
        KALSHI_LAST_CONFIRMED_KEY,
        { data: result.markets, updatedAt },
        LAST_CONFIRMED_TTL_MS,
      );
    }
    return {
      markets: result.markets,
      status: {
        status: "live",
        updatedAt,
        message: result.partial ? result.message : undefined,
      },
    };
  }

  if (result.ok) {
    console.warn("[forecast] Kalshi returned no markets");
    return {
      markets: [],
      status: {
        status: "unavailable",
        updatedAt: null,
        message: "Kalshi returned no markets.",
      },
    };
  }

  console.warn("[forecast] Kalshi fetch failed", result.status ?? "network", result.message);
  return {
    markets: [],
    status: {
      status: "unavailable",
      updatedAt: null,
      message: result.rateLimited ? "Kalshi is rate-limited." : "Kalshi is unavailable.",
    },
  };
}

function maybeRefreshKalshiInBackground(updatedAt: string): void {
  const ageMs = Date.now() - new Date(updatedAt).getTime();
  if (Number.isFinite(ageMs) && ageMs < KALSHI_BACKGROUND_REFRESH_AFTER_MS) return;

  void fetchAndStoreKalshi().catch((error) => {
    console.warn(
      "[forecast] Kalshi background refresh failed",
      error instanceof Error ? error.message : error,
    );
  });
}
