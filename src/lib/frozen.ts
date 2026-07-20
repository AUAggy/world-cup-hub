/**
 * Frozen final snapshots (Step 1b of the archive plan). Server-only:
 * importing this module inlines ~250KB of JSON, so only server functions
 * may import it. Client code uses archive-mode.ts instead.
 *
 * The casts are backed by tests/frozen/frozen-snapshots.test.ts, which
 * structurally validates both files against the DTO shapes. That test is
 * the boundary check; the casts are safe as long as it passes.
 */

import type { WorldCupSnapshot } from "./worldcup-types";
import type { ForecastSnapshot } from "./forecast-types";
import worldcupEnvelope from "../data/frozen/worldcup-snapshot.json";
import forecastEnvelope from "../data/frozen/forecast-snapshot.json";

export const frozenWorldCupSnapshot = worldcupEnvelope.snapshot as WorldCupSnapshot;
export const frozenForecastSnapshot = forecastEnvelope.snapshot as ForecastSnapshot;
