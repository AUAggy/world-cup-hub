import { describe, expect, test } from "bun:test";
import type { ForecastSourceStatus } from "../../src/lib/forecast-types";
import type { PolymarketEvent, PolymarketMarket } from "../../src/lib/forecast/schema";
import {
  assembleForecastSnapshot,
  parsePolymarketProbability,
} from "../../src/lib/forecast/transform";

const liveStatus: ForecastSourceStatus = {
  status: "live",
  updatedAt: "2026-06-19T00:00:00.000Z",
};

function polyMarket(team: string, price: number, movement24h: number | null): PolymarketMarket {
  return {
    id: team,
    question: `${team} wins`,
    groupItemTitle: team,
    outcomePrices: JSON.stringify([String(price), String(1 - price)]),
    volumeNum: 1000,
    volume24hr: 100,
    oneDayPriceChange: movement24h,
    oneWeekPriceChange: null,
    lastTradePrice: price,
    active: true,
    closed: false,
  };
}

function matchEvent(input: {
  id: string;
  title: string;
  slug: string;
  teamA: string;
  teamAPrice: number;
  teamB: string;
  teamBPrice: number;
  drawPrice?: number;
}): PolymarketEvent {
  return {
    id: input.id,
    title: input.title,
    slug: input.slug,
    markets: [
      polyMarket(input.teamA, input.teamAPrice, null),
      polyMarket(`Draw (${input.title})`, input.drawPrice ?? 0.2, null),
      polyMarket(input.teamB, input.teamBPrice, null),
    ],
  };
}

describe("parsePolymarketProbability", () => {
  test("reads the first outcome price and clamps bad values", () => {
    expect(parsePolymarketProbability(polyMarket("Brazil", 0.32, null))).toBe(0.32);
    expect(
      parsePolymarketProbability({
        ...polyMarket("Brazil", 0.32, null),
        outcomePrices: "not-json",
        lastTradePrice: 2,
      }),
    ).toBe(1);
  });
});

describe("assembleForecastSnapshot", () => {
  test("separates tournament and match signals by team", () => {
    const polymarket: PolymarketEvent = {
      id: "30615",
      title: "World Cup Winner",
      slug: "world-cup-winner",
      markets: [polyMarket("Brazil", 0.22, 0.02), polyMarket("United States", 0.08, -0.003)],
    };

    const snapshot = assembleForecastSnapshot({
      polymarket,
      polymarketMatchEvents: [
        matchEvent({
          id: "351774",
          title: "Türkiye vs. United States",
          slug: "fifwc-tur-usa-2026-06-25",
          teamA: "Türkiye",
          teamAPrice: 0.35,
          teamB: "United States",
          teamBPrice: 0.45,
        }),
      ],
      statuses: { polymarket: liveStatus, matchMarkets: liveStatus },
      now: new Date("2026-06-19T12:00:00.000Z"),
    });

    const brazil = snapshot.teamForecasts.find((team) => team.team === "Brazil");
    const usa = snapshot.teamForecasts.find((team) => team.team === "USA");

    expect(snapshot.fetchedAt).toBe("2026-06-19T12:00:00.000Z");
    expect(snapshot.groupForecasts).toHaveLength(12);
    expect(brazil?.tournament.probability).toBe(0.22);
    expect(usa?.matchAverageProbability).toBe(0.45);
    expect(usa?.matchSignals[0].opponent).toBe("Turkey");
    expect(snapshot.movers.map((mover) => mover.team)).toEqual(["Brazil"]);
  });
});
