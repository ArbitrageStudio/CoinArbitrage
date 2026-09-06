require('dotenv').config();

const OKXApi = require('../api/okx');
const BinanceApi = require('../api/binance');
const arbitrageConfig = require('../config/arbitrageConfig');
const SlippageCalculator = require('./slippage');

class TradeExecutor {
  constructor() {
    // 读取环境变量与配置
    this.enableAutoTrade = (process.env.ENABLE_AUTO_TRADE || 'false') === 'true';
    this.dryRun = (process.env.AUTO_TRADE_DRY_RUN || 'true') === 'true';
    this.orderUsdtSize = parseFloat(process.env.ORDER_USDT_SIZE || '50');
    this.minProfitForTrade = parseFloat(process.env.AUTO_TRADE_MIN_PROFIT || arbitrageConfig.getMinProfitThreshold());
    this.tradeCooldownMs = parseInt(process.env.AUTO_TRADE_COOLDOWN_MS || '15000');
    this.maxSlippage = parseFloat(process.env.MAX_SLIPPAGE_PCT || '0.5');

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

  // OKX 永续（SWAP）市价单（沙盒支持）
  async placeOkxPerpMarket(symbol, side, { usdtAmount, quantity }) {
    try {
      const swapSymbol = `${symbol}-SWAP`;
      const requestPath = '/api/v5/trade/order';

      // 获取当前永续价格用于估算张数（若提供 quantity 则优先使用）
      const ticker = await this.okx.getFuturesTicker(symbol);
      const lastPrice = ticker && ticker.price ? Number(ticker.price) : undefined;
      if (!lastPrice || lastPrice <= 0) {
        throw new Error('OKX perp ticker unavailable');
      }

      let contracts;
      if (quantity && quantity > 0) {
        // 将基础币数量换算为合约张数
        const info = await this.okx.getSwapInstrument(swapSymbol);
        const rawContracts = quantity / info.ctVal;
        const step = info.lotSz || 1;
        contracts = Math.floor(rawContracts / step) * step;
        if (contracts < info.minSz) {
          throw new Error(`Order size below minSz: ${contracts} < ${info.minSz}`);
        }
      } else if (usdtAmount && usdtAmount > 0) {
        const { contracts: c } = await this.okx.estimateSwapSizeByUsdt(swapSymbol, lastPrice, usdtAmount);
        contracts = c;
      } else {
        throw new Error('Invalid OKX perp market order parameters');
      }

      const body = {
        instId: swapSymbol,
        tdMode: process.env.OKX_TDMODE || 'cross',
        side: side === 'buy' ? 'buy' : 'sell',
        ordType: 'market',
        sz: String(contracts)
      };

      const headers = this.okx.getHeaders('POST', requestPath, JSON.stringify(body));
      const resp = await this.okx.client.post(requestPath, body, { headers });
      if (resp.data.code !== '0') {
        throw new Error(resp.data.msg || 'OKX perp trade/order failed');
      }
      return { raw: resp.data };
    } catch (error) {
      if (error.response && error.response.data) {
        console.error('OKX 永续下单错误:', error.response.data);
        throw new Error(error.response.data.msg || error.message);
      }
      throw error;
    }
  }

  // 直接按合约张数下 OKX 永续市价单
  async placeOkxPerpMarketByContracts(symbol, side, contracts) {
    try {
      const swapSymbol = `${symbol}-SWAP`;
      const requestPath = '/api/v5/trade/order';
      if (!contracts || contracts <= 0) throw new Error('Invalid contracts');
      const body = {
        instId: swapSymbol,
        tdMode: process.env.OKX_TDMODE || 'cross',
        side: side === 'buy' ? 'buy' : 'sell',
        ordType: 'market',
        sz: String(contracts)
      };
      const headers = this.okx.getHeaders('POST', requestPath, JSON.stringify(body));
      const resp = await this.okx.client.post(requestPath, body, { headers });
      if (resp.data.code !== '0') {
        throw new Error(resp.data.msg || 'OKX perp trade/order failed');
      }
      return { raw: resp.data };
    } catch (error) {
      if (error.response && error.response.data) {
        console.error('OKX 永续下单错误:', error.response.data);
        throw new Error(error.response.data.msg || error.message);
      }
      throw error;
    }
  }

  // 执行 OKX 基差计划：买现货 + 卖永续（或反向）
  async executeOkxBasisPlan(plan) {
    try {
      if (!this.enableAutoTrade) return { skipped: true, reason: 'auto_trade_disabled' };
      if (!plan || !Array.isArray(plan.legs)) return { skipped: true, reason: 'invalid_plan' };
      if (this.dryRun) {
        console.log('🧪 [DRY-RUN] OKX 基差计划执行: ', plan);
        return { dryRun: true };
      }

      // 顺序执行：先现货，再永续（避免裸空风险）
      const spotLeg = plan.legs.find(l => l.market === 'spot' && l.exchange === 'okx');
      const perpLeg = plan.legs.find(l => l.market === 'perpetual' && l.exchange === 'okx');
      if (!spotLeg || !perpLeg) return { skipped: true, reason: 'missing_legs' };

      // 计算数量
      const quantity = Number(plan.quantity || (this.orderUsdtSize / plan.spotPrice));

      // 滑点检查
      const okxOptions = {
        apiKey: this.okx.apiKey,
        secretKey: this.okx.secretKey,
        passphrase: this.okx.passphrase,
        sandbox: this.okx.sandbox
      };
      
      const isSlippageOk = await SlippageCalculator.isOkxBasisSlippageAcceptable(
        plan.symbol,
        quantity,
        spotLeg.side,
        perpLeg.side,
        this.maxSlippage,
        okxOptions
      );
      
      if (!isSlippageOk) {
        console.log(`⚠️ 滑点过高，跳过执行: ${plan.symbol}`);
        return { skipped: true, reason: 'slippage_too_high' };
      }
      
      const spotRes = await this.placeOkxSpotMarket(plan.symbol, spotLeg.side, {
        usdtAmount: spotLeg.side === 'buy' ? this.orderUsdtSize : undefined,
        quantity: spotLeg.side === 'sell' ? quantity : undefined
      });

      const perpRes = await this.placeOkxPerpMarket(plan.symbol, perpLeg.side, {
        usdtAmount: perpLeg.side === 'sell' ? this.orderUsdtSize : undefined,
        quantity: perpLeg.side === 'sell' ? quantity : undefined
      });

      console.log('✅ OKX 基差计划完成:', { symbol: plan.symbol, qty: Number(quantity.toFixed(6)) });
      return { ok: true, spotRes, perpRes };
    } catch (error) {
      console.error('❌ 执行 OKX 基差计划失败:', error.message);
      return { ok: false, error: error.message };
    }
  }

  // === 风控与闭环 ===
  // 获取 OKX 现货资产余额（返回基础币余额，如 BTC 数量）
  async getOkxSpotBalanceForSymbol(symbol) {
    const base = symbol.split('-')[0];
    const data = await this.okx.getBalance();
    try {
      const details = (data && data[0] && data[0].details) ? data[0].details : [];
      const item = details.find(d => d.ccy === base);
      const avail = item ? parseFloat(item.availBal || item.cashBal || '0') : 0;
      return { base, avail };
    } catch {
      return { base, avail: 0 };
    }
  }

  // 关闭 OKX 现货腿：卖出基础币数量
  async closeOkxSpotLeg(symbol, quantity) {
    if (!quantity || quantity <= 0) return { skipped: true };
    return this.placeOkxSpotMarket(symbol, 'sell', { quantity });
  }

  // 获取 OKX 永续仓位
  async getOkxPerpPositions(symbol) {
    const instId = `${symbol}-SWAP`;
    return this.okx.getSwapPositions(instId);
  }

  // 关闭 OKX 永续腿：按张数买入/卖出以对冲至 0（默认关闭空头：买入）
  async closeOkxPerpLeg(symbol) {
    const positions = await this.getOkxPerpPositions(symbol);
    const instId = `${symbol}-SWAP`;
    const pos = positions.find(p => p.instId === instId && Math.abs(p.pos) > 0);
    if (!pos) return { skipped: true };
    const side = (pos.posSide === 'short') ? 'buy' : 'sell';
    const res = await this.placeOkxPerpMarketByContracts(symbol, side, Math.abs(pos.pos));
    return res;
  }

  // 根据资金费风险，判断是否需要在下一个资金费之前平掉永续腿
  async maybeCloseOkxPerpBeforeFunding(symbol, minutesBefore = 5) {
    const fr = await this.okx.getFundingRate(symbol);
    if (!fr) return { skipped: true };
    const now = Date.now();
    const timeToFundingMin = (fr.nextFundingTime - now) / 60000;
    const positions = await this.getOkxPerpPositions(symbol);
    const instId = `${symbol}-SWAP`;
    const pos = positions.find(p => p.instId === instId && Math.abs(p.pos) > 0);
    if (!pos) return { skipped: true };

    // 规则：若当前持空（需要支付正资金费）且临近资金费，提前平仓
    const isShort = (pos.posSide === 'short' || pos.pos > 0);
    const willPay = isShort && fr.fundingRate > 0;
    if (willPay && timeToFundingMin <= minutesBefore) {
      // 平掉永续腿
      const res = await this.closeOkxPerpLeg(symbol);
      return { closed: true, res };
    }
    return { skipped: true };
  }

  // 一键闭环：同时关闭现货与永续（先永续，再现货）
  async closeOkxBasisPosition(symbol) {
    try {
      // 先平永续，避免敞口扩大
      await this.closeOkxPerpLeg(symbol);

      // 再卖出现货余额
      const bal = await this.getOkxSpotBalanceForSymbol(symbol);
      if (bal.avail > 0) {
        await this.closeOkxSpotLeg(symbol, bal.avail);
      }
      console.log(`✅ 已闭环 ${symbol} 基差仓位`);
      return { ok: true };
    } catch (error) {
      console.error('❌ 闭环失败:', error.message);
      return { ok: false, error: error.message };
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