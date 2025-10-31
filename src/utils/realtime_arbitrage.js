const ArbitrageCalculator = require('./arbitrage');
const WebSocketManager = require('../api/websocket');
const HyperliquidApi = require('../api/hyperliquid');
const arbitrageConfig = require('../config/arbitrageConfig');

class RealtimeArbitrageDetector {
  constructor() {
    this.arbitrageCalculator = new ArbitrageCalculator();
    this.wsManager = new WebSocketManager();
    this.hyperliquidApi = new HyperliquidApi();
    this.opportunities = new Map();
    this.minProfitThreshold = arbitrageConfig.getMinProfitThreshold();
    this.symbols = arbitrageConfig.getSymbols();
    this.checkInterval = null;
    this.hyperliquidPriceCache = new Map();
    this.lastHyperliquidUpdate = 0;
    this.apiCallQueue = new Map(); // 用于管理API调用频率
    this.minApiCallInterval = 3000; // 最小API调用间隔（毫秒）
  }

  // 启动实时检测
  async startRealTimeDetection(symbols = this.symbols) {
    console.log('🚀 启动实时套利检测...');
    
    try {
      // 连接所有交易所的WebSocket
      console.log('🌐 连接Binance WebSocket...');
      await this.wsManager.connectToBinance(symbols);
      
      console.log('🌐 连接OKX WebSocket...');
      await this.wsManager.connectToOKX(symbols);
      
      console.log('🌐 连接Hyperliquid WebSocket...');
      await this.wsManager.connectToHyperliquid(symbols);
      
      // 订阅价格更新
      const unsubscribe = this.wsManager.subscribe((exchange, symbol, data) => {
        this.handlePriceUpdate(exchange, symbol, data);
      });

      // 设置定期检查
      this.checkInterval = setInterval(() => {
        this.checkAllOpportunities().catch(error => {
          console.error('检查套利机会时出错:', error.message);
        });
      }, arbitrageConfig.REALTIME_CONFIG.checkInterval);

      console.log('✅ 实时套利检测已启动');
      
      // 返回停止函数
      return () => {
        unsubscribe();
        clearInterval(this.checkInterval);
        this.wsManager.closeAll();
        console.log('🛑 实时套利检测已停止');
      };

    } catch (error) {
      console.error('启动实时检测失败:', error.message);
      throw error;
    }
  }

  // 处理价格更新
  handlePriceUpdate(exchange, symbol, data) {
    // 这里可以添加价格缓存和数据处理逻辑
    // 实时检测可以立即触发套利检查
    this.checkArbitrageOpportunity(symbol);
  }

  // 获取Hyperliquid真实价格（使用REST API）
  async getHyperliquidRealPrice(symbol) {
    try {
      const now = Date.now();
      
      // 检查缓存中是否有有效价格
      const cachedPrice = this.hyperliquidPriceCache.get(symbol);
      if (cachedPrice && (now - cachedPrice.timestamp) < arbitrageConfig.REALTIME_CONFIG.priceCacheTTL) {
        return cachedPrice;
      }
      
      // 如果距离上次更新太近，避免频繁调用API
      if (now - this.lastHyperliquidUpdate < 3000) { // 增加到至少3秒间隔
        return cachedPrice || null;
      }
      
      // 调用Hyperliquid API获取真实价格
      const ticker = await this.hyperliquidApi.getTicker(symbol);
      
      if (ticker && ticker.price) {
        const priceData = {
          price: ticker.price,
          bid: ticker.bid,
          ask: ticker.ask,
          timestamp: now
        };
        
        // 更新缓存
        this.hyperliquidPriceCache.set(symbol, priceData);
        this.lastHyperliquidUpdate = now;
        
        return priceData;
      }
      
      return null;
      
    } catch (error) {
      console.error(`获取Hyperliquid价格失败 (${symbol}):`, error.message);
      // 返回缓存价格或null
      const cachedPrice = this.hyperliquidPriceCache.get(symbol);
      return cachedPrice || null;
    }
  }

  // 检查单个交易对的套利机会
  async checkArbitrageOpportunity(symbol) {
    try {
      // 获取所有交易所的最新价格
      const binancePrice = this.wsManager.getLatestPrice('binance', symbol);
      const okxPrice = this.wsManager.getLatestPrice('okx', symbol);
      
      // 获取Hyperliquid真实价格（使用REST API）
      const hyperliquidPrice = await this.getHyperliquidRealPrice(symbol);
      // 确保所有价格数据都存在且有效
      const validPrices = [binancePrice, okxPrice, hyperliquidPrice].filter(
        price => price && price.price && price.timestamp
      );
      
      if (validPrices.length >= 2) {
        // 计算所有可能的交易所组合的套利机会
        const opportunities = [];
        
        // Binance ↔ OKX
        if (binancePrice && okxPrice) {
          opportunities.push(
            this.calculateOpportunity('binance', 'okx', symbol, binancePrice.price, okxPrice.price),
            this.calculateOpportunity('okx', 'binance', symbol, okxPrice.price, binancePrice.price)
          );
        }
        
        // Binance ↔ Hyperliquid
        if (binancePrice && hyperliquidPrice) {
          opportunities.push(
            this.calculateOpportunity('binance', 'hyperliquid', symbol, binancePrice.price, hyperliquidPrice.price),
            this.calculateOpportunity('hyperliquid', 'binance', symbol, hyperliquidPrice.price, binancePrice.price)
          );
        }
        
        // OKX ↔ Hyperliquid
        if (okxPrice && hyperliquidPrice) {
          opportunities.push(
            this.calculateOpportunity('okx', 'hyperliquid', symbol, okxPrice.price, hyperliquidPrice.price),
            this.calculateOpportunity('hyperliquid', 'okx', symbol, hyperliquidPrice.price, okxPrice.price)
          );
        }

        // 筛选有利可图的机会
        const profitableOpportunities = opportunities.filter(opp => 
          opp && opp.netProfitPercentage >= this.minProfitThreshold
        );

        // 更新机会缓存
        if (profitableOpportunities.length > 0) {
          this.opportunities.set(symbol, {
            timestamp: Date.now(),
            opportunities: profitableOpportunities
          });
          
          // 实时通知
          this.notifyOpportunities(profitableOpportunities);
        }
      }

    } catch (error) {
      console.error(`检查 ${symbol} 套利机会失败:`, error.message);
    }
  }

  // 计算套利机会
  calculateOpportunity(buyExchange, sellExchange, symbol, buyPrice, sellPrice) {
    if (!buyPrice || !sellPrice) return null;

    const spread = Math.abs(buyPrice - sellPrice);
    const spreadPercentage = (spread / Math.min(buyPrice, sellPrice)) * 100;
    
    if (spreadPercentage < this.minProfitThreshold) return null;

    const grossProfit = Math.abs(sellPrice - buyPrice);
    const tradingFees = (buyPrice * 0.001) + (sellPrice * 0.001);
    const netProfit = grossProfit - tradingFees;
    const netProfitPercentage = (netProfit / Math.min(buyPrice, sellPrice)) * 100;
    console.log(netProfitPercentage);
    return {
      symbol,
      buyExchange,
      sellExchange,
      buyPrice,
      sellPrice,
      spread: spreadPercentage,
      grossProfit,
      netProfit,
      netProfitPercentage,
      timestamp: Date.now(),
      feasible: netProfitPercentage > 0
    };
  }

  // 检查所有机会（使用队列避免同时调用）
  async checkAllOpportunities() {
    for (const symbol of this.symbols) {
      await this.checkArbitrageOpportunity(symbol);
      // 在每个交易对检查之间添加小延迟，避免API限制
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // 通知套利机会
  notifyOpportunities(opportunities) {
    opportunities.forEach(opportunity => {
      if (opportunity.netProfitPercentage > this.minProfitThreshold) {
        // 高利润机会 - 立即通知
        const isHighProfit = opportunity.netProfitPercentage > arbitrageConfig.NOTIFICATION_CONFIG.highProfitThreshold;
        const emoji = isHighProfit ? '🚨' : '💰';
        const messageType = isHighProfit ? '高利润套利机会发现' : '套利机会发现';
        
        console.log(`${emoji} ${messageType}:`, {
          交易对: opportunity.symbol,
          买入交易所: opportunity.buyExchange,
          卖出交易所: opportunity.sellExchange,
          净利润百分比: `${opportunity.netProfitPercentage.toFixed(2)}%`,
          时间: new Date(opportunity.timestamp).toLocaleTimeString()
        });
      }
    });
  }

  // 获取当前所有机会
  getAllOpportunities() {
    const allOpps = [];
    this.opportunities.forEach((value, symbol) => {
      allOpps.push(...value.opportunities);
    });
    return allOpps.sort((a, b) => b.netProfitPercentage - a.netProfitPercentage);
  }

  // 设置最小利润阈值
  setMinProfitThreshold(threshold) {
    this.minProfitThreshold = threshold;
    this.arbitrageCalculator.setMinProfitThreshold(threshold);
  }

  // 停止检测
  stop() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    this.wsManager.closeAll();
    console.log('🛑 实时套利检测已停止');
  }
}

module.exports = RealtimeArbitrageDetector;