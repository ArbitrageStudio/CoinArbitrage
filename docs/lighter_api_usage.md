# Lighter.xyz API & WebSocket Integration

This project provides basic integration with Lighter for fetching order book data and a simple WebSocket subscription demo.

> Chinese version: [lighter_api_usage.zh-CN.md](./lighter_api_usage.zh-CN.md)

### REST: Order Book

- Methods: `src/api/lighter.js#orderBooks()` / `orderBookDetails(marketIndex)`
- Optional auth: if `LIGHTER_AUTH_TOKEN` is provided, an `Authorization` header is attached.
- Endpoint: defaults to `https://mainnet.zklighter.elliot.ai` (override with `LIGHTER_BASE_URL`)

### WebSocket: Order Book Channel

- Run the demo: `npm run lighter:wsdemo`
- Environment variables:
  - `LIGHTER_MARKET_INDEX` (default `0`)
  - `LIGHTER_WS_DEMO_MS` (demo duration, default `20000` ms)
- Behavior: subscribes to `order_book:{MARKET_INDEX}`, prints best bid/ask updates, and exits automatically after 20 seconds.

Note:
