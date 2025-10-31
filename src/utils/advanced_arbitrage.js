const ArbitrageCalculator = require('./arbitrage.js');

class AdvancedArbitrageCalculator extends ArbitrageCalculator {
  constructor() {
    super();
    this.priceHistory = new Map(); // 存储历史价格数据
    this.spreadHistory = new Map(); // 存储历史价差数据
    this.maxHistorySize = 100; // 最大历史数据点数
  }

  // 添加价格历史数据
  addPriceHistory(symbol, exchange, price, timestamp = Date.now()) {
    const key = `${symbol}-${exchange}`;
    if (!this.priceHistory.has(key)) {
      this.priceHistory.set(key, []);
    }
    
    const history = this.priceHistory.get(key);
    history.push({ price, timestamp });
    
    // 保持历史数据大小
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  // 计算统计套利信号（基于均值回归）
  calculateStatisticalArbitrage(symbol, exchange1, exchange2) {
    const key1 = `${symbol}-${exchange1}`;
    const key2 = `${symbol}-${exchange2}`;
    
    const history1 = this.priceHistory.get(key1) || [];
    const history2 = this.priceHistory.get(key2) || [];
    
    if (history1.length < 20 || history2.length < 20) {
      return null; // 数据不足
    }
    
    // 计算价差序列
    const spreads = [];
    const minLength = Math.min(history1.length, history2.length);
    
    for (let i = 0; i < minLength; i++) {
      const spread = Math.abs(history1[i].price - history2[i].price);
      spreads.push(spread);
    }
    
    // 计算统计指标
    const mean = spreads.reduce((sum, val) => sum + val, 0) / spreads.length;
    const std = Math.sqrt(spreads.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / spreads.length);
    
    // 当前价差
    const currentSpread = Math.abs(history1[history1.length - 1].price - history2[history2.length - 1].price);
    
    // 计算Z-score（偏离均值的标准差倍数）
    const zScore = std > 0 ? (currentSpread - mean) / std : 0;
    
    // 生成交易信号
    let signal = 'HOLD';
    let confidence = 0;
    
    if (zScore > 2.0) {
      signal = 'SELL_SPREAD'; // 价差过大，预计会回归
      confidence = Math.min(1.0, zScore / 4.0);
    } else if (zScore < -2.0) {
      signal = 'BUY_SPREAD'; // 价差过小，预计会扩大
      confidence = Math.min(1.0, Math.abs(zScore) / 4.0);
    }
    
    return {
      symbol,
      exchange1,
      exchange2,
      currentSpread,
      meanSpread: mean,
      stdDev: std,
      zScore,
      signal,
      confidence,
      historySize: minLength,
      timestamp: Date.now()
    };
  }

  // 三角套利分析
  analyzeTriangularArbitrage(tickers, baseCurrency = 'USDT') {
    const opportunities = [];
    
    // 构建价格矩阵
    const priceMatrix = {};
    tickers.forEach(ticker => {
      const [base, quote] = ticker.symbol.split('-');
      if (!priceMatrix[base]) priceMatrix[base] = {};
      priceMatrix[base][quote] = ticker.price;
    });
    
    // 寻找三角套利机会
    const currencies = Object.keys(priceMatrix);
    
    for (let i = 0; i < currencies.length; i++) {
      for (let j = 0; j < currencies.length; j++) {
        for (let k = 0; k < currencies.length; k++) {
          if (i === j || j === k || i === k) continue;
          
          const currencyA = currencies[i];
          const currencyB = currencies[j];
          const currencyC = currencies[k];
          
          // 检查所有必要的交易对是否存在
          if (priceMatrix[currencyA] && priceMatrix[currencyA][currencyB] &&
              priceMatrix[currencyB] && priceMatrix[currencyB][currencyC] &&
              priceMatrix[currencyA] && priceMatrix[currencyA][currencyC]) {
            
            const abPrice = priceMatrix[currencyA][currencyB];
            const bcPrice = priceMatrix[currencyB][currencyC];
            const acPrice = priceMatrix[currencyA][currencyC];
            
            // 计算三角套利理论价格
            const theoreticalPrice = abPrice * bcPrice;
            
            // 计算套利空间
            const arbitrageSpread = Math.abs(theoreticalPrice - acPrice);
            const arbitragePercentage = (arbitrageSpread / Math.min(theoreticalPrice, acPrice)) * 100;
            
            if (arbitragePercentage > this.minProfitThreshold) {
              opportunities.push({
                path: `${currencyA} → ${currencyB} → ${currencyC} → ${currencyA}`,
                currencies: [currencyA, currencyB, currencyC],
                prices: {
                  [currencyA+currencyB]: abPrice,
                  [currencyB+currencyC]: bcPrice,
                  [currencyA+currencyC]: acPrice
                },
                theoreticalPrice,
                actualPrice: acPrice,
                spread: arbitrageSpread,
                percentage: arbitragePercentage,
                isProfitable: arbitragePercentage > this.minProfitThreshold,
                timestamp: Date.now()
              });
            }
          }
        }
      }
    }
    
    return opportunities.sort((a, b) => b.percentage - a.percentage);
  }

  // 风险调整后的收益分析
  calculateRiskAdjustedReturn(opportunity, volatilityData = {}) {
    const { symbol, netProfitPercentage, spread } = opportunity;
    
    // 获取波动率数据（如果没有提供，使用默认值）
    const volatility = volatilityData[symbol] || 0.02; // 默认2%的日波动率
    
    // 计算夏普比率（假设无风险利率为0）
    const sharpeRatio = volatility > 0 ? netProfitPercentage / volatility : 0;
    
    // 计算Sortino比率（只考虑下行风险）
    const sortinoRatio = volatility > 0 ? netProfitPercentage / (volatility * 0.7) : 0;
    
    // 计算Calmar比率（收益/最大回撤）
    const calmarRatio = volatility > 0 ? netProfitPercentage / (volatility * 2) : 0;
    
    // 风险调整后的收益评分
    const riskAdjustedScore = (sharpeRatio + sortinoRatio + calmarRatio) / 3;
    
    return {
      symbol,
      netProfitPercentage,
      volatility,
      sharpeRatio,
      sortinoRatio,
      calmarRatio,
      riskAdjustedScore,
      riskLevel: this.getRiskLevel(riskAdjustedScore),
      recommendation: this.getRecommendation(riskAdjustedScore, netProfitPercentage)
    };
  }

  getRiskLevel(score) {
    if (score > 2.0) return 'LOW';
    if (score > 1.0) return 'MEDIUM';
    if (score > 0.5) return 'HIGH';
    return 'VERY_HIGH';
  }

  getRecommendation(score, profit) {
    if (score > 2.0 && profit > 1.0) return 'STRONG_BUY';
    if (score > 1.5 && profit > 0.8) return 'BUY';
    if (score > 1.0 && profit > 0.5) return 'HOLD';
    return 'AVOID';
  }

  // 批量分析高级套利机会
  analyzeAdvancedOpportunities(okxTickers, binanceTickers, hyperliquidTickers) {
    const results = {
      statisticalArbitrage: [],
      triangularArbitrage: [],
      riskAdjustedReturns: []
    };
    
    // 更新价格历史
    this.updatePriceHistory('OKX', okxTickers);
    this.updatePriceHistory('Binance', binanceTickers);
    this.updatePriceHistory('Hyperliquid', hyperliquidTickers);
    
    // 分析统计套利
    const symbols = [...new Set([...okxTickers, ...binanceTickers, ...hyperliquidTickers].map(t => t.symbol))];
    
    symbols.forEach(symbol => {
      // OKX vs Binance
      const statArb1 = this.calculateStatisticalArbitrage(symbol, 'OKX', 'Binance');
      if (statArb1) results.statisticalArbitrage.push(statArb1);
      
      // OKX vs Hyperliquid
      const statArb2 = this.calculateStatisticalArbitrage(symbol, 'OKX', 'Hyperliquid');
      if (statArb2) results.statisticalArbitrage.push(statArb2);
      
      // Binance vs Hyperliquid
      const statArb3 = this.calculateStatisticalArbitrage(symbol, 'Binance', 'Hyperliquid');
      if (statArb3) results.statisticalArbitrage.push(statArb3);
    });
    
    // 分析三角套利（每个交易所单独分析）
    results.triangularArbitrage.push({
      exchange: 'OKX',
      opportunities: this.analyzeTriangularArbitrage(okxTickers)
    });
    
    results.triangularArbitrage.push({
      exchange: 'Binance', 
      opportunities: this.analyzeTriangularArbitrage(binanceTickers)
    });
    
    results.triangularArbitrage.push({
      exchange: 'Hyperliquid',
      opportunities: this.analyzeTriangularArbitrage(hyperliquidTickers)
    });
    
    return results;
  }

  updatePriceHistory(exchange, tickers) {
    tickers.forEach(ticker => {
      this.addPriceHistory(ticker.symbol, exchange, ticker.price);
    });
  }

  // 生成高级分析报告
  generateAdvancedReport(advancedResults, basicOpportunities) {
    const report = {
      timestamp: new Date().toLocaleString('zh-CN'),
      basicAnalysis: super.generateArbitrageReport(basicOpportunities),
      statisticalArbitrage: {
        totalSignals: advancedResults.statisticalArbitrage.length,
        buySignals: advancedResults.statisticalArbitrage.filter(s => s.signal === 'BUY_SPREAD').length,
        sellSignals: advancedResults.statisticalArbitrage.filter(s => s.signal === 'SELL_SPREAD').length,
        signals: advancedResults.statisticalArbitrage.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore))
      },
      triangularArbitrage: {
        totalOpportunities: advancedResults.triangularArbitrage.reduce((sum, item) => sum + item.opportunities.length, 0),
        byExchange: advancedResults.triangularArbitrage.map(item => ({
          exchange: item.exchange,
          opportunities: item.opportunities.length,
          maxPercentage: item.opportunities.length > 0 ? Math.max(...item.opportunities.map(o => o.percentage)) : 0
        }))
      }
    };
    
    return report;
  }
}

module.exports = AdvancedArbitrageCalculator;