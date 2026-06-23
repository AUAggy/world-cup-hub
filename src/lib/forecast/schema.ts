export interface PolymarketMarket {
  id: string;
  question: string;
  groupItemTitle: string;
  outcomePrices: string;
  volumeNum: number;
  volume24hr: number;
  oneDayPriceChange: number | null;
  oneWeekPriceChange: number | null;
  lastTradePrice: number;
  active: boolean;
  closed: boolean;
}

export interface PolymarketEvent {
  id: string;
  title: string;
  slug: string;
  markets: PolymarketMarket[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nullableNumberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function booleanValue(value: unknown): boolean {
  return typeof value === "boolean" ? value : false;
}

export function parsePolymarketEvent(payload: unknown): PolymarketEvent | null {
  if (!isRecord(payload) || !Array.isArray(payload.markets)) return null;

  return {
    id: stringValue(payload.id),
    title: stringValue(payload.title),
    slug: stringValue(payload.slug),
    markets: payload.markets.flatMap((market) => {
      if (!isRecord(market)) return [];
      return [
        {
          id: stringValue(market.id),
          question: stringValue(market.question),
          groupItemTitle: stringValue(market.groupItemTitle),
          outcomePrices: stringValue(market.outcomePrices),
          volumeNum: numberValue(market.volumeNum),
          volume24hr: numberValue(market.volume24hr),
          oneDayPriceChange: nullableNumberValue(market.oneDayPriceChange),
          oneWeekPriceChange: nullableNumberValue(market.oneWeekPriceChange),
          lastTradePrice: numberValue(market.lastTradePrice),
          active: booleanValue(market.active),
          closed: booleanValue(market.closed),
        },
      ];
    }),
  };
}
