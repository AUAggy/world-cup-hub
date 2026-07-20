/**
 * Capture the final archive snapshots (Step 1a of the archive plan).
 *
 * Runs the exact production pipeline — fetch → validate → transform →
 * assemble — and writes the results to `src/data/frozen/*.json` so the
 * app can later serve them with zero upstream calls (Step 1b).
 *
 * Failure rule (decided in docs/archive-implementation-guide.md):
 *   - ESPN yields no valid matches → fatal, exit 1, nothing written.
 *     A frozen empty shell is worthless.
 *   - Polymarket fully unreachable → non-fatal. The forecast file is
 *     still written with `unavailable` statuses; that is an honest
 *     archive state. Probabilities are never fabricated.
 *
 * Usage: bun run capture:snapshots
 */

import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { Match } from "../src/lib/worldcup-types";
import type { ForecastSourceStatus } from "../src/lib/forecast-types";
import { fetchEspnRange } from "../src/lib/worldcup/espn-fetch";
import { eventsFromPayload, isValidEspnResponse } from "../src/lib/worldcup/espn-schema";
import { toMatches } from "../src/lib/worldcup/transform";
import { assembleSnapshot } from "../src/lib/worldcup/snapshot";
import {
  fetchPolymarketEvent,
  fetchPolymarketMatchEvents,
} from "../src/lib/forecast/polymarket-fetch";
import { assembleForecastSnapshot } from "../src/lib/forecast/transform";

// Same ranges as src/lib/worldcup/server-fn.ts — keep in sync.
const ESPN_RANGES = ["20260611-20260628", "20260628-20260720"];

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "src", "data", "frozen");
const NOTE = "Final archive snapshot";

interface FrozenEnvelope<T> {
  capturedAt: string;
  note: string;
  snapshot: T;
}

async function writeEnvelope<T>(filename: string, snapshot: T): Promise<string> {
  const envelope: FrozenEnvelope<T> = {
    capturedAt: new Date().toISOString(),
    note: NOTE,
    snapshot,
  };
  const path = join(OUT_DIR, filename);
  await writeFile(path, JSON.stringify(envelope, null, 2) + "\n");
  return path;
}

/** Returns the assembled snapshot, or null when ESPN gave us nothing real. */
async function captureWorldCup() {
  let hasValidPayload = false;
  const allMatches: Match[] = [];

  for (const range of ESPN_RANGES) {
    const result = await fetchEspnRange(range);
    if (!result.ok) {
      console.warn(
        "[capture] ESPN fetch failed",
        range,
        result.status ?? "network",
        result.message,
      );
      continue;
    }
    if (!isValidEspnResponse(result.data)) {
      console.warn("[capture] ESPN payload failed validation", range);
      continue;
    }
    allMatches.push(...toMatches(eventsFromPayload(result.data)));
    hasValidPayload = true;
  }

  const seen = new Map<string, Match>();
  for (const match of allMatches) seen.set(match.id, match);
  const deduped = [...seen.values()].sort((a, b) => a.date.localeCompare(b.date));

  // Empty-but-valid is still worthless for an archive: treat it as failure.
  if (!hasValidPayload || deduped.length === 0) return null;
  return assembleSnapshot(deduped, hasValidPayload);
}

function statusFrom(ok: boolean, message: string): ForecastSourceStatus {
  return ok
    ? { status: "live", updatedAt: new Date().toISOString() }
    : { status: "unavailable", updatedAt: null, message };
}

async function captureForecast() {
  const [tournament, matches] = await Promise.all([
    fetchPolymarketEvent(),
    fetchPolymarketMatchEvents(),
  ]);

  const statuses = {
    polymarket: statusFrom(tournament.ok, "Tournament markets were unavailable at capture time."),
    matchMarkets: statusFrom(matches.ok, "Match markets were unavailable at capture time."),
  };

  const snapshot = assembleForecastSnapshot({
    polymarket: tournament.ok ? tournament.event : null,
    polymarketMatchEvents: matches.ok ? matches.events : [],
    statuses,
  });

  return { snapshot, fullyUnavailable: !tournament.ok && !matches.ok };
}

async function main() {
  await mkdir(OUT_DIR, { recursive: true });

  const worldcup = await captureWorldCup();
  if (!worldcup) {
    console.error(
      "[capture] FATAL: ESPN returned no valid matches. " +
        "Nothing frozen. See guide Step 1a: hand-author results from a trusted record instead.",
    );
    process.exit(1);
  }
  const worldcupPath = await writeEnvelope("worldcup-snapshot.json", worldcup);

  const { snapshot: forecast, fullyUnavailable } = await captureForecast();
  const forecastPath = await writeEnvelope("forecast-snapshot.json", forecast);

  console.log(`[capture] worldcup  -> ${worldcupPath}`);
  console.log(`          ${worldcup.matches.length} matches, source: ${worldcup.source}`);
  console.log(`[capture] forecast  -> ${forecastPath}`);
  console.log(
    `          ${forecast.topTournamentSignals.length} tournament signals, ` +
      `${forecast.movers.length} movers, ` +
      `tournament: ${forecast.sourceStatus.polymarket.status}, ` +
      `matches: ${forecast.sourceStatus.matchMarkets.status}`,
  );

  if (fullyUnavailable) {
    console.warn(
      "[capture] WARNING: Polymarket was fully unreachable. Forecast file written with " +
        "`unavailable` statuses. The archive is honest; the crowd read was not preserved.",
    );
  } else if (forecast.topTournamentSignals.length === 0) {
    console.warn(
      "[capture] WARNING: forecast captured but contains no tournament signals. " +
        "Inspect the file before freezing it.",
    );
  }
}

await main();
