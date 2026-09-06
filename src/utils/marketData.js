// 跨所行情获取与交易对格式归一化的共享工具

const OKXApi = require('../api/okx');
const BinanceApi = require('../api/binance');
const HyperliquidApi = require('../api/hyperliquid');

// 创建三大交易所的 API 客户端（从环境变量读取凭据）
function createExchangeClients() {
  return {
    okx: new OKXApi(
      process.env.OKX_API_KEY,
      process.env.OKX_SECRET_KEY,
      process.env.OKX_PASSPHRASE,
      process.env.OKX_SANDBOX === 'true'
    ),
    binance: new BinanceApi(
      process.env.BINANCE_API_KEY,
      process.env.BINANCE_SECRET_KEY,
      process.env.BINANCE_TESTNET === 'true'
    ),
    hyperliquid: new HyperliquidApi(
      process.env.HYPERLIQUID_API_KEY,
      process.env.HYPERLIQUID_SECRET_KEY
    )
  };
}

// 将 Binance 的 BTCUSDT 格式归一化为 BTC-USDT
function normalizeBinanceTickers(tickers) {
  return (tickers || []).map(ticker => ({
    ...ticker,
    symbol: String(ticker.symbol).replace(/USDT$/, '-USDT')
  }));
}

// 并行获取三所现货 ticker，并归一化 Binance symbol
async function fetchTickers(symbols, clients = createExchangeClients()) {
  const binanceSymbols = symbols.map(symbol => symbol.replace('-', ''));
  const [okxTickers, binanceRawTickers, hyperliquidTickers] = await Promise.all([
    clients.okx.getMultipleTickers(symbols),
    clients.binance.getMultipleTickers(binanceSymbols),
    clients.hyperliquid.getMultipleTickers(symbols)
  ]);

  return {
    okxTickers,
    binanceTickers: normalizeBinanceTickers(binanceRawTickers),
    hyperliquidTickers
  };
}

module.exports = {
  createExchangeClients,
  normalizeBinanceTickers,
  fetchTickers
};
