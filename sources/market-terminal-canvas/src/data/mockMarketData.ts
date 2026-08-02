import {
  MarketIndex,
  HeatmapItem,
  CandleData,
  PreciousMetal,
  WorldSession,
  TapeTick,
  NewsItem
} from '../types';

// Generate 60 realistic sessions of AAPL data leading up to current price around 228.50
export const generateAAPL60Sessions = (): CandleData[] => {
  const candles: CandleData[] = [];
  let currentClose = 205.00;
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 90); // ~60 trading sessions

  const prices: number[] = [];

  let tradingDaysCount = 0;
  let datePointer = new Date(startDate);

  while (tradingDaysCount < 60) {
    // Skip weekends
    const day = datePointer.getDay();
    if (day !== 0 && day !== 6) {
      const volatility = 0.015; // 1.5% daily volatility
      const changePercent = (Math.random() - 0.48) * volatility; // slight upward bias
      
      const open = Number((currentClose * (1 + (Math.random() - 0.5) * 0.006)).toFixed(2));
      const close = Number((open * (1 + changePercent)).toFixed(2));
      const high = Number((Math.max(open, close) * (1 + Math.random() * 0.012)).toFixed(2));
      const low = Number((Math.min(open, close) * (1 - Math.random() * 0.012)).toFixed(2));
      const volume = Math.floor(40000000 + Math.random() * 35000000);

      currentClose = close;
      prices.push(close);

      const dateStr = datePointer.toISOString().split('T')[0];
      
      candles.push({
        time: dateStr,
        open,
        high,
        low,
        close,
        volume
      });

      tradingDaysCount++;
    }
    datePointer.setDate(datePointer.getDate() + 1);
  }

  // Calculate MA20, MA50, RSI(14)
  for (let i = 0; i < candles.length; i++) {
    // MA20
    if (i >= 19) {
      const slice = prices.slice(i - 19, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      candles[i].ma20 = Number((sum / 20).toFixed(2));
    }
    // MA50
    if (i >= 49) {
      const slice = prices.slice(i - 49, i + 1);
      const sum = slice.reduce((a, b) => a + b, 0);
      candles[i].ma50 = Number((sum / 50).toFixed(2));
    }

    // RSI 14
    if (i >= 14) {
      let gains = 0;
      let losses = 0;
      for (let j = i - 13; j <= i; j++) {
        const diff = prices[j] - prices[j - 1];
        if (diff >= 0) gains += diff;
        else losses += Math.abs(diff);
      }
      const avgGain = gains / 14;
      const avgLoss = losses / 14;
      if (avgLoss === 0) {
        candles[i].rsi = 100;
      } else {
        const rs = avgGain / avgLoss;
        candles[i].rsi = Number((100 - (100 / (1 + rs))).toFixed(1));
      }
    } else {
      candles[i].rsi = 52;
    }

    // Simple MACD estimation
    if (i >= 26) {
      const ema12 = prices.slice(i - 11, i + 1).reduce((a, b) => a + b, 0) / 12;
      const ema26 = prices.slice(i - 25, i + 1).reduce((a, b) => a + b, 0) / 26;
      candles[i].macd = Number((ema12 - ema26).toFixed(2));
    } else {
      candles[i].macd = 0.85;
    }
  }

  return candles;
};

export const INITIAL_GLOBAL_INDICES: MarketIndex[] = [
  {
    symbol: 'S&P 500',
    name: 'S&P 500 Index',
    region: 'Americas',
    price: 5432.80,
    change: 34.20,
    changePercent: 0.63,
    high: 5445.10,
    low: 5410.20,
    sparkline: [5390, 5405, 5412, 5398, 5420, 5432.80],
    lastUpdate: Date.now()
  },
  {
    symbol: 'NASDAQ 100',
    name: 'Nasdaq 100 Tech',
    region: 'Americas',
    price: 19842.15,
    change: 185.40,
    changePercent: 0.94,
    high: 19890.00,
    low: 19650.00,
    sparkline: [19600, 19680, 19710, 19750, 19800, 19842.15],
    lastUpdate: Date.now()
  },
  {
    symbol: 'DOW JONES',
    name: 'Dow Jones Industrial',
    region: 'Americas',
    price: 40120.50,
    change: -45.10,
    changePercent: -0.11,
    high: 40220.00,
    low: 39980.00,
    sparkline: [40180, 40150, 40090, 40130, 40100, 40120.50],
    lastUpdate: Date.now()
  },
  {
    symbol: 'FTSE 100',
    name: 'FTSE London 100',
    region: 'Europe',
    price: 8214.30,
    change: 18.60,
    changePercent: 0.23,
    high: 8230.00,
    low: 8190.10,
    sparkline: [8195, 8200, 8210, 8205, 8212, 8214.30],
    lastUpdate: Date.now()
  },
  {
    symbol: 'DAX 40',
    name: 'German Stock Index',
    region: 'Europe',
    price: 18450.90,
    change: 112.40,
    changePercent: 0.61,
    high: 18490.00,
    low: 18320.00,
    sparkline: [18340, 18380, 18400, 18420, 18435, 18450.90],
    lastUpdate: Date.now()
  },
  {
    symbol: 'NIKKEI 225',
    name: 'Nikkei Tokyo 225',
    region: 'Asia',
    price: 38920.00,
    change: -280.50,
    changePercent: -0.72,
    high: 39200.00,
    low: 38850.00,
    sparkline: [39200, 39110, 39050, 38980, 38900, 38920.00],
    lastUpdate: Date.now()
  },
  {
    symbol: 'HANG SENG',
    name: 'Hong Kong Index',
    region: 'Asia',
    price: 17850.40,
    change: 210.30,
    changePercent: 1.19,
    high: 17910.00,
    low: 17620.00,
    sparkline: [17640, 17700, 17750, 17800, 17820, 17850.40],
    lastUpdate: Date.now()
  },
  {
    symbol: 'SHANGHAI',
    name: 'SSE Composite',
    region: 'Asia',
    price: 2980.15,
    change: 8.40,
    changePercent: 0.28,
    high: 2992.00,
    low: 2970.00,
    sparkline: [2972, 2975, 2978, 2974, 2981, 2980.15],
    lastUpdate: Date.now()
  },
  {
    symbol: 'ASX 200',
    name: 'S&P/ASX Sydney',
    region: 'Asia',
    price: 7820.60,
    change: 32.10,
    changePercent: 0.41,
    high: 7835.00,
    low: 7780.00,
    sparkline: [7790, 7800, 7810, 7805, 7818, 7820.60],
    lastUpdate: Date.now()
  },
  {
    symbol: 'NIFTY 50',
    name: 'NSE India Nifty 50',
    region: 'Asia',
    price: 24580.20,
    change: 142.80,
    changePercent: 0.58,
    high: 24620.00,
    low: 24410.00,
    sparkline: [24440, 24490, 24520, 24550, 24570, 24580.20],
    lastUpdate: Date.now()
  }
];

export const INITIAL_HEATMAP_DATA: HeatmapItem[] = [
  // AI & Tech Sector
  { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'AI & Tech', marketCapBillions: 3120, price: 128.40, changePercent: 3.85 },
  { ticker: 'AAPL', name: 'Apple Inc', sector: 'AI & Tech', marketCapBillions: 3450, price: 228.50, changePercent: 1.42 },
  { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'AI & Tech', marketCapBillions: 3320, price: 448.90, changePercent: 0.88 },
  { ticker: 'GOOGL', name: 'Alphabet Inc', sector: 'AI & Tech', marketCapBillions: 2180, price: 179.20, changePercent: -0.45 },
  { ticker: 'AMZN', name: 'Amazon.com', sector: 'AI & Tech', marketCapBillions: 1980, price: 186.30, changePercent: 1.15 },
  { ticker: 'META', name: 'Meta Platforms', sector: 'AI & Tech', marketCapBillions: 1280, price: 504.10, changePercent: 2.10 },
  { ticker: 'TSM', name: 'TSMC Semiconductor', sector: 'AI & Tech', marketCapBillions: 920, price: 174.60, changePercent: 4.12 },
  { ticker: 'AVGO', name: 'Broadcom Inc', sector: 'AI & Tech', marketCapBillions: 780, price: 168.20, changePercent: 2.75 },
  { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'AI & Tech', marketCapBillions: 260, price: 156.40, changePercent: -1.82 },

  // Energy Sector
  { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy', marketCapBillions: 460, price: 114.80, changePercent: -0.92 },
  { ticker: 'CVX', name: 'Chevron Corp', sector: 'Energy', marketCapBillions: 285, price: 155.20, changePercent: -0.65 },
  { ticker: 'COP', name: 'ConocoPhillips', sector: 'Energy', marketCapBillions: 132, price: 112.40, changePercent: 0.35 },
  { ticker: 'SLB', name: 'Schlumberger NV', sector: 'Energy', marketCapBillions: 68, price: 48.10, changePercent: -1.20 },
  { ticker: 'EOG', name: 'EOG Resources', sector: 'Energy', marketCapBillions: 72, price: 124.50, changePercent: 0.12 },

  // Financials Sector
  { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials', marketCapBillions: 610, price: 212.30, changePercent: 1.25 },
  { ticker: 'BAC', name: 'Bank of America', sector: 'Financials', marketCapBillions: 320, price: 41.50, changePercent: 0.72 },
  { ticker: 'WFC', name: 'Wells Fargo & Co', sector: 'Financials', marketCapBillions: 205, price: 58.90, changePercent: -0.34 },
  { ticker: 'GS', name: 'Goldman Sachs', sector: 'Financials', marketCapBillions: 162, price: 495.20, changePercent: 1.84 },
  { ticker: 'MS', name: 'Morgan Stanley', sector: 'Financials', marketCapBillions: 158, price: 98.40, changePercent: 0.95 },
  { ticker: 'BLK', name: 'BlackRock Inc', sector: 'Financials', marketCapBillions: 125, price: 842.10, changePercent: -0.18 }
];

export const INITIAL_PRECIOUS_METALS: PreciousMetal[] = [
  {
    symbol: 'XAU/USD',
    name: 'Gold Spot',
    category: 'Metals',
    unit: '$/oz',
    price: 2428.50,
    change: 18.40,
    changePercent: 0.76,
    bid: 2428.10,
    ask: 2428.90,
    high24h: 2435.00,
    low24h: 2408.20,
    history: [2410, 2415, 2412, 2422, 2425, 2428.50]
  },
  {
    symbol: 'XAG/USD',
    name: 'Silver Spot',
    category: 'Metals',
    unit: '$/oz',
    price: 29.85,
    change: 0.42,
    changePercent: 1.43,
    bid: 29.83,
    ask: 29.87,
    high24h: 30.10,
    low24h: 29.30,
    history: [29.35, 29.50, 29.45, 29.70, 29.80, 29.85]
  },
  {
    symbol: 'XPT/USD',
    name: 'Platinum Spot',
    category: 'Metals',
    unit: '$/oz',
    price: 982.10,
    change: -4.30,
    changePercent: -0.44,
    bid: 981.50,
    ask: 982.70,
    high24h: 994.00,
    low24h: 978.00,
    history: [990, 988, 985, 984, 980, 982.10]
  },
  {
    symbol: 'XPD/USD',
    name: 'Palladium Spot',
    category: 'Metals',
    unit: '$/oz',
    price: 965.40,
    change: 12.80,
    changePercent: 1.34,
    bid: 964.20,
    ask: 966.60,
    high24h: 972.00,
    low24h: 950.00,
    history: [952, 958, 960, 962, 963, 965.40]
  },
  {
    symbol: 'WTI Crude',
    name: 'WTI Light Sweet Oil',
    category: 'Energy',
    unit: '$/bbl',
    price: 78.45,
    change: -0.85,
    changePercent: -1.07,
    bid: 78.43,
    ask: 78.47,
    high24h: 79.80,
    low24h: 78.10,
    history: [79.6, 79.2, 78.9, 78.7, 78.3, 78.45]
  },
  {
    symbol: 'BRENT Crude',
    name: 'Brent Crude Oil',
    category: 'Energy',
    unit: '$/bbl',
    price: 82.30,
    change: -0.70,
    changePercent: -0.84,
    bid: 82.28,
    ask: 82.32,
    high24h: 83.40,
    low24h: 81.95,
    history: [83.2, 82.9, 82.6, 82.5, 82.1, 82.30]
  },
  {
    symbol: 'NAT GAS',
    name: 'Henry Hub Natural Gas',
    category: 'Energy',
    unit: '$/MMBtu',
    price: 2.12,
    change: 0.05,
    changePercent: 2.41,
    bid: 2.11,
    ask: 2.13,
    high24h: 2.16,
    low24h: 2.05,
    history: [2.06, 2.08, 2.10, 2.09, 2.11, 2.12]
  },
  {
    symbol: 'COPPER',
    name: 'High Grade Copper',
    category: 'Metals',
    unit: '$/lb',
    price: 4.25,
    change: 0.03,
    changePercent: 0.71,
    bid: 4.24,
    ask: 4.26,
    high24h: 4.28,
    low24h: 4.20,
    history: [4.21, 4.22, 4.23, 4.24, 4.25, 4.25]
  }
];

export const WORLD_SESSIONS: WorldSession[] = [
  {
    city: 'New York',
    country: 'United States',
    timezone: 'America/New_York',
    utcoffset: -4, // EDT
    openHourUTC: 13.5, // 13:30 UTC = 09:30 EDT
    closeHourUTC: 20.0, // 20:00 UTC = 16:00 EDT
    exchange: 'NYSE / NASDAQ',
    currency: 'USD ($)'
  },
  {
    city: 'London',
    country: 'United Kingdom',
    timezone: 'Europe/London',
    utcoffset: 1, // BST
    openHourUTC: 7.0, // 07:00 UTC = 08:00 BST
    closeHourUTC: 15.5, // 15:30 UTC = 16:30 BST
    exchange: 'LSE (London Stock Exchange)',
    currency: 'GBP (£)'
  },
  {
    city: 'Frankfurt',
    country: 'Germany',
    timezone: 'Europe/Berlin',
    utcoffset: 2, // CEST
    openHourUTC: 7.0, // 07:00 UTC = 09:00 CEST
    closeHourUTC: 15.5, // 15:30 UTC = 17:30 CEST
    exchange: 'XETRA / Börse Frankfurt',
    currency: 'EUR (€)'
  },
  {
    city: 'Tokyo',
    country: 'Japan',
    timezone: 'Asia/Tokyo',
    utcoffset: 9, // JST
    openHourUTC: 0.0, // 00:00 UTC = 09:00 JST
    closeHourUTC: 6.0, // 06:00 UTC = 15:00 JST
    exchange: 'TSE (Tokyo Stock Exchange)',
    currency: 'JPY (¥)'
  },
  {
    city: 'Hong Kong',
    country: 'Hong Kong',
    timezone: 'Asia/Hong_Kong',
    utcoffset: 8, // HKT
    openHourUTC: 1.5, // 01:30 UTC = 09:30 HKT
    closeHourUTC: 8.0, // 08:00 UTC = 16:00 HKT
    exchange: 'HKEX (Hong Kong Exchange)',
    currency: 'HKD ($)'
  },
  {
    city: 'Sydney',
    country: 'Australia',
    timezone: 'Australia/Sydney',
    utcoffset: 10, // AEST
    openHourUTC: 0.0, // 00:00 UTC = 10:00 AEST
    closeHourUTC: 6.0, // 06:00 UTC = 16:00 AEST
    exchange: 'ASX (Australian Securities)',
    currency: 'AUD ($)'
  }
];

export const INITIAL_TAPE_TICKS: TapeTick[] = [
  { id: '1', timestamp: '17:15:02', ticker: 'NVDA', type: 'BUY', price: 128.45, size: 500 },
  { id: '2', timestamp: '17:15:04', ticker: 'AAPL', type: 'BUY', price: 228.52, size: 1200 },
  { id: '3', timestamp: '17:15:07', ticker: 'XAU/USD', type: 'SELL', price: 2428.40, size: 50 },
  { id: '4', timestamp: '17:15:09', ticker: 'MSFT', type: 'BUY', price: 448.95, size: 300 },
  { id: '5', timestamp: '17:15:12', ticker: 'XOM', type: 'SELL', price: 114.78, size: 800 },
  { id: '6', timestamp: '17:15:15', ticker: 'TSM', type: 'BUY', price: 174.65, size: 1500 }
];

export const INITIAL_MARKET_NEWS: NewsItem[] = [
  {
    id: 'news-1',
    time: '17:12:00',
    source: 'BLOOMBERG',
    category: 'MACRO',
    headline: 'US Treasury Yields Flat as Traders Assess Inflation Data & Fed Speeches',
    urgency: 'HIGH'
  },
  {
    id: 'news-2',
    time: '17:05:00',
    source: 'REUTERS',
    category: 'TECH',
    headline: 'AI Infrastructure Capex Guidance Reaches Record $180B Among Hyperscalers',
    urgency: 'FLASH'
  },
  {
    id: 'news-3',
    time: '16:48:00',
    source: 'WSJ',
    category: 'ENERGY',
    headline: 'OPEC+ Signals Steady Crude Oil Production Targets Into Q4',
    urgency: 'NORMAL'
  },
  {
    id: 'news-4',
    time: '16:30:00',
    source: 'FINANCIAL TIMES',
    category: 'FED',
    headline: 'Precious Metals Rally Extends as Global Central Banks Increase Reserve Allocation',
    urgency: 'HIGH'
  }
];
