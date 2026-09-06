require('dotenv').config();

const AdvancedArbitrageCalculator = require('../src/utils/advanced_arbitrage');
const { loadJsonState } = require('../src/utils/stateStore');
const { fetchTickers } = require('../src/utils/marketData');
const path = require('path');

async function main() {
  const symbolsEnv = process.env.ARBITRAGE_SYMBOLS || 'BTC-USDT,ETH-USDT,SOL-USDT';
  const symbols = symbolsEnv.split(',').map(s => s.trim()).filter(Boolean);

  const { okxTickers, binanceTickers, hyperliquidTickers } = await fetchTickers(symbols);

  const calc = new AdvancedArbitrageCalculator();

  const stateFile = path.join(process.cwd(), '.stat_history.json');
  const state = loadJsonState(stateFile);
  Object.keys(state).forEach(key => {
    calc.priceHistory.set(key, state[key]);
  });

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
