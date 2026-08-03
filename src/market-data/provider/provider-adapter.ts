import type { MarketQuote } from "../contracts/index.js";

// Any market-data provider must implement this. The rest of the backend
// (server.ts, normalize.ts) depends only on this interface, never on a
// concrete provider — that's what makes FixtureAdapter usable in tests and
// TwelveDataAdapter swappable for a second provider later without touching
// server.ts. Doc section 14 explicitly keeps "multiple-provider failover"
// out of MVP scope, but "provider is swappable" and "provider has failover"
// are different things — this interface buys the first for free without
// building the second.

export interface RawQuote {
  // Deliberately loose — this is whatever shape the provider's REST/WS
  // response actually has, before normalize.ts turns it into a MarketQuote.
  [key: string]: unknown;
}

export interface ProviderConnectionStatus {
  connected: boolean;
  lastMessageAt: string | null;
  reconnectCount: number;
}

export interface MarketDataProvider {
  readonly name: string;

  // REST — used for startup snapshot hydration and single-symbol lookups.
  getQuote(providerSymbol: string): Promise<RawQuote | null>;

  // WebSocket lifecycle — doc section 7 "Provider connection" bullets.
  connectStream(onQuote: (raw: RawQuote) => void): Promise<void>;
  subscribe(providerSymbols: string[]): Promise<void>;
  disconnectStream(): Promise<void>;
  getConnectionStatus(): ProviderConnectionStatus;
}
