// 套利配置管理

// 默认监控的交易对
const DEFAULT_SYMBOLS = [
  'BTC-USDT',
  'ETH-USDT', 
  'SOL-USDT'
];

// 默认最小利润阈值（百分比）
const DEFAULT_MIN_PROFIT_THRESHOLD = 0.1;

// 交易所配置
const EXCHANGE_CONFIG = {
  binance: {
    name: 'Binance',
    enabled: true
  },
  okx: {
    name: 'OKX', 
    enabled: true
  },
  hyperliquid: {
    name: 'Hyperliquid',
    enabled: true
  }
};

// 价格更新间隔（毫秒）
const PRICE_UPDATE_INTERVAL = 100;

// 实时检测配置
const REALTIME_CONFIG = {
  checkInterval: process.env.CHECK_INTERVAL ? parseInt(process.env.CHECK_INTERVAL) : 2000, // 套利检查间隔（毫秒）- 增加到2秒
  priceCacheTTL: process.env.PRICE_CACHE_TTL ? parseInt(process.env.PRICE_CACHE_TTL) : 10000, // 价格缓存有效期（毫秒）- 增加到10秒
  maxOpportunityAge: process.env.MAX_OPPORTUNITY_AGE ? parseInt(process.env.MAX_OPPORTUNITY_AGE) : 30000 // 最大机会有效期（毫秒）
};

// 通知配置
const NOTIFICATION_CONFIG = {
  enableConsole: true,
  enableFileLog: false,
  logFilePath: './logs/arbitrage.log',
  highProfitThreshold: 0.5 // 高利润通知阈值（百分比）
};

module.exports = {
  DEFAULT_SYMBOLS,
  DEFAULT_MIN_PROFIT_THRESHOLD,
  EXCHANGE_CONFIG,
  PRICE_UPDATE_INTERVAL,
  REALTIME_CONFIG,
  NOTIFICATION_CONFIG,
  
  // 获取配置的方法
  getSymbols: () => {
    // 可以从环境变量或配置文件读取自定义交易对
    const customSymbols = process.env.ARBITRAGE_SYMBOLS;
    if (customSymbols) {
      return customSymbols.split(',').map(s => s.trim());
    }
    return DEFAULT_SYMBOLS;
  },
  
  getMinProfitThreshold: () => {
    const envThreshold = process.env.MIN_PROFIT_THRESHOLD;
    if (envThreshold) {
      return parseFloat(envThreshold);
    }
    return DEFAULT_MIN_PROFIT_THRESHOLD;
  },
  
  isExchangeEnabled: (exchange) => {
    return EXCHANGE_CONFIG[exchange]?.enabled !== false;
  }
};