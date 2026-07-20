/**
 * Boundary checks for the forecast history freeze and the generated
 * retrospective artifact (Step 2). Both are rendered statically, so
 * structural soundness is checked here, at test time.
 */

import { describe, expect, test } from "bun:test";
import type { ForecastHistory, Retrospective } from "../../src/lib/retrospective-types";
import historyEnvelope from "../../src/data/frozen/forecast-history.json";
import retrospective from "../../src/data/frozen/retrospective.json";
import worldcupEnvelope from "../../src/data/frozen/worldcup-snapshot.json";

const history = historyEnvelope.snapshot as ForecastHistory;
const retro = retrospective as Retrospective;

describe("frozen forecast history", () => {
  test("covers the field and stays inside the window", () => {
    expect(history.teams.length).toBeGreaterThanOrEqual(48);
    const windowStart = history.windowStart.slice(0, 10);
    for (const team of history.teams) {
      expect(team.points.length).toBeGreaterThan(0);
      let previous = "";
      for (const point of team.points) {
        expect(point.date >= windowStart).toBe(true);
        expect(point.date > previous).toBe(true); // sorted, one per day
        previous = point.date;
        expect(point.probability).toBeGreaterThanOrEqual(0);
        expect(point.probability).toBeLessThanOrEqual(1);
      }
    }
  });

  test("champion and runner-up series run to the end of the window", () => {
    const spain = history.teams.find((t) => t.team === "Spain");
    const argentina = history.teams.find((t) => t.team === "Argentina");
    expect(spain?.points.at(-1)?.date).toBe("2026-07-20");
    expect(argentina?.points.at(-1)?.date).toBe("2026-07-20");
  });
});

describe("retrospective artifact", () => {
  test("agrees with the frozen worldcup snapshot on the champion", () => {
    const final = worldcupEnvelope.snapshot.rounds["final"][0];
    const winner = final.home.winner ? final.home.team.name : final.away.team.name;
    expect(retro.champion).toBe(winner);
    expect(retro.finalResult).toContain(winner);
  });

  test("has a full arc and a read for every knockout round", () => {
    expect(retro.championArc.length).toBeGreaterThan(0);
    expect(retro.roundEveReads.map((r) => r.round).sort()).toEqual(
      ["final", "quarterfinals", "round-of-16", "round-of-32", "semifinals"].sort(),
    );
    for (const read of retro.roundEveReads) {
      expect(read.favorite).not.toBeNull();
      expect(read.championProbability).not.toBeNull();
      expect(read.championRank).not.toBeNull();
      expect(read.top).toHaveLength(3);
      expect(read.aliveCount).toBeGreaterThan(0);
    }
  });

  test("race covers all eight quarterfinalists with labeled markers", () => {
    expect(retro.race.teams).toHaveLength(8);
    expect(retro.race.teams.filter((t) => t.isChampion)).toHaveLength(1);
    for (const team of retro.race.teams) {
      expect(team.points.length).toBeGreaterThan(0);
    }
    expect(retro.race.roundMarkers).toHaveLength(5);
  });

  test("crowd reads name fates for favorites and the unpriced runs", () => {
    expect(retro.crowdReads.earlyFavorites.length).toBeGreaterThan(0);
    expect(retro.crowdReads.unpricedRuns.length).toBeGreaterThan(0);
    for (const entry of [...retro.crowdReads.earlyFavorites, ...retro.crowdReads.unpricedRuns]) {
      expect(entry.fate.length).toBeGreaterThan(0);
      expect(entry.probability).toBeGreaterThanOrEqual(0);
      expect(entry.probability).toBeLessThanOrEqual(1);
    }
    expect(retro.crowdReads.earlyFavorites.some((e) => e.fate === "won the Cup")).toBe(true);
  });

  test("both finalists have an eve-of-final read", () => {
    expect(retro.finalRead.home.probability).not.toBeNull();
    expect(retro.finalRead.away.probability).not.toBeNull();
  });

  test("every top swing names its cause", () => {
    expect(retro.biggestSwings.length).toBeGreaterThan(0);
    for (const swing of retro.biggestSwings) {
      expect(swing.match).not.toBeNull();
      expect(Math.abs(swing.delta)).toBeGreaterThan(0);
    }
  });
});
