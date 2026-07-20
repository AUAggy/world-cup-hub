/**
 * Boundary check for the frozen archive snapshots (Step 1b).
 *
 * src/lib/frozen.ts casts the frozen JSON to the app DTOs; this test is
 * what makes those casts honest. If the frozen files are ever regenerated
 * or hand-edited, this suite must pass before they are trusted.
 */

import { describe, expect, test } from "bun:test";
import { ARCHIVE_CAPTURED_AT } from "../../src/lib/archive-mode";
import { ROUND_ORDER } from "../../src/lib/worldcup/snapshot";
import worldcupEnvelope from "../../src/data/frozen/worldcup-snapshot.json";
import forecastEnvelope from "../../src/data/frozen/forecast-snapshot.json";

const MATCH_STATUSES = new Set(["pre", "in", "post"]);
const SOURCE_STATUSES = new Set(["live", "cached", "unavailable"]);

// The 2026 tournament had 104 matches: 72 group + 32 knockout. The frozen
// artifact is final, so exact counts are the honest assertion.
const EXPECTED_MATCH_COUNT = 104;

describe("frozen worldcup snapshot", () => {
  const { snapshot } = worldcupEnvelope;

  test("envelope matches the displayed archive date", () => {
    expect(worldcupEnvelope.capturedAt).toBe(ARCHIVE_CAPTURED_AT);
    expect(worldcupEnvelope.note.length).toBeGreaterThan(0);
  });

  test("is a real ESPN snapshot, not a fallback shell", () => {
    expect(snapshot.source).toBe("espn");
    expect(snapshot.matches).toHaveLength(EXPECTED_MATCH_COUNT);
  });

  test("every match is structurally sound", () => {
    const ids = new Set<string>();
    for (const match of snapshot.matches) {
      expect(MATCH_STATUSES.has(match.status)).toBe(true);
      expect(match.id.length).toBeGreaterThan(0);
      expect(ids.has(match.id)).toBe(false);
      ids.add(match.id);
      expect(match.home.team.name.length).toBeGreaterThan(0);
      expect(match.away.team.name.length).toBeGreaterThan(0);
      // The tournament is over: nothing may be live or upcoming.
      expect(match.status).toBe("post");
      expect(match.home.score).not.toBeNull();
      expect(match.away.score).not.toBeNull();
    }
  });

  test("rounds cover every stage and contain every match", () => {
    expect(Object.keys(snapshot.rounds).sort()).toEqual([...ROUND_ORDER].sort());
    const inRounds = Object.values(snapshot.rounds).flat().length;
    expect(inRounds).toBe(EXPECTED_MATCH_COUNT);
    expect(snapshot.rounds["final"]).toHaveLength(1);
  });

  test("group archive is populated", () => {
    expect(snapshot.groups.length).toBeGreaterThan(0);
  });
});

describe("frozen forecast snapshot", () => {
  const { snapshot } = forecastEnvelope;

  test("source statuses are valid", () => {
    expect(SOURCE_STATUSES.has(snapshot.sourceStatus.polymarket.status)).toBe(true);
    expect(SOURCE_STATUSES.has(snapshot.sourceStatus.matchMarkets.status)).toBe(true);
  });

  test("team forecasts are populated with sane probabilities", () => {
    expect(snapshot.teamForecasts.length).toBeGreaterThan(0);
    for (const team of snapshot.teamForecasts) {
      const p = team.tournament.probability;
      if (p !== null) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    }
  });

  test("derived views are consistent with team forecasts", () => {
    for (const signal of snapshot.topTournamentSignals) {
      expect(signal.tournament.probability).not.toBeNull();
    }
    for (const group of snapshot.groupForecasts) {
      expect(group.teams.length).toBeGreaterThan(0);
    }
  });
});
