// REST + WebSocket surface contracts — doc section 8.

import type { MarketQuote, InstrumentEntry, MarketState } from "./market-quote.js";

// --- REST ---

export interface HealthResponse {
  status: "ok";
}

export interface ReadyResponse {
  ready: boolean;
  reasons: string[]; // populated when ready=false — doc section 11 readiness-fail conditions
}

export interface InstrumentsResponse {
  instruments: InstrumentEntry[];
}

export interface QuotesResponse {
  quotes: MarketQuote[];
}

export interface ProviderStatusResponse {
  provider: string;
  connected: boolean;
  lastMessageAt: string | null;
  subscribedCount: number;
  unresolvedCount: number;
  reconnectCount: number;
}

// --- WebSocket ---

export interface ClientSubscribeMessage {
  type: "subscribe";
  instrumentIds: string[];
}

export type ClientMessage = ClientSubscribeMessage;

export interface SnapshotEvent {
  event: "snapshot";
  quotes: MarketQuote[];
}

export interface QuoteEvent {
  event: "quote";
  quote: MarketQuote;
}

export interface MarketStateEvent {
  event: "market_state";
  instrumentId: string;
  marketState: MarketState;
}

export interface FeedStatusEvent {
  event: "feed_status";
  provider: string;
  connected: boolean;
}

export interface HeartbeatEvent {
  event: "heartbeat";
  serverTime: string;
}

export interface ErrorEvent {
  event: "error";
  message: string;
}

export type ServerEvent =
  | SnapshotEvent
  | QuoteEvent
  | MarketStateEvent
  | FeedStatusEvent
  | HeartbeatEvent
  | ErrorEvent;
