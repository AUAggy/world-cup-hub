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
  markets: PolymarketMarket[];
}

export interface KalshiMarket {
  ticker: string;
  title: string;
  event_ticker: string;
  last_price_dollars: string;
  volume_fp: string;
  volume_24h_fp: string;
  status: string;
  result?: string;
  yes_sub_title?: string;
  subtitle?: string;
}

export interface KalshiPayload {
  markets: KalshiMarket[];
  cursor?: string;
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

export function parseKalshiPayload(payload: unknown): KalshiPayload | null {
  if (!isRecord(payload) || !Array.isArray(payload.markets)) return null;

  return {
    cursor:
      typeof payload.cursor === "string" && payload.cursor.length > 0 ? payload.cursor : undefined,
    markets: payload.markets.flatMap((market) => {
      if (!isRecord(market)) return [];
      return [
        {
          ticker: stringValue(market.ticker),
          title: stringValue(market.title),
          event_ticker: stringValue(market.event_ticker),
          last_price_dollars: stringValue(market.last_price_dollars),
          volume_fp: stringValue(market.volume_fp),
          volume_24h_fp: stringValue(market.volume_24h_fp),
          status: stringValue(market.status),
          result: typeof market.result === "string" ? market.result : undefined,
          yes_sub_title:
            typeof market.yes_sub_title === "string" ? market.yes_sub_title : undefined,
          subtitle: typeof market.subtitle === "string" ? market.subtitle : undefined,
        },
      ];
    }),
  };
}
