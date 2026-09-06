require('dotenv').config();

const TradeExecutor = require('../src/utils/execution');

async function main() {
  const symbolsEnv = process.env.ARBITRAGE_SYMBOLS || 'BTC-USDT,ETH-USDT';
  const symbols = symbolsEnv.split(',').map(s => s.trim()).filter(Boolean);
  const minutesBefore = parseInt(process.env.FUNDING_CLOSE_BEFORE_MINUTES || '5');
  const executor = new TradeExecutor();

  for (const sym of symbols) {
    try {
      console.log(`🛡️ 资金费风控 ${sym}（提前 ${minutesBefore} 分钟）`);
      const res = await executor.maybeCloseOkxPerpBeforeFunding(sym, minutesBefore);
      if (res.closed) {
        console.log(`✅ ${sym} 已在资金费前平掉永续腿`);
      } else {
        console.log(`ℹ️ ${sym} 无需操作或无仓位`);
      }
    } catch (err) {
      console.error(`❌ ${sym} 风控失败:`, err.message);
    }
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}