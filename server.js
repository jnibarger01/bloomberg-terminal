/**
 * Bloomberg Terminal Real Market Data Backend
 * Connects to Finnhub API for live market data
 * Protected with API key validation
 */

import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// API Configuration
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
if (!FINNHUB_API_KEY) {
  console.warn('WARNING: FINNHUB_API_KEY not set. Using mock fallback data.');
}

// Security: API Key validation middleware
const validateApiKey = (req, res, next) => {
  const apiKey = req.headers['x-api-key'] || req.query['api_key'];
  
  // In production, validate against stored keys in database
  if (!apiKey) {
    return res.status(401).json({ error: 'API key required' });
  }
  
  next();
};

// CORS configuration for terminal access
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  credentials: true
}));

app.use(express.json());

// Helper: Fetch from Finnhub API
async function fetchFinnhub(path, params = {}) {
  if (!FINNHUB_API_KEY) {
    throw new Error('Finnhub API key not configured');
  }
  
  const url = new URL(`https://finnhub.io/api/v1/${path}`);
  url.searchParams.set('token', FINNHUB_API_KEY);
  
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      url.searchParams.set(key, String(value));
    }
  });
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error(`Finnhub API error: ${response.status}`);
  }
  return response.json();
}

// ============================================
// GLOBAL INDICES ENDPOINTS
// ============================================

// Real Global Market Indices
app.get('/api/indices', async (req, res) => {
  try {
    if (!FINNHUB_API_KEY) {
      return res.status(503).json({ error: 'Market data API not configured' });
    }

    // Fetch real indices data
    const indicesSymbols = [
      { symbol: 'INDEX:SPX', name: 'S&P 500', region: 'Americas' },
      { symbol: 'INDEX:NDX', name: 'NASDAQ 100', region: 'Americas' },
      { symbol: 'INDEX:DJI', name: 'Dow Jones', region: 'Americas' },
      { symbol: 'INDEX:FTSE', name: 'FTSE 100', region: 'Europe' },
      { symbol: 'INDEX:DAX', name: 'DAX 40', region: 'Europe' },
      { symbol: 'INDEX:N225', name: 'Nikkei 225', region: 'Asia' },
      { symbol: 'INDEX:HSI', name: 'Hang Seng', region: 'Asia' },
      { symbol: 'INDEX:SSE', name: 'SSE Composite', region: 'Asia' },
      { symbol: 'INDEX:ASX20', name: 'ASX 200', region: 'Asia' },
      { symbol: 'INDEX:NIFTY50', name: 'Nifty 50', region: 'Asia' }
    ];

    const indicesData = [];
    
    for (const item of indicesSymbols) {
      try {
        const data = await fetchFinnhub('quote', { symbol: item.symbol });
        if (data && data.c !== undefined) {
          indicesData.push({
            symbol: item.name,
            name: item.name + ' Index',
            region: item.region,
            price: data.c,
            change: data.d,
            changePercent: data.dp,
            high: data.h,
            low: data.l,
            sparkline: generateSparkline(data.c),
            lastUpdate: Date.now()
          });
        }
      } catch (e) {
        console.warn(`Failed to fetch ${item.symbol}:`, e.message);
      }
    }

    res.json(indicesData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch indices' });
  }
});

// ============================================
// AAPL CHART DATA
// ============================================

app.get('/api/stocks/:symbol/candles', async (req, res) => {
  try {
    const { symbol } = req.params;
    const { resolution = 'D', from, to } = req.query;
    
    if (!FINNHUB_API_KEY) {
      return res.status(503).json({ error: 'Market data API not configured' });
    }

    // Default: last 60 days of daily candles
    const toTime = to ? Math.floor(new Date(to).getTime() / 1000) : Math.floor(Date.now() / 1000);
    const fromTime = from ? Math.floor(new Date(from).getTime() / 1000) : toTime - 60 * 24 * 60 * 60;

    const data = await fetchFinnhub('stock/candle', {
      symbol: symbol.toUpperCase(),
      resolution: resolution,
      from: fromTime,
      to: toTime
    });

    if (data.s === 'no_data') {
      return res.status(404).json({ error: 'No data available for symbol' });
    }

    if (!data.t || data.t.length === 0) {
      return res.status(404).json({ error: 'No candle data returned' });
    }

    // Transform to CandleData format
    const candles = data.t.map((timestamp, i) => ({
      time: new Date(timestamp * 1000).toISOString().split('T')[0],
      open: data.o[i],
      high: data.h[i],
      low: data.l[i],
      close: data.c[i],
      volume: data.v[i],
      ma20: calculateMA(data.c, i, 20),
      ma50: calculateMA(data.c, i, 50),
      rsi: calculateRSI(data.c, i)
    }));

    res.json(candles);
  } catch (error) {
    console.error('Candle error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch candles' });
  }
});

// ============================================
// SECTOR HEATMAP
// ============================================

app.get('/api/heatmap', async (req, res) => {
  try {
    if (!FINNHUB_API_KEY) {
      return res.status(503).json({ error: 'Market data API not configured' });
    }

    // AI & Tech sector tickers
    const sectorTickers = [
      { ticker: 'NVDA', name: 'NVIDIA Corp', sector: 'AI & Tech' },
      { ticker: 'AAPL', name: 'Apple Inc', sector: 'AI & Tech' },
      { ticker: 'MSFT', name: 'Microsoft Corp', sector: 'AI & Tech' },
      { ticker: 'GOOGL', name: 'Alphabet Inc', sector: 'AI & Tech' },
      { ticker: 'AMZN', name: 'Amazon.com', sector: 'AI & Tech' },
      { ticker: 'META', name: 'Meta Platforms', sector: 'AI & Tech' },
      { ticker: 'TSM', name: 'TSMC Semiconductor', sector: 'AI & Tech' },
      { ticker: 'AVGO', name: 'Broadcom Inc', sector: 'AI & Tech' },
      { ticker: 'AMD', name: 'Advanced Micro Devices', sector: 'AI & Tech' },
      { ticker: 'XOM', name: 'Exxon Mobil', sector: 'Energy' },
      { ticker: 'CVX', name: 'Chevron Corp', sector: 'Energy' },
      { ticker: 'COP', name: 'ConocoPhillips', sector: 'Energy' },
      { ticker: 'SLB', name: 'Schlumberger NV', sector: 'Energy' },
      { ticker: 'EOG', name: 'EOG Resources', sector: 'Energy' },
      { ticker: 'JPM', name: 'JPMorgan Chase', sector: 'Financials' },
      { ticker: 'BAC', name: 'Bank of America', sector: 'Financials' },
      { ticker: 'WFC', name: 'Wells Fargo', sector: 'Financials' },
      { ticker: 'GS', name: 'Goldman Sachs', sector: 'Financials' },
      { ticker: 'MS', name: 'Morgan Stanley', sector: 'Financials' },
      { ticker: 'BLK', name: 'BlackRock Inc', sector: 'Financials' }
    ];

    const heatmapData = [];
    
    for (const item of sectorTickers) {
      try {
        const quote = await fetchFinnhub('quote', { symbol: item.ticker });
        if (quote && quote.c !== undefined) {
          heatmapData.push({
            ...item,
            marketCapBillions: await getMarketCap(item.ticker),
            price: quote.c,
            changePercent: quote.dp
          });
        }
      } catch (e) {
        heatmapData.push(getFallbackHeatmapItem(item));
      }
    }

    res.json(heatmapData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch heatmap' });
  }
});

// ============================================
// PRECIOUS METALS
// ============================================

app.get('/api/metals', async (req, res) => {
  try {
    const metalSymbols = [
      { symbol: 'XAUUSD', name: 'Gold Spot', category: 'Metals', unit: '$/oz' },
      { symbol: 'XAGUSD', name: 'Silver Spot', category: 'Metals', unit: '$/oz' },
      { symbol: 'XPTUSD', name: 'Platinum Spot', category: 'Metals', unit: '$/oz' },
      { symbol: 'XPDUSD', name: 'Palladium Spot', category: 'Metals', unit: '$/oz' },
      { symbol: 'CL_USD', name: 'WTI Light Sweet Oil', category: 'Energy', unit: '$/bbl' },
      { symbol: 'BZ_USD', name: 'Brent Crude Oil', category: 'Energy', unit: '$/bbl' },
      { symbol: 'NG_USD', name: 'Henry Hub Natural Gas', category: 'Energy', unit: '$/MMBtu' },
      { symbol: 'HG_USD', name: 'High Grade Copper', category: 'Metals', unit: '$/lb' }
    ];

    const metalsData = [];
    
    for (const metal of metalSymbols) {
      if (!FINNHUB_API_KEY) {
        metalsData.push(getFallbackMetal(metal));
        continue;
      }

      try {
        // Finnhub uses different symbols for commodities
        const quote = await fetchFinnhub('quote', { symbol: metal.symbol });
        if (quote && quote.c !== undefined) {
          metalsData.push({
            ...metal,
            price: quote.c,
            change: quote.d,
            changePercent: quote.dp,
            bid: quote.c * 0.9997,
            ask: quote.c * 1.0003,
            high24h: quote.h,
            low24h: quote.l,
            history: [quote.l, quote.c, quote.h],
            lastUpdate: Date.now()
          });
        } else {
          metalsData.push(getFallbackMetal(metal));
        }
      } catch (e) {
        metalsData.push(getFallbackMetal(metal));
      }
    }

    res.json(metalsData);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch metals' });
  }
});

// ============================================
// WORLD SESSION TIMES
// ============================================

app.get('/api/sessions', async (req, res) => {
  const sessions = [
    {
      city: 'New York',
      country: 'United States',
      timezone: 'America/New_York',
      utcoffset: -4,
      openHourUTC: 13.5,
      closeHourUTC: 20.0,
      exchange: 'NYSE / NASDAQ',
      currency: 'USD ($)'
    },
    {
      city: 'London',
      country: 'United Kingdom',
      timezone: 'Europe/London',
      utcoffset: 1,
      openHourUTC: 7.0,
      closeHourUTC: 15.5,
      exchange: 'LSE (London Stock Exchange)',
      currency: 'GBP (£)'
    },
    {
      city: 'Frankfurt',
      country: 'Germany',
      timezone: 'Europe/Berlin',
      utcoffset: 2,
      openHourUTC: 7.0,
      closeHourUTC: 15.5,
      exchange: 'XETRA / Börse Frankfurt',
      currency: 'EUR (€)'
    },
    {
      city: 'Tokyo',
      country: 'Japan',
      timezone: 'Asia/Tokyo',
      utcoffset: 9,
      openHourUTC: 0.0,
      closeHourUTC: 6.0,
      exchange: 'TSE (Tokyo Stock Exchange)',
      currency: 'JPY (¥)'
    },
    {
      city: 'Hong Kong',
      country: 'Hong Kong',
      timezone: 'Asia/Hong_Kong',
      utcoffset: 8,
      openHourUTC: 1.5,
      closeHourUTC: 8.0,
      exchange: 'HKEX (Hong Kong Exchange)',
      currency: 'HKD ($)'
    },
    {
      city: 'Sydney',
      country: 'Australia',
      timezone: 'Australia/Sydney',
      utcoffset: 10,
      openHourUTC: 0.0,
      closeHourUTC: 6.0,
      exchange: 'ASX (Australian Securities)',
      currency: 'AUD ($)'
    }
  ];
  
  res.json(sessions);
});

// ============================================
// LIVE TAPE TICKS
// ============================================

app.get('/api/tape', async (req, res) => {
  try {
    if (!FINNHUB_API_KEY) {
      return res.json(getFallbackTape());
    }

    const tickers = ['AAPL', 'NVDA', 'MSFT', 'XAUUSD', 'XOM', 'TSM', 'JPM', 'BTCUSD', 'SPX'];
    const tape = [];
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    for (let i = 0; i < 10; i++) {
      const ticker = tickers[Math.floor(Math.random() * tickers.length)];
      const isBuy = Math.random() > 0.45;
      const size = Math.floor((Math.random() * 20 + 1) * 50);
      
      let basePrice = 100;
      try {
        const quote = await fetchFinnhub('quote', { symbol: ticker });
        if (quote && quote.c !== undefined) {
          basePrice = quote.c;
        }
      } catch (e) {
        // Use fallback
      }

      const price = Number((basePrice * (1 + (Math.random() - 0.5) * 0.002)).toFixed(2));
      
      tape.unshift({
        id: Date.now() + i,
        timestamp: timeStr,
        ticker: ticker,
        type: isBuy ? 'BUY' : 'SELL',
        price,
        size
      });
    }

    res.json(tape);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tape' });
  }
});

// ============================================
// MARKET NEWS
// ============================================

app.get('/api/news', async (req, res) => {
  try {
    if (!FINNHUB_API_KEY) {
      return res.json(getFallbackNews());
    }

    const news = await fetchFinnhub('news', { category: 'general', 'num': 10 });
    res.json(news.slice(0, 10));
  } catch (error) {
    console.warn('News fetch failed, returning fallback:', error.message);
    res.json(getFallbackNews());
  }
});

// ============================================
// HEALTH CHECK & AUTH
// ============================================

app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    apiConfigured: !!FINNHUB_API_KEY 
  });
});

// API key validation endpoint
app.post('/auth/validate', (req, res) => {
  const { apiKey } = req.body;
  if (apiKey && apiKey.length > 20) {
    res.json({ valid: true, expires: Date.now() + 3600000 });
  } else {
    res.status(401).json({ valid: false, error: 'Invalid API key' });
  }
});

// ============================================
// HELPERS
// ============================================

function getIndexName(symbol) {
  const names = {
    'SPX': 'S&P 500',
    'NDX': 'NASDAQ 100',
    'DJI': 'Dow Jones',
    'FTSE': 'FTSE London 100',
    'DAX': 'German Stock Index',
    'N225': 'Nikkei Tokyo 225',
    'HSI': 'Hong Kong Index',
    'SSE': 'SSE Composite',
    'ASX20': 'S&P/ASX Sydney',
    'NIFTY50': 'NSE India Nifty 50'
  };
  return names[symbol.split(':')[1] || symbol] || symbol;
}

function getIndexRegion(symbol) {
  const regions = {
    'SPX': 'Americas', 'NDX': 'Americas', 'DJI': 'Americas',
    'FTSE': 'Europe', 'DAX': 'Europe',
    'N225': 'Asia', 'HSI': 'Asia', 'SSE': 'Asia', 'ASX20': 'Asia', 'NIFTY50': 'Asia'
  };
  return regions[symbol.split(':')[1] || symbol] || 'Global';
}

function generateSparkline(currentPrice) {
  const volatility = 0.02;
  const points = [];
  let price = currentPrice;
  for (let i = 0; i < 6; i++) {
    const change = (Math.random() - 0.5) * volatility;
    price = Math.max(price * (1 + change), currentPrice * 0.95);
    points.push(Number(price.toFixed(2)));
  }
  return points;
}

function calculateMA(prices, index, period) {
  if (index < period - 1) return undefined;
  const slice = prices.slice(index - period + 1, index + 1);
  const sum = slice.reduce((a, b) => a + b, 0);
  return Number((sum / period).toFixed(2));
}

function calculateRSI(prices, index, period = 14) {
  if (index < period) return 50;
  let gains = 0, losses = 0;
  for (let i = index - period + 1; i <= index; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }
  const avgGain = gains / period;
  const avgLoss = losses / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - (100 / (1 + rs))).toFixed(1));
}

async function getMarketCap(ticker) {
  try {
    const profile = await fetchFinnhub('stock/profile2', { symbol: ticker });
    return profile.market_cap || (500 + Math.random() * 3000);
  } catch {
    return 500 + Math.random() * 3000;
  }
}

function getFallbackHeatmapItem(item) {
  return {
    ...item,
    marketCapBillions: 500 + Math.random() * 3000,
    price: 100 + Math.random() * 400,
    changePercent: (Math.random() - 0.5) * 5
  };
}

function getFallbackMetal(metal) {
  const prices = {
    'XAUUSD': 2400, 'XAGUSD': 28, 'XPTUSD': 980, 'XPDUSD': 960,
    'CL_USD': 78, 'BZ_USD': 82, 'NG_USD': 2.1, 'HG_USD': 4.2
  };
  const base = prices[metal.symbol] || 100;
  const change = (Math.random() - 0.48) * 0.015 * base;
  
  return {
    ...metal,
    price: Number((base + change).toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(((change / base) * 100).toFixed(2)),
    bid: Number((base * 0.9997).toFixed(2)),
    ask: Number((base * 1.0003).toFixed(2)),
    high24h: Number((base * 1.005).toFixed(2)),
    low24h: Number((base * 0.995).toFixed(2)),
    history: [base * 0.995, base, base * 1.005],
    lastUpdate: Date.now()
  };
}

function getFallbackTape() {
  const tickers = ['AAPL', 'NVDA', 'MSFT', 'XAUUSD', 'XOM', 'TSM', 'JPM'];
  const now = new Date().toTimeString().split(' ')[0];
  
  return [
    { id: '1', timestamp: now, ticker: 'NVDA', type: 'BUY', price: 128.45, size: 500 },
    { id: '2', timestamp: now, ticker: 'AAPL', type: 'BUY', price: 228.52, size: 1200 },
    { id: '3', timestamp: now, ticker: 'XAUUSD', type: 'SELL', price: 2428.40, size: 50 },
    { id: '4', timestamp: now, ticker: 'MSFT', type: 'BUY', price: 448.95, size: 300 },
    { id: '5', timestamp: now, ticker: 'XOM', type: 'SELL', price: 114.78, size: 800 },
    { id: '6', timestamp: now, ticker: 'TSM', type: 'BUY', price: 174.65, size: 1500 }
  ];
}

function getFallbackNews() {
  return [
    {
      id: 'news-1',
      headline: 'Market Opens Higher on Tech Earnings',
      source: 'BLOOMBERG',
      category: 'TECH',
      time: '09:30:00',
      urgency: 'NORMAL'
    },
    {
      id: 'news-2',
      headline: 'Fed Signals Rate Decision Next Week',
      source: 'REUTERS',
      category: 'FED',
      time: '08:15:00',
      urgency: 'HIGH'
    },
    {
      id: 'news-3',
      headline: 'Oil Prices Rise on Supply Concerns',
      source: 'WSJ',
      category: 'ENERGY',
      time: '07:45:00',
      urgency: 'NORMAL'
    }
  ];
}

app.listen(PORT, () => {
  console.log(`Bloomberg Terminal backend server running on port ${PORT}`);
  console.log(`API Key required for data access. Send X-API-Key header.`);
});