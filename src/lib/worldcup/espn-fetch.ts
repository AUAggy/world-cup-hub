/**
 * ESPN scoreboard HTTP retrieval.
 *
 * Pure I/O boundary — the only module that touches the network.
 * Returns raw untyped JSON. Validation happens in espn-schema.ts.
 */

const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard";

const ESPN_TIMEOUT_MS = 8_000;
const ESPN_RETRY_MAX = 1; // one retry = at most 2 attempts total
const ESPN_RETRY_DELAY_MS = 500;

const USER_AGENT = "WCH-Dashboard/1.0 (public scoreboard aggregator)";

export interface EspnFetchResult {
  ok: true;
  data: unknown;
}

export interface EspnFetchError {
  ok: false;
  range: string;
  status?: number;
  message: string;
}

export async function fetchEspnRange(range: string): Promise<EspnFetchResult | EspnFetchError> {
  let last: EspnFetchError | null = null;
  const maxAttempts = 1 + ESPN_RETRY_MAX;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const url = `${ESPN_BASE}?dates=${range}&limit=100`;
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        signal: AbortSignal.timeout(ESPN_TIMEOUT_MS),
      });

      if (!res.ok) {
        last = {
          ok: false,
          range,
          status: res.status,
          message: `ESPN ${range} HTTP ${res.status}`,
        };
        if (attempt < maxAttempts) {
          await sleep(ESPN_RETRY_DELAY_MS);
        }
        continue;
      }

      const data = await res.json();
      return { ok: true, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown fetch error";
      last = { ok: false, range, message };

      // Don't retry on timeout or abort — the upstream is too slow.
      if (message.includes("timed out") || message.includes("abort")) break;
      if (attempt < maxAttempts) {
        await sleep(ESPN_RETRY_DELAY_MS);
      }
    }
  }

  return last!;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
