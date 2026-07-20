/**
 * Capture forecast price history (Step 2, Phase 1 of the archive plan).
 *
 * The 1a freeze kept only the final, resolved crowd read (Spain = 1.0,
 * everyone else = 0.0) — vacuous for a retrospective. This script
 * recovers what the crowd believed *over time*: the daily price history
 * of the Polymarket tournament-winner market for every team, frozen to
 * src/data/frozen/forecast-history.json.
 *
 * Scope discipline: winner market only. Per-match market history was
 * considered and rejected — delisted markets, marginal value.
 *
 * Failure rule: zero teams captured -> write nothing, exit 1. Partial
 * coverage -> freeze what we have and warn loudly (an honest archive
 * states its gaps). Prices are never fabricated.
 *
 * Usage: bun run capture:forecast-history
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { FORECAST_GROUPS, normalizeTeamName } from "../src/lib/forecast/teams";
import type { ForecastHistory, TeamHistory } from "../src/lib/retrospective-types";

const GAMMA_EVENT_URL = "https://gamma-api.polymarket.com/events/30615";
const CLOB_HISTORY_URL = "https://clob.polymarket.com/prices-history";
const USER_AGENT = "WorldCupHub/1.0 (archive history capture)";
const TIMEOUT_MS = 10_000;

// A little before kickoff (2026-06-11) so the pre-tournament read is kept.
const WINDOW_START = "2026-06-01T00:00:00.000Z";
const FIDELITY_MINUTES = 1440; // daily

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "frozen");

// --- Boundary validation: the gamma/CLOB payloads are untrusted. ---

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/** Extract team name + Yes-token id per market, dropping anything malformed. */
function tokensFromGamma(payload: unknown): Map<string, string> {
  const tokens = new Map<string, string>();
  if (!isRecord(payload) || !Array.isArray(payload.markets)) return tokens;

  for (const market of payload.markets) {
    if (!isRecord(market)) continue;
    const team = normalizeTeamName(
      typeof market.groupItemTitle === "string" ? market.groupItemTitle : "",
    );
    if (!team || team.startsWith("Team ") || team === "Other") continue;

    try {
      const ids = JSON.parse(typeof market.clobTokenIds === "string" ? market.clobTokenIds : "");
      const token = Array.isArray(ids) ? ids[0] : null;
      if (typeof token === "string" && token.length > 0) tokens.set(team, token);
    } catch {
      // Malformed clobTokenIds — drop the market, keep going.
    }
  }
  return tokens;
}

interface RawHistoryPoint {
  t: number;
  p: number;
}

/** Returns daily points sorted by date, or null when the fetch/parse fails. */
async function fetchTeamHistory(team: string, token: string): Promise<TeamHistory | null> {
  // The CLOB rejects long startTs/endTs ranges; interval=max returns the
  // market's full history at daily fidelity, and we filter to the window.
  const url = `${CLOB_HISTORY_URL}?market=${token}&interval=max&fidelity=${FIDELITY_MINUTES}`;

  let payload: unknown;
  try {
    const res = await fetch(url, {
      headers: { Accept: "application/json", "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.warn("[history] CLOB HTTP", res.status, "for", team);
      return null;
    }
    payload = await res.json();
  } catch (err) {
    console.warn("[history] fetch failed for", team, err instanceof Error ? err.message : err);
    return null;
  }

  if (!isRecord(payload) || !Array.isArray(payload.history)) {
    console.warn("[history] unexpected payload shape for", team);
    return null;
  }

  // One point per UTC date; last write wins. Drop out-of-range prices and
  // anything before the tournament window (these markets opened in 2025).
  const windowStartDate = WINDOW_START.slice(0, 10);
  const byDate = new Map<string, number>();
  for (const point of payload.history as RawHistoryPoint[]) {
    if (!isRecord(point)) continue;
    const { t, p } = point;
    if (typeof t !== "number" || typeof p !== "number") continue;
    if (p < 0 || p > 1) continue;
    const date = new Date(t * 1000).toISOString().slice(0, 10);
    if (date < windowStartDate) continue;
    byDate.set(date, p);
  }

  const points = [...byDate.entries()]
    .map(([date, probability]) => ({ date, probability }))
    .sort((a, b) => a.date.localeCompare(b.date));

  if (points.length === 0) return null;
  return { team, points };
}

async function main() {
  const res = await fetch(GAMMA_EVENT_URL, {
    headers: { Accept: "application/json", "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    console.error("[history] FATAL: gamma event fetch failed, HTTP", res.status);
    process.exit(1);
  }
  const tokens = tokensFromGamma(await res.json());

  const expectedTeams = new Set(FORECAST_GROUPS.flatMap((g) => g.teams));
  const captured: TeamHistory[] = [];
  const missing: string[] = [];

  for (const team of expectedTeams) {
    const token = tokens.get(team);
    if (!token) {
      missing.push(team);
      continue;
    }
    const history = await fetchTeamHistory(team, token);
    if (history) captured.push(history);
    else missing.push(team);
  }

  if (captured.length === 0) {
    console.error(
      "[history] FATAL: no team histories captured. Nothing frozen. " +
        "Ship the reduced retrospective page (guide Step 2 fallback).",
    );
    process.exit(1);
  }

  const history: ForecastHistory = {
    windowStart: WINDOW_START,
    windowEnd: new Date().toISOString(),
    fidelityMinutes: FIDELITY_MINUTES,
    teams: captured.sort((a, b) => a.team.localeCompare(b.team)),
  };

  await mkdir(OUT_DIR, { recursive: true });
  const path = join(OUT_DIR, "forecast-history.json");
  const envelope = {
    capturedAt: new Date().toISOString(),
    note: "Forecast price history archive",
    snapshot: history,
  };
  await writeFile(path, JSON.stringify(envelope, null, 2) + "\n");

  console.log(`[history] -> ${path}`);
  console.log(`          ${captured.length}/${expectedTeams.size} teams captured`);
  for (const t of captured.slice(0, 3)) {
    console.log(
      `          e.g. ${t.team}: ${t.points.length} points, ${t.points[0].date} -> ${t.points[t.points.length - 1].date}`,
    );
  }
  if (missing.length > 0) {
    console.warn(`[history] WARNING: ${missing.length} teams missing: ${missing.join(", ")}`);
  }
}

await main();
