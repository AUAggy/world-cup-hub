import { describe, expect, test } from "bun:test";
import { parsePolymarketEvent } from "../../src/lib/forecast/schema";

describe("parsePolymarketEvent", () => {
  test("accepts a valid event and filters bad markets", () => {
    const event = parsePolymarketEvent({
      id: "30615",
      title: "World Cup Winner",
      slug: "world-cup-winner",
      markets: [
        {
          id: "1",
          question: "Brazil wins",
          groupItemTitle: "Brazil",
          outcomePrices: '["0.21","0.79"]',
          volumeNum: 1000,
          volume24hr: 200,
          oneDayPriceChange: 0.01,
          oneWeekPriceChange: -0.02,
          lastTradePrice: 0.2,
          active: true,
          closed: false,
        },
        null,
      ],
    });

    expect(event?.slug).toBe("world-cup-winner");
    expect(event?.markets).toHaveLength(1);
    expect(event?.markets[0].groupItemTitle).toBe("Brazil");
  });

  test("rejects payloads without a market array", () => {
    expect(parsePolymarketEvent(null)).toBeNull();
    expect(parsePolymarketEvent({})).toBeNull();
    expect(parsePolymarketEvent({ markets: "bad" })).toBeNull();
  });
});
