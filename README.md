# Bloomberg Terminal Canvas

Interactive market dashboard built with React, TypeScript, Vite, and a protected Express market-data backend.

## Data integrity

The application has two explicit modes:

- **Simulated:** locally generated demonstration data.
- **Provider:** authenticated Finnhub data. Failed provider datasets remain empty and are reported as `degraded` or `failed`; they are never replaced with random values.

The international benchmark and commodity panels use clearly labeled **US-listed ETF proxies** because Finnhub's stock quote endpoint is used. They are not represented as cash indices or spot commodities.

## Setup

```bash
npm ci
cp .env.example .env
```

Set both required secrets in `.env`:

```env
FINNHUB_API_KEY=your_provider_key
BACKEND_API_KEY=your_long_random_backend_key
```

Start the frontend and backend:

```bash
npm run dev:all
```

Open `http://localhost:3000`, enter the **backend API key** in the toolbar, and switch from simulated mode to provider mode.

## Security and resilience

- Every `/api/*` route requires `X-API-Key` and compares it to `BACKEND_API_KEY` with constant-time comparison.
- The server refuses to start without backend authorization configured.
- CORS uses an explicit origin allowlist.
- Provider calls use TTL caching, bounded concurrency, timeouts, and API rate limiting.
- Provider errors are returned as explicit dataset status; no synthetic provider fallback is used.
- Trade tape records come from Finnhub WebSocket trade events. Buy/sell side is not inferred.

## Provider datasets

| Endpoint | Data |
|---|---|
| `GET /api/indices` | US-listed ETF proxies for international benchmarks |
| `GET /api/heatmap` | US equity quotes and provider `marketCapitalization` |
| `GET /api/stocks/:symbol/candles` | Finnhub stock candles; account entitlement may be required |
| `GET /api/metals` | US-listed commodity ETF proxies, not spot prices |
| `GET /api/tape` | Buffered Finnhub WebSocket trades |
| `GET /api/news` | Normalized Finnhub market news |
| `GET /api/sessions` | Static reference exchange hours |
| `GET /health` | Public configuration and service health, without secrets |

## Verification

```bash
npm run verify
```

This runs TypeScript checks, backend and frontend-state tests, and the production build. GitHub Actions runs the same gate for pull requests and `main`.

## Scripts

```bash
npm run dev
npm run dev:server
npm run dev:all
npm run lint
npm test
npm run build
npm run clean
npm run start:prod
```

`npm run clean` removes generated output only; it does not delete source files.

## Deployment note

GitHub Pages hosts only the static frontend. Provider mode also requires a separately deployed HTTPS backend and `VITE_BACKEND_URL` configured at build time or `bloomberg-backend-url` set in local storage.

## License

Apache-2.0
