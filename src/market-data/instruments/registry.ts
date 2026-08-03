import type { InstrumentEntry } from "../contracts/index.js";

// Canonical registry — doc section 6.
//
// Equities: providerSymbol is a direct, high-confidence ticker mapping.
// Exchange MIC (XNAS/XNYS) is a stable, essentially-permanent fact about
// where these specific large-caps are primary-listed — not something that
// needed live verification.
//
// Indices, commodities, crypto: per the doc's own rule ("Do not guess
// global index or commodity identifiers"), providerSymbol stays null and
// needsResolution stays true until the W0 entitlement-proof script
// (w0-entitlement-proof.ts) resolves each one against Twelve Data's live
// /symbol_search endpoint with a real API key. Filling these in by guessing
// defeats the entire point of W0 — so they stay honestly unresolved here.
// BTC/USD is the one exception: "BTC/USD" is Twelve Data's own documented
// example symbol for that exact pair, confirmed directly against their
// docs, not guessed.
//
// staleAfterMs values below are placeholder defaults by asset class, not
// measured latency — W0's "record latency for each instrument" step
// (doc section 15) is what should tune these for real.

const DEFAULT_STALE_MS = {
  equity: 30_000,
  index: 60_000,
  commodity: 60_000,
  crypto: 30_000,
} as const;

function equity(symbol: string, name: string, mic: "XNAS" | "XNYS"): InstrumentEntry {
  const id = `equity:${symbol.toLowerCase()}:${mic.toLowerCase()}`;
  return {
    id,
    displaySymbol: symbol,
    name,
    assetClass: "equity",
    currency: "USD",
    exchangeMic: mic,
    provider: "twelve-data",
    providerSymbol: symbol,
    streamEnabled: true,
    historicalEnabled: true,
    expectedLatency: "real_time",
    staleAfterMs: DEFAULT_STALE_MS.equity,
    needsResolution: false,
  };
}

function unresolved(
  assetClass: "index" | "commodity",
  slug: string,
  name: string
): InstrumentEntry {
  return {
    id: `${assetClass}:${slug}`,
    displaySymbol: name,
    name,
    assetClass,
    currency: assetClass === "commodity" ? "USD" : "USD", // both USD-quoted for this registry; revisit if that changes
    exchangeMic: null,
    provider: "twelve-data",
    providerSymbol: null,
    streamEnabled: true,
    historicalEnabled: true,
    expectedLatency: "real_time",
    staleAfterMs: DEFAULT_STALE_MS[assetClass],
    needsResolution: true,
  };
}

export const INSTRUMENT_REGISTRY: InstrumentEntry[] = [
  // --- Global indices (10) — unresolved, see header comment ---
  unresolved("index", "spx", "S&P 500"),
  unresolved("index", "ndx", "Nasdaq 100"),
  unresolved("index", "dji", "Dow Jones Industrial Average"),
  unresolved("index", "ftse", "FTSE 100"),
  unresolved("index", "dax", "DAX 40"),
  unresolved("index", "n225", "Nikkei 225"),
  unresolved("index", "hsi", "Hang Seng"),
  unresolved("index", "shcomp", "Shanghai Composite"),
  unresolved("index", "axjo", "ASX 200"),
  unresolved("index", "nifty", "Nifty 50"),

  // --- Equities (20) — pinned ---
  equity("NVDA", "NVIDIA Corporation", "XNAS"),
  equity("AAPL", "Apple Inc.", "XNAS"),
  equity("MSFT", "Microsoft Corporation", "XNAS"),
  equity("GOOGL", "Alphabet Inc.", "XNAS"),
  equity("AMZN", "Amazon.com Inc.", "XNAS"),
  equity("META", "Meta Platforms Inc.", "XNAS"),
  equity("TSM", "Taiwan Semiconductor Manufacturing Company", "XNYS"),
  equity("AVGO", "Broadcom Inc.", "XNAS"),
  equity("AMD", "Advanced Micro Devices Inc.", "XNAS"),
  equity("XOM", "Exxon Mobil Corporation", "XNYS"),
  equity("CVX", "Chevron Corporation", "XNYS"),
  equity("COP", "ConocoPhillips", "XNYS"),
  equity("SLB", "SLB", "XNYS"),
  equity("EOG", "EOG Resources Inc.", "XNYS"),
  equity("JPM", "JPMorgan Chase & Co.", "XNYS"),
  equity("BAC", "Bank of America Corporation", "XNYS"),
  equity("WFC", "Wells Fargo & Company", "XNYS"),
  equity("GS", "The Goldman Sachs Group Inc.", "XNYS"),
  equity("MS", "Morgan Stanley", "XNYS"),
  equity("BLK", "BlackRock Inc.", "XNYS"),

  // --- Commodities (8) — unresolved, see header comment ---
  unresolved("commodity", "gold", "Gold spot"),
  unresolved("commodity", "silver", "Silver spot"),
  unresolved("commodity", "platinum", "Platinum spot"),
  unresolved("commodity", "palladium", "Palladium spot"),
  unresolved("commodity", "wti", "WTI crude"),
  unresolved("commodity", "brent", "Brent crude"),
  unresolved("commodity", "natgas", "Henry Hub natural gas"),
  unresolved("commodity", "copper", "Copper"),

  // --- Crypto (1) — confirmed against Twelve Data's own documented example ---
  {
    id: "crypto:btcusd",
    displaySymbol: "BTC/USD",
    name: "Bitcoin / US Dollar",
    assetClass: "crypto",
    currency: "USD",
    exchangeMic: null,
    provider: "twelve-data",
    providerSymbol: "BTC/USD",
    streamEnabled: true,
    historicalEnabled: true,
    expectedLatency: "real_time",
    staleAfterMs: DEFAULT_STALE_MS.crypto,
    needsResolution: false,
  },
];
