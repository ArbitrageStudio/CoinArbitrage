class ArbitrageCalculator {
  constructor() {
    this.minProfitThreshold = 0.5; // 最小利润阈值（百分比）
  }

  // 设置最小利润阈值
  setMinProfitThreshold(threshold) {
    this.minProfitThreshold = threshold;
  }

  // 计算两个交易所之间的价差
  calculateSpread(price1, price2) {
    const spread = Math.abs(price1 - price2);
    const spreadPercentage = (spread / Math.min(price1, price2)) * 100;
    
    return {
      absoluteSpread: spread,
      percentageSpread: spreadPercentage,
      higherPrice: Math.max(price1, price2),
      lowerPrice: Math.min(price1, price2)
    };
  }

  // 分析套利机会
  analyzeArbitrageOpportunity(okxTicker, binanceTicker) {
    if (!okxTicker || !binanceTicker) {
      return null;
    }

    if (okxTicker.symbol !== binanceTicker.symbol) {
      throw new Error('交易对不匹配');
    }

    const spread = this.calculateSpread(okxTicker.price, binanceTicker.price);
    const isProfitable = spread.percentageSpread >= this.minProfitThreshold;
    
    // 确定买入和卖出交易所
    let buyExchange, sellExchange, buyPrice, sellPrice;
    
    if (okxTicker.price < binanceTicker.price) {
      buyExchange = 'OKX';
      sellExchange = 'Binance';
      buyPrice = okxTicker.price;
      sellPrice = binanceTicker.price;
    } else {
      buyExchange = 'Binance';
      sellExchange = 'OKX';
      buyPrice = binanceTicker.price;
      sellPrice = okxTicker.price;
    }

    // 计算潜在利润（假设交易1个单位）
    const grossProfit = sellPrice - buyPrice;
    const grossProfitPercentage = (grossProfit / buyPrice) * 100;
    
    // 估算交易费用（假设每个交易所0.1%手续费）
    const tradingFees = (buyPrice * 0.001) + (sellPrice * 0.001);
    const netProfit = grossProfit - tradingFees;
    const netProfitPercentage = (netProfit / buyPrice) * 100;

    return {
      symbol: okxTicker.symbol,
      isProfitable,
      spread: spread,
      buyExchange,
      sellExchange,
      buyPrice,
      sellPrice,
      grossProfit,
      grossProfitPercentage,
      estimatedTradingFees: tradingFees,
      netProfit,
      netProfitPercentage,
      timestamp: Date.now(),
      okxData: {
        price: okxTicker.price,
        bid: okxTicker.bid,
        ask: okxTicker.ask,
        volume: okxTicker.volume
      },
      binanceData: {
        price: binanceTicker.price,
        bid: binanceTicker.bid,
        ask: binanceTicker.ask,
        volume: binanceTicker.volume
      }
    };
  }

  // 批量分析多个交易对的套利机会
  analyzeBatchOpportunities(okxTickers, binanceTickers) {
    const opportunities = [];
    
    // 创建Binance ticker的映射以便快速查找
    const binanceTickerMap = new Map();
    binanceTickers.forEach(ticker => {
      binanceTickerMap.set(ticker.symbol, ticker);
    });

    // 分析每个OKX ticker
    okxTickers.forEach(okxTicker => {
      const binanceTicker = binanceTickerMap.get(okxTicker.symbol);
      if (binanceTicker) {
        try {
          const opportunity = this.analyzeArbitrageOpportunity(okxTicker, binanceTicker);
          if (opportunity) {
            opportunities.push(opportunity);
          }
        } catch (error) {
          console.error(`分析 ${okxTicker.symbol} 套利机会时出错:`, error.message);
        }
      }
    });

    // 按净利润百分比排序
    return opportunities.sort((a, b) => b.netProfitPercentage - a.netProfitPercentage);
  }

  // 过滤有利可图的机会
  filterProfitableOpportunities(opportunities) {
    return opportunities.filter(opp => 
      opp.isProfitable && opp.netProfitPercentage > 0
    );
  }

  // 格式化套利机会报告
  formatOpportunityReport(opportunity) {
    return {
      交易对: opportunity.symbol,
      是否有利可图: opportunity.isProfitable ? '是' : '否',
      价差百分比: `${opportunity.spread.percentageSpread.toFixed(2)}%`,
      买入交易所: opportunity.buyExchange,
      卖出交易所: opportunity.sellExchange,
      买入价格: opportunity.buyPrice.toFixed(8),
      卖出价格: opportunity.sellPrice.toFixed(8),
      毛利润: opportunity.grossProfit.toFixed(8),
      毛利润百分比: `${opportunity.grossProfitPercentage.toFixed(2)}%`,
      预估手续费: opportunity.estimatedTradingFees.toFixed(8),
      净利润: opportunity.netProfit.toFixed(8),
      净利润百分比: `${opportunity.netProfitPercentage.toFixed(2)}%`,
      时间戳: new Date(opportunity.timestamp).toLocaleString('zh-CN')
    };
  }

  // 生成套利报告
  generateArbitrageReport(opportunities) {
    const profitableOpportunities = this.filterProfitableOpportunities(opportunities);
    
    return {
      总机会数: opportunities.length,
      有利可图机会数: profitableOpportunities.length,
      最佳机会: profitableOpportunities.length > 0 ? 
        this.formatOpportunityReport(profitableOpportunities[0]) : null,
      所有有利可图机会: profitableOpportunities.map(opp => 
        this.formatOpportunityReport(opp)
      ),
      生成时间: new Date().toLocaleString('zh-CN')
    };
  }
}

module.exports = ArbitrageCalculator;