/**
 * Build the Forecast vs. Reality retrospective (Step 2, Phase 2).
 *
 * Thin I/O wrapper: reads the three frozen archives, calls the pure
 * builder in src/lib/retrospective.ts, writes
 * src/data/frozen/retrospective.json. The UI renders that file statically.
 *
 * Usage: bun run build:retrospective
 */

import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import type { WorldCupSnapshot } from "../src/lib/worldcup-types";
import type { ForecastSnapshot } from "../src/lib/forecast-types";
import type { ForecastHistory } from "../src/lib/retrospective-types";
import { buildRetrospective } from "../src/lib/retrospective";
import worldcupEnvelope from "../src/data/frozen/worldcup-snapshot.json";
import forecastEnvelope from "../src/data/frozen/forecast-snapshot.json";
import historyEnvelope from "../src/data/frozen/forecast-history.json";

const OUT_PATH = join(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "src",
  "data",
  "frozen",
  "retrospective.json",
);

// The casts are backed by tests/frozen — those suites are the boundary
// check for every file in src/data/frozen/.
const retrospective = buildRetrospective({
  worldcup: worldcupEnvelope.snapshot as WorldCupSnapshot,
  forecast: forecastEnvelope.snapshot as ForecastSnapshot,
  history: historyEnvelope.snapshot as ForecastHistory,
  historyCapturedAt: historyEnvelope.capturedAt,
});

await writeFile(OUT_PATH, JSON.stringify(retrospective, null, 2) + "\n");

console.log(`[retrospective] -> ${OUT_PATH}`);
console.log(`  champion: ${retrospective.champion} (${retrospective.finalResult})`);
for (const read of retrospective.roundEveReads) {
  const fav = read.favorite
    ? `${read.favorite.team} ${(read.favorite.probability * 100).toFixed(1)}%`
    : "n/a";
  const champ =
    read.championProbability !== null ? `${(read.championProbability * 100).toFixed(1)}%` : "n/a";
  console.log(`  eve of ${read.label}: crowd favorite ${fav} | ${retrospective.champion} ${champ}`);
}
const { home, away } = retrospective.finalRead;
console.log(
  `  eve of final: ${home.team} ${home.probability !== null ? (home.probability * 100).toFixed(1) + "%" : "n/a"}` +
    ` vs ${away.team} ${away.probability !== null ? (away.probability * 100).toFixed(1) + "%" : "n/a"}`,
);
console.log(`  biggest swing: ${retrospective.biggestSwings[0]?.team ?? "n/a"}`);
