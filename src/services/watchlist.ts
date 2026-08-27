import { INSTRUMENT_REGISTRY } from '../market-data/instruments/registry';
import type { MarketQuote } from '../market-data/contracts/market-quote';

export interface WatchlistError {
  symbol?: string;
  code: string;
  message: string;
}

export interface WatchlistResult {
  items: MarketQuote[];
  errors: WatchlistError[];
  status: 'connected' | 'degraded' | 'unavailable';
}

export interface WatchlistFetchOptions {
  apiKey?: string;
  backendUrl?: string;
  fetchImpl?: typeof fetch;
  maxAttempts?: number;
  backoffMs?: number;
  sleep?: (ms: number) => Promise<void>;
}

const resolvedRegistry = new Map(
  INSTRUMENT_REGISTRY.filter((entry) => entry.providerSymbol && !entry.needsResolution)
    .map((entry) => [entry.id, entry])
);

export function classifyProviderError(status?: number): 'retryable' | 'terminal' {
  return status === 408 || status === 429 || (status !== undefined && status >= 500) ? 'retryable' : 'terminal';
}

function delay(ms: number) {
  return new Promise<void>((resolve) => globalThis.setTimeout(resolve, ms));
}

export async function fetchWatchlistQuotes(
  instrumentIds: string[],
  options: WatchlistFetchOptions = {}
): Promise<WatchlistResult> {
  const entries = instrumentIds.map((id) => resolvedRegistry.get(id));
  const invalid = entries.findIndex((entry) => !entry);
  if (invalid >= 0) throw new Error(`Instrument ${instrumentIds[invalid]} is not available in the validated instrument registry`);
  const symbols = entries.map((entry) => entry!.providerSymbol!);
  if (symbols.length === 0) return { items: [], errors: [], status: 'unavailable' };

  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  const maxAttempts = Math.min(3, Math.max(1, options.maxAttempts ?? 3));
  const backoffMs = Math.min(2_000, Math.max(0, options.backoffMs ?? 250));
  const sleep = options.sleep ?? delay;
  const baseUrl = (options.backendUrl ?? '').replace(/\/$/, '');
  let response: Response | null = null;
  let lastError: WatchlistError = { code: 'WATCHLIST_REQUEST_FAILED', message: 'Watchlist request failed' };

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      response = await fetchImpl(`${baseUrl}/api/quotes?symbols=${encodeURIComponent(symbols.join(','))}`, {
        headers: { Accept: 'application/json', ...(options.apiKey ? { 'X-API-Key': options.apiKey } : {}) }
      });
      if (response.ok || classifyProviderError(response.status) === 'terminal' || attempt === maxAttempts) break;
    } catch (error) {
      lastError = { code: 'NETWORK_ERROR', message: error instanceof Error ? error.message : String(error) };
      if (attempt === maxAttempts) break;
    }
    await sleep(backoffMs * (2 ** (attempt - 1)));
  }

  if (!response) return { items: [], errors: [lastError], status: 'unavailable' };
  const body = await response.json().catch(() => null) as Partial<WatchlistResult> | null;
  if (!response.ok) {
    return {
      items: [],
      errors: [{ code: `HTTP_${response.status}`, message: (body as { error?: string } | null)?.error ?? `Watchlist request failed with ${response.status}` }],
      status: 'unavailable'
    };
  }
  return {
    items: Array.isArray(body?.items) ? body.items as MarketQuote[] : [],
    errors: Array.isArray(body?.errors) ? body.errors as WatchlistError[] : [],
    status: body?.status === 'connected' || body?.status === 'degraded' ? body.status : 'unavailable'
  };
}
