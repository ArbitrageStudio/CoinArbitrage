const CoinArbitrage = require('./index.js');

// 模拟数据用于测试套利分析
const mockData = {
  okxTickers: [
    { symbol: 'BTC-USDT', price: 45000, bid: 44999, ask: 45001, volume: 1000, type: 'spot' },
    { symbol: 'ETH-USDT', price: 2500, bid: 2499, ask: 2501, volume: 5000, type: 'spot' },
    { symbol: 'SOL-USDT', price: 100, bid: 99.9, ask: 100.1, volume: 10000, type: 'spot' }
  ],
  binanceTickers: [
    { symbol: 'BTC-USDT', price: 45100, bid: 45099, ask: 45101, volume: 2000, type: 'spot' },
    { symbol: 'ETH-USDT', price: 2490, bid: 2489, ask: 2491, volume: 8000, type: 'spot' },
    { symbol: 'SOL-USDT', price: 101, bid: 100.9, ask: 101.1, volume: 15000, type: 'spot' }
  ],
  hyperliquidTickers: [
    { symbol: 'BTC-USDT', price: 44950, bid: 44949, ask: 44951, volume: 800, type: 'spot' },
    { symbol: 'ETH-USDT', price: 2510, bid: 2509, ask: 2511, volume: 3000, type: 'spot' },
    { symbol: 'SOL-USDT', price: 99, bid: 98.9, ask: 99.1, volume: 7000, type: 'spot' }
  ]
};

// 测试套利分析功能
function testArbitrageAnalysis() {
  console.log('🧪 测试套利分析功能...\n');
  
  const arbitrage = new CoinArbitrage();
  
  // 手动设置模拟数据
  const opportunities = [];
  
  // 分析OKX-Binance套利机会
  const okxBinanceOpps = arbitrage.arbitrageCalculator.analyzeBatchOpportunities(
    mockData.okxTickers,
    mockData.binanceTickers
  );
  
  // 分析OKX-Hyperliquid套利机会
  const okxHyperOpps = arbitrage.arbitrageCalculator.analyzeBatchOpportunities(
    mockData.okxTickers,
    mockData.hyperliquidTickers
  );
  
  // 分析Binance-Hyperliquid套利机会
  const binanceHyperOpps = arbitrage.arbitrageCalculator.analyzeBatchOpportunities(
    mockData.binanceTickers,
    mockData.hyperliquidTickers
  );
  
  // 合并所有机会
  const allOpportunities = [...okxBinanceOpps, ...okxHyperOpps, ...binanceHyperOpps];
  
  // 生成报告
  const report = arbitrage.arbitrageCalculator.generateArbitrageReport(allOpportunities);
  
  // 显示报告
  console.log('📊 模拟数据套利分析报告:');
  console.log('='.repeat(50));
  console.log(`总机会数: ${report.总机会数}`);
  console.log(`有利可图机会数: ${report.有利可图机会数}`);
  console.log(`生成时间: ${report.生成时间}\n`);
  
  if (report.最佳机会) {
    console.log('🏆 最佳套利机会:');
    console.log('-'.repeat(30));
    Object.entries(report.最佳机会).forEach(([key, value]) => {
      console.log(`${key}: ${value}`);
    });
  }
  
  // 显示所有有利可图的机会
  if (report.所有有利可图机会.length > 0) {
    console.log('\n💰 所有有利可图机会:');
    console.log('-'.repeat(30));
    report.所有有利可图机会.forEach((opp, index) => {
      console.log(`\n${index + 1}. ${opp.交易对}`);
      console.log(`   净利润百分比: ${opp.净利润百分比}`);
      console.log(`   买入交易所: ${opp.买入交易所}`);
      console.log(`   卖出交易所: ${opp.卖出交易所}`);
      console.log(`   价差百分比: ${opp.价差百分比}`);
    });
  }
  
  // 分析套利机会的分布
  console.log('\n📈 套利机会分析:');
  console.log('-'.repeat(30));
  
  const exchangePairs = {
    'OKX-Binance': okxBinanceOpps.filter(opp => opp.isProfitable).length,
    'OKX-Hyperliquid': okxHyperOpps.filter(opp => opp.isProfitable).length,
    'Binance-Hyperliquid': binanceHyperOpps.filter(opp => opp.isProfitable).length
  };
  
  Object.entries(exchangePairs).forEach(([pair, count]) => {
    console.log(`${pair}: ${count} 个有利可图机会`);
  });
}

// 运行测试
testArbitrageAnalysis();