import assert from 'node:assert/strict';
import test from 'node:test';
import { ProviderError, createApp, createFinnhubClient } from '../server.js';

const BACKEND_KEY = 'test-backend-key-0123456789';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

async function withServer(app, run) {
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  const address = server.address();
  try {
    await run(`http://127.0.0.1:${address.port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

const authorizedHeaders = () => ({ 'X-API-Key': BACKEND_KEY });

test('all /api routes fail closed without a valid API key', async () => {
  const app = createApp({
    backendApiKey: BACKEND_KEY,
    finnhubApiKey: 'provider-key',
    fetchImpl: async () => jsonResponse({ c: 100 })
  });
  await withServer(app, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/sessions`)).status, 401);
    assert.equal((await fetch(`${baseUrl}/api/sessions`, { headers: { 'X-API-Key': 'wrong-key' } })).status, 403);
    const valid = await fetch(`${baseUrl}/api/sessions`, { headers: authorizedHeaders() });
    assert.equal(valid.status, 200);
    assert.equal((await valid.json()).status, 'connected');
  });
});

test('indices use provider-supported US-listed ETF proxy symbols', async () => {
  const requestedSymbols = [];
  const app = createApp({
    backendApiKey: BACKEND_KEY,
    finnhubApiKey: 'provider-key',
    fetchImpl: async (requestUrl) => {
      const url = new URL(requestUrl);
      requestedSymbols.push(url.searchParams.get('symbol'));
      return jsonResponse({ c: 100, d: 1, dp: 1, h: 101, l: 98, pc: 99, t: 1_700_000_000 });
    }
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/indices`, { headers: authorizedHeaders() });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, 'connected');
    assert.equal(body.items.length, 10);
    assert.ok(body.items.every((item) => item.proxy === true));
    assert.ok(requestedSymbols.includes('SPY'));
    assert.ok(requestedSymbols.every((symbol) => !symbol.startsWith('INDEX:')));
  });
});

test('heatmap uses marketCapitalization and never generates random fallback values', async () => {
  const app = createApp({
    backendApiKey: BACKEND_KEY,
    finnhubApiKey: 'provider-key',
    fetchImpl: async (requestUrl) => {
      const url = new URL(requestUrl);
      if (url.pathname.endsWith('/stock/profile2')) return jsonResponse({ marketCapitalization: 3_500_000 });
      return jsonResponse({ c: 125, d: 2, dp: 1.6, h: 127, l: 120, pc: 123 });
    }
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/heatmap`, { headers: authorizedHeaders() });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.items[0].marketCapBillions, 3500);
    assert.ok(body.items.every((item) => item.price === 125));
  });
});

test('partial provider failures return degraded data without synthetic substitutes', async () => {
  const app = createApp({
    backendApiKey: BACKEND_KEY,
    finnhubApiKey: 'provider-key',
    fetchImpl: async (requestUrl) => {
      const url = new URL(requestUrl);
      if (url.searchParams.get('symbol') === 'EWU') return jsonResponse({ error: 'limited' }, 429);
      return jsonResponse({ c: 100, d: 1, dp: 1, h: 101, l: 99, pc: 99 });
    }
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/indices`, { headers: authorizedHeaders() });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, 'degraded');
    assert.equal(body.items.length, 9);
    assert.equal(body.items.some((item) => item.sourceSymbol === 'EWU'), false);
    assert.equal(body.errors[0].code, 'PROVIDER_RATE_LIMITED');
  });
});

test('tape exposes provider trade records without inferred buy or sell side', async () => {
  const tradeSource = {
    getSnapshot: () => ({
      status: 'connected',
      source: 'finnhub-websocket',
      items: [{ id: 'trade-1', timestamp: '12:00:00', ticker: 'AAPL', type: 'TRADE', price: 200, size: 10 }],
      errors: []
    })
  };
  const app = createApp({
    backendApiKey: BACKEND_KEY,
    finnhubApiKey: 'provider-key',
    tradeSource,
    fetchImpl: async () => jsonResponse({})
  });
  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/tape`, { headers: authorizedHeaders() });
    const body = await response.json();
    assert.equal(body.items[0].type, 'TRADE');
    assert.equal(body.items.some((item) => item.type === 'BUY' || item.type === 'SELL'), false);
  });
});

test('API rate limiter rejects requests beyond the configured window', async () => {
  const app = createApp({
    backendApiKey: BACKEND_KEY,
    finnhubApiKey: 'provider-key',
    rateLimitMax: 2,
    rateLimitWindowMs: 60_000,
    fetchImpl: async () => jsonResponse({})
  });
  await withServer(app, async (baseUrl) => {
    assert.equal((await fetch(`${baseUrl}/api/sessions`, { headers: authorizedHeaders() })).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/sessions`, { headers: authorizedHeaders() })).status, 200);
    assert.equal((await fetch(`${baseUrl}/api/sessions`, { headers: authorizedHeaders() })).status, 429);
  });
});

test('provider client caches requests and enforces maximum concurrency', async () => {
  let calls = 0;
  let active = 0;
  let peakActive = 0;
  const client = createFinnhubClient({
    apiKey: 'provider-key',
    maxConcurrent: 2,
    fetchImpl: async () => {
      calls += 1;
      active += 1;
      peakActive = Math.max(peakActive, active);
      await new Promise((resolve) => setTimeout(resolve, 15));
      active -= 1;
      return jsonResponse({ c: 100 });
    }
  });
  await Promise.all([client.quote('AAPL'), client.quote('MSFT'), client.quote('NVDA'), client.quote('XOM')]);
  assert.equal(peakActive, 2);
  await client.quote('AAPL');
  assert.equal(calls, 4);
});

test('provider client aborts requests that exceed the upstream timeout', async () => {
  const client = createFinnhubClient({
    apiKey: 'provider-key',
    timeoutMs: 10,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
    })
  });
  await assert.rejects(
    () => client.quote('AAPL'),
    (error) => error instanceof ProviderError && error.code === 'UPSTREAM_TIMEOUT'
  );
});
