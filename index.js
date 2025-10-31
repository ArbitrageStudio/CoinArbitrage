require('dotenv').config();

const OKXApi = require('./src/api/okx');
const BinanceApi = require('./src/api/binance');
const HyperliquidApi = require('./src/api/hyperliquid');
const SlippageCalculator = require('./src/utils/slippage');
const ArbitrageCalculator = require('./src/utils/arbitrage');

class CoinArbitrage {
  constructor() {
    // 初始化API客户端
    this.okxApi = new OKXApi(
      process.env.OKX_API_KEY,
      process.env.OKX_SECRET_KEY,
      process.env.OKX_PASSPHRASE,
      process.env.OKX_SANDBOX === 'true'
    );
    
    this.binanceApi = new BinanceApi(
      process.env.BINANCE_API_KEY,
      process.env.BINANCE_SECRET_KEY,
      process.env.BINANCE_TESTNET === 'true'
    );
    
    this.hyperliquidApi = new HyperliquidApi(
      process.env.HYPERLIQUID_API_KEY,
      process.env.HYPERLIQUID_SECRET_KEY
    );
    
    // 初始化套利计算器
    this.arbitrageCalculator = new ArbitrageCalculator();
    
    // 设置最小利润阈值
    const minProfit = parseFloat(process.env.MIN_PROFIT_THRESHOLD) || 0.5;
    this.arbitrageCalculator.setMinProfitThreshold(minProfit);
    
    // 默认监控的交易对（OKX格式）
    this.defaultSymbols = [
      'BTC-USDT',
      'ETH-USDT',
      'XRP-USDT',
      'LTC-USDT',
      'BCH-USDT',
      'SOL-USDT',
      // 'LINK-USDT',
      // 'DOT-USDT',
      'DOGE-USDT',
      // 'UNI-USDT',
      'BNB-USDT',
      // 'OKB-USDT'
    ];
  }

  // 转换交易对格式（OKX格式转Binance格式）
  convertSymbolFormat(okxSymbol) {
    return okxSymbol.replace('-', '');
  }

  // 测试API连接
  async testConnections() {
    console.log('🔍 测试API连接...');
    
    try {
      const okxConnected = await this.okxApi.testConnection();
      const binanceConnected = await this.binanceApi.testConnection();
      const hyperliquidConnected = await this.hyperliquidApi.testConnection();
      
      console.log(`OKX连接状态: ${okxConnected ? '✅ 成功' : '❌ 失败'}`);
      console.log(`Binance连接状态: ${binanceConnected ? '✅ 成功' : '❌ 失败'}`);
      console.log(`Hyperliquid连接状态: ${hyperliquidConnected ? '✅ 成功' : '❌ 失败'}`);
      
      return okxConnected && binanceConnected && hyperliquidConnected;
    } catch (error) {
      console.error('连接测试失败:', error.message);
      return false;
    }
  }

  // 获取价格数据
  async fetchPriceData(symbols = this.defaultSymbols, includeFutures = false) {
    console.log('📊 获取价格数据...');
    
    try {
      // 转换交易对格式
      const binanceSymbols = symbols.map(symbol => this.convertSymbolFormat(symbol));
      
      if (includeFutures) {
        // 并行获取现货和合约数据
        const [
          okxSpotTickers, okxFuturesTickers,
          binanceSpotTickers, binanceFuturesTickers,
          hyperliquidSpotTickers, hyperliquidFuturesTickers
        ] = await Promise.all([
          this.okxApi.getMultipleTickers(symbols),
          this.okxApi.getMultipleFuturesTickers(symbols),
          this.binanceApi.getMultipleTickers(binanceSymbols),
          this.binanceApi.getMultipleFuturesTickers(symbols),
          this.hyperliquidApi.getMultipleTickers(symbols),
          this.hyperliquidApi.getMultipleFuturesTickers(symbols)
        ]);
        
        console.log(`✅ 获取到 ${okxSpotTickers.length} 个OKX现货价格数据`);
        console.log(`✅ 获取到 ${okxFuturesTickers.length} 个OKX合约价格数据`);
        console.log(`✅ 获取到 ${binanceSpotTickers.length} 个Binance现货价格数据`);
        console.log(`✅ 获取到 ${binanceFuturesTickers.length} 个Binance合约价格数据`);
        console.log(`✅ 获取到 ${hyperliquidSpotTickers.length} 个Hyperliquid现货价格数据`);
        console.log(`✅ 获取到 ${hyperliquidFuturesTickers.length} 个Hyperliquid合约价格数据`);
        
        // 统一交易对格式以便比较
        const normalizedBinanceSpotTickers = binanceSpotTickers.map(ticker => ({
          ...ticker,
          symbol: ticker.symbol.replace(/USDT$/, '-USDT')
        }));
        
        return {
          spot: {
            okxTickers: okxSpotTickers,
            binanceTickers: normalizedBinanceSpotTickers,
            hyperliquidTickers: hyperliquidSpotTickers
          },
          futures: {
            okxTickers: okxFuturesTickers,
            binanceTickers: binanceFuturesTickers,
            hyperliquidTickers: hyperliquidFuturesTickers
          }
        };
      } else {
        // 只获取现货数据（保持向后兼容）
        const [okxTickers, binanceTickers, hyperliquidTickers] = await Promise.all([
          this.okxApi.getMultipleTickers(symbols),
          this.binanceApi.getMultipleTickers(binanceSymbols),
          this.hyperliquidApi.getMultipleTickers(symbols)
        ]);
        
        console.log(`✅ 获取到 ${okxTickers.length} 个OKX价格数据`);
        console.log(`✅ 获取到 ${binanceTickers.length} 个Binance价格数据`);
        console.log(`✅ 获取到 ${hyperliquidTickers.length} 个Hyperliquid价格数据`);
        
        // 统一交易对格式以便比较
        const normalizedBinanceTickers = binanceTickers.map(ticker => ({
          ...ticker,
          symbol: ticker.symbol.replace(/USDT$/, '-USDT')
        }));
        
        return {
          okxTickers,
          binanceTickers: normalizedBinanceTickers,
          hyperliquidTickers
        };
      }
    } catch (error) {
      console.error('获取价格数据失败:', error.message);
      throw error;
    }
  }

  // 获取订单簿数据
  async fetchOrderBookData(symbols = this.defaultSymbols, depth = 20, includeFutures = false) {
    console.log('📖 获取订单簿数据...');
    
    try {
      if (includeFutures) {
        // 获取现货和合约订单簿
        const [
          okxSpotOrderBooks, okxFuturesOrderBooks,
          binanceSpotOrderBooks, binanceFuturesOrderBooks,
          hyperliquidSpotOrderBooks, hyperliquidFuturesOrderBooks
        ] = await Promise.all([
          this.okxApi.getMultipleOrderBooks(symbols, depth),
          this.okxApi.getMultipleFuturesOrderBooks(symbols, depth),
          this.binanceApi.getMultipleOrderBooks(symbols, depth),
          this.binanceApi.getMultipleFuturesOrderBooks(symbols, depth),
          this.hyperliquidApi.getMultipleOrderBooks(symbols, depth),
          this.hyperliquidApi.getMultipleFuturesOrderBooks(symbols, depth)
        ]);
        
        console.log(`✅ 获取到 ${okxSpotOrderBooks.length} 个OKX现货订单簿`);
        console.log(`✅ 获取到 ${okxFuturesOrderBooks.length} 个OKX合约订单簿`);
        console.log(`✅ 获取到 ${binanceSpotOrderBooks.length} 个Binance现货订单簿`);
        console.log(`✅ 获取到 ${binanceFuturesOrderBooks.length} 个Binance合约订单簿`);
        console.log(`✅ 获取到 ${hyperliquidSpotOrderBooks.length} 个Hyperliquid现货订单簿`);
        console.log(`✅ 获取到 ${hyperliquidFuturesOrderBooks.length} 个Hyperliquid合约订单簿`);
        
        return {
          spot: {
            okxOrderBooks: okxSpotOrderBooks,
            binanceOrderBooks: binanceSpotOrderBooks,
            hyperliquidOrderBooks: hyperliquidSpotOrderBooks
          },
          futures: {
            okxOrderBooks: okxFuturesOrderBooks,
            binanceOrderBooks: binanceFuturesOrderBooks,
            hyperliquidOrderBooks: hyperliquidFuturesOrderBooks
          }
        };
      } else {
        // 只获取现货订单簿
        const [okxOrderBooks, binanceOrderBooks, hyperliquidOrderBooks] = await Promise.all([
          this.okxApi.getMultipleOrderBooks(symbols, depth),
          this.binanceApi.getMultipleOrderBooks(symbols, depth),
          this.hyperliquidApi.getMultipleOrderBooks(symbols, depth)
        ]);
        
        console.log(`✅ 获取到 ${okxOrderBooks.length} 个OKX订单簿`);
        console.log(`✅ 获取到 ${binanceOrderBooks.length} 个Binance订单簿`);
        console.log(`✅ 获取到 ${hyperliquidOrderBooks.length} 个Hyperliquid订单簿`);
        
        return {
          okxOrderBooks,
          binanceOrderBooks,
          hyperliquidOrderBooks
        };
      }
    } catch (error) {
      console.error('获取订单簿数据失败:', error.message);
      throw error;
    }
  }

  // 获取资金费率数据
  async fetchFundingRates(symbols = this.defaultSymbols) {
    console.log('💰 获取资金费率数据...');
    
    try {
      const [okxFundingRates, binanceFundingRates, hyperliquidFundingRates] = await Promise.all([
        this.okxApi.getMultipleFundingRates(symbols),
        this.binanceApi.getMultipleFundingRates(symbols),
        this.hyperliquidApi.getMultipleFundingRates(symbols)
      ]);
      
      console.log(`✅ 获取到 ${okxFundingRates.length} 个OKX资金费率`);
      console.log(`✅ 获取到 ${binanceFundingRates.length} 个Binance资金费率`);
      console.log(`✅ 获取到 ${hyperliquidFundingRates.length} 个Hyperliquid资金费率`);
      
      return {
        okxFundingRates,
        binanceFundingRates,
        hyperliquidFundingRates
      };
    } catch (error) {
      console.error('获取资金费率数据失败:', error.message);
      throw error;
    }
  }

  // 计算滑点分析
  async calculateSlippageAnalysis(symbols = this.defaultSymbols, amount = 1000, depth = 20) {
    console.log('📊 计算滑点分析...');
    
    try {
      // 获取订单簿数据
      const orderBookData = await this.fetchOrderBookData(symbols, depth, false);
      
      // 合并所有交易所的订单簿
      const allOrderBooks = [
        ...orderBookData.okxOrderBooks,
        ...orderBookData.binanceOrderBooks,
        ...orderBookData.hyperliquidOrderBooks
      ];
      
      // 按交易对分组
      const orderBooksBySymbol = {};
      allOrderBooks.forEach(orderBook => {
        const symbol = orderBook.originalSymbol || orderBook.symbol;
        if (!orderBooksBySymbol[symbol]) {
          orderBooksBySymbol[symbol] = [];
        }
        orderBooksBySymbol[symbol].push(orderBook);
      });
      
      // 计算每个交易对的套利机会
      const arbitrageOpportunities = [];
      
      Object.keys(orderBooksBySymbol).forEach(symbol => {
        const orderBooks = orderBooksBySymbol[symbol];
        if (orderBooks.length >= 2) {
          const opportunities = SlippageCalculator.findBestArbitrageOpportunities(orderBooks, amount);
          arbitrageOpportunities.push(...opportunities);
        }
      });
      
      console.log(`✅ 发现 ${arbitrageOpportunities.length} 个套利机会`);
      
      return {
        orderBooksBySymbol,
        arbitrageOpportunities: arbitrageOpportunities.slice(0, 10), // 返回前10个最佳机会
        slippageAnalysis: this.generateSlippageReport(arbitrageOpportunities)
      };
    } catch (error) {
      console.error('计算滑点分析失败:', error.message);
      throw error;
    }
  }

  // 生成滑点分析报告
  generateSlippageReport(opportunities) {
    if (opportunities.length === 0) {
      return {
        summary: '未发现可行的套利机会',
        totalOpportunities: 0,
        averageProfit: 0,
        bestOpportunity: null
      };
    }
    
    const totalProfit = opportunities.reduce((sum, opp) => sum + opp.netProfit, 0);
    const averageProfit = totalProfit / opportunities.length;
    const bestOpportunity = opportunities[0];
    
    return {
      summary: `发现 ${opportunities.length} 个套利机会，平均净利润 ${averageProfit.toFixed(4)} USDT`,
      totalOpportunities: opportunities.length,
      averageProfit,
      bestOpportunity,
      profitableCount: opportunities.filter(opp => opp.netProfit > 0).length
    };
  }

  // 分析套利机会
  async analyzeArbitrageOpportunities(symbols = this.defaultSymbols) {
    console.log('🔍 分析套利机会...');
    
    try {
      // 获取价格数据
      const { okxTickers, binanceTickers, hyperliquidTickers } = await this.fetchPriceData(symbols);
      
      // 分析OKX和Binance之间的套利机会
      const okxBinanceOpportunities = this.arbitrageCalculator.analyzeBatchOpportunities(
        okxTickers,
        binanceTickers
      );
      
      // 分析OKX和Hyperliquid之间的套利机会
      const okxHyperliquidOpportunities = this.arbitrageCalculator.analyzeBatchOpportunities(
        okxTickers,
        hyperliquidTickers
      );
      
      // 分析Binance和Hyperliquid之间的套利机会
      const binanceHyperliquidOpportunities = this.arbitrageCalculator.analyzeBatchOpportunities(
        binanceTickers,
        hyperliquidTickers
      );
      
      // 合并所有套利机会
      const allOpportunities = [
        ...okxBinanceOpportunities,
        ...okxHyperliquidOpportunities,
        ...binanceHyperliquidOpportunities
      ];
      
      // 生成报告
      const report = this.arbitrageCalculator.generateArbitrageReport(allOpportunities);
      
      return report;
    } catch (error) {
      console.error('分析套利机会失败:', error.message);
      throw error;
    }
  }

  // 显示套利报告
  displayReport(report) {
    console.log('\n' + '='.repeat(60));
    console.log('📈 加密货币套利机会报告');
    console.log('='.repeat(60));
    console.log(`生成时间: ${report.生成时间}`);
    console.log(`总机会数: ${report.总机会数}`);
    console.log(`有利可图机会数: ${report.有利可图机会数}`);
    
    if (report.最佳机会) {
      console.log('\n🏆 最佳套利机会:');
      console.log('-'.repeat(40));
      Object.entries(report.最佳机会).forEach(([key, value]) => {
        console.log(`${key}: ${value}`);
      });
    }
    
    if (report.所有有利可图机会.length > 1) {
      console.log('\n💰 其他有利可图机会:');
      console.log('-'.repeat(40));
      report.所有有利可图机会.slice(1, 6).forEach((opp, index) => {
        console.log(`\n${index + 2}. ${opp.交易对}`);
        console.log(`   净利润百分比: ${opp.净利润百分比}`);
        console.log(`   ${opp.买入交易所} → ${opp.卖出交易所}`);
      });
    }
    
    if (report.有利可图机会数 === 0) {
      console.log('\n😔 当前没有发现有利可图的套利机会');
      console.log('建议稍后再试或调整最小利润阈值');
    }
    
    console.log('\n' + '='.repeat(60));
  }

  // 运行单次分析
  async runOnce(symbols) {
    try {
      // 测试连接
      const connected = await this.testConnections();
      if (!connected) {
        console.error('❌ API连接失败，请检查配置');
        return;
      }
      
      // 分析套利机会
      const report = await this.analyzeArbitrageOpportunities(symbols);
      
      // 显示报告
      this.displayReport(report);
      
    } catch (error) {
      console.error('❌ 运行失败:', error.message);
    }
  }

  // 持续监控模式
  async startMonitoring(symbols, intervalMinutes = 5) {
    console.log(`🚀 开始监控套利机会 (每${intervalMinutes}分钟检查一次)`);
    console.log('按 Ctrl+C 停止监控\n');
    
    // 立即运行一次
    await this.runOnce(symbols);
    
    // 设置定时器
    const interval = setInterval(async () => {
      console.log('\n🔄 刷新数据...');
      await this.runOnce(symbols);
    }, intervalMinutes * 60 * 1000);
    
    // 优雅退出
    process.on('SIGINT', () => {
      console.log('\n👋 停止监控');
      clearInterval(interval);
      process.exit(0);
    });
  }
}

// 主函数
async function main() {
  console.log('🚀 启动加密货币套利工具');
  
  // 检查环境变量
  if (!process.env.OKX_API_KEY || !process.env.BINANCE_API_KEY) {
    console.error('❌ 请先配置API密钥环境变量');
    console.log('请复制 .env.example 为 .env 并填入您的API密钥');
    process.exit(1);
  }
  
  const arbitrage = new CoinArbitrage();
  
  // 获取命令行参数
  const args = process.argv.slice(2);
  const mode = args[0] || 'monitor'; // 默认改为监控模式
  
  if (mode === 'once') {
    await arbitrage.runOnce();
  } else {
    const interval = parseInt(args[1]) || 5;
    await arbitrage.startMonitoring(undefined, interval);
  }
}

// 运行主函数
if (require.main === module) {
  main().catch(error => {
    console.error('程序运行出错:', error.message);
    process.exit(1);
  });
}

module.exports = CoinArbitrage;