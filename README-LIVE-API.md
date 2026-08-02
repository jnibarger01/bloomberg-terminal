# Bloomberg Terminal Live API - Full Scope MVP

## Overview

This is the **Full Scope MVP** version of the Bloomberg Terminal replica. All displayed instruments are now connected to real market data via the Finnhub API.

## What's Connected

### ✅ Real Market Data Endpoints

| Widget | Data Source | Endpoint | Status |
|--------|-------------|----------|--------|
| **Global Indices** | Finnhub Quotes | `/api/indices` | ✅ LIVE |
| **Sector Heatmap** | Finnhub Quotes | `/api/heatmap` | ✅ LIVE |
| **AAPL Chart** | Finnhub Candles | `/api/stocks/AAPL/candles` | ✅ LIVE |
| **Precious Metals** | Finnhub Commodities | `/api/metals` | ✅ LIVE |
| **Order Tape** | Finnhub Live Feed | `/api/tape` | ✅ LIVE |
| **Market News** | Finnhub News | `/api/news` | ✅ LIVE |
| **World Sessions** | Static Data | `/api/sessions` | ✅ LIVE |

## Setup Instructions

### 1. Get Your Finnhub API Key

1. Go to https://finnhub.io/
2. Sign up for a free account (supports up to 60 requests/minute)
3. Get your API key from the dashboard
4. Copy it to your clipboard

### 2. Configure .env

```bash
# Copy the example
cp .env.example .env

# Edit .env and add your Finnhub API key
FINNHUB_API_KEY="your_actual_api_key_here"
```

### 3. Start the Backend Server

```bash
# Option 1: Start backend server
npm run dev:server

# Option 2: Start both frontend and backend together
npm run dev:all
```

### 4. Start the Development Frontend

In a new terminal:

```bash
npm run dev
```

### 5. Switch to Live Mode

1. Open the terminal at http://localhost:3000
2. Click the **DATA** button in the toolbar (it will show "SIM DATA")
3. Toggle to **LIVE** mode
4. You'll see a confirmation and the connection indicator

## Required API Keys

### Primary Key: Finnhub API Key
- **Free Tier**: 60 requests/minute, 500 requests/day
- **Pro Tier**: $10/month, 100 requests/minute, unlimited requests/week
- Website: https://finnhub.io/

### Optional: Gemini API Key (for AI features)
- Website: https://ai.google.dev/
- Required for: AI-powered market analysis

## API Endpoints Reference

### GET /api/indices
Returns real-time global market indices:
```json
[
  {
    "symbol": "SPX",
    "name": "S&P 500 Index",
    "region": "Americas",
    "price": 5432.80,
    "change": 34.20,
    "changePercent": 0.63,
    "high": 5445.10,
    "low": 5410.20,
    "sparkline": [5390, 5405, 5412, 5398, 5420, 5432.80],
    "lastUpdate": 1699999999999
  }
]
```

### GET /api/heatmap
Returns stock ticker data by sector:
```json
[
  {
    "ticker": "NVDA",
    "name": "NVIDIA Corp",
    "sector": "AI & Tech",
    "marketCapBillions": 3120,
    "price": 128.40,
    "changePercent": 3.85
  }
]
```

### GET /api/stocks/:symbol/candles?resolution=D&from=X&to=Y
Returns candlestick data:
```json
[
  {
    "time": "2024-01-15",
    "open": 150.00,
    "high": 152.50,
    "low": 149.50,
    "close": 151.80,
    "volume": 45000000,
    "ma20": 150.50,
    "ma50": 149.80,
    "rsi": 55.2
  }
]
```

### GET /api/metals
Returns precious metals and commodity prices:
```json
[
  {
    "symbol": "XAUUSD",
    "name": "Gold Spot",
    "category": "Metals",
    "unit": "$/oz",
    "price": 2428.50,
    "change": 18.40,
    "changePercent": 0.76,
    "bid": 2428.10,
    "ask": 2428.90,
    "high24h": 2435.00,
    "low24h": 2408.20,
    "history": [2410, 2415, 2412, 2422, 2425, 2428.50]
  }
]
```

### GET /api/tape
Returns live order tape ticks:
```json
[
  {
    "id": "tick-1",
    "timestamp": "17:15:02",
    "ticker": "NVDA",
    "type": "BUY",
    "price": 128.45,
    "size": 500
  }
]
```

### GET /api/news
Returns latest market news:
```json
[
  {
    "id": "news-1",
    "headline": "Market Opens Higher on Tech Earnings",
    "source": "BLOOMBERG",
    "category": "TECH",
    "time": "09:30:00",
    "urgency": "NORMAL"
  }
]
```

### GET /api/sessions
Returns world market session times.

## Security Features

### API Key Authentication
- Protected with `X-API-Key` header
- Set via `setApiKey()` function in the client
- Validates key length for basic security

### CORS Protection
- Configurable allowed origins via `ALLOWED_ORIGINS` env var
- Default: development servers only

### Rate Limiting (Future)
Built-in support for implementing rate limiting

## Production Deployment

### Using PM2 (Recommended)

```bash
# Install PM2
npm install -g pm2

# Start with ecosystem file
pm2 start server.js --name "bloomberg-terminal-api"

# Save configuration
pm2 save
pm2 startup
```

### Environment Variables for Production

```bash
# Required
FINNHUB_API_KEY=your_production_key

# Optional - Security
ALLOWED_ORIGINS=https://yourdomain.com,https://admin.yourdomain.com
BACKEND_URL=https://api.yourdomain.com

# Server
PORT=4000
```

## Troubleshooting

### "API key required" error
- Ensure you're sending the `X-API-Key` header
- Check that your Finnhub API key is valid

### "Market data API not configured"
- Your `.env` file is missing `FINNHUB_API_KEY`
- Restart the backend server after adding the key

### Slow response times
- Free Finnhub tier has request limits
- Upgrade to Pro tier for higher limits
- Check your API usage at https://finnhub.io/dashboard

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Vite)                   │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐    │
│  │ Indices  │  │ Heatmap  │  │  AAPL    │  │ Metals   │    │
│  │  Widget  │  │ Widget   │  │ Chart    │  │ Widget   │    │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘    │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐  │
│  │         DataAdapter Service (src/services/)            │  │
│  │  - Transforms real data to widget formats             │  │
│  │  - Manages live mode toggles                          │  │
│  └────────────────────────────────────────────────────────┘  │
└─────────────────────────┬─────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND API (Express)                   │
│  ┌────────────────────────────────────────────────────────┐│
│  │              /api/indices    → Finnhub Quotes          ││
│  │              /api/heatmap    → Finnhub Quotes          ││
│  │              /api/stocks/*   → Finnhub Candles        ││
│  │              /api/metals     → Finnhub Commodities    ││
│  │              /api/tape       → Finnhub Real-time      ││
│  │              /api/news       → Finnhub News Feed      ││
│  │              /api/sessions   → Static Session Data    ││
│  └────────────────────────────────────────────────────────┘│
└─────────────────────────┬─────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Finnhub API (External)                    │
│  - Real-time market quotes                                    │
│  - Historical candle data                                     │
│  - Live news feed                                             │
│  - Commodity & metal prices                                   │
└─────────────────────────────────────────────────────────────┘
```

## Full Scope MVP Coverage

| Instrument | Category | Real Data? | API Source |
|------------|----------|------------|------------|
| AAPL | US Stock | ✅ | Finnhub |
| NVDA | US Stock | ✅ | Finnhub |
| MSFT | US Stock | ✅ | Finnhub |
| GOOGL | US Stock | ✅ | Finnhub |
| AMZN | US Stock | ✅ | Finnhub |
| META | US Stock | ✅ | Finnhub |
| TSM | Taiwan Stock | ✅ | Finnhub |
| AVGO | US Stock | ✅ | Finnhub |
| AMD | US Stock | ✅ | Finnhub |
| XOM | Energy | ✅ | Finnhub |
| CVX | Energy | ✅ | Finnhub |
| COP | Energy | ✅ | Finnhub |
| SLB | Energy | ✅ | Finnhub |
| EOG | Energy | ✅ | Finnhub |
| JPM | Financial | ✅ | Finnhub |
| BAC | Financial | ✅ | Finnhub |
| WFC | Financial | ✅ | Finnhub |
| GS | Financial | ✅ | Finnhub |
| MS | Financial | ✅ | Finnhub |
| BLK | Financial | ✅ | Finnhub |
| XAU/USD (Gold) | Commodity | ✅ | Finnhub |
| XAG/USD (Silver) | Commodity | ✅ | Finnhub |
| XPT/USD (Platinum) | Commodity | ✅ | Finnhub |
| XPD/USD (Palladium) | Commodity | ✅ | Finnhub |
| WTI Crude | Commodity | ✅ | Finnhub |
| Brent Crude | Commodity | ✅ | Finnhub |
| Nat Gas | Commodity | ✅ | Finnhub |
| Copper | Commodity | ✅ | Finnhub |
| S&P 500 | Index | ✅ | Finnhub |
| NASDAQ 100 | Index | ✅ | Finnhub |
| Dow Jones | Index | ✅ | Finnhub |
| FTSE 100 | Index | ✅ | Finnhub |
| DAX 40 | Index | ✅ | Finnhub |
| Nikkei 225 | Index | ✅ | Finnhub |
| Hang Seng | Index | ✅ | Finnhub |
| Shanghai | Index | ✅ | Finnhub |
| ASX 200 | Index | ✅ | Finnhub |
| Nifty 50 | Index | ✅ | Finnhub |

## Next Steps

1. Add WebSocket support for truly real-time data
2. Implement API key management dashboard
3. Add caching layer for rate limiting
4. Add historical database for extended analysis
5. Implement authentication/authorization for user accounts