# 📖 Cryptocurrency Arbitrage System - Usage Guide

> Chinese version: [USAGE_GUIDE.zh-CN.md](./USAGE_GUIDE.zh-CN.md)

## 🚀 Quick Start

### 1. Environment Setup

```bash
# Install dependencies
npm install

# Copy the environment variable template
cp .env.example .env
```

### 2. Configure Environment Variables

Edit `.env`:

```env
# Symbols to monitor (comma-separated)
ARBITRAGE_SYMBOLS="BTC-USDT,ETH-USDT,SOL-USDT"

# Minimum profit threshold (percentage)
MIN_PROFIT_THRESHOLD=0.1

# Exchange flags (true/false)
BINANCE_ENABLED=true
OKX_ENABLED=true
HYPERLIQUID_ENABLED=true
```

### 3. Start Real-Time Monitoring

```bash
# Start real-time arbitrage monitoring
node scripts/realtime_monitor.js

# Or use the npm script
npm run monitor
```

## ⚙️ Configuration

### Core Config File

The main configuration lives in `src/config/arbitrageConfig.js`:

```javascript
// Default symbols to monitor
const DEFAULT_SYMBOLS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];

// Minimum profit threshold (0.1%)
const DEFAULT_MIN_PROFIT_THRESHOLD = 0.1;

// Realtime detection config
const REALTIME_CONFIG = {
  checkInterval: 2000,        // check every 2 seconds
  priceCacheTTL: 10000,       // price cache 10 seconds
  maxOpportunityAge: 30000    // opportunity valid for 30 seconds
};
```

### Environment Variable Precedence

The system reads configuration in the following order:

1. **Environment variables** (highest priority)
2. **Config file defaults**
3. **Hard-coded values**

### Advanced Analysis & Statistical Arbitrage

```bash
# Generate a one-shot advanced analysis report (statistical & triangular arbitrage)
npm run arb:advanced

# Periodically sample and persist history, then output statistical arbitrage signals
npm run arb:stat
```

- Report source: `scripts/advanced_arbitrage_cli.js`, generates a JSON report from OKX / Binance / Hyperliquid market data.
- History accumulation: `scripts/stat_arb_sampler.js` persists price history to `.stat_history.json` in the project root on every sample.
- Signal requirements: at least 20 historical data points are needed before stable Z-score signals appear.
- Sampling parameters:
  - `ARBITRAGE_SYMBOLS` (default `BTC-USDT,ETH-USDT,SOL-USDT`)
  - `SAMPLER_INTERVAL_MS` (default `3000`)
  - `SAMPLER_RUN_MS` (default `0` = run forever)

### Annualized Yield Guard Strategy (optional live trading)

```bash
# Maintain a minimum annualized return while controlling drawdown
npm run basis:yield
```

- Entry point: `scripts/yield_guard.js`. Opens/completes legs when the plan is feasible, meets the APR target, and passes the slippage check; closes the position when targets are not met or a stop-loss / take-profit / funding window is triggered.
- Environment variables:
  - `TARGET_APR_MIN` (minimum annualized target, e.g. `10`)
  - `EXIT_APR_MIN` (exit APR threshold, e.g. `2`)
  - `BASIS_HOLD_HOURS`, `STOP_LOSS_PCT`, `TAKE_PROFIT_PCT`, `MAX_SLIPPAGE_PCT`
  - Real orders are only placed when `ENABLE_AUTO_TRADE=true` and `AUTO_TRADE_DRY_RUN=false`

## 📊 Monitoring

### Real-Time Monitoring Commands

```bash
# Basic monitoring
node scripts/realtime_monitor.js

# Monitor specific symbols
ARBITRAGE_SYMBOLS="BTC-USDT,ETH-USDT" node scripts/realtime_monitor.js

# Custom profit threshold
MIN_PROFIT_THRESHOLD=0.2 node scripts/realtime_monitor.js
```

## 🧭 Command Reference (npm scripts)

### General

- `npm start` / `npm run start`
  - Runs the main entry point `index.js` (data fetching and analysis example).
  - Arguments: none (uses `.env` and defaults).
- `npm run dev`
  - Runs `index.js` with `--watch` (development mode).
  - Arguments: none.

### Real-Time Monitoring

- `npm run monitor`
  - Runs `scripts/realtime_monitor.js`, discovering cross-exchange arbitrage opportunities in real time over WebSocket.
  - CLI arguments:
    - `--help` show help
    - `--stop` stop monitoring
    - `--status` show current status
    - `--set-threshold=0.5` set the minimum profit threshold (percentage)
  - Environment variables: `ARBITRAGE_SYMBOLS`, `MIN_PROFIT_THRESHOLD`

### Auto-Trading (Dry-Run Example)

- `npm run dryrun`
  - Runs `scripts/dry_run_demo.js`, demonstrating the auto-trade entry point in dry-run mode.
  - Environment variables (with in-script defaults): `ENABLE_AUTO_TRADE`, `AUTO_TRADE_DRY_RUN`, `ORDER_USDT_SIZE`, `AUTO_TRADE_MIN_PROFIT`

### OKX Basis Arbitrage (Spot vs Perpetual)

- `npm run basis:dryrun`
  - Runs `scripts/okx_basis_dryrun.js`, generating and printing plans only (validates feasibility, no orders).
  - Environment variables: `ARBITRAGE_SYMBOLS`, `BASIS_HOLD_HOURS`, `OKX_SPOT_FEE`, `OKX_PERP_FEE`, `ORDER_USDT_SIZE`, `BASIS_MIN_PROFIT` or `AUTO_TRADE_MIN_PROFIT`
- `npm run basis:sandbox`
  - Runs `scripts/okx_basis_trade.js`, placing market orders on the OKX sandbox (strict risk control).
  - Required: `OKX_SANDBOX=true`, `ENABLE_AUTO_TRADE=true`
  - Recommended: `AUTO_TRADE_DRY_RUN=false` to actually place orders
  - Environment variables: `ARBITRAGE_SYMBOLS`, `BASIS_HOLD_HOURS`, `ORDER_USDT_SIZE`
- `npm run basis:close`
  - Runs `scripts/okx_basis_close.js`, closing both legs for each symbol (perp first, then spot).
  - Environment variables: `ARBITRAGE_SYMBOLS`
- `npm run basis:risk`
  - Runs `scripts/okx_basis_risk.js`, closing the perp leg before the funding window when it would pay positive funding.
  - Environment variables: `ARBITRAGE_SYMBOLS`, `FUNDING_CLOSE_BEFORE_MINUTES`
- `npm run basis:manager`
  - Runs `scripts/okx_basis_manager.js`, continuously managing positions: auto-open / funding risk control / hold-duration close / stop-loss & take-profit.
  - Environment variables: `ARBITRAGE_SYMBOLS`, `BASIS_HOLD_HOURS`, `BASIS_STOP_LOSS_PCT`, `BASIS_TAKE_PROFIT_PCT`, `MANAGER_CHECK_INTERVAL_MS`, `MANAGER_RUN_MS`, `ENABLE_AUTO_TRADE`, `AUTO_TRADE_DRY_RUN`
- `npm run basis:yield`
  - Runs `scripts/yield_guard.js`, executing/completing legs and closing positions based on APR targets and slippage risk control.
  - Environment variables: `TARGET_APR_MIN`, `EXIT_APR_MIN`, `BASIS_HOLD_HOURS`, `STOP_LOSS_PCT`, `TAKE_PROFIT_PCT`, `MAX_SLIPPAGE_PCT`, `ENABLE_AUTO_TRADE`, `AUTO_TRADE_DRY_RUN`

### Advanced Analysis & Statistical Arbitrage

- `npm run arb:advanced`
  - Runs `scripts/advanced_arbitrage_cli.js`, generating a statistical & triangular arbitrage report (JSON output).
  - Environment variables: `ARBITRAGE_SYMBOLS` (default `BTC-USDT,ETH-USDT,SOL-USDT`)
  - History source: if `.stat_history.json` exists, it is loaded before analysis to improve signal stability.
- `npm run arb:stat`
  - Runs `scripts/stat_arb_sampler.js`, sampling periodically, accumulating history, and outputting statistical arbitrage signals.
  - Environment variables: `ARBITRAGE_SYMBOLS`, `SAMPLER_INTERVAL_MS` (default `3000`), `SAMPLER_RUN_MS` (default `0` = run forever)
  - History storage: `.stat_history.json` in the project root, up to 100 points per key.

### Lighter Demo

- `npm run lighter:wsdemo`
  - Runs `scripts/lighter_ws_demo.js`, demonstrating the Lighter WebSocket and order book handling.
  - Args/env: depends on Lighter API configuration (see `lighter_api_usage.md`).

### Monitoring Output Example

```
🌐 Starting cryptocurrency real-time arbitrage monitoring...
📊 Monitoring symbols: BTC-USDT, ETH-USDT, SOL-USDT
⚡ Detection frequency: milliseconds (WebSocket real-time data)
💡 Minimum profit threshold: 0.3%
⏰ Start time: 2025/10/31 3:18:12 PM
============================================================
🚀 Starting real-time arbitrage detection...
🌐 Connecting to Binance WebSocket...
✅ binance WebSocket connected
🌐 Connecting to OKX WebSocket...
✅ okx WebSocket connected
🌐 Connecting to Hyperliquid WebSocket...
✅ hyperliquid WebSocket connected
```

## 🎯 Arbitrage Opportunity Notification

### Opportunity Display Format

```
🎯 Arbitrage opportunity found!
📈 Profit: 0.45%
🔄 Path: Binance → OKX
💰 Symbol: BTC-USDT
🕒 Time: 2025-01-31 15:20:30
📊 Buy price: $42,100.50 (Binance)
📊 Sell price: $42,290.25 (OKX)
💸 Spread: $189.75
```

### High-Profit Opportunities

When profit exceeds 0.5%:

```
🚀 High-profit arbitrage opportunity!
📈 Profit: 0.78%
🔄 Path: Hyperliquid → Binance
💰 Symbol: ETH-USDT
⚠️ Note: execute quickly!
```

## 🔧 Advanced Configuration

### Custom Symbols

Add to `.env`:

```env
ARBITRAGE_SYMBOLS="BTC-USDT,ETH-USDT,XRP-USDT,LTC-USDT,ADA-USDT"
```

### Adjust Detection Frequency

Edit `src/config/arbitrageConfig.js`:

```javascript
const REALTIME_CONFIG = {
  checkInterval: 1000,        // lower to 1 second (more frequent)
  priceCacheTTL: 5000,        // 5-second cache
  maxOpportunityAge: 15000    // opportunity valid for 15 seconds
};
```

### Disable Specific Exchanges

Set in `.env`:

```env
# Disable OKX
OKX_ENABLED=false

# Use Binance only
BINANCE_ENABLED=true
OKX_ENABLED=false
HYPERLIQUID_ENABLED=false
```

## 🤖 Auto-Trading (Optional)

Auto-trading is disabled by default. To enable it:

1) Enable and configure in `.env`:

```env
ENABLE_AUTO_TRADE=true          # enable auto-trading
AUTO_TRADE_DRY_RUN=true         # dry-run mode: print only, no orders (start here)
ORDER_USDT_SIZE=50              # USDT amount per trade
AUTO_TRADE_MIN_PROFIT=0.5       # only trade when profit exceeds this threshold
AUTO_TRADE_COOLDOWN_MS=15000    # cooldown per symbol, in milliseconds
```

2) Make sure exchange keys are configured and have trading permissions:

- `BINANCE_API_KEY`, `BINANCE_SECRET_KEY`
- `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`

3) Once real-time monitoring is running, when an opportunity above the threshold is detected the system will:

- Market-buy on the buy exchange by USDT amount (Binance uses `quoteOrderQty`, OKX uses `tgtCcy=quote_ccy`).
- Market-sell the filled quantity on the sell exchange.
- Skip repeated orders for the same symbol within the cooldown window.

4) Risks and notes:

- Market orders can incur slippage and fee errors; start with `AUTO_TRADE_DRY_RUN=true` to validate the flow.
- Binance sell market orders require a `quantity`; precision or `LOT_SIZE` mismatches may cause errors.
- OKX spot market buys by USDT amount require `tdMode=cash` and `tgtCcy=quote_ccy`.
- Hyperliquid auto-trading is not yet integrated; it is currently used only for price and opportunity detection.

## 🧪 OKX Single-Exchange Basis Arbitrage (Dry-Run Validation)

Validates the feasibility and potential net profit of OKX spot-perpetual basis arbitrage (buy spot, short perpetual).

- Command: `npm run basis:dryrun`
- Configuration:
  - `ARBITRAGE_SYMBOLS` (or set in `src/config/arbitrageConfig.js`)
  - `BASIS_HOLD_HOURS` (default `8`, one funding cycle)
  - `OKX_SPOT_FEE` (default `0.001`, i.e. 0.1%)
  - `OKX_PERP_FEE` (default `0.0005`, i.e. 0.05%)
  - `ORDER_USDT_SIZE` (default `50`, used to estimate size)
  - `BASIS_MIN_PROFIT` or `AUTO_TRADE_MIN_PROFIT` (minimum net-profit percentage threshold)

Output includes: spot price, perp price, basis percentage, funding estimate, fee estimate, expected net profit, and net profit percentage. A `✅ Feasible plan` marker means the net profit percentage exceeds your configured threshold.

Notes:

- This is a dry-run validation; no real orders are placed. Real execution requires OKX perpetual order placement and position management.
- The funding rate is an 8-hour periodic rate; the script uses a linear approximation for reference.
- It is recommended to first place real orders in the OKX sandbox with a small, controlled size before going live.

### 🧪→🧰 Sandbox Real-Order Execution (OKX Perpetual)

- Command: `npm run basis:sandbox`
- Prerequisites:
  - `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE` configured
  - `OKX_SANDBOX=true` (enables the simulated-trading header `x-simulated-trading: 1`)
  - To observe without placing orders, keep `AUTO_TRADE_DRY_RUN=true`
- Behavior:
  - The script reads the plan generated by `src/utils/intra_exchange_arbitrage.js` (buy spot, sell perpetual) and executes it at market price in the sandbox.
  - Contract counts are converted from OKX instrument parameters `ctVal/lotSz/minSz` and rounded down to avoid minimum-size errors.

Example environment variables:

```env
OKX_SANDBOX=true
ENABLE_AUTO_TRADE=true
AUTO_TRADE_DRY_RUN=false
ORDER_USDT_SIZE=50
ARBITRAGE_SYMBOLS=BTC-USDT,ETH-USDT
```

Notes:

- Contract-size calculation requires the `public/instruments` parameters; if `ORDER_USDT_SIZE` is too small it may fall below `minSz` and be rejected.
- For initial validation, use a small size and split into batches, observing funding impact and fill structure.

### Slippage Check & Liquidity Validation

When auto-executing a basis arbitrage plan, the system queries OKX spot/perpetual order book depth before placing orders and estimates expected slippage:

- If total slippage (spot + perp) exceeds the threshold (default 0.5%), execution is skipped.
- Environment variable: `MAX_SLIPPAGE_PCT=0.5` (customizable threshold percentage).

This helps avoid excessive slippage in volatile markets where the actual profit would fall below expectations.

### 🔄 Closing & Risk Control (Position Query / Close / Funding)

- Position query & closing:
  - Close both legs: `npm run basis:close`
  - Note: closes the perpetual first, then sells the spot balance, to avoid increasing exposure.
- Funding risk control:
  - Close the short perp leg before funding when it would pay positive funding: `npm run basis:risk`
  - Environment variable: `FUNDING_CLOSE_BEFORE_MINUTES=5`
  - Rule: if holding a short perp with `fundingRate > 0` and the next funding time is within the threshold minutes, close the perp leg.

Notes:

- OKX spot balance reads depend on `account/balance` `details.ccy`; if assets are insufficient, the spot leg is skipped.
- Perpetual position reads depend on `account/positions?instType=SWAP&instId=...`; if there is no position, the perp leg is skipped.

### 🧭 Manager Script (Continuous Management & Auto-Close)

- Command: `npm run basis:manager`
- Function: polls `ARBITRAGE_SYMBOLS` at a fixed interval and performs "auto-open + continuous management + auto-close" for OKX spot+perp basis:
  - Funding-window risk control: if short perp with `fundingRate > 0` and the next funding is within the threshold minutes, close the perp leg early.
  - Hold-duration close: after reaching `BASIS_HOLD_HOURS`, close the perp first, then sell spot — a full close.
  - Stop-loss / take-profit: roughly calculates net profit rate from current spot/perp prices and auto-closes when the stop-loss or take-profit threshold is triggered.
  - Auto-open: when the basis plan is feasible (`feasible=true`) and auto-trading is enabled, market-buys spot and shorts perpetual, sized by `ORDER_USDT_SIZE`.

Environment variables:

- `ARBITRAGE_SYMBOLS`: e.g. `BTC-USDT,ETH-USDT`
- `BASIS_HOLD_HOURS`: auto-close after this hold duration, default `8`
- `FUNDING_CLOSE_BEFORE_MINUTES`: how many minutes before funding to close the perp, default `5`
- `BASIS_STOP_LOSS_PCT`: stop-loss percentage (net-profit-rate threshold, negative direction), default `0` = disabled
- `BASIS_TAKE_PROFIT_PCT`: take-profit percentage (net-profit-rate threshold), default `0` = disabled
- `MANAGER_CHECK_INTERVAL_MS`: polling interval in ms, default `60000`
- `MANAGER_RUN_MS`: run duration in ms, default `0` = run forever
- `ENABLE_AUTO_TRADE`: enable auto-trading (for auto-open), default `false`
- `AUTO_TRADE_DRY_RUN`: dry-run mode (print plan without ordering), default `true`

Notes:

- The script uses a local state file `.basis_state.json` to record position start times; if you close positions externally or the account balance changes, the script syncs and cleans up state on the next poll.
- If using the sandbox, set `OKX_SANDBOX=true` and ensure `OKX_API_KEY/SECRET_KEY/PASSPHRASE` are valid; in a live environment, carefully evaluate risk and permissions.
- Auto-open requires `ENABLE_AUTO_TRADE=true`; in dry-run mode it only prints without ordering, and position records are not persisted.

## 🛠️ Troubleshooting

### Common Issues

#### 1. WebSocket Connection Failure

```bash
# Check network connectivity
ping api.binance.com

# Check firewall settings
sudo ufw status
```

#### 2. API Rate Limit Errors

```
Hyperliquid getTicker error: Request failed with status code 429
```

**Solutions:**

- Increase the check interval
- Reduce the number of monitored symbols
- Enable price caching

#### 3. Out-of-Sync Price Data

```bash
# Check system time synchronization
sudo ntpdate pool.ntp.org
```

### Log Debugging

```bash
# Enable verbose logging
DEBUG=* node scripts/realtime_monitor.js

# Show errors only
DEBUG=error node scripts/realtime_monitor.js
```

## 📈 Performance Tuning

### For Low-Spec Servers

```javascript
// Fewer symbols
ARBITRAGE_SYMBOLS="BTC-USDT,ETH-USDT"

// Longer check interval
checkInterval: 3000

// Disable non-essential exchanges
HYPERLIQUID_ENABLED=false
```

### For High-Frequency Trading

```javascript
// More symbols
ARBITRAGE_SYMBOLS="BTC-USDT,ETH-USDT,SOL-USDT,ADA-USDT,XRP-USDT"

// Shorter check interval
checkInterval: 500

// Shorter cache time
priceCacheTTL: 2000
```

## 🔄 System Maintenance

### Periodic Checks

```bash
# Check for dependency updates
npm outdated

# Update dependencies
npm update

# Security audit
npm audit
```

### Monitoring System Status

```bash
# Check resource usage
htop

# Monitor network connections
netstat -tulpn

# Check log files
tail -f logs/arbitrage.log
```

## 🚨 Important Notes

1. **Risk**: arbitrage trading is risky; account for slippage and fees in real execution.
2. **API limits**: respect each exchange's API rate limits.
3. **Network latency**: cross-exchange arbitrage is latency-sensitive.
4. **Fund safety**: start with a small amount before scaling up.
5. **Legal compliance**: make sure cryptocurrency trading is legal in your jurisdiction.

---

*Last updated: January 2025*
*If you encounter issues, check the log files or contact the developer.*
