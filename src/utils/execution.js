require('dotenv').config();

const OKXApi = require('../api/okx');
const BinanceApi = require('../api/binance');
const arbitrageConfig = require('../config/arbitrageConfig');

class TradeExecutor {
  constructor() {
    // 读取环境变量与配置
    this.enableAutoTrade = (process.env.ENABLE_AUTO_TRADE || 'false') === 'true';
    this.dryRun = (process.env.AUTO_TRADE_DRY_RUN || 'true') === 'true';
    this.orderUsdtSize = parseFloat(process.env.ORDER_USDT_SIZE || '50');
    this.minProfitForTrade = parseFloat(process.env.AUTO_TRADE_MIN_PROFIT || arbitrageConfig.getMinProfitThreshold());
    this.tradeCooldownMs = parseInt(process.env.AUTO_TRADE_COOLDOWN_MS || '15000');

    // 初始化API客户端
    this.okx = new OKXApi(
      process.env.OKX_API_KEY,
      process.env.OKX_SECRET_KEY,
      process.env.OKX_PASSPHRASE,
      process.env.OKX_SANDBOX === 'true'
    );

    this.binance = new BinanceApi(
      process.env.BINANCE_API_KEY,
      process.env.BINANCE_SECRET_KEY,
      process.env.BINANCE_TESTNET === 'true'
    );

    // 记录每个交易对的最近交易时间，避免过于频繁
    this.lastTradeAt = new Map();
  }

  // 统一的执行入口
  async executeArbitrage(opportunity) {
    try {
      if (!this.enableAutoTrade) return { skipped: true, reason: 'auto_trade_disabled' };
      if (!opportunity || !opportunity.symbol) return { skipped: true, reason: 'invalid_opportunity' };

      // 利润与可行性校验
      if (!(opportunity.netProfitPercentage > this.minProfitForTrade) || opportunity.feasible === false) {
        return { skipped: true, reason: 'profit_too_low' };
      }

      // 冷却时间避免过度交易
      const now = Date.now();
      const last = this.lastTradeAt.get(opportunity.symbol) || 0;
      if (now - last < this.tradeCooldownMs) {
        return { skipped: true, reason: 'cooldown' };
      }

      const buyExchange = String(opportunity.buyExchange).toLowerCase();
      const sellExchange = String(opportunity.sellExchange).toLowerCase();
      const symbol = opportunity.symbol; // 标准格式: BTC-USDT

      // 以 USDT 金额下单，估算数量
      const buyPrice = opportunity.buyPrice;
      if (!buyPrice || buyPrice <= 0) return { skipped: true, reason: 'invalid_buy_price' };
      const estQuantity = this.orderUsdtSize / buyPrice;

      // 干跑模式：只打印将要执行的交易
      if (this.dryRun) {
        console.log('🧪 [DRY-RUN] 将执行套利交易: ', {
          symbol,
          buyExchange,
          sellExchange,
          orderUsdtSize: this.orderUsdtSize,
          estQuantity: Number(estQuantity.toFixed(6))
        });
        this.lastTradeAt.set(symbol, now);
        return { dryRun: true };
      }

      // 实盘执行：先买后卖（市价单）
      const buyResult = await this.placeMarketOrder(buyExchange, symbol, 'buy', {
        usdtAmount: this.orderUsdtSize,
        quantity: estQuantity
      });

      // 以买入成交数量为准进行卖出；如果无法获取，使用估算数量
      const filledQty = (buyResult && buyResult.filledQty) ? buyResult.filledQty : estQuantity;

      const sellResult = await this.placeMarketOrder(sellExchange, symbol, 'sell', {
        quantity: filledQty
      });

      this.lastTradeAt.set(symbol, now);
      console.log('✅ 自动套利交易完成:', { symbol, buyExchange, sellExchange, filledQty: Number(filledQty.toFixed(6)) });
      return { ok: true, buyResult, sellResult };

    } catch (error) {
      console.error('❌ 执行套利交易失败:', error.message);
      return { ok: false, error: error.message };
    }
  }

  // 按交易所路由市价单
  async placeMarketOrder(exchange, symbol, side, { usdtAmount, quantity }) {
    switch (exchange) {
      case 'binance':
        return this.placeBinanceSpotMarket(symbol, side, { usdtAmount, quantity });
      case 'okx':
        return this.placeOkxSpotMarket(symbol, side, { usdtAmount, quantity });
      default:
        console.warn(`⚠️ 暂不支持在 ${exchange} 自动下单`);
        return { skipped: true };
    }
  }

  // Binance 现货市价单
  async placeBinanceSpotMarket(symbol, side, { usdtAmount, quantity }) {
    try {
      const binanceSymbol = symbol.replace('-', ''); // BTC-USDT -> BTCUSDT
      if (side === 'buy' && usdtAmount && usdtAmount > 0) {
        // 使用 quoteOrderQty 以 USDT 金额买入
        const params = {
          symbol: binanceSymbol,
          side: 'BUY',
          type: 'MARKET',
          quoteOrderQty: Number(usdtAmount.toFixed(2))
        };
        const queryString = this.binance.getSignedParams(params);
        const resp = await this.binance.client.post(`/api/v3/order?${queryString}`);
        const filledQty = this._sumFillsQty(resp.data.fills);
        return { raw: resp.data, filledQty };
      }

      if (side === 'sell' && quantity && quantity > 0) {
        const qty = Number(quantity.toFixed(6));
        const params = {
          symbol: binanceSymbol,
          side: 'SELL',
          type: 'MARKET',
          quantity: qty
        };
        const queryString = this.binance.getSignedParams(params);
        const resp = await this.binance.client.post(`/api/v3/order?${queryString}`);
        return { raw: resp.data };
      }

      throw new Error('Invalid Binance market order parameters');
    } catch (error) {
      if (error.response && error.response.data) {
        console.error('Binance 下单错误:', error.response.data);
        throw new Error(error.response.data.msg || error.message);
      }
      throw error;
    }
  }

  // OKX 现货市价单
  async placeOkxSpotMarket(symbol, side, { usdtAmount, quantity }) {
    try {
      const requestPath = '/api/v5/trade/order';
      const body = {
        instId: symbol,
        tdMode: 'cash',
        side: side === 'buy' ? 'buy' : 'sell',
        ordType: 'market'
      };

      if (side === 'buy' && usdtAmount && usdtAmount > 0) {
        // 以 USDT 金额买入
        body.tgtCcy = 'quote_ccy';
        body.sz = Number(usdtAmount.toFixed(2)).toString();
      } else if (side === 'sell' && quantity && quantity > 0) {
        body.sz = Number(quantity.toFixed(6)).toString();
      } else {
        throw new Error('Invalid OKX market order parameters');
      }

      const headers = this.okx.getHeaders('POST', requestPath, JSON.stringify(body));
      const resp = await this.okx.client.post(requestPath, body, { headers });

      if (resp.data.code !== '0') {
        throw new Error(resp.data.msg || 'OKX trade/order failed');
      }

      // OKX返回成交细节需要后续查询，这里返回原始响应
      return { raw: resp.data };
    } catch (error) {
      if (error.response && error.response.data) {
        console.error('OKX 下单错误:', error.response.data);
        throw new Error(error.response.data.msg || error.message);
      }
      throw error;
    }
  }

  _sumFillsQty(fills) {
    try {
      if (!fills || !Array.isArray(fills)) return undefined;
      const sum = fills.reduce((acc, f) => acc + parseFloat(f.qty || f.qtyExecuted || 0), 0);
      return sum || undefined;
    } catch {
      return undefined;
    }
  }
}

module.exports = TradeExecutor;