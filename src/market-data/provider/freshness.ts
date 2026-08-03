import type { MarketQuote, FeedState } from "../contracts/index.js";

// "Mark values stale rather than continuing to call them live" (doc section
// 7). This is evaluated at read-time against the instrument's own
// staleAfterMs, not baked into the stored quote — a quote that was live
// when received becomes stale purely by the clock moving forward, without
// any new provider message.

export function computeFeedState(quote: MarketQuote, staleAfterMs: number, now: Date = new Date()): FeedState {
  const sourceTime = new Date(quote.sourceTimestamp).getTime();
  if (!Number.isFinite(sourceTime)) return "unavailable";

  const ageMs = now.getTime() - sourceTime;
  if (ageMs < 0) {
    // Provider timestamp in the future relative to us — clock skew or a bad
    // payload. Doc section 7: "detect extreme jumps without silently
    // replacing them." Treat as unavailable rather than trusting it.
    return "unavailable";
  }
  return ageMs <= staleAfterMs ? "live" : "stale";
}

export function withComputedFeedState(quote: MarketQuote, staleAfterMs: number, now?: Date): MarketQuote {
  return { ...quote, feedState: computeFeedState(quote, staleAfterMs, now) };
}
