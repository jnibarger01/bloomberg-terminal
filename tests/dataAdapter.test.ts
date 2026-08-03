import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MarketDataAdapter,
  resetBackendConfigForTests,
  setApiKey,
  setBackendUrl
} from '../src/services/dataAdapter';
import type {
  CandleData,
  HeatmapItem,
  MarketIndex,
  NewsItem,
  PreciousMetal,
  TapeTick,
  WorldSession
} from '../src/types';

const indices: MarketIndex[] = [{
  symbol: 'SIM', name: 'Simulated', region: 'Americas', price: 1, change: 0,
  changePercent: 0, high: 1, low: 1, sparkline: [1, 1], lastUpdate: 0
}];
const heatmap: HeatmapItem[] = [{ ticker: 'SIM', name: 'Simulated', sector: 'AI & Tech', marketCapBillions: 1, price: 1, changePercent: 0 }];
const candles: CandleData[] = [{ time: '2026-01-01', open: 1, high: 1, low: 1, close: 1, volume: 1 }];
const metals: PreciousMetal[] = [{ symbol: 'SIM', name: 'Simulated', category: 'Metals', unit: '$', price: 1, change: 0, changePercent: 0, bid: 1, ask: 1, high24h: 1, low24h: 1, history: [1] }];
const tape: TapeTick[] = [{ id: 'sim', timestamp: '00:00:00', ticker: 'SIM', type: 'BUY', price: 1, size: 1 }];
const sessions: WorldSession[] = [{ city: 'Test', country: 'Test', timezone: 'UTC', utcoffset: 0, openHourUTC: 0, closeHourUTC: 1, exchange: 'TEST', currency: 'USD' }];
const news: NewsItem[] = [{ id: 'sim', time: '00:00:00', source: 'SIM', category: 'SIM', headline: 'Simulated', urgency: 'NORMAL' }];

function envelope<T>(items: T[], status: 'connected' | 'degraded' | 'unavailable' = 'connected') {
  return { status, source: 'test', asOf: new Date().toISOString(), items, errors: status === 'connected' ? [] : [{ message: 'degraded' }] };
}

async function initialize(adapter: MarketDataAdapter) {
  await adapter.init(indices, heatmap, candles, metals, tape, sessions, news, 'simulated');
  adapter.stopSimulation();
}

test.afterEach(() => resetBackendConfigForTests());

test('live mode enters failed state when backend authentication is not configured', async () => {
  const adapter = new MarketDataAdapter();
  await initialize(adapter);
  await adapter.setMode('live');
  const state = adapter.getState();
  assert.equal(state.connectionState, 'failed');
  assert.equal(state.indices.length, 0);
  assert.equal(state.tape.length, 0);
  adapter.stopSimulation();
});

test('successful provider refresh reaches connected state and wires news and sessions into DataState', async () => {
  setBackendUrl('https://backend.test');
  setApiKey('valid-key');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (request) => {
    const path = new URL(String(request)).pathname;
    const response = path === '/api/indices' ? envelope([{ ...indices[0], symbol: 'SPY' }])
      : path === '/api/heatmap' ? envelope([{ ...heatmap[0], ticker: 'AAPL' }])
        : path === '/api/metals' ? envelope([{ ...metals[0], symbol: 'GLD', sourceSymbol: 'GLD', proxy: true }])
          : path === '/api/news' ? envelope([{ ...news[0], id: 'provider-news', headline: 'Provider headline' }])
            : path.includes('/candles') ? envelope([{ ...candles[0], close: 200 }])
              : path === '/api/tape' ? envelope([{ ...tape[0], id: 'trade', type: 'TRADE' as const }])
                : envelope([{ ...sessions[0], city: 'Provider City' }]);
    return new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const adapter = new MarketDataAdapter();
    await initialize(adapter);
    await adapter.setMode('live');
    const state = adapter.getState();
    assert.equal(state.connectionState, 'connected');
    assert.equal(state.dataOrigin, 'provider');
    assert.equal(state.news[0].id, 'provider-news');
    assert.equal(state.sessions[0].city, 'Provider City');
    assert.equal(state.tape[0].type, 'TRADE');
    assert.equal(state.currentAAPLPrice, 200);
    adapter.stopSimulation();
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('partial provider failure reaches degraded state and does not retain simulated fallback data', async () => {
  setBackendUrl('https://backend.test');
  setApiKey('valid-key');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (request) => {
    const path = new URL(String(request)).pathname;
    if (path === '/api/tape') {
      return new Response(JSON.stringify(envelope([], 'unavailable')), { status: 503, headers: { 'content-type': 'application/json' } });
    }
    const response = path === '/api/indices' ? envelope([{ ...indices[0], symbol: 'SPY' }])
      : path === '/api/heatmap' ? envelope([{ ...heatmap[0], ticker: 'AAPL' }])
        : path === '/api/metals' ? envelope([{ ...metals[0], symbol: 'GLD' }])
          : path === '/api/news' ? envelope([{ ...news[0], id: 'provider-news' }])
            : path.includes('/candles') ? envelope([{ ...candles[0], close: 200 }])
              : envelope(sessions);
    return new Response(JSON.stringify(response), { status: 200, headers: { 'content-type': 'application/json' } });
  };

  try {
    const adapter = new MarketDataAdapter();
    await initialize(adapter);
    await adapter.setMode('live');
    const state = adapter.getState();
    assert.equal(state.connectionState, 'degraded');
    assert.deepEqual(state.tape, []);
    assert.equal(state.tape.some((item) => item.id === 'sim'), false);
    adapter.stopSimulation();
  } finally {
    globalThis.fetch = originalFetch;
  }
});
