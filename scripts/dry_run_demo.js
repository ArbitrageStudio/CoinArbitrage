require('dotenv').config();

// 强制开启自动交易的干跑模式（不会下单）
process.env.ENABLE_AUTO_TRADE = process.env.ENABLE_AUTO_TRADE || 'true';
process.env.AUTO_TRADE_DRY_RUN = 'true';
process.env.ORDER_USDT_SIZE = process.env.ORDER_USDT_SIZE || '50';
process.env.AUTO_TRADE_MIN_PROFIT = process.env.AUTO_TRADE_MIN_PROFIT || '0.1';

const TradeExecutor = require('../src/utils/execution');

async function main() {
  console.log('🧪 运行干跑验证：不会提交真实订单');

  const executor = new TradeExecutor();

  // 构造一个模拟的套利机会（字段与实时检测一致）
  const mockOpportunity = {
    symbol: 'BTC-USDT',
    buyExchange: 'binance',
    sellExchange: 'okx',
    buyPrice: 42000,
    sellPrice: 42250,
    spread: ((42250 - 42000) / 42000) * 100,
    grossProfit: 250,
    netProfit: 250 - (42000 * 0.001 + 42250 * 0.001),
    netProfitPercentage: ((250 - (42000 * 0.001 + 42250 * 0.001)) / 42000) * 100,
    timestamp: Date.now(),
    feasible: true
  };

  console.log('🧮 模拟机会: ', {
    symbol: mockOpportunity.symbol,
    buyExchange: mockOpportunity.buyExchange,
    sellExchange: mockOpportunity.sellExchange,
    netProfitPercentage: mockOpportunity.netProfitPercentage.toFixed(4) + '%'
  });

  const result = await executor.executeArbitrage(mockOpportunity);
  console.log('📄 执行结果: ', result);
  console.log('✅ 干跑完成');
}

main().catch(err => {
  console.error('❌ 干跑失败:', err.message);
  process.exit(1);
});