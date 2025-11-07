require('dotenv').config();

const TradeExecutor = require('./src/utils/execution');

async function main() {
  const symbolsEnv = process.env.ARBITRAGE_SYMBOLS || 'BTC-USDT,ETH-USDT';
  const symbols = symbolsEnv.split(',').map(s => s.trim()).filter(Boolean);
  const executor = new TradeExecutor();

  for (const sym of symbols) {
    try {
      console.log(`🔄 闭环 ${sym} 基差仓位`);
      const res = await executor.closeOkxBasisPosition(sym);
      if (!res.ok) {
        console.log(`❌ ${sym} 闭环失败: ${res.error}`);
      }
    } catch (err) {
      console.error(`❌ ${sym} 处理失败:`, err.message);
    }
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}