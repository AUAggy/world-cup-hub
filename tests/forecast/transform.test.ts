import { describe, expect, test } from "bun:test";
import type { ForecastSourceStatus } from "../../src/lib/forecast-types";
import type {
  KalshiMarket,
  PolymarketEvent,
  PolymarketMarket,
} from "../../src/lib/forecast/schema";
import {
  assembleForecastSnapshot,
  parseKalshiGames,
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

function kalshiMarket(input: {
  ticker: string;
  event: string;
  team: string;
  price: string;
  status?: string;
  result?: string;
}): KalshiMarket {
  return {
    ticker: input.ticker,
    title: `${input.team} wins`,
    event_ticker: input.event,
    last_price_dollars: input.price,
    volume_fp: "25",
    volume_24h_fp: "5",
    status: input.status ?? "open",
    result: input.result,
    yes_sub_title: input.team,
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

describe("parseKalshiGames", () => {
  test("builds finalized win, loss, and draw states", () => {
    const win = parseKalshiGames([
      kalshiMarket({
        ticker: "KXWCGAME-260612-USA",
        event: "KXWCGAME-260612",
        team: "United States",
        price: "0",
        status: "finalized",
        result: "yes",
      }),
      kalshiMarket({
        ticker: "KXWCGAME-260612-PAR",
        event: "KXWCGAME-260612",
        team: "Paraguay",
        price: "0",
        status: "finalized",
        result: "no",
      }),
    ]);

    expect(win[0].result).toBe("teamA");
    expect(win[0].teamA.probability).toBe(1);
    expect(win[0].teamB.probability).toBe(0);

    const draw = parseKalshiGames([
      kalshiMarket({
        ticker: "KXWCGAME-260613-BRA",
        event: "KXWCGAME-260613",
        team: "Brazil",
        price: "0",
        status: "finalized",
        result: "no",
      }),
      kalshiMarket({
        ticker: "KXWCGAME-260613-MAR",
        event: "KXWCGAME-260613",
        team: "Morocco",
        price: "0",
        status: "finalized",
        result: "no",
      }),
      kalshiMarket({
        ticker: "KXWCGAME-260613-TIE",
        event: "KXWCGAME-260613",
        team: "Tie",
        price: "0",
        status: "finalized",
        result: "yes",
      }),
    ]);

    expect(draw[0].result).toBe("draw");
  });
});

describe("assembleForecastSnapshot", () => {
  test("separates tournament and match signals by team", () => {
    const polymarket: PolymarketEvent = {
      id: "30615",
      title: "World Cup Winner",
      markets: [polyMarket("Brazil", 0.22, 0.02), polyMarket("United States", 0.08, -0.003)],
    };

    const snapshot = assembleForecastSnapshot({
      polymarket,
      kalshiMarkets: [
        kalshiMarket({
          ticker: "KXWCGAME-260612-USA",
          event: "KXWCGAME-260612",
          team: "United States",
          price: "0.55",
        }),
        kalshiMarket({
          ticker: "KXWCGAME-260612-PAR",
          event: "KXWCGAME-260612",
          team: "Paraguay",
          price: "0.31",
        }),
      ],
      statuses: { polymarket: liveStatus, kalshi: liveStatus },
      now: new Date("2026-06-19T12:00:00.000Z"),
    });

    const brazil = snapshot.teamForecasts.find((team) => team.team === "Brazil");
    const usa = snapshot.teamForecasts.find((team) => team.team === "USA");

    expect(snapshot.fetchedAt).toBe("2026-06-19T12:00:00.000Z");
    expect(snapshot.groupForecasts).toHaveLength(12);
    expect(brazil?.tournament.probability).toBe(0.22);
    expect(usa?.matchAverageProbability).toBe(0.55);
    expect(usa?.matchSignals[0].opponent).toBe("Paraguay");
    expect(snapshot.movers.map((mover) => mover.team)).toEqual(["Brazil"]);
  });
});
