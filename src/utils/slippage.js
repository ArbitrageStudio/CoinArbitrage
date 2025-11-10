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

  /**
   * 从 Lighter API 获取订单簿并计算买入滑点
   * @param {number} marketIndex - 市场索引
   * @param {number} amount - 买入数量
   * @param {Object} options - 配置选项 { baseURL, authToken }
   * @returns {Promise<Object>} 滑点计算结果
   */
  static async calculateBuySlippageFromLighter(marketIndex, amount, options = {}) {
    const LighterApi = require('../api/lighter');
    const lighter = new LighterApi(options);
    const orderBook = await lighter.orderBookDetails(marketIndex);
    
    if (!orderBook || !orderBook.asks) {
      throw new Error('无法从 Lighter 获取订单簿数据');
    }
    
    // 假设 orderBook.asks 是 [{price, quantity}, ...] 格式
    return this.calculateBuySlippage(orderBook.asks, amount);
  }

  /**
   * 从 Lighter API 获取订单簿并计算卖出滑点
   * @param {number} marketIndex - 市场索引
   * @param {number} amount - 卖出数量
   * @param {Object} options - 配置选项 { baseURL, authToken }
   * @returns {Promise<Object>} 滑点计算结果
   */
  static async calculateSellSlippageFromLighter(marketIndex, amount, options = {}) {
    const LighterApi = require('../api/lighter');
    const lighter = new LighterApi(options);
    const orderBook = await lighter.orderBookDetails(marketIndex);
    
    if (!orderBook || !orderBook.bids) {
      throw new Error('无法从 Lighter 获取订单簿数据');
    }
    
    // 假设 orderBook.bids 是 [{price, quantity}, ...] 格式
    return this.calculateSellSlippage(orderBook.bids, amount);
  }

  /**
   * 检查套利滑点是否可接受（使用 Lighter 数据）
   * @param {number} buyMarketIndex - 买入市场索引
   * @param {number} sellMarketIndex - 卖出市场索引
   * @param {number} amount - 交易数量
   * @param {number} maxSlippage - 最大允许滑点百分比 (默认 0.5)
   * @param {Object} options - 配置选项
   * @returns {Promise<boolean>} 是否可接受
   */
  static async isArbitrageSlippageAcceptable(buyMarketIndex, sellMarketIndex, amount, maxSlippage = 0.5, options = {}) {
    const [buySlippage, sellSlippage] = await Promise.all([
      this.calculateBuySlippageFromLighter(buyMarketIndex, amount, options),
      this.calculateSellSlippageFromLighter(sellMarketIndex, amount, options)
    ]);
    
    const totalSlippage = buySlippage.slippage + sellSlippage.slippage;
    return totalSlippage <= maxSlippage && buySlippage.feasible && sellSlippage.feasible;
  }

  /**
   * 从 OKX API 获取现货订单簿并计算买入滑点
   * @param {string} symbol - 交易对 (e.g., 'BTC-USDT')
   * @param {number} amount - 买入数量 (基础币)
   * @param {Object} options - 配置选项 { apiKey, secretKey, passphrase, sandbox }
   * @returns {Promise<Object>} 滑点计算结果
   */
  static async calculateOkxSpotBuySlippage(symbol, amount, options = {}) {
    const OKXApi = require('../api/okx');
    const okx = new OKXApi(options.apiKey, options.secretKey, options.passphrase, options.sandbox);
    const orderBook = await okx.getOrderBook(symbol);
    
    if (!orderBook || !orderBook.asks) {
      throw new Error('无法从 OKX 获取现货订单簿数据');
    }
    
    return this.calculateBuySlippage(orderBook.asks, amount);
  }

  /**
   * 从 OKX API 获取现货订单簿并计算卖出滑点
   * @param {string} symbol - 交易对
   * @param {number} amount - 卖出数量 (基础币)
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 滑点计算结果
   */
  static async calculateOkxSpotSellSlippage(symbol, amount, options = {}) {
    const OKXApi = require('../api/okx');
    const okx = new OKXApi(options.apiKey, options.secretKey, options.passphrase, options.sandbox);
    const orderBook = await okx.getOrderBook(symbol);
    
    if (!orderBook || !orderBook.bids) {
      throw new Error('无法从 OKX 获取现货订单簿数据');
    }
    
    return this.calculateSellSlippage(orderBook.bids, amount);
  }

  /**
   * 从 OKX API 获取永续订单簿并计算买入滑点
   * @param {string} symbol - 交易对 (e.g., 'BTC-USDT')
   * @param {number} amount - 买入数量 (基础币数量，非合约张数)
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 滑点计算结果
   */
  static async calculateOkxPerpBuySlippage(symbol, amount, options = {}) {
    const OKXApi = require('../api/okx');
    const okx = new OKXApi(options.apiKey, options.secretKey, options.passphrase, options.sandbox);
    const orderBook = await okx.getFuturesOrderBook(symbol);
    
    if (!orderBook || !orderBook.asks) {
      throw new Error('无法从 OKX 获取永续订单簿数据');
    }
    
    // 注意：OKX 永续订单簿的 quantity 是合约张数，需要转换为基础币数量
    // 获取合约信息以转换
    const swapSymbol = `${symbol}-SWAP`;
    const instrument = await okx.getSwapInstrument(swapSymbol);
    const ctVal = instrument.ctVal || 1; // 合约价值 (e.g., BTC 为 0.0001 BTC per contract?)
    
    // 转换 asks/bids 的 quantity 为基础币数量: quantity * ctVal
    const adjustedAsks = orderBook.asks.map(({price, quantity}) => ({
      price,
      quantity: quantity * ctVal
    }));
    
    return this.calculateBuySlippage(adjustedAsks, amount);
  }

  /**
   * 从 OKX API 获取永续订单簿并计算卖出滑点
   * @param {string} symbol - 交易对
   * @param {number} amount - 卖出数量 (基础币)
   * @param {Object} options - 配置选项
   * @returns {Promise<Object>} 滑点计算结果
   */
  static async calculateOkxPerpSellSlippage(symbol, amount, options = {}) {
    const OKXApi = require('../api/okx');
    const okx = new OKXApi(options.apiKey, options.secretKey, options.passphrase, options.sandbox);
    const orderBook = await okx.getFuturesOrderBook(symbol);
    
    if (!orderBook || !orderBook.bids) {
      throw new Error('无法从 OKX 获取永续订单簿数据');
    }
    
    const swapSymbol = `${symbol}-SWAP`;
    const instrument = await okx.getSwapInstrument(swapSymbol);
    const ctVal = instrument.ctVal || 1;
    
    const adjustedBids = orderBook.bids.map(({price, quantity}) => ({
      price,
      quantity: quantity * ctVal
    }));
    
    return this.calculateSellSlippage(adjustedBids, amount);
  }

  /**
   * 检查 OKX 基差套利滑点是否可接受
   * @param {string} symbol - 交易对
   * @param {number} amount - 交易数量 (基础币)
   * @param {string} spotSide - 现货方向 ('buy' or 'sell')
   * @param {string} perpSide - 永续方向 ('buy' or 'sell')
   * @param {number} maxSlippage - 最大允许滑点百分比 (默认 0.5)
   * @param {Object} options - 配置选项
   * @returns {Promise<boolean>} 是否可接受
   */
  static async isOkxBasisSlippageAcceptable(symbol, amount, spotSide, perpSide, maxSlippage = 0.5, options = {}) {
    let spotSlippage, perpSlippage;
    
    if (spotSide === 'buy') {
      spotSlippage = await this.calculateOkxSpotBuySlippage(symbol, amount, options);
    } else {
      spotSlippage = await this.calculateOkxSpotSellSlippage(symbol, amount, options);
    }
    
    if (perpSide === 'buy') {
      perpSlippage = await this.calculateOkxPerpBuySlippage(symbol, amount, options);
    } else {
      perpSlippage = await this.calculateOkxPerpSellSlippage(symbol, amount, options);
    }
    
    const totalSlippage = spotSlippage.slippage + perpSlippage.slippage;
    return totalSlippage <= maxSlippage && spotSlippage.feasible && perpSlippage.feasible;
  }
}

module.exports = SlippageCalculator;