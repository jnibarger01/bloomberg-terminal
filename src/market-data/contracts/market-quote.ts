// Shared quote contract — doc section 7 "Quote normalization".
// This is the ONE shape every provider adapter must normalize into. Nothing
// downstream (REST responses, WS events, frontend state) should ever see a
// raw provider payload — only this.

export type Latency = "real_time" | "delayed" | "eod";
export type MarketState = "pre" | "open" | "post" | "closed";
export type FeedState = "live" | "stale" | "unavailable";

export interface MarketQuote {
  instrumentId: string;
  price: number;
  change: number | null;
  changePercent: number | null;
  open: number | null;
  previousClose: number | null;
  high: number | null;
  low: number | null;
  bid: number | null;
  ask: number | null;
  currency: string;
  sourceTimestamp: string; // ISO 8601, from the provider
  receivedTimestamp: string; // ISO 8601, backend receipt time
  provider: string;
  latency: Latency;
  marketState: MarketState;
  feedState: FeedState;
}

// doc section 6 — canonical instrument registry entry shape.
export type AssetClass = "index" | "equity" | "commodity" | "crypto";

export interface InstrumentEntry {
  id: string;
  displaySymbol: string;
  name: string;
  assetClass: AssetClass;
  currency: string;
  exchangeMic: string | null; // null only when genuinely not applicable (e.g. spot commodities)
  provider: string;
  providerSymbol: string | null; // null = unresolved, see needsResolution
  streamEnabled: boolean;
  historicalEnabled: boolean;
  expectedLatency: Latency;
  staleAfterMs: number;
  // Not in the doc's example JSON, but required to make "don't guess global
  // index or commodity identifiers" (section 6) machine-checkable rather
  // than a rule someone has to remember. true = providerSymbol has not been
  // pinned via /symbol_search yet; the registry validator treats this as a
  // distinct, non-failing state from "missing symbol on a resolved entry."
  needsResolution: boolean;
}
