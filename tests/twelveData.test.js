import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ProviderError,
  createApp,
  createTwelveDataClient
} from '../server.js';

const BACKEND_KEY = 'test-backend-key-0123456789';

function jsonResponse(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' }
  });
}

function twelveDataQuote(overrides = {}) {
  return {
    symbol: 'AAPL',
    close: '201.25',
    change: '1.75',
    percent_change: '0.876',
    high: '203.10',
    low: '198.20',
    previous_close: '199.50',
    timestamp: 1_700_000_000,
    ...overrides
  };
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

test('createApp selects Twelve Data and labels quote datasets accurately', async () => {
  const hosts = [];
  const app = createApp({
    backendApiKey: BACKEND_KEY,
    marketDataProvider: 'twelvedata',
    twelveDataApiKey: 'twelve-data-key',
    fetchImpl: async (requestUrl) => {
      const url = new URL(requestUrl);
      hosts.push(url.host);
      return jsonResponse(twelveDataQuote({ symbol: url.searchParams.get('symbol') }));
    }
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/indices`, { headers: authorizedHeaders() });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.status, 'connected');
    assert.equal(body.source, 'twelvedata');
    assert.equal(body.items.length, 10);
    assert.ok(hosts.every((host) => host === 'api.twelvedata.com'));
  });
});

test('Twelve Data sends the API key in the Authorization header', async () => {
  let authorization;
  const client = createTwelveDataClient({
    apiKey: 'secret-twelve-data-key',
    fetchImpl: async (_url, options) => {
      authorization = options.headers.Authorization;
      return jsonResponse(twelveDataQuote());
    }
  });

  await client.quote('AAPL');
  assert.equal(authorization, 'apikey secret-twelve-data-key');
});

test('Twelve Data quote fields normalize to the existing provider interface', async () => {
  const client = createTwelveDataClient({
    apiKey: 'provider-key',
    fetchImpl: async () => jsonResponse(twelveDataQuote())
  });

  assert.deepEqual(await client.quote('AAPL'), {
    c: 201.25,
    d: 1.75,
    dp: 0.876,
    h: 203.1,
    l: 198.2,
    pc: 199.5,
    t: 1_700_000_000
  });
});

test('Twelve Data maps provider HTTP failures to ProviderError', async () => {
  const client = createTwelveDataClient({
    apiKey: 'provider-key',
    fetchImpl: async () => jsonResponse({ status: 'error', code: 429, message: 'rate limited' }, 429)
  });

  await assert.rejects(
    () => client.quote('AAPL'),
    (error) => error instanceof ProviderError
      && error.code === 'PROVIDER_RATE_LIMITED'
      && error.status === 429
  );
});

test('Twelve Data rejects invalid JSON responses', async () => {
  const client = createTwelveDataClient({
    apiKey: 'provider-key',
    fetchImpl: async () => new Response('not-json', { status: 200 })
  });

  await assert.rejects(
    () => client.quote('AAPL'),
    (error) => error instanceof ProviderError && error.code === 'INVALID_PROVIDER_RESPONSE'
  );
});

test('Twelve Data aborts requests that exceed the upstream timeout', async () => {
  const client = createTwelveDataClient({
    apiKey: 'provider-key',
    timeoutMs: 10,
    fetchImpl: async (_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener('abort', () => {
        reject(Object.assign(new Error('aborted'), { name: 'AbortError' }));
      });
    })
  });

  await assert.rejects(
    () => client.quote('AAPL'),
    (error) => error instanceof ProviderError && error.code === 'UPSTREAM_TIMEOUT'
  );
});

test('Twelve Data reuses cached quote responses', async () => {
  let calls = 0;
  const client = createTwelveDataClient({
    apiKey: 'provider-key',
    fetchImpl: async () => {
      calls += 1;
      return jsonResponse(twelveDataQuote());
    }
  });

  await client.quote('AAPL');
  await client.quote('AAPL');
  assert.equal(calls, 1);
});

test('unsupported Twelve Data capabilities fail explicitly without Finnhub fallback', async () => {
  let fetchCalls = 0;
  const app = createApp({
    backendApiKey: BACKEND_KEY,
    marketDataProvider: 'twelvedata',
    twelveDataApiKey: 'provider-key',
    fetchImpl: async () => {
      fetchCalls += 1;
      throw new Error('No provider request should occur for unsupported news');
    }
  });

  await withServer(app, async (baseUrl) => {
    const response = await fetch(`${baseUrl}/api/news`, { headers: authorizedHeaders() });
    const body = await response.json();
    assert.equal(response.status, 503);
    assert.equal(body.status, 'unavailable');
    assert.equal(body.source, 'twelvedata');
    assert.equal(body.errors[0].code, 'PROVIDER_CAPABILITY_UNAVAILABLE');
    assert.equal(
      body.errors[0].message,
      'The selected Twelve Data adapter does not yet provide news'
    );
    assert.equal(fetchCalls, 0);
  });
});
