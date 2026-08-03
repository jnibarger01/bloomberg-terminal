import type { MarketQuote, Latency, MarketState } from "../contracts/index.js";
import type { RawQuote } from "./provider-adapter.js";

// Field names below (symbol, close, previous_close, change, percent_change,
// open, high, low, timestamp, currency, is_market_open) match Twelve Data's
// documented /quote REST response shape, based on general familiarity with
// their API, NOT a live payload captured this session — I didn't have
// network access to api.twelvedata.com to fetch and inspect a real one.
// First thing to check when you run this against a real key: does the
// actual response match these field names? If not, this is the one file
// that needs adjusting — everything downstream (server, contracts, tests)
// is shape-agnostic as long as this function's output matches MarketQuote.

function num(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

export interface NormalizeOptions {
  instrumentId: string;
  provider: string;
  latency: Latency; // from the registry entry's expectedLatency, not guessed per-quote
  receivedAt?: Date; // injectable for tests; defaults to now
}

export function normalizeTwelveDataQuote(raw: RawQuote, options: NormalizeOptions): MarketQuote | null {
  const price = num(raw.close);
  if (price === null) {
    // No usable price — doc section 7 data-quality controls say reject
    // malformed values rather than manufacture a number.
    return null;
  }

  const timestampSec = num(raw.timestamp);
  const sourceTimestamp = timestampSec !== null ? new Date(timestampSec * 1000).toISOString() : new Date(0).toISOString();

  const currency = str(raw.currency) ?? "USD";

  const marketState: MarketState = raw.is_market_open === true ? "open" : raw.is_market_open === false ? "closed" : "closed";

  const receivedAt = options.receivedAt ?? new Date();

  return {
    instrumentId: options.instrumentId,
    price,
    change: num(raw.change),
    changePercent: num(raw.percent_change),
    open: num(raw.open),
    previousClose: num(raw.previous_close),
    high: num(raw.high),
    low: num(raw.low),
    // Twelve Data's WS price stream and REST /quote endpoint don't reliably
    // carry bid/ask (doc section 7 says exactly this) — left null rather
    // than fabricated, per the doc's explicit instruction.
    bid: num(raw.bid),
    ask: num(raw.ask),
    currency,
    sourceTimestamp,
    receivedTimestamp: receivedAt.toISOString(),
    provider: options.provider,
    latency: options.latency,
    marketState,
    // feedState is NOT decided here — that's freshness.ts's job, evaluated
    // continuously against staleAfterMs, not fixed at normalization time.
    feedState: "live",
  };
}
