/**
 * Unit tests for the retrospective builder (Step 2, Phase 2).
 * Synthetic fixtures only — the frozen artifacts are covered by
 * tests/frozen/.
 */

import { describe, expect, test } from "bun:test";
import type { Match, WorldCupSnapshot } from "../../src/lib/worldcup-types";
import type { ForecastSnapshot } from "../../src/lib/forecast-types";
import type { ForecastHistory } from "../../src/lib/retrospective-types";
import { buildRetrospective, probabilityOn } from "../../src/lib/retrospective";

function side(name: string, score: number, winner: boolean) {
  return {
    team: { id: name, name, abbreviation: name.slice(0, 3).toUpperCase(), logo: "", color: "" },
    score,
    winner,
  };
}

function match(
  id: string,
  round: Match["round"],
  date: string,
  home: string,
  away: string,
  hs: number,
  as: number,
  homeWon: boolean,
): Match {
  return {
    id,
    date: `${date}T19:00Z`,
    round,
    group: null,
    status: "post",
    statusDetail: "FT",
    venue: null,
    home: side(home, hs, homeWon),
    away: side(away, as, !homeWon),
    shortName: `${away} @ ${home}`,
  };
}

const SEMI = match("s1", "semifinals", "2026-07-14", "Spain", "France", 2, 0, true);
const FINAL = match("f1", "final", "2026-07-19", "Spain", "Argentina", 1, 0, true);

const worldcup: WorldCupSnapshot = {
  fetchedAt: "2026-07-20T00:00:00.000Z",
  ttlSeconds: 0,
  source: "espn",
  matches: [SEMI, FINAL],
  groups: [],
  rounds: {
    "group-stage": [],
    "round-of-32": [],
    "round-of-16": [],
    quarterfinals: [],
    semifinals: [SEMI],
    "3rd-place-match": [],
    final: [FINAL],
  },
};

const forecast = {
  fetchedAt: "2026-07-20T00:00:00.000Z",
  ttlSeconds: 0,
  sourceStatus: {
    polymarket: { status: "live", updatedAt: null },
    matchMarkets: { status: "live", updatedAt: null },
  },
  teamForecasts: [],
  groupForecasts: [],
  topTournamentSignals: [],
  movers: [
    { team: "Spain", group: "E", probability: 1, movement24h: 0.409 },
    { team: "Argentina", group: "J", probability: 0, movement24h: -0.409 },
  ],
} as unknown as ForecastSnapshot;

const history: ForecastHistory = {
  windowStart: "2026-07-01T00:00:00.000Z",
  windowEnd: "2026-07-20T00:00:00.000Z",
  fidelityMinutes: 1440,
  teams: [
    {
      team: "Spain",
      points: [
        { date: "2026-07-13", probability: 0.2 },
        { date: "2026-07-14", probability: 0.2 },
        // Semifinal win on 07-14 registers at the 07-15 midnight snapshot.
        { date: "2026-07-15", probability: 0.58 },
        { date: "2026-07-18", probability: 0.59 },
        { date: "2026-07-19", probability: 0.6 },
        { date: "2026-07-20", probability: 1 },
      ],
    },
    {
      team: "France",
      points: [
        { date: "2026-07-13", probability: 0.39 },
        { date: "2026-07-14", probability: 0.39 },
        { date: "2026-07-15", probability: 0.001 },
      ],
    },
    {
      team: "Argentina",
      points: [
        { date: "2026-07-18", probability: 0.4 },
        { date: "2026-07-19", probability: 0.4 },
        { date: "2026-07-20", probability: 0 },
      ],
    },
  ],
};

describe("probabilityOn", () => {
  const points = [
    { date: "2026-07-01", probability: 0.1 },
    { date: "2026-07-05", probability: 0.2 },
  ];

  test("returns null before the first point", () => {
    expect(probabilityOn(points, "2026-06-30")).toBeNull();
  });

  test("returns the exact value on a point date", () => {
    expect(probabilityOn(points, "2026-07-05")).toBe(0.2);
  });

  test("carries the last value forward between points", () => {
    expect(probabilityOn(points, "2026-07-03")).toBe(0.1);
    expect(probabilityOn(points, "2026-07-31")).toBe(0.2);
  });
});

describe("buildRetrospective", () => {
  const r = buildRetrospective({
    worldcup,
    forecast,
    history,
    historyCapturedAt: "2026-07-20T01:00:00.000Z",
  });

  test("champion and final result come from the final match", () => {
    expect(r.champion).toBe("Spain");
    expect(r.finalResult).toBe("Spain 1\u20130 Argentina");
  });

  test("eve of semifinal: favorite is France, champion read is Spain", () => {
    const semi = r.roundEveReads.find((x) => x.round === "semifinals");
    expect(semi?.eveDate).toBe("2026-07-13");
    expect(semi?.favorite?.team).toBe("France");
    expect(semi?.championProbability).toBe(0.2);
  });

  test("eve of final: Spain 59%, Argentina 40%", () => {
    const final = r.roundEveReads.find((x) => x.round === "final");
    expect(final?.eveDate).toBe("2026-07-18");
    expect(final?.championProbability).toBe(0.59);
    expect(r.finalRead.home.probability).toBe(0.59);
    expect(r.finalRead.away.probability).toBe(0.4);
  });

  test("midnight-snapshot swings join to the match played the day before", () => {
    const france = r.biggestSwings.find((s) => s.team === "France");
    expect(france?.date).toBe("2026-07-15");
    expect(france?.match?.opponent).toBe("Spain");
    expect(france?.match?.result).toBe("L");
  });

  test("champion arc annotates match days", () => {
    const semiDay = r.championArc.find((p) => p.date === "2026-07-14");
    expect(semiDay?.match?.result).toBe("W");
    expect(semiDay?.match?.opponent).toBe("France");
    const quietDay = r.championArc.find((p) => p.date === "2026-07-13");
    expect(quietDay?.match).toBeNull();
  });

  test("resolution movers pass through, capped", () => {
    expect(r.resolutionMovers).toHaveLength(2);
    expect(r.resolutionMovers[0].team).toBe("Spain");
  });
});
