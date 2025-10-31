const axios = require('axios');

class HyperliquidApi {
  constructor(apiKey = '', secretKey = '') {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.baseURL = 'https://api.hyperliquid.xyz';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // 获取所有交易对的行情数据
  async getAllMarketInfo() {
    try {
      const response = await this.client.post('/info', {
        type: 'meta'
      });
      return response.data;
    } catch (error) {
      console.error('Hyperliquid getAllMarketInfo error:', error.message);
      throw error;
    }
  }

  // 获取单个交易对的ticker数据（现货模拟）
  async getTicker(symbol) {
    try {
      // 将symbol格式转换为Hyperliquid格式（去掉-USDT后缀）
      const hlSymbol = symbol.replace('-USDT', '');
      
      // 直接获取所有交易对的价格数据（更高效，避免多次API调用）
      const marketResponse = await this.client.post('/info', {
        type: 'allMids'
      });
      
      if (marketResponse.data) {
        const midPrice = marketResponse.data[hlSymbol];
        if (midPrice !== undefined) {
          return {
            symbol: symbol, // 保持与其他交易所一致的格式
            price: parseFloat(midPrice),
            bid: parseFloat(midPrice) * 0.999, // 模拟bid价格
            ask: parseFloat(midPrice) * 1.001, // 模拟ask价格
            volume: 0, // 暂时无法获取交易量
            timestamp: Date.now(),
            exchange: 'Hyperliquid',
            type: 'spot' // 标记为现货（实际是基于合约价格的模拟）
          };
        } else {
          throw new Error(`Symbol ${hlSymbol} not found in Hyperliquid allMids data`);
        }
      } else {
        throw new Error(`No data returned for symbol ${hlSymbol}`);
      }
    } catch (error) {
      console.error(`Hyperliquid getTicker error for ${symbol}:`, error.message);
      throw error;
    }
  }

  // 获取合约价格信息
  async getFuturesTicker(symbol) {
    try {
      // 将symbol格式转换为Hyperliquid格式（去掉-USDT）
      const hlSymbol = symbol.replace('-USDT', '');
      
      // 直接获取所有交易对的价格数据（更高效，避免多次API调用）
      const marketResponse = await this.client.post('/info', {
        type: 'allMids'
      });
      
      if (marketResponse.data) {
        const midPrice = marketResponse.data[hlSymbol];
        if (midPrice !== undefined) {
          return {
            symbol: symbol, // 保持与其他交易所一致的格式
            price: parseFloat(midPrice),
            bid: parseFloat(midPrice) * 0.999, // 模拟bid价格
            ask: parseFloat(midPrice) * 1.001, // 模拟ask价格
            volume: 0, // 暂时无法获取交易量
            timestamp: Date.now(),
            exchange: 'Hyperliquid',
            type: 'futures',
            contractSymbol: hlSymbol
          };
        } else {
          throw new Error(`Symbol ${hlSymbol} not found in Hyperliquid allMids data`);
        }
      } else {
        throw new Error(`No data returned for symbol ${hlSymbol}`);
      }
    } catch (error) {
      console.error(`Hyperliquid getFuturesTicker error for ${symbol}:`, error.message);
      throw error;
    }
  }

  // 获取多个交易对的价格（优化版本，单次API调用）
  async getMultipleTickers(symbols) {
    try {
      // 单次调用获取所有交易对的价格数据
      const marketResponse = await this.client.post('/info', {
        type: 'allMids'
      });
      
      if (!marketResponse.data) {
        throw new Error('No data returned from Hyperliquid allMids endpoint');
      }
      
      const allMids = marketResponse.data;
      const results = [];
      
      for (const symbol of symbols) {
        try {
          const hlSymbol = symbol.replace('-USDT', '');
          const midPrice = allMids[hlSymbol];
          
          if (midPrice !== undefined) {
            results.push({
              symbol: symbol,
              price: parseFloat(midPrice),
              bid: parseFloat(midPrice) * 0.999,
              ask: parseFloat(midPrice) * 1.001,
              volume: 0,
              timestamp: Date.now(),
              exchange: 'Hyperliquid',
              type: 'spot'
            });
          } else {
            console.warn(`Symbol ${hlSymbol} not found in Hyperliquid allMids data`);
          }
        } catch (error) {
          console.error(`Failed to process ticker for ${symbol}:`, error.message);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Hyperliquid getMultipleTickers error:', error.message);
      throw error;
    }
  }

  // 获取多个交易对的合约价格（优化版本，单次API调用）
  async getMultipleFuturesTickers(symbols) {
    try {
      // 单次调用获取所有交易对的价格数据
      const marketResponse = await this.client.post('/info', {
        type: 'allMids'
      });
      
      if (!marketResponse.data) {
        throw new Error('No data returned from Hyperliquid allMids endpoint');
      }
      
      const allMids = marketResponse.data;
      const results = [];
      
      for (const symbol of symbols) {
        try {
          const hlSymbol = symbol.replace('-USDT', '');
          const midPrice = allMids[hlSymbol];
          
          if (midPrice !== undefined) {
            results.push({
              symbol: symbol,
              price: parseFloat(midPrice),
              bid: parseFloat(midPrice) * 0.999,
              ask: parseFloat(midPrice) * 1.001,
              volume: 0,
              timestamp: Date.now(),
              exchange: 'Hyperliquid',
              type: 'futures',
              contractSymbol: hlSymbol
            });
          } else {
            console.warn(`Symbol ${hlSymbol} not found in Hyperliquid allMids data`);
          }
        } catch (error) {
          console.error(`Failed to process futures ticker for ${symbol}:`, error.message);
        }
      }
      
      return results;
    } catch (error) {
      console.error('Hyperliquid getMultipleFuturesTickers error:', error.message);
      throw error;
    }
  }

  // 获取订单簿数据
  async getOrderBook(symbol, depth = 20) {
    try {
      const hyperliquidSymbol = symbol.replace('-USDT', '');
      const response = await this.client.post('/info', {
        type: 'l2Book',
        coin: hyperliquidSymbol
      });
      
      const data = response.data;
      
      if (!data.levels) {
        throw new Error('Hyperliquid API错误: 无法获取订单簿数据');
      }
      
      // 限制深度
      const bids = data.levels[0].slice(0, depth);
      const asks = data.levels[1].slice(0, depth);
      
      return {
        symbol: hyperliquidSymbol,
        originalSymbol: symbol,
        exchange: 'Hyperliquid',
        timestamp: Date.now(),
        bids: bids.map(([price, size]) => ({
          price: parseFloat(price),
          quantity: parseFloat(size)
        })),
        asks: asks.map(([price, size]) => ({
          price: parseFloat(price),
          quantity: parseFloat(size)
        }))
      };
    } catch (error) {
      console.error(`获取Hyperliquid订单簿失败 (${symbol}):`, error.message);
      return null;
    }
  }

  // 获取合约订单簿数据（Hyperliquid主要是合约交易）
  async getFuturesOrderBook(symbol, depth = 20) {
    try {
      // Hyperliquid主要是合约交易，所以直接使用getOrderBook
      const orderBook = await this.getOrderBook(symbol, depth);
      if (orderBook) {
        orderBook.type = 'futures';
      }
      return orderBook;
    } catch (error) {
      console.error(`获取Hyperliquid合约订单簿失败 (${symbol}):`, error.message);
      return null;
    }
  }

  // 获取多个交易对的订单簿数据
  async getMultipleOrderBooks(symbols, depth = 20) {
    try {
      const orderBooks = await Promise.all(
        symbols.map(symbol => this.getOrderBook(symbol, depth))
      );
      return orderBooks.filter(orderBook => orderBook !== null);
    } catch (error) {
      console.error('获取Hyperliquid多个订单簿失败:', error.message);
      return [];
    }
  }

  // 获取多个交易对的合约订单簿数据
  async getMultipleFuturesOrderBooks(symbols, depth = 20) {
    try {
      const orderBooks = await Promise.all(
        symbols.map(symbol => this.getFuturesOrderBook(symbol, depth))
      );
      return orderBooks.filter(orderBook => orderBook !== null);
    } catch (error) {
      console.error('获取Hyperliquid多个合约订单簿失败:', error.message);
      return [];
    }
  }

  // 获取资金费率
  async getFundingRate(symbol) {
    try {
      const hyperliquidSymbol = symbol.replace('-USDT', '');
      const response = await this.client.post('/info', {
        type: 'meta'
      });
      
      const data = response.data;
      
      if (!data.universe) {
        throw new Error('Hyperliquid API错误: 无法获取市场信息');
      }
      
      // 查找对应的交易对信息
      const assetInfo = data.universe.find(asset => asset.name === hyperliquidSymbol);
      
      if (!assetInfo) {
        throw new Error(`未找到交易对 ${hyperliquidSymbol} 的信息`);
      }
      
      // 获取资金费率信息
      const fundingResponse = await this.client.post('/info', {
        type: 'fundingHistory',
        coin: hyperliquidSymbol,
        startTime: Date.now() - 24 * 60 * 60 * 1000 // 最近24小时
      });
      
      const fundingData = fundingResponse.data;
      
      if (!fundingData || fundingData.length === 0) {
        throw new Error('无法获取资金费率历史数据');
      }
      
      // 获取最新的资金费率
      const latestFunding = fundingData[fundingData.length - 1];
      
      return {
        symbol: hyperliquidSymbol,
        originalSymbol: symbol,
        exchange: 'Hyperliquid',
        fundingRate: parseFloat(latestFunding.fundingRate),
        nextFundingTime: latestFunding.time + 8 * 60 * 60 * 1000, // 假设8小时一次
        timestamp: latestFunding.time
      };
    } catch (error) {
      console.error(`获取Hyperliquid资金费率失败 (${symbol}):`, error.message);
      return null;
    }
  }

  // 获取多个交易对的资金费率
  async getMultipleFundingRates(symbols) {
    try {
      const promises = symbols.map(symbol => this.getFundingRate(symbol));
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Failed to get funding rate for ${symbols[index]}:`, result.reason.message);
          return null;
        }
      }).filter(fundingRate => fundingRate !== null);
    } catch (error) {
      console.error('Hyperliquid getMultipleFundingRates error:', error.message);
      throw error;
    }
  }

  // 测试连接
  async testConnection() {
    try {
      // Hyperliquid API需要使用POST请求，发送特定的请求体
      const response = await this.client.post('/info', {
        type: 'meta'
      });
      return response.status === 200;
    } catch (error) {
      console.error('Hyperliquid connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = HyperliquidApi;