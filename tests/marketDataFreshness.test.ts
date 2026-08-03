import { test } from "node:test";
import assert from "node:assert/strict";
import { computeFeedState } from "../src/market-data/provider/freshness.js";
import type { MarketQuote } from "../src/market-data/contracts/index.js";

function quoteAt(sourceTimestamp: string): MarketQuote {
  return {
    instrumentId: "equity:aapl:xnas",
    price: 100,
    change: null,
    changePercent: null,
    open: null,
    previousClose: null,
    high: null,
    low: null,
    bid: null,
    ask: null,
    currency: "USD",
    sourceTimestamp,
    receivedTimestamp: sourceTimestamp,
    provider: "twelve-data",
    latency: "real_time",
    marketState: "open",
    feedState: "live",
  };
}

test("a quote inside the staleness window is live", () => {
  const now = new Date("2026-08-02T12:00:30Z");
  const quote = quoteAt("2026-08-02T12:00:00Z"); // 30s old
  assert.equal(computeFeedState(quote, 60_000, now), "live");
});

test("a quote past the staleness window is stale", () => {
  const now = new Date("2026-08-02T12:02:00Z");
  const quote = quoteAt("2026-08-02T12:00:00Z"); // 120s old, staleAfterMs=60000
  assert.equal(computeFeedState(quote, 60_000, now), "stale");
});

test("a quote with a future timestamp (clock skew / bad payload) is unavailable, not trusted", () => {
  const now = new Date("2026-08-02T12:00:00Z");
  const quote = quoteAt("2026-08-02T12:05:00Z"); // 5 minutes in the future
  assert.equal(computeFeedState(quote, 60_000, now), "unavailable");
});

test("an unparseable source timestamp is unavailable", () => {
  const now = new Date("2026-08-02T12:00:00Z");
  const quote = quoteAt("not-a-real-timestamp");
  assert.equal(computeFeedState(quote, 60_000, now), "unavailable");
});
