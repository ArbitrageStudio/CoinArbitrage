const AdvancedArbitrageCalculator = require('../src/utils/advanced_arbitrage.js');
const MLPricePredictor = require('../src/utils/ml_predictor.js');

// 创建更真实的模拟数据
const mockData = {
  okxTickers: [
    { symbol: 'BTC-USDT', price: 45000, bid: 44999, ask: 45001, volume: 1000, type: 'spot' },
    { symbol: 'ETH-USDT', price: 2500, bid: 2499, ask: 2501, volume: 5000, type: 'spot' },
    { symbol: 'SOL-USDT', price: 100, bid: 99.9, ask: 100.1, volume: 10000, type: 'spot' },
    { symbol: 'ADA-USDT', price: 0.5, bid: 0.499, ask: 0.501, volume: 50000, type: 'spot' }
  ],
  binanceTickers: [
    { symbol: 'BTC-USDT', price: 45100, bid: 45099, ask: 45101, volume: 2000, type: 'spot' },
    { symbol: 'ETH-USDT', price: 2490, bid: 2489, ask: 2491, volume: 8000, type: 'spot' },
    { symbol: 'SOL-USDT', price: 101, bid: 100.9, ask: 101.1, volume: 15000, type: 'spot' },
    { symbol: 'ADA-USDT', price: 0.52, bid: 0.519, ask: 0.521, volume: 60000, type: 'spot' }
  ],
  hyperliquidTickers: [
    { symbol: 'BTC-USDT', price: 44950, bid: 44949, ask: 44951, volume: 800, type: 'spot' },
    { symbol: 'ETH-USDT', price: 2510, bid: 2509, ask: 2511, volume: 3000, type: 'spot' },
    { symbol: 'SOL-USDT', price: 99, bid: 98.9, ask: 99.1, volume: 7000, type: 'spot' },
    { symbol: 'ADA-USDT', price: 0.48, bid: 0.479, ask: 0.481, volume: 40000, type: 'spot' }
  ]
};

// 测试高级套利分析
function testAdvancedArbitrage() {
  console.log('🚀 测试高级套利模型...\n');
  
  const advancedArb = new AdvancedArbitrageCalculator();
  const mlPredictor = new MLPricePredictor();
  
  // 1. 测试统计套利分析
  console.log('1. 📊 统计套利分析（均值回归策略）');
  console.log('='.repeat(50));
  
  // 添加历史数据（模拟价格波动）
  for (let i = 0; i < 30; i++) {
    mockData.okxTickers.forEach(ticker => {
      const fluctuation = (Math.random() - 0.5) * 0.02; // ±2%波动
      const newPrice = ticker.price * (1 + fluctuation);
      advancedArb.addPriceHistory(ticker.symbol, 'OKX', newPrice, Date.now() - (30 - i) * 60000);
    });
    
    mockData.binanceTickers.forEach(ticker => {
      const fluctuation = (Math.random() - 0.5) * 0.02;
      const newPrice = ticker.price * (1 + fluctuation);
      advancedArb.addPriceHistory(ticker.symbol, 'Binance', newPrice, Date.now() - (30 - i) * 60000);
    });
  }
  
  // 分析统计套利机会
  const statArbResults = [];
  ['BTC-USDT', 'ETH-USDT', 'SOL-USDT', 'ADA-USDT'].forEach(symbol => {
    const result1 = advancedArb.calculateStatisticalArbitrage(symbol, 'OKX', 'Binance');
    const result2 = advancedArb.calculateStatisticalArbitrage(symbol, 'OKX', 'Hyperliquid');
    const result3 = advancedArb.calculateStatisticalArbitrage(symbol, 'Binance', 'Hyperliquid');
    
    if (result1) statArbResults.push(result1);
    if (result2) statArbResults.push(result2);
    if (result3) statArbResults.push(result3);
  });
  
  statArbResults.forEach(result => {
    if (result.signal !== 'HOLD') {
      console.log(`   ${result.symbol} | ${result.exchange1}-${result.exchange2}`);
      console.log(`   信号: ${result.signal}, Z-score: ${result.zScore.toFixed(2)}, 置信度: ${(result.confidence * 100).toFixed(1)}%`);
      console.log(`   当前价差: ${result.currentSpread.toFixed(4)}, 平均价差: ${result.meanSpread.toFixed(4)}`);
      console.log('   ---');
    }
  });
  
  // 2. 测试三角套利分析
  console.log('\n2. 🔺 三角套利分析');
  console.log('='.repeat(50));
  
  const triArbResults = advancedArb.analyzeTriangularArbitrage([
    ...mockData.okxTickers,
    ...mockData.binanceTickers,
    ...mockData.hyperliquidTickers
  ]);
  
  if (triArbResults.length > 0) {
    triArbResults.slice(0, 3).forEach((opp, index) => {
      console.log(`   ${index + 1}. ${opp.path}`);
      console.log(`      套利空间: ${opp.percentage.toFixed(2)}%`);
      console.log(`      理论价格: ${opp.theoreticalPrice.toFixed(6)}`);
      console.log(`      实际价格: ${opp.actualPrice.toFixed(6)}`);
      console.log('      ---');
    });
  } else {
    console.log('   未发现三角套利机会');
  }
  
  // 3. 测试机器学习价格预测
  console.log('\n3. 🤖 机器学习价格预测');
  console.log('='.repeat(50));
  
  // 添加训练数据
  mockData.okxTickers.forEach(ticker => {
    for (let i = 0; i < 50; i++) {
      const fluctuation = (Math.random() - 0.5) * 0.01;
      const historicalPrice = ticker.price * (1 + fluctuation);
      mlPredictor.addTrainingData(ticker.symbol, historicalPrice, Date.now() - (50 - i) * 30000);
    }
  });
  
  // 预测价格方向
  ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'].forEach(symbol => {
    const prediction = mlPredictor.predictPriceDirection(symbol);
    const technical = mlPredictor.analyzeTechnicalIndicators(symbol);
    
    console.log(`   ${symbol}:`);
    console.log(`      预测方向: ${prediction.direction}`);
    console.log(`      置信度: ${(prediction.confidence * 100).toFixed(1)}%`);
    
    if (technical.indicators.rsi) {
      console.log(`      RSI: ${technical.indicators.rsi.rsi.toFixed(2)} (${technical.indicators.rsi.signal})`);
    }
    
    if (technical.indicators.macd) {
      console.log(`      MACD: ${technical.indicators.macd.signal}`);
    }
    
    console.log('      ---');
  });
  
  // 4. 测试风险调整分析
  console.log('\n4. ⚖️ 风险调整收益分析');
  console.log('='.repeat(50));
  
  const sampleOpportunity = {
    symbol: 'BTC-USDT',
    netProfitPercentage: 1.2,
    spread: { percentageSpread: 1.5 }
  };
  
  const riskAnalysis = advancedArb.calculateRiskAdjustedReturn(sampleOpportunity, {
    'BTC-USDT': 0.025, // 2.5%的波动率
    'ETH-USDT': 0.035,
    'SOL-USDT': 0.045
  });
  
  console.log(`   交易对: ${riskAnalysis.symbol}`);
  console.log(`   净利润: ${riskAnalysis.netProfitPercentage.toFixed(2)}%`);
  console.log(`   波动率: ${(riskAnalysis.volatility * 100).toFixed(2)}%`);
  console.log(`   夏普比率: ${riskAnalysis.sharpeRatio.toFixed(2)}`);
  console.log(`   风险等级: ${riskAnalysis.riskLevel}`);
  console.log(`   推荐: ${riskAnalysis.recommendation}`);
  
  console.log('\n🎯 高级套利分析完成！');
}

// 运行测试
testAdvancedArbitrage();