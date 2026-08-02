# Bloomberg Terminal Canvas

Interactive market-terminal dashboard built with React, TypeScript, and Vite.

## 🚀 Full Scope MVP - Live Market Data

This project now includes a **protected backend API** that connects every displayed instrument to real market data via Finnhub.

### What's Connected

| Widget | Data Source | Status |
|--------|-------------|--------|
| Global Indices | Finnhub Quotes | ✅ LIVE |
| Sector Heatmap | Finnhub Quotes | ✅ LIVE |
| AAPL Chart | Finnhub Candles | ✅ LIVE |
| Precious Metals | Finnhub Commodities | ✅ LIVE |
| Order Tape | Finnhub Live Feed | ✅ LIVE |
| Market News | Finnhub News | ✅ LIVE |

## 🛠️ Development

### Installation

```bash
npm install
```

### Start Development Servers

```bash
# Option 1: Start both backend and frontend (recommended)
npm run dev:all

# Option 2: Start separately
npm run dev:server  # Backend API on port 4000
npm run dev         # Frontend on port 3000
```

### Build for Production

```bash
npm run build
```

The production build is stored in `dist/`.

### Live Mode Usage

1. Start the backend server (requires `FINNHUB_API_KEY` in `.env`)
2. Run `npm run dev:all` to start both servers
3. Open http://localhost:3000
4. Click **LIVE DATA** button in the toolbar
5. Enter your Finnhub API key when prompted

## 🔐 API Configuration

### Required: Finnhub API Key

1. Get a free API key at https://finnhub.io/
2. Copy `.env.example` to `.env`
3. Add your key:
   ```env
   FINNHUB_API_KEY=your_api_key_here
   ```

### Backend Endpoints

- `GET /api/indices` - Global market indices
- `GET /api/heatmap` - Sector heatmap data
- `GET /api/stocks/:symbol/candles` - Historical candlestick data
- `GET /api/metals` - Precious metals & commodities
- `GET /api/tape` - Live order tape
- `GET /api/news` - Market news
- `GET /api/sessions` - World market session times
- `GET /health` - Health check

## 📋 Project Structure

```
bloomberg-terminal/
├── src/
│   ├── main.tsx           # App entry point
│   ├── App.tsx            # Main dashboard
│   ├── components/        # UI components
│   ├── services/
│   │   └── dataAdapter.ts # Data layer with live mode
│   ├── data/
│   │   └── mockMarketData.ts # Fallback mock data
│   └── utils/
├── server.js              # Backend API server
├── .env.example           # Environment template
├── README-LIVE-API.md     # Full API documentation
└── package.json
```

## 🎯 Full Scope MVP Coverage

All 29+ instruments are connected to real data:

**Stock Indices (10):** S&P 500, NASDAQ 100, Dow Jones, FTSE 100, DAX, Nikkei 225, Hang Seng, Shanghai, ASX 200, Nifty 50

**Sector Stocks (20):** NVDA, AAPL, MSFT, GOOGL, AMZN, META, TSM, AVGO, AMD, XOM, CVX, COP, SLB, EOG, JPM, BAC, WFC, GS, MS, BLK

**Metals & Commodities (8):** XAU/USD, XAG/USD, XPT/USD, XPD/USD, WTI Crude, Brent Crude, Nat Gas, Copper

**Additional:** AAPL 60-session chart, World session clocks, Live order tape, Market news

## 🔧 Troubleshooting

- **API key required:** Ensure `FINNHUB_API_KEY` is set in `.env`
- **Connection refused:** Check backend is running on port 4000
- **Slow data:** Free Finnhub tier has rate limits; upgrade for higher limits

## License

Apache-2.0