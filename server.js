/**
 * Protected market-data backend.
 *
 * The server fails closed when BACKEND_API_KEY is missing, never substitutes
 * random values for provider failures, and returns explicit dataset status.
 */

import crypto from 'node:crypto';
import { pathToFileURL } from 'node:url';
import cors from 'cors';
import dotenv from 'dotenv';
import express from 'express';

dotenv.config();

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3000', 'http://localhost:5173'];
const DEFAULT_TRADE_SYMBOLS = ['AAPL', 'NVDA', 'MSFT', 'XOM', 'TSM', 'JPM'];
const SUPPORTED_PROVIDERS = new Set(['finnhub', 'twelvedata']);

const INDEX_PROXIES = [
  { symbol: 'SPY', label: 'S&P 500', name: 'S&P 500 ETF proxy', region: 'Americas' },
  { symbol: 'QQQ', label: 'NASDAQ 100', name: 'NASDAQ 100 ETF proxy', region: 'Americas' },
  { symbol: 'DIA', label: 'Dow Jones', name: 'Dow Jones ETF proxy', region: 'Americas' },
  { symbol: 'EWU', label: 'FTSE 100', name: 'United Kingdom ETF proxy', region: 'Europe' },
  { symbol: 'EWG', label: 'DAX 40', name: 'Germany ETF proxy', region: 'Europe' },
  { symbol: 'EWJ', label: 'Nikkei 225', name: 'Japan ETF proxy', region: 'Asia' },
  { symbol: 'EWH', label: 'Hang Seng', name: 'Hong Kong ETF proxy', region: 'Asia' },
  { symbol: 'ASHR', label: 'Shanghai', name: 'China A-shares ETF proxy', region: 'Asia' },
  { symbol: 'EWA', label: 'ASX 200', name: 'Australia ETF proxy', region: 'Asia' },
  { symbol: 'INDA', label: 'Nifty 50', name: 'India ETF proxy', region: 'Asia' }
];

const HEATMAP_SYMBOLS = [
  { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'AI & Tech' },
  { ticker: 'AAPL', name: 'Apple Inc', sector: 'AI & Tech' },
  { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'AI & Tech' },
  { ticker: 'GOOGL', name: 'Alphabet Inc', sector: 'AI & Tech' },
  { ticker: 'AMZN', name: 'Amazon.com', sector: 'AI & Tech' },
  { ticker: 'META', name: 'Meta Platforms', sector: 'AI & Tech' },
  { ticker: 'TSM', name: 'TSMC', sector: 'AI & Tech' },
  { ticker: 'AVGO', name: 'Broadcom Inc', sector: 'AI & Tech' },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'AI & Tech' },
  { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy' },
  { ticker: 'CVX', name: 'Chevron Corp', sector: 'Energy' },
  { ticker: 'COP', name: 'ConocoPhillips', sector: 'Energy' },
  { ticker: 'SLB', name: 'SLB', sector: 'Energy' },
  { ticker: 'EOG', name: 'EOG Resources', sector: 'Energy' },
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials' },
  { ticker: 'BAC', name: 'Bank of America', sector: 'Financials' },
  { ticker: 'WFC', name: 'Wells Fargo', sector: 'Financials' },
  { ticker: 'GS', name: 'Goldman Sachs', sector: 'Financials' },
  { ticker: 'MS', name: 'Morgan Stanley', sector: 'Financials' },
  { ticker: 'BLK', name: 'BlackRock Inc', sector: 'Financials' }
];

const COMMODITY_PROXIES = [
  { symbol: 'GLD', displaySymbol: 'GOLD ETF', name: 'Gold ETF proxy', category: 'Metals', unit: '$/share' },
  { symbol: 'SLV', displaySymbol: 'SILVER ETF', name: 'Silver ETF proxy', category: 'Metals', unit: '$/share' },
  { symbol: 'PPLT', displaySymbol: 'PLATINUM ETF', name: 'Platinum ETF proxy', category: 'Metals', unit: '$/share' },
  { symbol: 'PALL', displaySymbol: 'PALLADIUM ETF', name: 'Palladium ETF proxy', category: 'Metals', unit: '$/share' },
  { symbol: 'USO', displaySymbol: 'WTI ETF', name: 'WTI crude ETF proxy', category: 'Energy', unit: '$/share' },
  { symbol: 'BNO', displaySymbol: 'BRENT ETF', name: 'Brent crude ETF proxy', category: 'Energy', unit: '$/share' },
  { symbol: 'UNG', displaySymbol: 'NAT GAS ETF', name: 'Natural gas ETF proxy', category: 'Energy', unit: '$/share' },
  { symbol: 'CPER', displaySymbol: 'COPPER ETF', name: 'Copper ETF proxy', category: 'Metals', unit: '$/share' }
];

const WORLD_SESSIONS = [
  { city: 'New York', country: 'United States', timezone: 'America/New_York', utcoffset: -4, openHourUTC: 13.5, closeHourUTC: 20, exchange: 'NYSE / NASDAQ', currency: 'USD ($)' },
  { city: 'London', country: 'United Kingdom', timezone: 'Europe/London', utcoffset: 1, openHourUTC: 7, closeHourUTC: 15.5, exchange: 'LSE', currency: 'GBP (£)' },
  { city: 'Frankfurt', country: 'Germany', timezone: 'Europe/Berlin', utcoffset: 2, openHourUTC: 7, closeHourUTC: 15.5, exchange: 'XETRA', currency: 'EUR (€)' },
  { city: 'Tokyo', country: 'Japan', timezone: 'Asia/Tokyo', utcoffset: 9, openHourUTC: 0, closeHourUTC: 6, exchange: 'TSE', currency: 'JPY (¥)' },
  { city: 'Hong Kong', country: 'Hong Kong', timezone: 'Asia/Hong_Kong', utcoffset: 8, openHourUTC: 1.5, closeHourUTC: 8, exchange: 'HKEX', currency: 'HKD ($)' },
  { city: 'Sydney', country: 'Australia', timezone: 'Australia/Sydney', utcoffset: 10, openHourUTC: 0, closeHourUTC: 6, exchange: 'ASX', currency: 'AUD ($)' }
];

export class ProviderError extends Error {
  constructor(message, { code = 'PROVIDER_ERROR', status = 502 } = {}) {
    super(message);
    this.name = 'ProviderError';
    this.code = code;
    this.status = status;
  }
}

function parsePositiveInt(value, fallback) {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseAllowedOrigins(value) {
  const origins = String(value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  return origins.length > 0 ? origins : DEFAULT_ALLOWED_ORIGINS;
}

function parseMarketDataProvider(value) {
  const provider = String(value ?? 'finnhub').trim().toLowerCase();
  if (!SUPPORTED_PROVIDERS.has(provider)) {
    throw new Error(`Unsupported MARKET_DATA_PROVIDER: ${provider}`);
  }
  return provider;
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left ?? ''), 'utf8');
  const rightBuffer = Buffer.from(String(right ?? ''), 'utf8');
  if (leftBuffer.length === 0 || leftBuffer.length !== rightBuffer.length) return false;
  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function createConcurrencyGate(maxConcurrent) {
  let active = 0;
  const queue = [];
  const release = () => {
    active -= 1;
    const next = queue.shift();
    if (next) next();
  };
  return async function run(task) {
    if (active >= maxConcurrent) await new Promise((resolve) => queue.push(resolve));
    active += 1;
    try {
      return await task();
    } finally {
      release();
    }
  };
}

function createTtlCache() {
  const values = new Map();
  return {
    get(key) {
      const entry = values.get(key);
      if (!entry) return undefined;
      if (entry.expiresAt <= Date.now()) {
        values.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key, value, ttlMs) {
      values.set(key, { value, expiresAt: Date.now() + ttlMs });
    },
    clear() {
      values.clear();
    }
  };
}

export function createFinnhubClient({
  apiKey,
  fetchImpl = globalThis.fetch,
  timeoutMs = 8_000,
  maxConcurrent = 4,
  defaultCacheTtlMs = 15_000
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');
  const cache = createTtlCache();
  const runLimited = createConcurrencyGate(maxConcurrent);

  async function request(path, params = {}, { cacheTtlMs = defaultCacheTtlMs } = {}) {
    if (!apiKey) {
      throw new ProviderError('Finnhub API key is not configured', {
        code: 'PROVIDER_NOT_CONFIGURED',
        status: 503
      });
    }

    const url = new URL(`https://finnhub.io/api/v1/${path}`);
    url.searchParams.set('token', apiKey);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    const cacheKey = url.toString();
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const payload = await runLimited(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(url, {
          headers: { Accept: 'application/json' },
          signal: controller.signal
        });
        const text = await response.text();
        let body = null;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          throw new ProviderError('Provider returned invalid JSON', { code: 'INVALID_PROVIDER_RESPONSE' });
        }
        if (!response.ok) {
          throw new ProviderError(`Finnhub request failed with ${response.status}`, {
            code: response.status === 429 ? 'PROVIDER_RATE_LIMITED' : 'PROVIDER_HTTP_ERROR',
            status: response.status
          });
        }
        return body;
      } catch (error) {
        if (error?.name === 'AbortError') {
          throw new ProviderError('Finnhub request timed out', {
            code: 'UPSTREAM_TIMEOUT',
            status: 504
          });
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    });

    cache.set(cacheKey, payload, cacheTtlMs);
    return payload;
  }

  return {
    request,
    quote: (symbol) => request('quote', { symbol }, { cacheTtlMs: 15_000 }),
    profile: (symbol) => request('stock/profile2', { symbol }, { cacheTtlMs: 6 * 60 * 60 * 1000 }),
    candles: (symbol, resolution, from, to) => request('stock/candle', { symbol, resolution, from, to }, { cacheTtlMs: 5 * 60 * 1000 }),
    news: () => request('news', { category: 'general' }, { cacheTtlMs: 60_000 }),
    clearCache: () => cache.clear()
  };
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function normalizeTwelveDataTimestamp(payload) {
  const timestamp = finiteNumber(payload?.timestamp);
  if (timestamp !== undefined) return timestamp > 1_000_000_000_000 ? Math.floor(timestamp / 1000) : Math.floor(timestamp);
  const parsed = Date.parse(String(payload?.datetime ?? ''));
  return Number.isFinite(parsed) ? Math.floor(parsed / 1000) : undefined;
}

function normalizeTwelveDataQuote(payload, symbol) {
  const current = finiteNumber(payload?.close);
  if (current === undefined || current <= 0) {
    throw new ProviderError(`No usable quote returned for ${symbol}`, {
      code: 'NO_PROVIDER_DATA',
      status: 502
    });
  }
  return {
    c: current,
    d: finiteNumber(payload.change),
    dp: finiteNumber(payload.percent_change),
    h: finiteNumber(payload.high),
    l: finiteNumber(payload.low),
    pc: finiteNumber(payload.previous_close),
    t: normalizeTwelveDataTimestamp(payload)
  };
}

function capabilityUnavailable(message) {
  return Promise.reject(new ProviderError(message, {
    code: 'PROVIDER_CAPABILITY_UNAVAILABLE',
    status: 501
  }));
}

export function createTwelveDataClient({
  apiKey,
  fetchImpl = globalThis.fetch,
  timeoutMs = 8_000,
  maxConcurrent = 4,
  defaultCacheTtlMs = 15_000
} = {}) {
  if (typeof fetchImpl !== 'function') throw new Error('A fetch implementation is required');
  const cache = createTtlCache();
  const runLimited = createConcurrencyGate(maxConcurrent);

  async function request(path, params = {}, { cacheTtlMs = defaultCacheTtlMs } = {}) {
    if (!apiKey) {
      throw new ProviderError('Twelve Data API key is not configured', {
        code: 'PROVIDER_NOT_CONFIGURED',
        status: 503
      });
    }

    const url = new URL(`https://api.twelvedata.com/${path}`);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }

    const cacheKey = url.toString();
    const cached = cache.get(cacheKey);
    if (cached !== undefined) return cached;

    const payload = await runLimited(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetchImpl(url, {
          headers: {
            Accept: 'application/json',
            Authorization: `apikey ${apiKey}`
          },
          signal: controller.signal
        });
        const text = await response.text();
        let body = null;
        try {
          body = text ? JSON.parse(text) : null;
        } catch {
          throw new ProviderError('Provider returned invalid JSON', { code: 'INVALID_PROVIDER_RESPONSE' });
        }

        if (!response.ok || body?.status === 'error') {
          const providerStatus = Number(body?.code);
          const status = Number.isInteger(providerStatus) && providerStatus >= 400 && providerStatus <= 599
            ? providerStatus
            : response.status >= 400
              ? response.status
              : 502;
          throw new ProviderError(body?.message || `Twelve Data request failed with ${status}`, {
            code: status === 429 ? 'PROVIDER_RATE_LIMITED' : 'PROVIDER_HTTP_ERROR',
            status
          });
        }
        return body;
      } catch (error) {
        if (error?.name === 'AbortError') {
          throw new ProviderError('Twelve Data request timed out', {
            code: 'UPSTREAM_TIMEOUT',
            status: 504
          });
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    });

    cache.set(cacheKey, payload, cacheTtlMs);
    return payload;
  }

  return {
    request,
    quote: async (symbol) => normalizeTwelveDataQuote(
      await request('quote', { symbol }, { cacheTtlMs: 15_000 }),
      symbol
    ),
    profile: () => capabilityUnavailable('The selected Twelve Data adapter does not yet provide company profiles'),
    candles: () => capabilityUnavailable('The selected Twelve Data adapter does not yet provide historical candles'),
    news: () => capabilityUnavailable('The selected Twelve Data adapter does not yet provide news'),
    clearCache: () => cache.clear()
  };
}

function assertQuote(quote, symbol) {
  if (!quote || !Number.isFinite(Number(quote.c)) || Number(quote.c) <= 0) {
    throw new ProviderError(`No usable quote returned for ${symbol}`, {
      code: 'NO_PROVIDER_DATA',
      status: 502
    });
  }
  return quote;
}

async function collectItems(definitions, mapper) {
  const settled = await Promise.allSettled(definitions.map(mapper));
  const items = [];
  const errors = [];
  settled.forEach((result, index) => {
    if (result.status === 'fulfilled') items.push(result.value);
    else {
      errors.push({
        symbol: definitions[index].symbol ?? definitions[index].ticker ?? 'unknown',
        code: result.reason?.code ?? 'PROVIDER_ERROR',
        message: result.reason?.message ?? 'Provider request failed'
      });
    }
  });
  return { items, errors };
}

function sendDataset(res, { items, errors = [], source = 'provider', metadata = {} }, successStatus = 200) {
  const status = items.length === 0 ? 'unavailable' : errors.length > 0 ? 'degraded' : 'connected';
  return res.status(items.length === 0 && successStatus === 200 ? 503 : successStatus).json({
    status,
    source,
    asOf: new Date().toISOString(),
    items,
    errors,
    metadata
  });
}

function calculateSma(prices, index, period) {
  if (index < period - 1) return undefined;
  const values = prices.slice(index - period + 1, index + 1);
  return Number((values.reduce((sum, value) => sum + value, 0) / period).toFixed(2));
}

function calculateRsi(prices, index, period = 14) {
  if (index < period) return undefined;
  let gains = 0;
  let losses = 0;
  for (let cursor = index - period + 1; cursor <= index; cursor += 1) {
    const difference = prices[cursor] - prices[cursor - 1];
    if (difference >= 0) gains += difference;
    else losses += Math.abs(difference);
  }
  const averageGain = gains / period;
  const averageLoss = losses / period;
  if (averageLoss === 0) return 100;
  const relativeStrength = averageGain / averageLoss;
  return Number((100 - (100 / (1 + relativeStrength))).toFixed(1));
}

function calculateEmaSeries(prices, period) {
  const multiplier = 2 / (period + 1);
  const result = [];
  let previous = prices[0];
  prices.forEach((price, index) => {
    previous = index === 0 ? price : ((price - previous) * multiplier) + previous;
    result.push(previous);
  });
  return result;
}

function transformCandles(data) {
  if (!data || data.s === 'no_data' || !Array.isArray(data.t) || data.t.length === 0) return [];
  const closes = data.c.map(Number);
  const ema12 = calculateEmaSeries(closes, 12);
  const ema26 = calculateEmaSeries(closes, 26);
  return data.t.map((timestamp, index) => ({
    time: new Date(Number(timestamp) * 1000).toISOString().slice(0, 10),
    open: Number(data.o[index]),
    high: Number(data.h[index]),
    low: Number(data.l[index]),
    close: closes[index],
    volume: Number(data.v[index]),
    ma20: calculateSma(closes, index, 20),
    ma50: calculateSma(closes, index, 50),
    rsi: calculateRsi(closes, index),
    macd: Number((ema12[index] - ema26[index]).toFixed(2))
  }));
}

function normalizeNews(items) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 20).map((item, index) => ({
    id: String(item.id ?? `${item.datetime ?? Date.now()}-${index}`),
    time: item.datetime ? new Date(Number(item.datetime) * 1000).toISOString().slice(11, 19) : 'N/A',
    source: String(item.source || 'FINNHUB').toUpperCase(),
    category: String(item.category || 'MARKET').toUpperCase(),
    headline: String(item.headline || '').trim(),
    urgency: 'NORMAL',
    url: item.url || undefined
  })).filter((item) => item.headline.length > 0);
}

function createRateLimiter({ windowMs, maxRequests }) {
  const buckets = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now ? { count: 0, resetAt: now + windowMs } : current;
    bucket.count += 1;
    buckets.set(key, bucket);
    res.setHeader('RateLimit-Limit', String(maxRequests));
    res.setHeader('RateLimit-Remaining', String(Math.max(0, maxRequests - bucket.count)));
    res.setHeader('RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > maxRequests) return res.status(429).json({ error: 'Rate limit exceeded' });
    return next();
  };
}

function createUnavailableTradeSource(
  message = 'Provider trade stream is not available',
  source = 'provider-stream'
) {
  return {
    getSnapshot() {
      return {
        status: 'unavailable',
        source,
        items: [],
        errors: [{ code: 'TRADE_STREAM_UNAVAILABLE', message }]
      };
    }
  };
}

export function createFinnhubTradeStream({
  apiKey,
  symbols = DEFAULT_TRADE_SYMBOLS,
  WebSocketImpl = globalThis.WebSocket,
  maxItems = 200,
  reconnectDelayMs = 5_000
} = {}) {
  let socket = null;
  let stopped = true;
  let state = 'unavailable';
  let lastError = apiKey ? null : 'Finnhub API key is not configured';
  let trades = [];
  let reconnectTimer = null;

  function scheduleReconnect() {
    if (stopped || reconnectTimer) return;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, reconnectDelayMs);
  }

  function connect() {
    if (stopped) return;
    if (!apiKey || typeof WebSocketImpl !== 'function') {
      state = 'unavailable';
      lastError = !apiKey ? 'Finnhub API key is not configured' : 'WebSocket client is unavailable in this runtime';
      return;
    }
    state = 'connecting';
    socket = new WebSocketImpl(`wss://ws.finnhub.io?token=${encodeURIComponent(apiKey)}`);
    socket.addEventListener('open', () => {
      state = 'connected';
      lastError = null;
      symbols.forEach((symbol) => socket.send(JSON.stringify({ type: 'subscribe', symbol })));
    });
    socket.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse(String(event.data));
        if (payload.type !== 'trade' || !Array.isArray(payload.data)) return;
        const normalized = payload.data.map((trade, index) => ({
          id: `${trade.s}-${trade.t}-${index}`,
          timestamp: new Date(Number(trade.t)).toISOString().slice(11, 19),
          ticker: String(trade.s),
          type: 'TRADE',
          price: Number(trade.p),
          size: Number(trade.v),
          source: 'finnhub-websocket'
        })).filter((trade) => Number.isFinite(trade.price) && Number.isFinite(trade.size));
        trades = [...normalized.reverse(), ...trades].slice(0, maxItems);
      } catch (error) {
        state = 'degraded';
        lastError = `Invalid trade message: ${error.message}`;
      }
    });
    socket.addEventListener('error', () => {
      state = 'degraded';
      lastError = 'Finnhub trade stream error';
    });
    socket.addEventListener('close', () => {
      socket = null;
      if (!stopped) {
        state = 'degraded';
        lastError = 'Finnhub trade stream disconnected';
        scheduleReconnect();
      }
    });
  }

  return {
    start() {
      if (!stopped) return;
      stopped = false;
      connect();
    },
    stop() {
      stopped = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      reconnectTimer = null;
      if (socket) socket.close();
      socket = null;
    },
    getSnapshot() {
      const snapshotState = state === 'connected' && trades.length === 0 ? 'degraded' : state;
      return {
        status: snapshotState,
        source: 'finnhub-websocket',
        items: [...trades],
        errors: lastError ? [{ code: 'TRADE_STREAM_STATUS', message: lastError }] : []
      };
    }
  };
}

export function createApp(options = {}) {
  const backendApiKey = options.backendApiKey ?? process.env.BACKEND_API_KEY;
  const marketDataProvider = parseMarketDataProvider(
    options.marketDataProvider ?? process.env.MARKET_DATA_PROVIDER
  );
  const finnhubApiKey = options.finnhubApiKey ?? process.env.FINNHUB_API_KEY;
  const twelveDataApiKey = options.twelveDataApiKey ?? process.env.TWELVE_DATA_API_KEY;
  const allowedOrigins = options.allowedOrigins ?? parseAllowedOrigins(process.env.ALLOWED_ORIGINS);
  const requestTimeoutMs = options.requestTimeoutMs ?? parsePositiveInt(process.env.UPSTREAM_TIMEOUT_MS, 8_000);
  const maxConcurrent = options.maxConcurrent ?? parsePositiveInt(process.env.UPSTREAM_MAX_CONCURRENT, 4);
  const rateLimitWindowMs = options.rateLimitWindowMs ?? parsePositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60_000);
  const rateLimitMax = options.rateLimitMax ?? parsePositiveInt(process.env.RATE_LIMIT_MAX, 120);
  const selectedApiKey = marketDataProvider === 'twelvedata' ? twelveDataApiKey : finnhubApiKey;
  const provider = options.provider ?? (
    marketDataProvider === 'twelvedata'
      ? createTwelveDataClient({
        apiKey: twelveDataApiKey,
        fetchImpl: options.fetchImpl,
        timeoutMs: requestTimeoutMs,
        maxConcurrent
      })
      : createFinnhubClient({
        apiKey: finnhubApiKey,
        fetchImpl: options.fetchImpl,
        timeoutMs: requestTimeoutMs,
        maxConcurrent
      })
  );
  const providerSource = options.providerSource ?? marketDataProvider;
  const providerConfigured = Boolean(options.provider || selectedApiKey);
  const tradeSource = options.tradeSource ?? createUnavailableTradeSource(
    marketDataProvider === 'twelvedata'
      ? 'Twelve Data streaming is not implemented in quote-only Slice 2'
      : 'Finnhub trade stream is not started by createApp',
    marketDataProvider === 'twelvedata' ? 'twelvedata-rest' : 'finnhub-websocket'
  );
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);
  app.use(cors({
    credentials: true,
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin is not allowed'));
    }
  }));
  app.use(express.json({ limit: '32kb' }));

  const authorize = (req, res, next) => {
    if (!backendApiKey) return res.status(503).json({ error: 'Backend authorization is not configured' });
    const suppliedKey = req.get('x-api-key');
    if (!suppliedKey) return res.status(401).json({ error: 'X-API-Key header is required' });
    if (!safeEqual(suppliedKey, backendApiKey)) return res.status(403).json({ error: 'Invalid API key' });
    return next();
  };

  app.get('/health', (_req, res) => {
    const trade = tradeSource.getSnapshot();
    res.json({
      status: backendApiKey && providerConfigured ? 'healthy' : 'degraded',
      timestamp: new Date().toISOString(),
      authConfigured: Boolean(backendApiKey),
      providerConfigured,
      marketDataProvider,
      tradeStream: trade.status
    });
  });
  app.post('/auth/validate', authorize, (_req, res) => res.json({ valid: true }));
  app.use('/api', authorize, createRateLimiter({ windowMs: rateLimitWindowMs, maxRequests: rateLimitMax }));

  app.get('/api/indices', async (_req, res) => {
    const result = await collectItems(INDEX_PROXIES, async (definition) => {
      const quote = assertQuote(await provider.quote(definition.symbol), definition.symbol);
      return {
        symbol: definition.label,
        name: definition.name,
        region: definition.region,
        sourceSymbol: definition.symbol,
        proxy: true,
        price: Number(quote.c),
        change: Number(quote.d ?? 0),
        changePercent: Number(quote.dp ?? 0),
        high: Number(quote.h ?? quote.c),
        low: Number(quote.l ?? quote.c),
        sparkline: [Number(quote.pc ?? quote.c), Number(quote.c)],
        lastUpdate: Number(quote.t ? quote.t * 1000 : Date.now())
      };
    });
    return sendDataset(res, {
      ...result,
      source: providerSource,
      metadata: { instrumentType: 'US-listed ETF proxies' }
    });
  });

  app.get('/api/heatmap', async (_req, res) => {
    const definitions = HEATMAP_SYMBOLS.map((item) => ({ ...item, symbol: item.ticker }));
    const settled = await Promise.allSettled(definitions.map(async (definition) => {
      const quote = assertQuote(await provider.quote(definition.ticker), definition.ticker);
      let profile = null;
      let warning = null;
      try {
        profile = await provider.profile(definition.ticker);
      } catch (error) {
        warning = {
          symbol: definition.ticker,
          code: error.code ?? 'PROVIDER_ERROR',
          message: error.message ?? 'Provider profile request failed'
        };
      }
      const marketCapitalizationMillions = Number(profile?.marketCapitalization);
      return {
        item: {
          ticker: definition.ticker,
          name: definition.name,
          sector: definition.sector,
          marketCapBillions: Number.isFinite(marketCapitalizationMillions)
            ? Number((marketCapitalizationMillions / 1000).toFixed(2))
            : null,
          price: Number(quote.c),
          changePercent: Number(quote.dp ?? 0)
        },
        warning
      };
    }));
    const result = { items: [], errors: [] };
    settled.forEach((entry, index) => {
      if (entry.status === 'fulfilled') {
        result.items.push(entry.value.item);
        if (entry.value.warning) result.errors.push(entry.value.warning);
      } else {
        result.errors.push({
          symbol: definitions[index].ticker,
          code: entry.reason?.code ?? 'PROVIDER_ERROR',
          message: entry.reason?.message ?? 'Provider request failed'
        });
      }
    });
    return sendDataset(res, { ...result, source: providerSource });
  });

  app.get('/api/stocks/:symbol/candles', async (req, res) => {
    const symbol = String(req.params.symbol || '').toUpperCase();
    if (!/^[A-Z][A-Z0-9.-]{0,9}$/.test(symbol)) return res.status(400).json({ error: 'Invalid stock symbol' });
    const resolution = String(req.query.resolution || 'D');
    const to = Number(req.query.to || Math.floor(Date.now() / 1000));
    const from = Number(req.query.from || to - (120 * 24 * 60 * 60));
    try {
      const providerData = await provider.candles(symbol, resolution, from, to);
      const items = transformCandles(providerData);
      return sendDataset(res, {
        items,
        errors: items.length === 0 ? [{ symbol, code: 'NO_PROVIDER_DATA', message: 'No candle data returned' }] : [],
        source: providerSource,
        metadata: { symbol, resolution, entitlementMayBeRequired: true }
      });
    } catch (error) {
      return sendDataset(res, {
        items: [],
        errors: [{ symbol, code: error.code ?? 'PROVIDER_ERROR', message: error.message }],
        source: providerSource,
        metadata: { symbol, resolution, entitlementMayBeRequired: true }
      });
    }
  });

  app.get('/api/metals', async (_req, res) => {
    const result = await collectItems(COMMODITY_PROXIES, async (definition) => {
      const quote = assertQuote(await provider.quote(definition.symbol), definition.symbol);
      return {
        symbol: definition.displaySymbol,
        sourceSymbol: definition.symbol,
        proxy: true,
        name: definition.name,
        category: definition.category,
        unit: definition.unit,
        price: Number(quote.c),
        change: Number(quote.d ?? 0),
        changePercent: Number(quote.dp ?? 0),
        bid: null,
        ask: null,
        high24h: Number(quote.h ?? quote.c),
        low24h: Number(quote.l ?? quote.c),
        history: [Number(quote.pc ?? quote.c), Number(quote.c)]
      };
    });
    return sendDataset(res, {
      ...result,
      source: providerSource,
      metadata: { instrumentType: 'US-listed ETF proxies; not spot commodities' }
    });
  });

  app.get('/api/sessions', (_req, res) => sendDataset(res, {
    items: WORLD_SESSIONS,
    source: 'static-reference',
    metadata: { note: 'Reference exchange hours; holiday calendars are not included' }
  }));
  app.get('/api/tape', (_req, res) => sendDataset(res, tradeSource.getSnapshot()));
  app.get('/api/news', async (_req, res) => {
    try {
      const items = normalizeNews(await provider.news());
      return sendDataset(res, {
        items,
        errors: items.length === 0 ? [{ code: 'NO_PROVIDER_DATA', message: 'No provider news returned' }] : [],
        source: providerSource
      });
    } catch (error) {
      return sendDataset(res, {
        items: [],
        errors: [{ code: error.code ?? 'PROVIDER_ERROR', message: error.message }],
        source: providerSource
      });
    }
  });

  app.use((error, _req, res, _next) => {
    if (error?.message === 'Origin is not allowed') return res.status(403).json({ error: 'Origin is not allowed' });
    console.error(error);
    return res.status(500).json({ error: 'Internal server error' });
  });
  return app;
}

export function startServer(options = {}) {
  const port = options.port ?? parsePositiveInt(process.env.PORT, 4000);
  const backendApiKey = options.backendApiKey ?? process.env.BACKEND_API_KEY;
  if (!backendApiKey) throw new Error('BACKEND_API_KEY is required; refusing to start an unprotected server');
  const marketDataProvider = parseMarketDataProvider(
    options.marketDataProvider ?? process.env.MARKET_DATA_PROVIDER
  );
  const finnhubApiKey = options.finnhubApiKey ?? process.env.FINNHUB_API_KEY;
  const twelveDataApiKey = options.twelveDataApiKey ?? process.env.TWELVE_DATA_API_KEY;
  const tradeSource = options.tradeSource ?? (
    marketDataProvider === 'finnhub'
      ? createFinnhubTradeStream({ apiKey: finnhubApiKey })
      : createUnavailableTradeSource(
        'Twelve Data streaming is not implemented in quote-only Slice 2',
        'twelvedata-rest'
      )
  );
  tradeSource.start?.();
  const app = createApp({
    ...options,
    backendApiKey,
    marketDataProvider,
    finnhubApiKey,
    twelveDataApiKey,
    tradeSource
  });
  const server = app.listen(port, () => console.log(`Market-data backend listening on port ${port}`));
  server.on('close', () => tradeSource.stop?.());
  return server;
}

const isEntrypoint = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isEntrypoint) startServer();
