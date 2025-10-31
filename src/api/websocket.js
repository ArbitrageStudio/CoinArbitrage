const WebSocket = require('ws');

class WebSocketManager {
  constructor() {
    this.wsConnections = new Map();
    this.priceData = new Map();
    this.subscribers = new Set();
    this.reconnectAttempts = new Map(); // 用于跟踪重连尝试次数
  }

  // Binance WebSocket连接
  async connectToBinance(symbols) {
    const binanceSymbols = symbols.map(s => s.replace('-', '').toLowerCase());
    const streamNames = binanceSymbols.map(s => `${s}@ticker`);
    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streamNames.join('/')}`;
    
    return this.createConnection('binance', wsUrl, (data) => {
      this.handleBinanceMessage(data);
    });
  }

  // OKX WebSocket连接
  async connectToOKX(symbols) {
    // OKX WebSocket公共频道，不需要认证
    const okxSymbols = symbols.map(s => {
      // 转换为OKX格式: BTC-USDT -> BTC-USDT
      return s.replace('-', '-');
    });
    
    const args = okxSymbols.map(symbol => ({
      channel: 'tickers',
      instId: symbol
    }));
    
    const wsUrl = 'wss://ws.okx.com:8443/ws/v5/public';
    
    return this.createConnection('okx', wsUrl, (data) => {
      this.handleOKXMessage(data);
    }, () => {
      // 连接建立后订阅频道
      const subscribeMsg = {
        op: 'subscribe',
        args: args
      };
      const ws = this.wsConnections.get('okx');
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(subscribeMsg));
      }
    });
  }

  // Hyperliquid WebSocket连接
  async connectToHyperliquid(symbols) {
    // Hyperliquid使用不同的WebSocket端点
    const wsUrl = 'wss://api.hyperliquid.xyz/ws';
    
    return this.createConnection('hyperliquid', wsUrl, (data) => {
      this.handleHyperliquidMessage(data);
    }, () => {
      // 连接建立后订阅交易对信息
      const ws = this.wsConnections.get('hyperliquid');
      if (ws && ws.readyState === WebSocket.OPEN) {
        // Hyperliquid使用info端点获取数据，WebSocket主要用于推送通知
        // 这里我们使用REST API来获取价格数据，WebSocket用于连接状态检测
        console.log('✅ Hyperliquid WebSocket连接成功（用于状态监测）');
      }
    });
  }

  // 创建WebSocket连接（带自动重连功能）
  createConnection(exchange, url, messageHandler, onOpenCallback = null) {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(url);
      
      ws.on('open', () => {
        console.log(`✅ ${exchange} WebSocket连接成功`);
        this.wsConnections.set(exchange, ws);
        
        // 执行连接建立后的回调
        if (onOpenCallback) {
          onOpenCallback();
        }
        
        resolve(ws);
      });

      ws.on('message', (data) => {
        try {
          const parsed = JSON.parse(data);
          messageHandler(parsed);
        } catch (error) {
          console.error('WebSocket消息解析错误:', error);
        }
      });

      ws.on('error', (error) => {
        console.error(`${exchange} WebSocket错误:`, error.message);
        reject(error);
      });

      ws.on('close', (code, reason) => {
        console.log(`❌ ${exchange} WebSocket连接关闭 (code: ${code}, reason: ${reason || 'none'})`);
        this.wsConnections.delete(exchange);
        
        // 自动重连逻辑（非正常关闭时）
        if (code !== 1000) { // 1000表示正常关闭
          console.log(`🔄 尝试重新连接 ${exchange} WebSocket...`);
          setTimeout(() => {
            this.attemptReconnect(exchange, url, messageHandler, onOpenCallback);
          }, 3000); // 3秒后重连
        }
      });
    });
  }

  // 尝试重新连接
  async attemptReconnect(exchange, url, messageHandler, onOpenCallback) {
    try {
      console.log(`🔄 正在重新连接 ${exchange} WebSocket...`);
      await this.createConnection(exchange, url, messageHandler, onOpenCallback);
      console.log(`✅ ${exchange} WebSocket重新连接成功`);
    } catch (error) {
      console.error(`❌ ${exchange} WebSocket重新连接失败:`, error.message);
      
      // 如果重连失败，继续尝试（指数退避）
      const retryDelay = Math.min(30000, 3000 * Math.pow(2, this.reconnectAttempts.get(exchange) || 1));
      this.reconnectAttempts.set(exchange, (this.reconnectAttempts.get(exchange) || 0) + 1);
      
      console.log(`⏰ ${exchange} 将在 ${retryDelay / 1000} 秒后再次尝试重连...`);
      setTimeout(() => {
        this.attemptReconnect(exchange, url, messageHandler, onOpenCallback);
      }, retryDelay);
    }
  }

  // 处理Binance消息
  handleBinanceMessage(data) {
    if (data.stream && data.data) {
      // Binance格式: BTCUSDT -> BTC-USDT
      const rawSymbol = data.data.s;
      let symbol;
      
      if (rawSymbol.endsWith('USDT')) {
        symbol = rawSymbol.slice(0, -4) + '-USDT';
      } else {
        symbol = rawSymbol + '-USDT';
      }
      
      const price = parseFloat(data.data.c);
      const bid = parseFloat(data.data.b);
      const ask = parseFloat(data.data.a);
      
      this.updatePrice('binance', symbol, {
        price,
        bid,
        ask,
        timestamp: Date.now()
      });
    }
  }

  // 处理OKX消息
  handleOKXMessage(data) {
    if (data.arg && data.arg.channel === 'tickers' && data.data && data.data.length > 0) {
      const tickerData = data.data[0];
      const symbol = tickerData.instId;
      const price = parseFloat(tickerData.last);
      const bid = parseFloat(tickerData.bidPx);
      const ask = parseFloat(tickerData.askPx);
      
      this.updatePrice('okx', symbol, {
        price,
        bid,
        ask,
        timestamp: parseInt(tickerData.ts)
      });
    }
  }

  // 处理Hyperliquid消息
  handleHyperliquidMessage(data) {
    if (data.channel === 'l2Book' && data.data) {
      try {
        const symbol = data.coin + '-USDT'; // 转换为标准格式
        const levels = data.data.levels;
        
        if (levels && levels.length >= 2) {
          // 获取最佳买价和卖价
          const bestBid = levels[0][0]; // bids数组的第一个元素
          const bestAsk = levels[1][0]; // asks数组的第一个元素
          
          if (bestBid && bestAsk) {
            const bidPrice = parseFloat(bestBid[0]);
            const askPrice = parseFloat(bestAsk[0]);
            const midPrice = (bidPrice + askPrice) / 2;
            
            this.updatePrice('hyperliquid', symbol, {
              price: midPrice,
              bid: bidPrice,
              ask: askPrice,
              timestamp: Date.now()
            });
          }
        }
      } catch (error) {
        console.error('处理Hyperliquid订单簿数据错误:', error);
      }
    }
  }

  // 更新价格数据
  updatePrice(exchange, symbol, data) {
    const key = `${exchange}:${symbol}`;
    this.priceData.set(key, data);
    
    // 通知所有订阅者
    this.notifySubscribers(exchange, symbol, data);
  }

  // 通知订阅者
  notifySubscribers(exchange, symbol, data) {
    this.subscribers.forEach(callback => {
      try {
        callback(exchange, symbol, data);
      } catch (error) {
        console.error('订阅者回调错误:', error);
      }
    });
  }

  // 订阅价格更新
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  // 获取最新价格
  getLatestPrice(exchange, symbol) {
    return this.priceData.get(`${exchange}:${symbol}`);
  }

  // 关闭所有连接
  closeAll() {
    this.wsConnections.forEach((ws, exchange) => {
      ws.close();
      console.log(`已关闭${exchange} WebSocket连接`);
    });
    this.wsConnections.clear();
  }
}

module.exports = WebSocketManager;