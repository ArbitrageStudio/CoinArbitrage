# Coin Arbitrage

A cryptocurrency arbitrage tool that discovers price differences across OKX, Binance, and Hyperliquid.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> ⚠️ **Disclaimer**: This project is for educational and research purposes only and does **not** constitute investment advice. Cryptocurrency trading is extremely risky; arbitrage and derivatives trading can result in the total loss of your capital. Always validate in a simulated/sandbox environment first, and assume full responsibility for any real trading you perform with this software.

中文文档：[README.zh-CN.md](./README.zh-CN.md)

## Features

- 🔄 Real-time price feeds from OKX, Binance, and Hyperliquid (REST + WebSocket)
- 📊 Cross-exchange spread and arbitrage opportunity detection
- 📖 Order book analysis with slippage estimation
- 🧮 Statistical arbitrage (mean reversion) and triangular arbitrage
- 🤖 Technical indicators (RSI, Bollinger Bands, MACD) for price prediction
- ⚖️ Risk-adjusted return analysis (Sharpe / Sortino / Calmar)
- 💰 OKX spot-vs-perpetual basis arbitrage (dry-run / sandbox / live)
- 🛡️ Auto-trading with dry-run mode, slippage guard, and cooldown controls

## Project Structure

```
CoinArbitrage/
├── src/
│   ├── api/          # Exchange API clients (OKX / Binance / Hyperliquid / Lighter / WebSocket)
│   ├── config/       # Arbitrage configuration
│   └── utils/        # Arbitrage, slippage, execution, ML, shared helpers
├── scripts/          # CLI entry points (monitor, basis arbitrage, samplers, demos)
├── test/             # Tests
├── docs/             # Documentation (usage guide, arbitrage logic, Lighter notes)
├── index.js          # Main entry point
├── package.json      # Project config and npm scripts
├── .env.example      # Environment variable template
└── README.md
```

## Requirements

- Node.js >= 16
- Exchange API keys (only required for authenticated endpoints — public market data works without keys)

## Installation

```bash
git clone https://github.com/ArbitrageStudio/CoinArbitrage.git
cd CoinArbitrage
npm install
```

## Configuration

```bash
cp .env.example .env
# edit .env and fill in your API keys
```

Public market data (prices, order books, funding rates) works without keys. Trading requires API keys with appropriate permissions. See `.env.example` for the full list of variables.

## Quick Start

```bash
# One-shot cross-exchange analysis
npm start

# Real-time arbitrage monitoring (WebSocket)
npm run monitor
```

## CLI Scripts

| Command | Description |
|---|---|
| `npm start` | Run the main analysis (`index.js`) |
| `npm run dev` | Run `index.js` in watch mode |
| `npm run monitor` | Real-time arbitrage monitoring via WebSocket |
| `npm run dryrun` | Demonstrate auto-trade entry in dry-run mode |
| `npm run basis:dryrun` | Generate OKX spot-perp basis plans (no orders) |
| `npm run basis:sandbox` | Execute basis plans on the OKX sandbox |
| `npm run basis:close` | Close OKX basis positions (perp first, then spot) |
| `npm run basis:risk` | Close the perp leg before the funding window |
| `npm run basis:manager` | Continuously manage basis positions (open/close/stop-loss/take-profit) |
| `npm run basis:yield` | Annualized-yield guard strategy |
| `npm run arb:advanced` | Generate an advanced analysis report (stat/triangular arbitrage) |
| `npm run arb:stat` | Sample prices and output statistical arbitrage signals |
| `npm run lighter:wsdemo` | Lighter WebSocket order book demo |
| `npm test` | Run unit tests (mock data, no network required) |

## Environment Variables

See `.env.example` for the full list with comments. Key groups:

- **Exchange credentials**: `OKX_API_KEY` / `OKX_SECRET_KEY` / `OKX_PASSPHRASE` / `OKX_SANDBOX`, `BINANCE_API_KEY` / `BINANCE_SECRET_KEY` / `BINANCE_TESTNET`, `HYPERLIQUID_API_KEY` / `HYPERLIQUID_SECRET_KEY`
- **Arbitrage**: `ARBITRAGE_SYMBOLS`, `MIN_PROFIT_THRESHOLD`
- **Auto-trading**: `ENABLE_AUTO_TRADE`, `AUTO_TRADE_DRY_RUN`, `ORDER_USDT_SIZE`, `AUTO_TRADE_MIN_PROFIT`, `AUTO_TRADE_COOLDOWN_MS`, `MAX_SLIPPAGE_PCT`
- **Basis arbitrage**: `BASIS_HOLD_HOURS`, `BASIS_MIN_PROFIT`, `BASIS_STOP_LOSS_PCT`, `BASIS_TAKE_PROFIT_PCT`, `OKX_SPOT_FEE`, `OKX_PERP_FEE`
- **Yield guard**: `TARGET_APR_MIN`, `EXIT_APR_MIN`, `STOP_LOSS_PCT`, `TAKE_PROFIT_PCT`
- **Managers / samplers**: `MANAGER_CHECK_INTERVAL_MS`, `MANAGER_RUN_MS`, `FUNDING_CLOSE_BEFORE_MINUTES`, `SAMPLER_INTERVAL_MS`, `SAMPLER_RUN_MS`
- **Realtime**: `CHECK_INTERVAL`, `PRICE_CACHE_TTL`, `MAX_OPPORTUNITY_AGE`

## Documentation

- [Usage guide](./docs/USAGE_GUIDE.md) · [中文](./docs/USAGE_GUIDE.zh-CN.md)
- [Arbitrage logic](./docs/ARBITRAGE_LOGIC.md) · [中文](./docs/ARBITRAGE_LOGIC.zh-CN.md)
- [Lighter API notes](./docs/lighter_api_usage.md) · [中文](./docs/lighter_api_usage.zh-CN.md)

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to open an issue or a pull request.

## License

[MIT](./LICENSE) © CoinArbitrage contributors
