const axios = require('axios');
const crypto = require('crypto');

class BinanceApi {
  constructor(apiKey, secretKey, testnet = false) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.baseURL = testnet 
      ? 'https://testnet.binance.vision' 
      : 'https://api.binance.com';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'X-MBX-APIKEY': this.apiKey,
        'Content-Type': 'application/json'
      }
    });
  }

  // 生成签名
  generateSignature(queryString) {
    return crypto.createHmac('sha256', this.secretKey)
      .update(queryString)
      .digest('hex');
  }

  // 获取带签名的查询字符串
  getSignedParams(params = {}) {
    const timestamp = Date.now();
    const queryParams = { ...params, timestamp };
    
    const queryString = Object.keys(queryParams)
      .map(key => `${key}=${queryParams[key]}`)
      .join('&');
    
    const signature = this.generateSignature(queryString);
    return `${queryString}&signature=${signature}`;
  }

  // 获取ticker价格信息
  async getTicker(symbol) {
    try {
      const binanceSymbol = String(symbol).replace('-', ''); // 允许传入 BTC-USDT
      const response = await this.client.get(`/api/v3/ticker/24hr?symbol=${binanceSymbol}`);
      
      if (response.data) {
        const ticker = response.data;
        return {
          symbol: ticker.symbol,
          price: parseFloat(ticker.lastPrice),
          bid: parseFloat(ticker.bidPrice),
          ask: parseFloat(ticker.askPrice),
          volume: parseFloat(ticker.volume),
          timestamp: Date.now(),
          exchange: 'Binance',
          type: 'spot'
        };
      } else {
        throw new Error('Invalid response from Binance API');
      }
    } catch (error) {
      if (error.response) {
        console.error('Binance API Error:', error.response.data);
        throw new Error(`Binance API Error: ${error.response.data.msg || error.response.statusText}`);
      } else {
        console.error('Binance getTicker error:', error.message);
        throw error;
      }
    }
  }

  // 获取合约价格信息
  async getFuturesTicker(symbol) {
    try {
      // 创建期货API客户端
      const futuresClient = axios.create({
        baseURL: 'https://fapi.binance.com',
        timeout: 10000,
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });

      const response = await futuresClient.get(`/fapi/v1/ticker/24hr?symbol=${symbol.replace('-', '')}`);
      
      if (response.data) {
        const ticker = response.data;
        return {
          symbol: symbol, // 保持原始格式便于比较
          price: parseFloat(ticker.lastPrice),
          bid: parseFloat(ticker.bidPrice),
          ask: parseFloat(ticker.askPrice),
          volume: parseFloat(ticker.volume),
          timestamp: Date.now(),
          exchange: 'Binance',
          type: 'futures',
          contractSymbol: ticker.symbol
        };
      } else {
        throw new Error('Invalid response from Binance Futures API');
      }
    } catch (error) {
      if (error.response) {
        console.error('Binance Futures API Error:', error.response.data);
        throw new Error(`Binance Futures API Error: ${error.response.data.msg || error.response.statusText}`);
      } else {
        console.error('Binance getFuturesTicker error:', error.message);
        throw error;
      }
    }
  }

  // 获取多个交易对的价格
  async getMultipleTickers(symbols) {
    try {
      const promises = symbols.map(symbol => this.getTicker(symbol));
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Failed to get ticker for ${symbols[index]}:`, result.reason.message);
          return null;
        }
      }).filter(ticker => ticker !== null);
    } catch (error) {
      console.error('Binance getMultipleTickers error:', error.message);
      throw error;
    }
  }

  // 获取多个交易对的合约价格
  async getMultipleFuturesTickers(symbols) {
    try {
      const promises = symbols.map(symbol => this.getFuturesTicker(symbol));
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Failed to get futures ticker for ${symbols[index]}:`, result.reason.message);
          return null;
        }
      }).filter(ticker => ticker !== null);
    } catch (error) {
      console.error('Binance getMultipleFuturesTickers error:', error.message);
      throw error;
    }
  }

  // 获取订单簿数据
  async getOrderBook(symbol, depth = 20) {
    try {
      const binanceSymbol = symbol.replace('-', '');
      const response = await this.client.get(`/api/v3/depth?symbol=${binanceSymbol}&limit=${depth}`);
      
      if (response.data.code) {
        throw new Error(`Binance API错误: ${response.data.msg}`);
      }
      
      return {
        symbol: binanceSymbol,
        originalSymbol: symbol,
        exchange: 'Binance',
        timestamp: Date.now(),
        bids: response.data.bids.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        })),
        asks: response.data.asks.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        }))
      };
    } catch (error) {
      console.error(`获取Binance订单簿失败 (${symbol}):`, error.message);
      return null;
    }
  }

  // 获取合约订单簿数据
  async getFuturesOrderBook(symbol, depth = 20) {
    try {
      const futuresClient = axios.create({
        baseURL: 'https://fapi.binance.com',
        timeout: 10000,
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      const binanceSymbol = symbol.replace('-', '');
      const response = await futuresClient.get(`/fapi/v1/depth?symbol=${binanceSymbol}&limit=${depth}`);
      
      if (response.data.code) {
        throw new Error(`Binance Futures API错误: ${response.data.msg}`);
      }
      
      return {
        symbol: binanceSymbol,
        originalSymbol: symbol,
        exchange: 'Binance',
        type: 'futures',
        timestamp: Date.now(),
        bids: response.data.bids.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        })),
        asks: response.data.asks.map(([price, quantity]) => ({
          price: parseFloat(price),
          quantity: parseFloat(quantity)
        }))
      };
    } catch (error) {
      console.error(`获取Binance合约订单簿失败 (${symbol}):`, error.message);
      return null;
    }
  }

  // 获取多个交易对的订单簿数据
  async getMultipleOrderBooks(symbols, depth = 20) {
    try {
      const promises = symbols.map(symbol => this.getOrderBook(symbol, depth));
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Failed to get order book for ${symbols[index]}:`, result.reason.message);
          return null;
        }
      }).filter(orderBook => orderBook !== null);
    } catch (error) {
      console.error('Binance getMultipleOrderBooks error:', error.message);
      throw error;
    }
  }

  // 获取多个交易对的合约订单簿数据
  async getMultipleFuturesOrderBooks(symbols, depth = 20) {
    try {
      const promises = symbols.map(symbol => this.getFuturesOrderBook(symbol, depth));
      const results = await Promise.allSettled(promises);
      
      return results.map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value;
        } else {
          console.error(`Failed to get futures order book for ${symbols[index]}:`, result.reason.message);
          return null;
        }
      }).filter(orderBook => orderBook !== null);
    } catch (error) {
      console.error('Binance getMultipleFuturesOrderBooks error:', error.message);
      throw error;
    }
  }

  // 获取资金费率
  async getFundingRate(symbol) {
    try {
      const futuresClient = axios.create({
        baseURL: 'https://fapi.binance.com',
        timeout: 10000,
        headers: {
          'X-MBX-APIKEY': this.apiKey,
          'Content-Type': 'application/json'
        }
      });
      
      const binanceSymbol = symbol.replace('-', '');
      const response = await futuresClient.get(`/fapi/v1/premiumIndex?symbol=${binanceSymbol}`);
      
      if (response.data.code) {
        throw new Error(`Binance Futures API错误: ${response.data.msg}`);
      }
      
      return {
        symbol: binanceSymbol,
        originalSymbol: symbol,
        exchange: 'Binance',
        fundingRate: parseFloat(response.data.lastFundingRate),
        nextFundingTime: parseInt(response.data.nextFundingTime),
        timestamp: Date.now()
      };
    } catch (error) {
      console.error(`获取Binance资金费率失败 (${symbol}):`, error.message);
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
      console.error('Binance getMultipleFundingRates error:', error.message);
      throw error;
    }
  }

  // 获取所有交易对价格（简化版）
  async getAllTickers() {
    try {
      const response = await this.client.get('/api/v3/ticker/price');
      return response.data.map(ticker => ({
        symbol: ticker.symbol,
        price: parseFloat(ticker.price),
        exchange: 'Binance'
      }));
    } catch (error) {
      console.error('Binance getAllTickers error:', error.message);
      throw error;
    }
  }

  // 获取账户信息（需要签名）
  async getAccountInfo() {
    try {
      const queryString = this.getSignedParams();
      const response = await this.client.get(`/api/v3/account?${queryString}`);
      
      return response.data;
    } catch (error) {
      if (error.response) {
        console.error('Binance API Error:', error.response.data);
        throw new Error(`Binance API Error: ${error.response.data.msg || error.response.statusText}`);
      } else {
        console.error('Binance getAccountInfo error:', error.message);
        throw error;
      }
    }
  }

  // 获取交易对信息
  async getExchangeInfo() {
    try {
      const response = await this.client.get('/api/v3/exchangeInfo');
      return response.data;
    } catch (error) {
      console.error('Binance getExchangeInfo error:', error.message);
      throw error;
    }
  }

  // 测试连接
  async testConnection() {
    try {
      const response = await this.client.get('/api/v3/ping');
      return response.status === 200;
    } catch (error) {
      console.error('Binance connection test failed:', error.message);
      return false;
    }
  }

  // 获取服务器时间
  async getServerTime() {
    try {
      const response = await this.client.get('/api/v3/time');
      return response.data.serverTime;
    } catch (error) {
      console.error('Binance getServerTime error:', error.message);
      throw error;
    }
  }
}

module.exports = BinanceApi;
