import { describe, expect, test } from "bun:test";
import { parseKalshiPayload, parsePolymarketEvent } from "../../src/lib/forecast/schema";

describe("parsePolymarketEvent", () => {
  test("accepts a valid event and filters bad markets", () => {
    const event = parsePolymarketEvent({
      id: "30615",
      title: "World Cup Winner",
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

    expect(event?.markets).toHaveLength(1);
    expect(event?.markets[0].groupItemTitle).toBe("Brazil");
  });

  test("rejects payloads without a market array", () => {
    expect(parsePolymarketEvent(null)).toBeNull();
    expect(parsePolymarketEvent({})).toBeNull();
    expect(parsePolymarketEvent({ markets: "bad" })).toBeNull();
  });
});

describe("parseKalshiPayload", () => {
  test("accepts markets and cursor", () => {
    const payload = parseKalshiPayload({
      cursor: "next",
      markets: [
        {
          ticker: "KXWCGAME-260612-USA",
          title: "USA wins",
          event_ticker: "KXWCGAME-260612",
          last_price_dollars: "0.55",
          volume_fp: "100",
          volume_24h_fp: "10",
          status: "open",
          yes_sub_title: "United States",
        },
      ],
    });

    expect(payload?.cursor).toBe("next");
    expect(payload?.markets).toHaveLength(1);
    expect(payload?.markets[0].yes_sub_title).toBe("United States");
  });

  test("rejects payloads without a market array", () => {
    expect(parseKalshiPayload(null)).toBeNull();
    expect(parseKalshiPayload({})).toBeNull();
    expect(parseKalshiPayload({ markets: "bad" })).toBeNull();
  });
});
