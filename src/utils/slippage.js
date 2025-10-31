/**
 * 滑点计算工具类
 * 用于计算交易时的价格滑点影响
 */
class SlippageCalculator {
  /**
   * 计算买入滑点
   * @param {Array} asks - 卖单数据 [{price, quantity}, ...]
   * @param {number} amount - 买入数量
   * @returns {Object} 滑点计算结果
   */
  static calculateBuySlippage(asks, amount) {
    if (!asks || asks.length === 0 || amount <= 0) {
      return {
        averagePrice: 0,
        totalCost: 0,
        slippage: 0,
        priceImpact: 0,
        feasible: false,
        filledAmount: 0,
        remainingAmount: amount
      };
    }

    // 按价格排序（从低到高）
    const sortedAsks = asks.sort((a, b) => a.price - b.price);
    const bestPrice = sortedAsks[0].price;
    
    let totalCost = 0;
    let filledAmount = 0;
    let remainingAmount = amount;
    let weightedPriceSum = 0;

    for (const ask of sortedAsks) {
      if (remainingAmount <= 0) break;
      
      const fillQuantity = Math.min(remainingAmount, ask.quantity);
      const cost = fillQuantity * ask.price;
      
      totalCost += cost;
      filledAmount += fillQuantity;
      weightedPriceSum += cost;
      remainingAmount -= fillQuantity;
    }

    const averagePrice = filledAmount > 0 ? totalCost / filledAmount : 0;
    const slippage = filledAmount > 0 ? ((averagePrice - bestPrice) / bestPrice) * 100 : 0;
    const priceImpact = filledAmount > 0 ? ((averagePrice - bestPrice) / bestPrice) * 100 : 0;

    return {
      averagePrice,
      totalCost,
      slippage,
      priceImpact,
      feasible: remainingAmount === 0,
      filledAmount,
      remainingAmount,
      bestPrice
    };
  }

  /**
   * 计算卖出滑点
   * @param {Array} bids - 买单数据 [{price, quantity}, ...]
   * @param {number} amount - 卖出数量
   * @returns {Object} 滑点计算结果
   */
  static calculateSellSlippage(bids, amount) {
    if (!bids || bids.length === 0 || amount <= 0) {
      return {
        averagePrice: 0,
        totalRevenue: 0,
        slippage: 0,
        priceImpact: 0,
        feasible: false,
        filledAmount: 0,
        remainingAmount: amount
      };
    }

    // 按价格排序（从高到低）
    const sortedBids = bids.sort((a, b) => b.price - a.price);
    const bestPrice = sortedBids[0].price;
    
    let totalRevenue = 0;
    let filledAmount = 0;
    let remainingAmount = amount;
    let weightedPriceSum = 0;

    for (const bid of sortedBids) {
      if (remainingAmount <= 0) break;
      
      const fillQuantity = Math.min(remainingAmount, bid.quantity);
      const revenue = fillQuantity * bid.price;
      
      totalRevenue += revenue;
      filledAmount += fillQuantity;
      weightedPriceSum += revenue;
      remainingAmount -= fillQuantity;
    }

    const averagePrice = filledAmount > 0 ? totalRevenue / filledAmount : 0;
    const slippage = filledAmount > 0 ? ((bestPrice - averagePrice) / bestPrice) * 100 : 0;
    const priceImpact = filledAmount > 0 ? ((bestPrice - averagePrice) / bestPrice) * 100 : 0;

    return {
      averagePrice,
      totalRevenue,
      slippage,
      priceImpact,
      feasible: remainingAmount === 0,
      filledAmount,
      remainingAmount,
      bestPrice
    };
  }

  /**
   * 计算套利交易的总滑点影响
   * @param {Object} buyOrderBook - 买入交易所的订单簿
   * @param {Object} sellOrderBook - 卖出交易所的订单簿
   * @param {number} amount - 交易数量
   * @returns {Object} 套利滑点分析结果
   */
  static calculateArbitrageSlippage(buyOrderBook, sellOrderBook, amount) {
    const buySlippage = this.calculateBuySlippage(buyOrderBook.asks, amount);
    const sellSlippage = this.calculateSellSlippage(sellOrderBook.bids, amount);

    const grossProfit = sellSlippage.averagePrice - buySlippage.averagePrice;
    const grossProfitPercentage = buySlippage.averagePrice > 0 ? 
      (grossProfit / buySlippage.averagePrice) * 100 : 0;

    const totalSlippage = buySlippage.slippage + sellSlippage.slippage;
    const netProfit = grossProfit * Math.min(buySlippage.filledAmount, sellSlippage.filledAmount);
    
    const feasible = buySlippage.feasible && sellSlippage.feasible && grossProfit > 0;

    return {
      buyExchange: buyOrderBook.exchange,
      sellExchange: sellOrderBook.exchange,
      symbol: buyOrderBook.symbol,
      amount,
      buySlippage,
      sellSlippage,
      grossProfit,
      grossProfitPercentage,
      totalSlippage,
      netProfit,
      feasible,
      recommendation: this.getArbitrageRecommendation(grossProfitPercentage, totalSlippage, feasible)
    };
  }

  /**
   * 获取套利建议
   * @param {number} grossProfitPercentage - 毛利润百分比
   * @param {number} totalSlippage - 总滑点
   * @param {boolean} feasible - 是否可行
   * @returns {string} 建议
   */
  static getArbitrageRecommendation(grossProfitPercentage, totalSlippage, feasible) {
    if (!feasible) {
      return '不可行：流动性不足或价格倒挂';
    }
    
    const netProfitPercentage = grossProfitPercentage - totalSlippage;
    
    if (netProfitPercentage > 0.5) {
      return '强烈推荐：高利润套利机会';
    } else if (netProfitPercentage > 0.2) {
      return '推荐：中等利润套利机会';
    } else if (netProfitPercentage > 0.05) {
      return '谨慎考虑：小利润套利机会';
    } else {
      return '不推荐：利润微薄或亏损';
    }
  }

  /**
   * 批量计算多个交易对的滑点
   * @param {Array} orderBooks - 订单簿数组
   * @param {number} amount - 交易数量
   * @param {string} side - 交易方向 ('buy' | 'sell')
   * @returns {Array} 滑点计算结果数组
   */
  static calculateMultipleSlippage(orderBooks, amount, side = 'buy') {
    return orderBooks.map(orderBook => {
      const slippage = side === 'buy' ? 
        this.calculateBuySlippage(orderBook.asks, amount) :
        this.calculateSellSlippage(orderBook.bids, amount);
      
      return {
        exchange: orderBook.exchange,
        symbol: orderBook.symbol,
        side,
        amount,
        ...slippage
      };
    });
  }

  /**
   * 寻找最佳套利机会
   * @param {Array} orderBooks - 所有交易所的订单簿数据
   * @param {number} amount - 交易数量
   * @returns {Array} 排序后的套利机会列表
   */
  static findBestArbitrageOpportunities(orderBooks, amount) {
    const opportunities = [];
    
    // 比较所有交易所之间的套利机会
    for (let i = 0; i < orderBooks.length; i++) {
      for (let j = 0; j < orderBooks.length; j++) {
        if (i !== j) {
          const buyOrderBook = orderBooks[i];
          const sellOrderBook = orderBooks[j];
          
          const arbitrage = this.calculateArbitrageSlippage(buyOrderBook, sellOrderBook, amount);
          
          if (arbitrage.feasible && arbitrage.grossProfit > 0) {
            opportunities.push(arbitrage);
          }
        }
      }
    }
    
    // 按净利润排序
    return opportunities.sort((a, b) => b.netProfit - a.netProfit);
  }
}

module.exports = SlippageCalculator;