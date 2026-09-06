require('dotenv').config();

const AdvancedArbitrageCalculator = require('../src/utils/advanced_arbitrage');
const { loadJsonState, saveJsonState } = require('../src/utils/stateStore');
const { fetchTickers } = require('../src/utils/marketData');
const path = require('path');

const STATE_FILE = path.join(process.cwd(), '.stat_history.json');

function addHistory(calc, exchange, tickers) {
  tickers.forEach(t => {
    if (t && t.symbol && t.price) {
      calc.addPriceHistory(t.symbol, exchange, t.price, Date.now());
    }
  });
}

function persistFromCalc(calc) {
  const state = loadJsonState(STATE_FILE);
  calc.priceHistory.forEach((arr, key) => {
    if (!Array.isArray(state[key])) state[key] = [];
    const merged = [...state[key], ...arr];
    const trimmed = merged.slice(Math.max(0, merged.length - 100));
    state[key] = trimmed;
  });
  saveJsonState(STATE_FILE, state);
}

function outputSignals(calc, symbols) {
  const signals = [];
  symbols.forEach(symbol => {
    const s1 = calc.calculateStatisticalArbitrage(symbol, 'OKX', 'Binance');
    const s2 = calc.calculateStatisticalArbitrage(symbol, 'OKX', 'Hyperliquid');
    const s3 = calc.calculateStatisticalArbitrage(symbol, 'Binance', 'Hyperliquid');
    [s1, s2, s3].forEach(s => { if (s) signals.push(s); });
  });
  signals.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  const top = signals.slice(0, 10).map(s => ({
    symbol: s.symbol,
    pair: `${s.exchange1}-${s.exchange2}`,
    zScore: Number(s.zScore.toFixed(3)),
    signal: s.signal,
    confidence: Number(s.confidence.toFixed(3))
  }));
  if (top.length > 0) {
    console.log(JSON.stringify({ timestamp: new Date().toLocaleString('zh-CN'), signals: top }, null, 2));
  } else {
    console.log(JSON.stringify({ timestamp: new Date().toLocaleString('zh-CN'), signals: [] }, null, 2));
  }
}

async function main() {
  const symbolsEnv = process.env.ARBITRAGE_SYMBOLS || 'BTC-USDT,ETH-USDT,SOL-USDT';
  const symbols = symbolsEnv.split(',').map(s => s.trim()).filter(Boolean);
  const intervalMs = parseInt(process.env.SAMPLER_INTERVAL_MS || '3000');
  const runMs = parseInt(process.env.SAMPLER_RUN_MS || '0');

  const calc = new AdvancedArbitrageCalculator();

  async function tick() {
    try {
      const { okxTickers, binanceTickers, hyperliquidTickers } = await fetchTickers(symbols);
      addHistory(calc, 'OKX', okxTickers);
      addHistory(calc, 'Binance', binanceTickers);
      addHistory(calc, 'Hyperliquid', hyperliquidTickers);
      persistFromCalc(calc);
      outputSignals(calc, symbols);
    } catch (e) {
      console.error('采样失败', e.message);
    }
  }

  await tick();
  const timer = setInterval(tick, intervalMs);
  if (runMs > 0) {
    setTimeout(() => { clearInterval(timer); console.log('采样结束'); }, runMs);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal', err.message);
    process.exit(1);
  });
}
