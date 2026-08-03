import { test } from "node:test";
import assert from "node:assert/strict";
import type { InstrumentEntry } from "../src/market-data/contracts/index.js";
import { INSTRUMENT_REGISTRY } from "../src/market-data/instruments/registry.js";
import { validateRegistry, hasErrors } from "../src/market-data/instruments/validate.js";

test("registry has exactly 39 entries", () => {
  assert.equal(INSTRUMENT_REGISTRY.length, 39);
});

test("non-strict mode: the 18 known-unresolved entries are warnings, not errors, and there are zero errors", () => {
  const issues = validateRegistry(INSTRUMENT_REGISTRY, { strict: false });
  const errors = issues.filter((i) => i.severity === "error");
  const pendingWarnings = issues.filter((i) => i.code === "pending-resolution");
  assert.equal(errors.length, 0, `expected 0 errors pre-W0, got: ${JSON.stringify(errors, null, 2)}`);
  assert.equal(pendingWarnings.length, 18, "expected exactly the 10 indices + 8 commodities as pending");
  assert.equal(hasErrors(issues), false);
});

test("strict mode: the same 18 unresolved entries become errors", () => {
  const issues = validateRegistry(INSTRUMENT_REGISTRY, { strict: true });
  const errors = issues.filter((i) => i.code === "missing-provider-symbol");
  assert.equal(errors.length, 18);
  assert.equal(hasErrors(issues), true);
});

test("catches a duplicate id", () => {
  const bad: InstrumentEntry[] = [
    makeEntry("equity:aapl:xnas", "AAPL"),
    makeEntry("equity:aapl:xnas", "AAPL"), // duplicate id, different object
  ];
  const issues = validateRegistry(bad);
  assert.ok(issues.some((i) => i.code === "duplicate-id"));
});

test("catches a missing currency", () => {
  const bad: InstrumentEntry[] = [{ ...makeEntry("equity:x:xnas", "X"), currency: "" }];
  const issues = validateRegistry(bad);
  assert.ok(issues.some((i) => i.code === "missing-currency"));
});

test("catches two different ids representing the same instrument", () => {
  const bad: InstrumentEntry[] = [
    makeEntry("equity:aapl:xnas", "AAPL"),
    makeEntry("equity:aapl:xnys", "AAPL"), // same symbol+class, different id — accidental dupe
  ];
  const issues = validateRegistry(bad);
  assert.ok(issues.some((i) => i.code === "duplicate-instrument"));
});

test("entitlement check flags a resolved symbol that W0 did not confirm", () => {
  const entry = makeEntry("equity:aapl:xnas", "AAPL");
  const issues = validateRegistry([entry], { entitledSymbols: new Set(["MSFT"]) });
  assert.ok(issues.some((i) => i.code === "not-entitled"));
});

test("widget reference check flags an instrument id no widget-supplied registry knows about", () => {
  const entry = makeEntry("equity:aapl:xnas", "AAPL");
  const issues = validateRegistry([entry], {
    widgetInstrumentIds: new Set(["equity:aapl:xnas", "equity:ghost:xnas"]),
  });
  assert.ok(issues.some((i) => i.code === "unregistered-widget-reference" && i.instrumentId === "equity:ghost:xnas"));
});

function makeEntry(id: string, symbol: string): InstrumentEntry {
  return {
    id,
    displaySymbol: symbol,
    name: symbol,
    assetClass: "equity",
    currency: "USD",
    exchangeMic: "XNAS",
    provider: "twelve-data",
    providerSymbol: symbol,
    streamEnabled: true,
    historicalEnabled: true,
    expectedLatency: "real_time",
    staleAfterMs: 30_000,
    needsResolution: false,
  };
}
