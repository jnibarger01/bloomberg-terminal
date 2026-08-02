export type ThemeColor = 'green' | 'amber' | 'cyan' | 'monochrome';

export type AdapterMode = 'simulated' | 'live';

export type WidgetType = 
  | 'global_indices' 
  | 'sector_heatmap' 
  | 'aapl_chart' 
  | 'precious_metals' 
  | 'world_clocks' 
  | 'order_tape' 
  | 'market_news';

export interface WidgetPosition {
  x: number; // grid columns or px
  y: number; // grid rows or px
  w: number; // width grid units (1 to 12)
  h: number; // height grid units
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
  marketCapBillions: number;
  price: number;
  changePercent: number;
}

export interface CandleData {
  time: string; // YYYY-MM-DD or session index
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
  name: string;
  category: 'Metals' | 'Energy';
  unit: string;
  price: number;
  change: number;
  changePercent: number;
  bid: number;
  ask: number;
  high24h: number;
  low24h: number;
  history: number[];
  flash?: 'up' | 'down' | null;
}

export interface WorldSession {
  city: string;
  country: string;
  timezone: string; // e.g. 'America/New_York'
  utcoffset: number; // offset in hours
  openHourUTC: number;
  closeHourUTC: number;
  exchange: string;
  currency: string;
}

export interface TapeTick {
  id: string;
  timestamp: string;
  ticker: string;
  type: 'BUY' | 'SELL';
  price: number;
  size: number;
}

export interface NewsItem {
  id: string;
  time: string;
  source: string;
  category: 'MACRO' | 'TECH' | 'ENERGY' | 'FED';
  headline: string;
  urgency: 'NORMAL' | 'HIGH' | 'FLASH';
}
