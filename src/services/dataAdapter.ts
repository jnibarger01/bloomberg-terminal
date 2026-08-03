import type {
  AdapterMode,
  CandleData,
  ConnectionState,
  DataOrigin,
  HeatmapItem,
  MarketIndex,
  NewsItem,
  PreciousMetal,
  TapeTick,
  WorldSession
} from '../types';

export interface DataState {
  indices: MarketIndex[];
  heatmap: HeatmapItem[];
  aaplCandles: CandleData[];
  currentAAPLPrice: number;
  metals: PreciousMetal[];
  tape: TapeTick[];
  sessions: WorldSession[];
  news: NewsItem[];
  mode: AdapterMode;
  connectionState: ConnectionState;
  dataOrigin: DataOrigin;
  connectionError: string | null;
  lastSuccessfulUpdate: number | null;
  speed: number;
  volatility: number;
}

interface ApiEnvelope<T> {
  status: 'connected' | 'degraded' | 'unavailable';
  source: string;
  asOf: string;
  items: T[];
  errors?: Array<{ code?: string; message?: string; symbol?: string }>;
  metadata?: Record<string, unknown>;
}

interface SimulatedSnapshot {
  indices: MarketIndex[];
  heatmap: HeatmapItem[];
  aaplCandles: CandleData[];
  currentAAPLPrice: number;
  metals: PreciousMetal[];
  tape: TapeTick[];
  sessions: WorldSession[];
  news: NewsItem[];
}

export type DataListener = (state: DataState) => void;

const configuredBackendUrl = (import.meta as ImportMeta & { env?: { VITE_BACKEND_URL?: string } }).env?.VITE_BACKEND_URL || '';
let backendUrl = configuredBackendUrl.replace(/\/$/, '');
let apiKey: string | null = null;

export function setBackendUrl(url: string) {
  backendUrl = String(url || '').trim().replace(/\/$/, '');
}

export function setApiKey(key: string) {
  const normalized = String(key || '').trim();
  apiKey = normalized || null;
}

export function resetBackendConfigForTests() {
  backendUrl = '';
  apiKey = null;
}

function formatApiError(body: unknown, status: number) {
  if (body && typeof body === 'object') {
    const record = body as { error?: string; errors?: Array<{ message?: string }> };
    if (record.error) return record.error;
    const messages = record.errors?.map((error) => error.message).filter(Boolean);
    if (messages?.length) return messages.join('; ');
  }
  return `API request failed with ${status}`;
}

async function fetchWithAuth<T>(endpoint: string): Promise<ApiEnvelope<T>> {
  if (!apiKey) throw new Error('Backend API key is not configured');
  const controller = new AbortController();
  const timeout = globalThis.setTimeout(() => controller.abort(), 10_000);
  try {
    const response = await fetch(`${backendUrl}${endpoint}`, {
      headers: { Accept: 'application/json', 'X-API-Key': apiKey },
      signal: controller.signal
    });
    const body = await response.json().catch(() => null);
    if (!response.ok) throw new Error(formatApiError(body, response.status));
    return body as ApiEnvelope<T>;
  } catch (error) {
    if ((error as Error)?.name === 'AbortError') throw new Error(`Request timed out: ${endpoint}`);
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
  }
}

export class MarketDataAdapter {
  private listeners = new Set<DataListener>();
  private timer: ReturnType<typeof globalThis.setInterval> | null = null;
  private refreshInFlight: Promise<void> | null = null;
  private simulatedSnapshot: SimulatedSnapshot | null = null;

  private state: DataState = {
    indices: [],
    heatmap: [],
    aaplCandles: [],
    currentAAPLPrice: 0,
    metals: [],
    tape: [],
    sessions: [],
    news: [],
    mode: 'simulated',
    connectionState: 'connected',
    dataOrigin: 'simulated',
    connectionError: null,
    lastSuccessfulUpdate: null,
    speed: 1,
    volatility: 1
  };

  public async init(
    initialIndices: MarketIndex[],
    initialHeatmap: HeatmapItem[],
    initialCandles: CandleData[],
    initialMetals: PreciousMetal[],
    initialTape: TapeTick[],
    initialSessions: WorldSession[] = [],
    initialNews: NewsItem[] = [],
    initialMode: AdapterMode = 'simulated'
  ) {
    const currentAAPLPrice = initialCandles.at(-1)?.close ?? 0;
    this.simulatedSnapshot = {
      indices: structuredClone(initialIndices),
      heatmap: structuredClone(initialHeatmap),
      aaplCandles: structuredClone(initialCandles),
      currentAAPLPrice,
      metals: structuredClone(initialMetals),
      tape: structuredClone(initialTape),
      sessions: structuredClone(initialSessions),
      news: structuredClone(initialNews)
    };
    this.restoreSimulatedSnapshot();
    if (initialMode === 'live') await this.setMode('live');
    else this.restartTimer();
  }

  public subscribe(listener: DataListener): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  public getState(): DataState {
    return {
      ...this.state,
      indices: [...this.state.indices],
      heatmap: [...this.state.heatmap],
      aaplCandles: [...this.state.aaplCandles],
      metals: [...this.state.metals],
      tape: [...this.state.tape],
      sessions: [...this.state.sessions],
      news: [...this.state.news]
    };
  }

  public async setMode(mode: AdapterMode) {
    this.state.mode = mode;
    this.stopTimer();
    if (mode === 'simulated') {
      this.restoreSimulatedSnapshot();
      this.restartTimer();
      this.notify();
      return;
    }
    this.state.connectionState = 'connecting';
    this.state.dataOrigin = 'provider';
    this.state.connectionError = null;
    this.clearLiveDatasets();
    this.notify();
    await this.refreshLiveData();
    this.restartTimer();
  }

  public setSpeed(speed: number) {
    this.state.speed = Math.max(0, speed);
    this.restartTimer();
    this.notify();
  }

  public setVolatility(volatility: number) {
    this.state.volatility = Math.max(0.1, volatility);
  }

  public stopSimulation() {
    this.stopTimer();
  }

  public async refreshLiveData() {
    if (this.state.mode !== 'live') return;
    if (this.refreshInFlight) return this.refreshInFlight;
    this.refreshInFlight = this.performLiveRefresh().finally(() => {
      this.refreshInFlight = null;
    });
    return this.refreshInFlight;
  }

  private async performLiveRefresh() {
    const requests = await Promise.allSettled([
      fetchWithAuth<MarketIndex>('/api/indices'),
      fetchWithAuth<HeatmapItem>('/api/heatmap'),
      fetchWithAuth<PreciousMetal>('/api/metals'),
      fetchWithAuth<NewsItem>('/api/news'),
      fetchWithAuth<CandleData>('/api/stocks/AAPL/candles'),
      fetchWithAuth<TapeTick>('/api/tape'),
      fetchWithAuth<WorldSession>('/api/sessions')
    ]);

    const errors: string[] = [];
    let successfulProviderDatasets = 0;
    let degraded = false;

    const consume = <T>(
      result: PromiseSettledResult<ApiEnvelope<T>>,
      apply: (items: T[]) => void,
      providerDataset = true
    ) => {
      if (result.status === 'rejected') {
        errors.push(result.reason instanceof Error ? result.reason.message : String(result.reason));
        degraded = true;
        apply([]);
        return;
      }
      const envelope = result.value;
      apply(Array.isArray(envelope.items) ? envelope.items : []);
      if (providerDataset && envelope.items.length > 0) successfulProviderDatasets += 1;
      if (envelope.status !== 'connected') degraded = true;
      envelope.errors?.forEach((error) => errors.push(error.message || error.code || 'Dataset degraded'));
    };

    consume(requests[0], (items) => { this.state.indices = items; });
    consume(requests[1], (items) => { this.state.heatmap = items; });
    consume(requests[2], (items) => { this.state.metals = items; });
    consume(requests[3], (items) => { this.state.news = items; });
    consume(requests[4], (items) => {
      this.state.aaplCandles = items;
      this.state.currentAAPLPrice = items.at(-1)?.close ?? 0;
    });
    consume(requests[5], (items) => { this.state.tape = items; });
    consume(requests[6], (items) => { this.state.sessions = items; }, false);

    if (successfulProviderDatasets === 0) {
      this.state.connectionState = 'failed';
      this.state.connectionError = errors.join('; ') || 'No provider datasets were available';
      this.state.lastSuccessfulUpdate = null;
    } else {
      this.state.connectionState = degraded ? 'degraded' : 'connected';
      this.state.connectionError = errors.length > 0 ? errors.join('; ') : null;
      this.state.lastSuccessfulUpdate = Date.now();
    }
    this.state.dataOrigin = 'provider';
    this.notify();
  }

  private clearLiveDatasets() {
    this.state.indices = [];
    this.state.heatmap = [];
    this.state.aaplCandles = [];
    this.state.currentAAPLPrice = 0;
    this.state.metals = [];
    this.state.tape = [];
    this.state.sessions = [];
    this.state.news = [];
  }

  private restoreSimulatedSnapshot() {
    if (!this.simulatedSnapshot) return;
    this.state = {
      ...this.state,
      indices: structuredClone(this.simulatedSnapshot.indices),
      heatmap: structuredClone(this.simulatedSnapshot.heatmap),
      aaplCandles: structuredClone(this.simulatedSnapshot.aaplCandles),
      currentAAPLPrice: this.simulatedSnapshot.currentAAPLPrice,
      metals: structuredClone(this.simulatedSnapshot.metals),
      tape: structuredClone(this.simulatedSnapshot.tape),
      sessions: structuredClone(this.simulatedSnapshot.sessions),
      news: structuredClone(this.simulatedSnapshot.news),
      mode: 'simulated',
      connectionState: 'connected',
      dataOrigin: 'simulated',
      connectionError: null,
      lastSuccessfulUpdate: null
    };
  }

  private restartTimer() {
    this.stopTimer();
    if (this.state.speed <= 0) return;
    if (this.state.mode === 'live') {
      this.timer = globalThis.setInterval(() => void this.refreshLiveData(), 30_000);
      return;
    }
    const interval = Math.max(200, 1000 / this.state.speed);
    this.timer = globalThis.setInterval(() => this.tickSimulation(), interval);
  }

  private stopTimer() {
    if (this.timer) globalThis.clearInterval(this.timer);
    this.timer = null;
  }

  private tickSimulation() {
    if (this.state.mode !== 'simulated') return;
    const volatility = 0.0015 * this.state.volatility;
    this.state.indices = this.state.indices.map((index) => {
      if (Math.random() <= 0.3) return index;
      const delta = (Math.random() - 0.49) * volatility;
      const previous = index.price;
      const price = Number((previous * (1 + delta)).toFixed(2));
      const change = Number((index.change + price - previous).toFixed(2));
      return {
        ...index,
        price,
        change,
        changePercent: Number(((change / Math.max(0.01, price - change)) * 100).toFixed(2)),
        high: Math.max(index.high, price),
        low: Math.min(index.low, price),
        sparkline: [...index.sparkline.slice(1), price],
        flash: price > previous ? 'up' : price < previous ? 'down' : null,
        lastUpdate: Date.now()
      };
    });
    this.state.heatmap = this.state.heatmap.map((item) => {
      if (Math.random() <= 0.6) return item;
      const delta = (Math.random() - 0.48) * volatility * 2;
      return {
        ...item,
        price: Number((item.price * (1 + delta)).toFixed(2)),
        changePercent: Number((item.changePercent + delta * 100).toFixed(2))
      };
    });
    this.state.metals = this.state.metals.map((item) => {
      if (Math.random() <= 0.35) return item;
      const delta = (Math.random() - 0.49) * volatility * 1.2;
      const previous = item.price;
      const price = Number((previous * (1 + delta)).toFixed(2));
      const change = Number((item.change + price - previous).toFixed(2));
      return {
        ...item,
        price,
        change,
        changePercent: Number(((change / Math.max(0.01, price - change)) * 100).toFixed(2)),
        bid: Number((price * 0.9997).toFixed(2)),
        ask: Number((price * 1.0003).toFixed(2)),
        high24h: Math.max(item.high24h, price),
        low24h: Math.min(item.low24h, price),
        history: [...item.history.slice(1), price],
        flash: price > previous ? 'up' : price < previous ? 'down' : null
      };
    });
    if (this.state.aaplCandles.length > 0) {
      const lastIndex = this.state.aaplCandles.length - 1;
      const candle = { ...this.state.aaplCandles[lastIndex] };
      const delta = (Math.random() - 0.48) * volatility * 1.5;
      candle.close = Number((candle.close * (1 + delta)).toFixed(2));
      candle.high = Math.max(candle.high, candle.close);
      candle.low = Math.min(candle.low, candle.close);
      candle.volume += Math.floor(Math.random() * 5000);
      this.state.aaplCandles[lastIndex] = candle;
      this.state.currentAAPLPrice = candle.close;
    }
    this.notify();
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => listener(state));
  }
}

export const marketDataAdapter = new MarketDataAdapter();
