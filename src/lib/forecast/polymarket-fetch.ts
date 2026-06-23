import { parsePolymarketEvent, type PolymarketEvent } from "./schema";

const POLYMARKET_EVENT_URL = "https://gamma-api.polymarket.com/events/30615";
const POLYMARKET_EVENTS_URL = "https://gamma-api.polymarket.com/events";
const WORLD_CUP_TAG_SLUG = "fifa-world-cup";
const PAGE_SIZE = 100;
const MAX_MATCH_EVENT_PAGES = 6;
const TIMEOUT_MS = 8_000;
const USER_AGENT = "WorldCupHub/1.0 (public market signal)";
const PRIMARY_MATCH_SLUG = /^fifwc-[a-z0-9]+-[a-z0-9]+-2026-\d{2}-\d{2}$/;

export type PolymarketFetchResult =
  | { ok: true; event: PolymarketEvent }
  | { ok: false; message: string; status?: number };

export type PolymarketMatchFetchResult =
  | { ok: true; events: PolymarketEvent[] }
  | { ok: false; events: []; message: string; status?: number };

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

export async function fetchPolymarketMatchEvents(): Promise<PolymarketMatchFetchResult> {
  try {
    const events: PolymarketEvent[] = [];

    for (let page = 0; page < MAX_MATCH_EVENT_PAGES; page++) {
      const url = new URL(POLYMARKET_EVENTS_URL);
      url.searchParams.set("limit", String(PAGE_SIZE));
      url.searchParams.set("offset", String(page * PAGE_SIZE));
      url.searchParams.set("active", "true");
      url.searchParams.set("closed", "false");
      url.searchParams.set("tag_slug", WORLD_CUP_TAG_SLUG);

      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": USER_AGENT,
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });

      if (!res.ok) {
        return {
          ok: false,
          events: [],
          status: res.status,
          message: `Polymarket match events HTTP ${res.status}`,
        };
      }

      const payload = await res.json();
      if (!Array.isArray(payload)) {
        return { ok: false, events: [], message: "Polymarket match events failed validation" };
      }

      events.push(
        ...payload.flatMap((event) => {
          const parsed = parsePolymarketEvent(event);
          return parsed && PRIMARY_MATCH_SLUG.test(parsed.slug) ? [parsed] : [];
        }),
      );

      if (payload.length < PAGE_SIZE) break;
    }

    return { ok: true, events };
  } catch (error) {
    return {
      ok: false,
      events: [],
      message: error instanceof Error ? error.message : "unknown Polymarket match fetch error",
    };
  }
}
