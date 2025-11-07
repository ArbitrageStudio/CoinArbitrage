const axios = require('axios');
const crypto = require('crypto');

class OKXApi {
  constructor(apiKey, secretKey, passphrase, sandbox = false) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.passphrase = passphrase;
    this.sandbox = !!sandbox;
    this.baseURL = 'https://www.okx.com';
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }

  // 生成签名
  generateSignature(timestamp, method, requestPath, body = '') {
    const message = timestamp + method.toUpperCase() + requestPath + body;
    return crypto.createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
  }

  // 获取请求头
  getHeaders(method, requestPath, body = '') {
    const timestamp = new Date().toISOString();
    const signature = this.generateSignature(timestamp, method, requestPath, body);
    const headers = {
      'OK-ACCESS-KEY': this.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json'
    };
    // 开启沙盒（模拟交易）头
    if (this.sandbox) {
      headers['x-simulated-trading'] = '1';
    }
    return headers;
  }

  // 获取ticker价格信息
  async getTicker(symbol) {
    try {
      const requestPath = `/api/v5/market/ticker?instId=${symbol}`;
      const headers = this.getHeaders('GET', requestPath);
      
      const response = await this.client.get(requestPath, { headers });
      
      if (response.data.code === '0' && response.data.data.length > 0) {
        const ticker = response.data.data[0];
        return {
          symbol: ticker.instId,
          price: parseFloat(ticker.last),
          bid: parseFloat(ticker.bidPx),
          ask: parseFloat(ticker.askPx),
          volume: parseFloat(ticker.vol24h),
          timestamp: parseInt(ticker.ts),
          exchange: 'OKX',
          type: 'spot'
        };
      } else {
        throw new Error(`OKX API Error: ${response.data.msg}`);
      }
    } catch (error) {
      console.error('OKX getTicker error:', error.message);
      throw error;
    }
  }

  // 获取合约价格信息
  async getFuturesTicker(symbol) {
    try {
      // 将现货交易对转换为永续合约格式 (BTC-USDT -> BTC-USDT-SWAP)
      const swapSymbol = symbol + '-SWAP';
      const requestPath = `/api/v5/market/ticker?instId=${swapSymbol}`;
      const headers = this.getHeaders('GET', requestPath);
      
      const response = await this.client.get(requestPath, { headers });
      
      if (response.data.code === '0' && response.data.data.length > 0) {
        const ticker = response.data.data[0];
        return {
          symbol: symbol, // 保持原始格式便于比较
          price: parseFloat(ticker.last),
          bid: parseFloat(ticker.bidPx),
          ask: parseFloat(ticker.askPx),
          volume: parseFloat(ticker.vol24h),
          timestamp: parseInt(ticker.ts),
          exchange: 'OKX',
          type: 'futures',
          contractSymbol: swapSymbol
        };
      } else {
        throw new Error(`OKX API Error: ${response.data.msg}`);
      }
    } catch (error) {
      console.error('OKX getFuturesTicker error:', error.message);
      throw error;
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
      console.error('OKX getMultipleTickers error:', error.message);
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
      console.error('OKX getMultipleFuturesTickers error:', error.message);
      throw error;
    }
  }

  // 获取订单簿数据
  async getOrderBook(symbol, depth = 20) {
    try {
      const requestPath = `/api/v5/market/books?instId=${symbol}&sz=${depth}`;
      const headers = this.getHeaders('GET', requestPath);
      
      const response = await this.client.get(requestPath, { headers });
      
      if (response.data.code === '0' && response.data.data.length > 0) {
        const orderBookData = response.data.data[0];
        return {
          symbol,
          exchange: 'OKX',
          timestamp: parseInt(orderBookData.ts),
          bids: orderBookData.bids.map(([price, size]) => ({
            price: parseFloat(price),
            quantity: parseFloat(size)
          })),
          asks: orderBookData.asks.map(([price, size]) => ({
            price: parseFloat(price),
            quantity: parseFloat(size)
          }))
        };
      } else {
        throw new Error(`OKX API Error: ${response.data.msg}`);
      }
    } catch (error) {
      console.error(`OKX getOrderBook error (${symbol}):`, error.message);
      throw error;
    }
  }

  // 获取合约订单簿数据
  async getFuturesOrderBook(symbol, depth = 20) {
    try {
      const swapSymbol = symbol + '-SWAP';
      const requestPath = `/api/v5/market/books?instId=${swapSymbol}&sz=${depth}`;
      const headers = this.getHeaders('GET', requestPath);
      
      const response = await this.client.get(requestPath, { headers });
      
      if (response.data.code === '0' && response.data.data.length > 0) {
        const orderBookData = response.data.data[0];
        return {
          symbol: swapSymbol,
          originalSymbol: symbol,
          exchange: 'OKX',
          type: 'futures',
          timestamp: parseInt(orderBookData.ts),
          bids: orderBookData.bids.map(([price, size]) => ({
            price: parseFloat(price),
            quantity: parseFloat(size)
          })),
          asks: orderBookData.asks.map(([price, size]) => ({
            price: parseFloat(price),
            quantity: parseFloat(size)
          }))
        };
      } else {
        throw new Error(`OKX API Error: ${response.data.msg}`);
      }
    } catch (error) {
      console.error(`OKX getFuturesOrderBook error (${symbol}):`, error.message);
      throw error;
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
      console.error('OKX getMultipleOrderBooks error:', error.message);
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
      console.error('OKX getMultipleFuturesOrderBooks error:', error.message);
      throw error;
    }
  }

  // 获取合约（SWAP）合约参数
  async getSwapInstrument(instId) {
    try {
      const requestPath = `/api/v5/public/instruments?instType=SWAP&instId=${instId}`;
      const response = await this.client.get(requestPath);
      if (response.data.code === '0' && response.data.data && response.data.data.length > 0) {
        const d = response.data.data[0];
        return {
          instId: d.instId,
          ctVal: parseFloat(d.ctVal), // 合约面值
          ctValCcy: d.ctValCcy,       // 面值计价币种（如 BTC 或 USDT）
          lotSz: parseFloat(d.lotSz), // 下单步长（合约张数步进）
          tickSz: parseFloat(d.tickSz),
          minSz: parseFloat(d.minSz || '0')
        };
      }
      throw new Error(`OKX instruments error: ${response.data.msg || 'unknown'}`);
    } catch (error) {
      console.error('OKX getSwapInstrument error:', error.message);
      throw error;
    }
  }

  // 根据 USDT 名义金额与价格估算张数（合约数量），按 lotSz 向下取整
  async estimateSwapSizeByUsdt(instId, lastPrice, usdtNotional) {
    const info = await this.getSwapInstrument(instId);
    // 将 USDT 金额转换为基础币数量（例如 BTC 数量）
    // 若 ctValCcy 为基础币（如 BTC），则 1 张 = ctVal 个基础币
    const baseQty = usdtNotional / lastPrice;
    const rawContracts = baseQty / info.ctVal; // 张数（可能是小数）
    const step = info.lotSz || 1;
    const contracts = Math.floor(rawContracts / step) * step;
    if (contracts < info.minSz) {
      throw new Error(`Order size below minSz: ${contracts} < ${info.minSz}`);
    }
    return { contracts, info };
  }

  // 获取资金费率
  async getFundingRate(symbol) {
    try {
      const swapSymbol = symbol + '-SWAP';
      const requestPath = `/api/v5/public/funding-rate?instId=${swapSymbol}`;
      
      const response = await this.client.get(requestPath);
      
      if (response.data.code === '0' && response.data.data.length > 0) {
        const fundingData = response.data.data[0];
        return {
          symbol: swapSymbol,
          originalSymbol: symbol,
          exchange: 'OKX',
          fundingRate: parseFloat(fundingData.fundingRate),
          nextFundingTime: parseInt(fundingData.nextFundingTime),
          timestamp: parseInt(fundingData.fundingTime)
        };
      } else {
        throw new Error(`OKX API Error: ${response.data.msg}`);
      }
    } catch (error) {
      console.error(`OKX getFundingRate error (${symbol}):`, error.message);
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
      console.error('OKX getMultipleFundingRates error:', error.message);
      throw error;
    }
  }

  // 获取账户余额（需要交易权限）
  async getBalance() {
    try {
      const requestPath = '/api/v5/account/balance';
      const headers = this.getHeaders('GET', requestPath);
      
      const response = await this.client.get(requestPath, { headers });
      
      if (response.data.code === '0') {
        return response.data.data;
      } else {
        throw new Error(`OKX API Error: ${response.data.msg}`);
      }
    } catch (error) {
      console.error('OKX getBalance error:', error.message);
      throw error;
    }
  }

  // 获取永续仓位（SWAP）
  async getSwapPositions(instId) {
    try {
      const requestPath = `/api/v5/account/positions?instType=SWAP&instId=${instId}`;
      const headers = this.getHeaders('GET', requestPath);
      const response = await this.client.get(requestPath, { headers });
      if (response.data.code === '0') {
        const arr = response.data.data || [];
        // 归一化输出：以张数与方向为核心
        return arr.map(d => ({
          instId: d.instId,
          mgnMode: d.mgnMode,
          lever: parseFloat(d.lever),
          posSide: d.posSide || (parseFloat(d.pos || '0') >= 0 ? 'short' : 'long'),
          // OKX pos 为张数字符串
          pos: parseFloat(d.pos || '0'),
          avgPx: parseFloat(d.avgPx || '0'),
          upl: parseFloat(d.upl || '0'),
          liqPx: parseFloat(d.liqPx || '0'),
          markPx: parseFloat(d.markPx || '0'),
          ccy: d.ccy
        }));
      }
      throw new Error(`OKX positions error: ${response.data.msg || 'unknown'}`);
    } catch (error) {
      console.error('OKX getSwapPositions error:', error.message);
      throw error;
    }
  }

  // 测试连接
  async testConnection() {
    try {
      // 使用公共API测试连接，不需要签名
      const response = await this.client.get('/api/v5/public/time');
      return response.data.code === '0';
    } catch (error) {
      console.error('OKX connection test failed:', error.message);
      return false;
    }
  }
}

module.exports = OKXApi;