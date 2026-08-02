import {
  MarketIndex,
  HeatmapItem,
  CandleData,
  PreciousMetal,
  TapeTick,
  AdapterMode
} from '../types';

export interface DataState {
  indices: MarketIndex[];
  heatmap: HeatmapItem[];
  aaplCandles: CandleData[];
  currentAAPLPrice: number;
  metals: PreciousMetal[];
  tape: TapeTick[];
  mode: AdapterMode;
  speed: number; // 1 = normal, 2 = fast, 5 = ultra
  volatility: number; // 1 = normal, 2 = high
}

export type DataListener = (state: DataState) => void;

class MarketDataAdapter {
  private listeners: Set<DataListener> = new Set();
  private timer: number | null = null;
  private mode: AdapterMode = 'simulated';
  private speed: number = 1;
  private volatility: number = 1;

  private indices: MarketIndex[] = [];
  private heatmap: HeatmapItem[] = [];
  private aaplCandles: CandleData[] = [];
  private currentAAPLPrice: number = 228.50;
  private metals: PreciousMetal[] = [];
  private tape: TapeTick[] = [];

  constructor() {
    // Initial state setup is called from app component
  }

  public init(
    initialIndices: MarketIndex[],
    initialHeatmap: HeatmapItem[],
    initialCandles: CandleData[],
    initialMetals: PreciousMetal[],
    initialTape: TapeTick[]
  ) {
    this.indices = [...initialIndices];
    this.heatmap = [...initialHeatmap];
    this.aaplCandles = [...initialCandles];
    this.metals = [...initialMetals];
    this.tape = [...initialTape];

    if (this.aaplCandles.length > 0) {
      this.currentAAPLPrice = this.aaplCandles[this.aaplCandles.length - 1].close;
    }

    this.startSimulation();
  }

  public subscribe(listener: DataListener): () => void {
    this.listeners.add(listener);
    // Notify immediate initial state
    listener(this.getState());

    return () => {
      this.listeners.delete(listener);
    };
  }

  public getState(): DataState {
    return {
      indices: this.indices,
      heatmap: this.heatmap,
      aaplCandles: this.aaplCandles,
      currentAAPLPrice: this.currentAAPLPrice,
      metals: this.metals,
      tape: this.tape,
      mode: this.mode,
      speed: this.speed,
      volatility: this.volatility
    };
  }

  public setMode(mode: AdapterMode) {
    this.mode = mode;
    this.notify();
  }

  public setSpeed(speed: number) {
    this.speed = speed;
    this.restartTimer();
  }

  public setVolatility(volatility: number) {
    this.volatility = volatility;
  }

  private restartTimer() {
    if (this.timer) {
      window.clearInterval(this.timer);
    }
    const interval = Math.max(200, 1000 / this.speed);
    this.timer = window.setInterval(() => this.tick(), interval);
  }

  private startSimulation() {
    this.restartTimer();
  }

  public stopSimulation() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private tick() {
    const volFactor = 0.0015 * this.volatility;

    // 1. Tick Indices
    this.indices = this.indices.map(idx => {
      if (Math.random() > 0.3) {
        const deltaPct = (Math.random() - 0.49) * volFactor;
        const oldPrice = idx.price;
        const newPrice = Number((oldPrice * (1 + deltaPct)).toFixed(2));
        const flash = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : null;
        const newChange = Number((idx.change + (newPrice - oldPrice)).toFixed(2));
        const newChangePct = Number(((newChange / (newPrice - newChange)) * 100).toFixed(2));

        const updatedSparkline = [...idx.sparkline.slice(1), newPrice];

        return {
          ...idx,
          price: newPrice,
          change: newChange,
          changePercent: newChangePct,
          high: Math.max(idx.high, newPrice),
          low: Math.min(idx.low, newPrice),
          sparkline: updatedSparkline,
          flash,
          lastUpdate: Date.now()
        };
      }
      return idx;
    });

    // 2. Tick Metals
    this.metals = this.metals.map(metal => {
      if (Math.random() > 0.35) {
        const deltaPct = (Math.random() - 0.49) * volFactor * 1.2;
        const oldPrice = metal.price;
        const decimals = metal.price < 10 ? 2 : 2;
        const newPrice = Number((oldPrice * (1 + deltaPct)).toFixed(decimals));
        const flash = newPrice > oldPrice ? 'up' : newPrice < oldPrice ? 'down' : null;
        
        const spread = Number((newPrice * 0.0003).toFixed(2));
        const newBid = Number((newPrice - spread).toFixed(2));
        const newAsk = Number((newPrice + spread).toFixed(2));

        const newChange = Number((metal.change + (newPrice - oldPrice)).toFixed(decimals));
        const newChangePct = Number(((newChange / (newPrice - newChange)) * 100).toFixed(2));
        const updatedHistory = [...metal.history.slice(1), newPrice];

        return {
          ...metal,
          price: newPrice,
          change: newChange,
          changePercent: newChangePct,
          bid: newBid,
          ask: newAsk,
          high24h: Math.max(metal.high24h, newPrice),
          low24h: Math.min(metal.low24h, newPrice),
          history: updatedHistory,
          flash
        };
      }
      return metal;
    });

    // 3. Tick Sector Heatmap
    this.heatmap = this.heatmap.map(item => {
      if (Math.random() > 0.6) {
        const deltaPct = (Math.random() - 0.48) * volFactor * 2;
        const newPrice = Number((item.price * (1 + deltaPct)).toFixed(2));
        const newChangePct = Number((item.changePercent + deltaPct * 100).toFixed(2));
        return {
          ...item,
          price: newPrice,
          changePercent: newChangePct
        };
      }
      return item;
    });

    // 4. Tick AAPL 60-session chart (live last candle update)
    if (this.aaplCandles.length > 0) {
      const lastIdx = this.aaplCandles.length - 1;
      const lastCandle = { ...this.aaplCandles[lastIdx] };
      const deltaPct = (Math.random() - 0.48) * volFactor * 1.5;
      const newClose = Number((lastCandle.close * (1 + deltaPct)).toFixed(2));

      lastCandle.close = newClose;
      lastCandle.high = Math.max(lastCandle.high, newClose);
      lastCandle.low = Math.min(lastCandle.low, newClose);
      lastCandle.volume += Math.floor(Math.random() * 5000);

      this.currentAAPLPrice = newClose;
      this.aaplCandles[lastIdx] = lastCandle;

      // Update AAPL in Heatmap as well
      this.heatmap = this.heatmap.map(h => {
        if (h.ticker === 'AAPL') {
          return { ...h, price: newClose };
        }
        return h;
      });
    }

    // 5. Add Tape Ticks
    if (Math.random() > 0.4) {
      const tickers = ['AAPL', 'NVDA', 'MSFT', 'XAU/USD', 'XOM', 'TSM', 'JPM', 'BTC/USD', 'S&P500'];
      const randomTicker = tickers[Math.floor(Math.random() * tickers.length)];
      const isBuy = Math.random() > 0.45;
      
      let basePrice = 100;
      if (randomTicker === 'AAPL') basePrice = this.currentAAPLPrice;
      else if (randomTicker === 'NVDA') basePrice = 128.40;
      else if (randomTicker === 'MSFT') basePrice = 448.90;
      else if (randomTicker === 'XAU/USD') basePrice = this.metals[0]?.price || 2428;

      const price = Number((basePrice * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2));
      const size = Math.floor((Math.random() * 20 + 1) * 50);

      const now = new Date();
      const timeStr = now.toTimeString().split(' ')[0];

      const newTick: TapeTick = {
        id: Math.random().toString(36).substring(2, 9),
        timestamp: timeStr,
        ticker: randomTicker,
        type: isBuy ? 'BUY' : 'SELL',
        price,
        size
      };

      this.tape = [newTick, ...this.tape.slice(0, 19)];
    }

    this.notify();
  }

  private notify() {
    const state = this.getState();
    this.listeners.forEach(listener => listener(state));
  }
}

export const marketDataAdapter = new MarketDataAdapter();
