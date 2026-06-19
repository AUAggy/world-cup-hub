import { parsePolymarketEvent, type PolymarketEvent } from "./schema";

const POLYMARKET_EVENT_URL = "https://gamma-api.polymarket.com/events/30615";
const TIMEOUT_MS = 8_000;
const USER_AGENT = "WorldCupHub/1.0 (public market signal)";

export type PolymarketFetchResult =
  | { ok: true; event: PolymarketEvent }
  | { ok: false; message: string; status?: number };

export async function fetchPolymarketEvent(): Promise<PolymarketFetchResult> {
  try {
    const res = await fetch(POLYMARKET_EVENT_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (!res.ok) {
      return { ok: false, status: res.status, message: `Polymarket HTTP ${res.status}` };
    }

    const parsed = parsePolymarketEvent(await res.json());
    if (!parsed) return { ok: false, message: "Polymarket payload failed validation" };

    return { ok: true, event: parsed };
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "unknown Polymarket fetch error",
    };
  }
}
