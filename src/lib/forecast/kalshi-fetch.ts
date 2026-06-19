import { parseKalshiPayload, type KalshiMarket } from "./schema";

const KALSHI_BASE = "https://api.elections.kalshi.com/trade-api/v2";
const SERIES_TICKER = "KXWCGAME";
const TIMEOUT_MS = 8_000;
const USER_AGENT = "WorldCupHub/1.0 (public market signal)";

let backoffUntil = 0;

export type KalshiFetchResult =
  | { ok: true; markets: KalshiMarket[] }
  | { ok: false; markets: []; message: string; status?: number; rateLimited: boolean };

export async function fetchKalshiMarkets(): Promise<KalshiFetchResult> {
  if (Date.now() < backoffUntil) {
    return {
      ok: false,
      markets: [],
      message: "Kalshi rate-limit backoff active",
      rateLimited: true,
    };
  }

  const markets: KalshiMarket[] = [];

  for (const status of ["open", "settled"] as const) {
    let cursor: string | undefined;
    do {
      const result = await fetchKalshiPage(status, cursor);
      if (!result.ok) return result;
      markets.push(...result.markets);
      cursor = result.cursor;
    } while (cursor);
  }

  return { ok: true, markets };
}

type KalshiPageResult =
  | { ok: true; markets: KalshiMarket[]; cursor?: string }
  | { ok: false; markets: []; message: string; status?: number; rateLimited: boolean };

async function fetchKalshiPage(
  status: "open" | "settled",
  cursor?: string,
): Promise<KalshiPageResult> {
  const url = new URL(`${KALSHI_BASE}/markets`);
  url.searchParams.set("series_ticker", SERIES_TICKER);
  url.searchParams.set("limit", "500");
  url.searchParams.set("status", status);
  if (cursor) url.searchParams.set("cursor", cursor);

  try {
    const res = await fetch(url, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      if (res.status === 429) setKalshiBackoff(res);
      return {
        ok: false,
        markets: [],
        status: res.status,
        rateLimited: res.status === 429,
        message: `Kalshi HTTP ${res.status}`,
      };
    }

    const parsed = parseKalshiPayload(await res.json());
    if (!parsed) {
      return {
        ok: false,
        markets: [],
        rateLimited: false,
        message: "Kalshi payload failed validation",
      };
    }

    return { ok: true, markets: parsed.markets, cursor: parsed.cursor };
  } catch (error) {
    return {
      ok: false,
      markets: [],
      rateLimited: false,
      message: error instanceof Error ? error.message : "unknown Kalshi fetch error",
    };
  }
}

function setKalshiBackoff(res: Response): void {
  const retryAfterSeconds = Number(res.headers.get("retry-after"));
  const retryAfterMs = Number.isFinite(retryAfterSeconds) ? retryAfterSeconds * 1000 : 5 * 60_000;
  backoffUntil = Date.now() + retryAfterMs;
}
