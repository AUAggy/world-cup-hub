/**
 * TanStack Start server function: getWorldCup.
 *
 * Orchestrates fetch → validate → transform → assemble → cache.
 */

import { createServerFn } from "@tanstack/react-start";
import type { Match, WorldCupSnapshot } from "../worldcup-types";
import { ARCHIVE_MODE } from "../archive-mode";
import { frozenWorldCupSnapshot } from "../frozen";
import { fetchEspnRange } from "./espn-fetch";
import { eventsFromPayload, isValidEspnResponse } from "./espn-schema";
import { toMatches } from "./transform";
import { assembleSnapshot } from "./snapshot";
import { getCachedSnapshot, setCachedSnapshot } from "./cache";

const ESPN_RANGES = ["20260611-20260628", "20260628-20260720"];

let inflight: Promise<WorldCupSnapshot> | null = null;

export const getWorldCup = createServerFn({ method: "GET" }).handler(
  async (): Promise<WorldCupSnapshot> => {
    if (ARCHIVE_MODE) return frozenWorldCupSnapshot;

    const cached = getCachedSnapshot();
    if (cached) return cached;

    inflight ??= refreshSnapshot().finally(() => {
      inflight = null;
    });

    return inflight;
  },
);

async function refreshSnapshot(): Promise<WorldCupSnapshot> {
  let hasValidPayload = false;
  const allMatches: Match[] = [];

  for (const range of ESPN_RANGES) {
    const result = await fetchEspnRange(range);
    if (!result.ok) {
      console.warn(
        "[worldcup] fetch failed",
        result.range,
        result.status ?? "network",
        result.message,
      );
      continue;
    }

    if (!isValidEspnResponse(result.data)) {
      console.warn("[worldcup] invalid ESPN payload", range);
      continue;
    }

    allMatches.push(...toMatches(eventsFromPayload(result.data)));
    hasValidPayload = true;
  }

  const seen = new Map<string, Match>();
  for (const match of allMatches) seen.set(match.id, match);

  const deduped = [...seen.values()].sort((a, b) => a.date.localeCompare(b.date));
  const snapshot = assembleSnapshot(deduped, hasValidPayload);

  if (snapshot.source === "fallback") {
    const stale = getCachedSnapshot();
    if (stale) return stale;
  }

  setCachedSnapshot(snapshot);
  return snapshot;
}
