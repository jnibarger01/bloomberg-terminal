import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeTwelveDataQuote } from "../src/market-data/provider/normalize.js";
import sampleQuotes from "../src/market-data/provider/fixtures/sample-quotes.json" with { type: "json" };

test("normalizes a valid fixture quote into the MarketQuote shape", () => {
  const raw = (sampleQuotes as Record<string, Record<string, unknown>>).AAPL;
  const quote = normalizeTwelveDataQuote(raw, {
    instrumentId: "equity:aapl:xnas",
    provider: "twelve-data",
    latency: "real_time",
    receivedAt: new Date("2026-08-02T12:00:00Z"),
  });

  assert.ok(quote);
  assert.equal(quote?.instrumentId, "equity:aapl:xnas");
  assert.equal(quote?.price, 213.14);
  assert.equal(quote?.currency, "USD");
  assert.equal(quote?.provider, "twelve-data");
  assert.equal(quote?.marketState, "open");
  assert.equal(quote?.receivedTimestamp, "2026-08-02T12:00:00.000Z");
  // bid/ask absent from the fixture, per doc section 7 must stay null, not fabricated
  assert.equal(quote?.bid, null);
  assert.equal(quote?.ask, null);
});

test("rejects a quote with no usable price instead of manufacturing one", () => {
  const quote = normalizeTwelveDataQuote(
    { symbol: "GHOST", currency: "USD" }, // no close field at all
    { instrumentId: "equity:ghost:xnas", provider: "twelve-data", latency: "real_time" }
  );
  assert.equal(quote, null);
});

test("rejects a non-numeric price string instead of coercing garbage", () => {
  const quote = normalizeTwelveDataQuote(
    { symbol: "GHOST", close: "not-a-number", currency: "USD" },
    { instrumentId: "equity:ghost:xnas", provider: "twelve-data", latency: "real_time" }
  );
  assert.equal(quote, null);
});

test("defaults currency to USD when the provider omits it, rather than failing", () => {
  const quote = normalizeTwelveDataQuote(
    { symbol: "X", close: "10.0" },
    { instrumentId: "equity:x:xnas", provider: "twelve-data", latency: "real_time" }
  );
  assert.equal(quote?.currency, "USD");
});
