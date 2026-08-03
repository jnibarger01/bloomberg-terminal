export type ThemeColor = 'green' | 'amber' | 'cyan' | 'monochrome';

export type AdapterMode = 'simulated' | 'live';
export type ConnectionState = 'connecting' | 'connected' | 'degraded' | 'failed';
export type DataOrigin = 'simulated' | 'provider' | 'mixed';

export type WidgetType =
  | 'global_indices'
  | 'sector_heatmap'
  | 'aapl_chart'
  | 'precious_metals'
  | 'world_clocks'
  | 'order_tape'
  | 'market_news';

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
}

export interface WidgetConfig {
  id: string;
  type: WidgetType;
  title: string;
  position: WidgetPosition;
  isMinimized?: boolean;
  isMaximized?: boolean;
}

export interface MarketIndex {
  symbol: string;
  name: string;
  region: 'Americas' | 'Europe' | 'Asia';
  sourceSymbol?: string;
  proxy?: boolean;
  price: number;
  change: number;
  changePercent: number;
  high: number;
  low: number;
  sparkline: number[];
  lastUpdate: number;
  flash?: 'up' | 'down' | null;
}

export interface HeatmapItem {
  ticker: string;
  name: string;
  sector: 'AI & Tech' | 'Energy' | 'Financials';
  marketCapBillions: number | null;
  price: number;
  changePercent: number;
}

export interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  ma20?: number;
  ma50?: number;
  rsi?: number;
  macd?: number;
}

export interface PreciousMetal {
  symbol: string;
  sourceSymbol?: string;
  proxy?: boolean;
  name: string;
  category: 'Metals' | 'Energy';
  unit: string;
  price: number;
  change: number;
  changePercent: number;
  bid: number | null;
  ask: number | null;
  high24h: number;
  low24h: number;
  history: number[];
  flash?: 'up' | 'down' | null;
}

export interface WorldSession {
  city: string;
  country: string;
  timezone: string;
  utcoffset: number;
  openHourUTC: number;
  closeHourUTC: number;
  exchange: string;
  currency: string;
}

export interface TapeTick {
  id: string;
  timestamp: string;
  ticker: string;
  type: 'BUY' | 'SELL' | 'TRADE';
  price: number;
  size: number;
  source?: string;
}

export interface NewsItem {
  id: string;
  time: string;
  source: string;
  category: string;
  headline: string;
  urgency: 'NORMAL' | 'HIGH' | 'FLASH';
  url?: string;
}
