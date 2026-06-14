/**
 * Assemble a WorldCupSnapshot from parsed matches.
 *
 * Pure except for the Date.now() call in assembleSnapshot(), which is
 * an intentional timestamp for the `fetchedAt` field.
 */

import type { WorldCupSnapshot, RoundSlug, Match } from "../worldcup-types";
import { computeGroups } from "./standings";

export const ROUND_ORDER: RoundSlug[] = [
  "group-stage",
  "round-of-32",
  "round-of-16",
  "quarterfinals",
  "semifinals",
  "3rd-place-match",
  "final",
];

export const SNAPSHOT_TTL_SECONDS = 30 * 60; // 30 minutes

export function emptyRounds(): Record<RoundSlug, Match[]> {
  return ROUND_ORDER.reduce(
    (acc, r) => {
      acc[r] = [];
      return acc;
    },
    {} as Record<RoundSlug, Match[]>,
  );
}

/**
 * Produce a snapshot from parsed matches.
 *
 * When at least one date-range response is valid, the snapshot is
 * treated as ESPN-sourced. If every range fails validation or fetch,
 * the snapshot is a fallback shell.
 */
export function assembleSnapshot(matches: Match[], hasValidPayload: boolean): WorldCupSnapshot {
  const source = hasValidPayload ? "espn" : "fallback";

  const rounds = emptyRounds();
  for (const m of matches) rounds[m.round].push(m);

  return {
    fetchedAt: new Date().toISOString(),
    ttlSeconds: SNAPSHOT_TTL_SECONDS,
    source,
    matches,
    groups: computeGroups(matches),
    rounds,
  };
}

/**
 * An empty snapshot to serve when no data is available at all.
 */
export function emptySnapshot(): WorldCupSnapshot {
  return assembleSnapshot([], false);
}
