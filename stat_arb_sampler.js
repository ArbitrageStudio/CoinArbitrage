require('dotenv').config();

const OKXApi = require('./src/api/okx');
const BinanceApi = require('./src/api/binance');
const HyperliquidApi = require('./src/api/hyperliquid');
const AdvancedArbitrageCalculator = require('./src/utils/advanced_arbitrage');
const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(process.cwd(), '.stat_history.json');

function loadState() {
  try {
    if (!fs.existsSync(STATE_FILE)) return {};
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) || {};
  } catch {
    return {};
  }
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
  } catch {}
}

async function fetchTickers(okx, binance, hyperliquid, symbols) {
  const binanceSymbols = symbols.map(s => s.replace('-', ''));
  const [okxTickers, binanceRawTickers, hyperliquidTickers] = await Promise.all([
    okx.getMultipleTickers(symbols),
    binance.getMultipleTickers(binanceSymbols),
    hyperliquid.getMultipleTickers(symbols)
  ]);
  const binanceTickers = (binanceRawTickers || []).map(t => ({
    ...t,
    symbol: String(t.symbol).replace(/USDT$/, '-USDT')
  }));
  return { okxTickers, binanceTickers, hyperliquidTickers };
}

function addHistory(calc, exchange, tickers) {
  tickers.forEach(t => {
    if (t && t.symbol && t.price) {
      calc.addPriceHistory(t.symbol, exchange, t.price, Date.now());
    }
  });
}

function persistFromCalc(calc) {
  const state = loadState();
  calc.priceHistory.forEach((arr, key) => {
    if (!Array.isArray(state[key])) state[key] = [];
    const merged = [...state[key], ...arr];
    const trimmed = merged.slice(Math.max(0, merged.length - 100));
    state[key] = trimmed;
  });
  saveState(state);
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

  const okx = new OKXApi(
    process.env.OKX_API_KEY,
    process.env.OKX_SECRET_KEY,
    process.env.OKX_PASSPHRASE,
    process.env.OKX_SANDBOX === 'true'
  );
  const binance = new BinanceApi(
    process.env.BINANCE_API_KEY,
    process.env.BINANCE_SECRET_KEY,
    process.env.BINANCE_TESTNET === 'true'
  );
  const hyperliquid = new HyperliquidApi();
  const calc = new AdvancedArbitrageCalculator();

  async function tick() {
    try {
      const { okxTickers, binanceTickers, hyperliquidTickers } = await fetchTickers(okx, binance, hyperliquid, symbols);
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
