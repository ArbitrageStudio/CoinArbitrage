require('dotenv').config();

const OKXApi = require('./src/api/okx');
const BinanceApi = require('./src/api/binance');
const HyperliquidApi = require('./src/api/hyperliquid');
const AdvancedArbitrageCalculator = require('./src/utils/advanced_arbitrage');
const fs = require('fs');
const path = require('path');

async function main() {
  const symbolsEnv = process.env.ARBITRAGE_SYMBOLS || 'BTC-USDT,ETH-USDT,SOL-USDT';
  const symbols = symbolsEnv.split(',').map(s => s.trim()).filter(Boolean);

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

  const calc = new AdvancedArbitrageCalculator();

  try {
    const stateFile = path.join(process.cwd(), '.stat_history.json');
    if (fs.existsSync(stateFile)) {
      const state = JSON.parse(fs.readFileSync(stateFile, 'utf8')) || {};
      Object.keys(state).forEach(key => {
        calc.priceHistory.set(key, state[key]);
      });
    }
  } catch {}

  const results = calc.analyzeAdvancedOpportunities(okxTickers, binanceTickers, hyperliquidTickers);
  const report = calc.generateAdvancedReport(results, []);
  console.log(JSON.stringify(report, null, 2));
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal', err.message);
    process.exit(1);
  });
}
