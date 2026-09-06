# Cryptocurrency Arbitrage System - Logic Overview

> Chinese version: [ARBITRAGE_LOGIC.zh-CN.md](./ARBITRAGE_LOGIC.zh-CN.md)

## 🎯 System Overview

This is a real-time cryptocurrency arbitrage detection system. It monitors price differences across multiple exchanges, detects potential arbitrage opportunities, and notifies you when they appear.

## 🔄 Arbitrage Logic Flow

### 1. Data Collection

```
Exchange WebSocket → real-time price stream → price cache update
```

**Supported exchanges:**

- **Binance** - the largest cryptocurrency exchange
- **OKX** - a professional derivatives exchange
- **Hyperliquid** - a decentralized perpetual exchange

### 2. Price Processing

```
Real-time price data → price normalization → cache management → validity check
```

**Price normalization:**

- Unify symbol format (e.g. `BTC-USDT`)
- Convert to numeric values
- Validate timestamps

### 3. Arbitrage Detection Algorithms

#### Triangular Arbitrage

```javascript
function findTriangularArbitrage(exchangePrices) {
  // 1. Iterate over all possible trading-pair combinations
  // 2. Calculate theoretical profit along each path
  // 3. Filter out opportunities below the threshold
  // 4. Return high-profit opportunities
}
```

#### Cross-Exchange Arbitrage

```javascript
function findCrossExchangeArbitrage(prices) {
  // 1. Compare the same pair across different exchanges
  // 2. Calculate the percentage price difference
  // 3. Account for trading fees and slippage
  // 4. Filter executable opportunities
}
```

### 4. Profit Calculation Model

```
Theoretical profit = (sell price on target exchange - buy price on source exchange) / buy price on source exchange * 100%
Actual profit = theoretical profit - trading fees - slippage loss
```

**Considered factors:**

- Trading fees (0.1%-0.2%)
- Network latency cost
- Price slippage risk
- Fund transfer time

### 5. Risk Management

- ✅ Minimum profit threshold filtering (default: 0.1%)
- ✅ Price validity checks (timestamp validation)
- ✅ API call rate limiting (to avoid being banned)
- ✅ Error retry mechanism
- ✅ Connection state monitoring

## 🏗️ System Architecture

### Core Modules

1. **API layer** (`src/api/`)
   - `binance.js` - Binance exchange API
   - `okx.js` - OKX exchange API
   - `hyperliquid.js` - Hyperliquid exchange API
   - `websocket.js` - WebSocket connection management

2. **Arbitrage engine** (`src/utils/`)
   - `realtime_arbitrage.js` - real-time arbitrage detection core
   - `arbitrage.js` - basic arbitrage algorithms
   - `advanced_arbitrage.js` - advanced arbitrage strategies
   - `slippage.js` - slippage calculation model
   - `ml_predictor.js` - ML-based price prediction

3. **Configuration** (`src/config/`)
   - `arbitrageConfig.js` - system configuration center

### Data Flow

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Exchange WS feed │ →  │  Price cache      │ →  │  Arbitrage engine │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        ↓                        ↓                        ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Real-time prices │    │ Cache validation │    │ Filter & sort     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        ↓                        ↓                        ↓
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ Error retry      │    │ Rate limiting    │    │ Notification      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## ⚡ Performance Optimizations

### Caching

- **Price cache TTL**: 10 seconds
- **API call interval**: 2 seconds
- **Smart cache updates**: only update when the actual price changes

### Rate Control

- **WebSocket reconnect**: automatic exponential backoff
- **API call queue**: queued request management
- **Rate limiting**: respects exchange API limits

## 🎪 Features

### Implemented

- ✅ Multi-exchange real-time price monitoring
- ✅ Cross-exchange arbitrage detection
- ✅ Automatic profit calculation
- ✅ Real-time opportunity notification
- ✅ Configurable symbol management
- ✅ Intelligent error recovery
- ✅ Rate-limit protection

### Advanced

- 🔄 ML price prediction
- 📊 Slippage simulation
- 🔔 Multi-channel notification
- ⚙️ Dynamic configuration

## 🔧 Tech Stack

- **Runtime**: Node.js + JavaScript
- **Network**: WebSocket + REST API
- **Data processing**: real-time stream processing
- **Cache**: in-memory caching
- **Monitoring**: connection health checks

---
