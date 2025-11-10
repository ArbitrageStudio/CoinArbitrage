const OkxApi = require('../api/okx');
const arbitrageConfig = require('../config/arbitrageConfig');

// 简化费用估算，可在 .env 中覆盖
const SPOT_FEE_RATE = parseFloat(process.env.OKX_SPOT_FEE || '0.001'); // 0.1%
const PERP_FEE_RATE = parseFloat(process.env.OKX_PERP_FEE || '0.0005'); // 0.05%
const MIN_PROFIT_PCT = parseFloat(process.env.BASIS_MIN_PROFIT || process.env.AUTO_TRADE_MIN_PROFIT || '0.2');
const ORDER_USDT_SIZE = parseFloat(process.env.ORDER_USDT_SIZE || '50');

class OkxBasisArbitrage {
  constructor() {
    this.okx = new OkxApi(
      process.env.OKX_API_KEY,
      process.env.OKX_SECRET_KEY,
      process.env.OKX_PASSPHRASE,
      process.env.OKX_SANDBOX === 'true'
    );
    this.config = arbitrageConfig;
  }

  // 现货与永续的标准化 symbol 转换
  normalizeSymbol(symbol) {
    // 输入统一为 OKX 格式，例如 BTC-USDT
    return symbol.toUpperCase();
  }

  async fetchSpotAndPerp(symbol) {
    const normalized = this.normalizeSymbol(symbol);
    const [spot, perp, funding] = await Promise.all([
      this.okx.getTicker(normalized),
      this.okx.getFuturesTicker(normalized),
      this.okx.getFundingRate(normalized)
    ]);
    // console.log(spot, perp, funding);
    const spotPrice = spot?.price || parseFloat(spot?.lastTradedPrice || spot?.price || 0);
    const perpPrice = perp?.price || parseFloat(perp?.lastTradedPrice || perp?.price || 0);
    const fundingRate = parseFloat(funding?.fundingRate || 0); // 单次 8 小时资金费率
    // console.log(spotPrice, perpPrice, fundingRate);
    return { spotPrice: Number(spotPrice), perpPrice: Number(perpPrice), fundingRate };
  }

  computeBasis(spotPrice, perpPrice) {
    if (!spotPrice || !perpPrice) return null;
    const basisPct = ((perpPrice - spotPrice) / spotPrice) * 100;
    return basisPct;
  }

  estimateFundingCost(fundingRate, holdHours) {
    // fundingRate 为每 8 小时的费率，线性估算
    const periods = holdHours / 8;
    return fundingRate * periods; // 比例，乘以名义金额得到成本
  }

  estimateFees(notional) {
    const buySpotFee = notional * SPOT_FEE_RATE;
    const sellPerpFee = notional * PERP_FEE_RATE;
    return buySpotFee + sellPerpFee;
  }

  buildPlan(symbol, spotPrice, perpPrice, basisPct, fundingRate, holdHours) {
    const notional = ORDER_USDT_SIZE;
    const quantity = notional / spotPrice;
    const fundingCost = notional * this.estimateFundingCost(fundingRate, holdHours);
    const fees = this.estimateFees(notional);
    const gross = (perpPrice - spotPrice) * quantity; // 基差收益（买现货、做空永续）
    const net = gross - fundingCost - fees;
    const netPct = (net / notional) * 100;

    return {
      strategy: 'okx_spot_perp_basis',
      symbol,
      spotPrice,
      perpPrice,
      basisPercentage: basisPct,
      fundingRate,
      holdHours,
      notional,
      quantity,
      fees,
      fundingCost,
      grossProfit: gross,
      netProfit: net,
      netProfitPercentage: netPct,
      legs: [
        { side: 'buy', market: 'spot', exchange: 'okx', symbol, price: spotPrice, quantity },
        { side: 'sell', market: 'perpetual', exchange: 'okx', symbol, price: perpPrice, quantity }
      ],
      feasible: netPct >= MIN_PROFIT_PCT && net > 0
    };
  }

  async analyzeSymbols(symbol, holdHours = parseFloat(process.env.BASIS_HOLD_HOURS || '8')) {
    const results = [];
    // for (const symbol of symbols) {
      try {
        const { spotPrice, perpPrice, fundingRate } = await this.fetchSpotAndPerp(symbol);
        const basisPct = this.computeBasis(spotPrice, perpPrice);
        const plan = this.buildPlan(symbol, spotPrice, perpPrice, basisPct, fundingRate, holdHours);
        results.push(plan);
      } catch (err) {
        results.push({ strategy: 'okx_spot_perp_basis', symbol, error: err.message });
      }
    // }
    return results;
  }
}

module.exports = OkxBasisArbitrage;