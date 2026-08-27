import assert from 'node:assert/strict';
import test from 'node:test';
import { fetchWatchlistQuotes, classifyProviderError } from '../src/services/watchlist';

test('watchlist rejects instruments that are not resolved in the registry', async () => {
  await assert.rejects(
    () => fetchWatchlistQuotes(['index:spx'], { fetchImpl: async () => new Response() }),
    /not available in the validated instrument registry/
  );
});

test('watchlist retries transient provider failures and returns partial results', async () => {
  let attempts = 0;
  const result = await fetchWatchlistQuotes(
    ['equity:aapl:xnas', 'equity:msft:xnas'],
    {
      apiKey: 'test-key',
      backendUrl: 'http://backend.test',
      fetchImpl: async (request) => {
        attempts += 1;
        const symbols = new URL(String(request)).searchParams.get('symbols');
        if (attempts === 1) return new Response(JSON.stringify({ error: 'busy' }), { status: 503 });
        return new Response(JSON.stringify({
          status: 'degraded',
          source: 'test',
          asOf: new Date().toISOString(),
          items: [{ instrumentId: 'equity:aapl:xnas', price: 200, change: 1, changePercent: 0.5, currency: 'USD' }],
          errors: [{ symbol: 'MSFT', code: 'NO_PROVIDER_DATA', message: 'No quote' }]
        }), { status: 200 });
      },
      maxAttempts: 2,
      backoffMs: 0
    }
  );
  assert.equal(attempts, 2);
  assert.equal(result.items[0].instrumentId, 'equity:aapl:xnas');
  assert.equal(result.errors[0].code, 'NO_PROVIDER_DATA');
});

test('provider errors classify rate limits and auth failures as terminal or retryable', () => {
  assert.equal(classifyProviderError(429), 'retryable');
  assert.equal(classifyProviderError(503), 'retryable');
  assert.equal(classifyProviderError(401), 'terminal');
  assert.equal(classifyProviderError(400), 'terminal');
});