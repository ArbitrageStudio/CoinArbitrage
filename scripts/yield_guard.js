require('dotenv').config();

const TradeExecutor = require('../src/utils/execution');
const OKXApi = require('../src/api/okx');
const OkxBasisArbitrage = require('../src/utils/intra_exchange_arbitrage');
const SlippageCalculator = require('../src/utils/slippage');

function aprFromNetPct(netPct, holdHours) {
  const periods = (365 * 24) / holdHours;
  return netPct * periods;
}

async function detectLegs(executor, symbol) {
  const bal = await executor.getOkxSpotBalanceForSymbol(symbol);
  const positions = await executor.getOkxPerpPositions(symbol);
  const instId = `${symbol}-SWAP`;
  const perp = positions.find(p => p.instId === instId && Math.abs(p.pos) > 0);
  const haveSpot = bal.avail > 0.0000001;
  const haveShort = !!perp && perp.posSide === 'short';
  return { haveSpot, haveShort, bal, perp };
}

async function getPerpBaseQty(okx, symbol, perp) {
  if (!perp) return 0;
  const info = await okx.getSwapInstrument(`${symbol}-SWAP`);
  const ctVal = info.ctVal || 1;
  return Math.abs(perp.pos) * ctVal;
}

async function main() {
  const symbolsEnv = process.env.ARBITRAGE_SYMBOLS || 'BTC-USDT,ETH-USDT,SOL-USDT';
  const symbols = symbolsEnv.split(',').map(s => s.trim()).filter(Boolean);
  const holdHoursDefault = parseFloat(process.env.BASIS_HOLD_HOURS || '8');
  const targetAprMin = parseFloat(process.env.TARGET_APR_MIN || '10');
  const exitAprMin = parseFloat(process.env.EXIT_APR_MIN || '2');
  const stopLossPct = parseFloat(process.env.STOP_LOSS_PCT || '0');
  const takeProfitPct = parseFloat(process.env.TAKE_PROFIT_PCT || '0');
  const intervalMs = parseInt(process.env.MANAGER_CHECK_INTERVAL_MS || '60000');
  const runMs = parseInt(process.env.MANAGER_RUN_MS || '0');
  const maxSlippage = parseFloat(process.env.MAX_SLIPPAGE_PCT || '0.5');

  const executor = new TradeExecutor();
  const okx = new OKXApi(
    process.env.OKX_API_KEY,
    process.env.OKX_SECRET_KEY,
    process.env.OKX_PASSPHRASE,
    process.env.OKX_SANDBOX === 'true'
  );
  const planner = new OkxBasisArbitrage();

  async function tick() {
    for (const sym of symbols) {
      try {
        const { haveSpot, haveShort, bal, perp } = await detectLegs(executor, sym);
        const spotTicker = await okx.getTicker(sym);
        const perpTicker = await okx.getFuturesTicker(sym);
        const spotPrice = spotTicker.price;
        const perpPrice = perpTicker.price;
        const plans = await planner.analyzeSymbols([sym], holdHoursDefault);
        const plan = plans && plans[0];
        const apr = aprFromNetPct(plan.netProfitPercentage, holdHoursDefault);

        if (haveSpot && haveShort) {
          const fr = await okx.getFundingRate(sym);
          if (fr) {
            const minutesBefore = parseInt(process.env.FUNDING_CLOSE_BEFORE_MINUTES || '5');
            const now = Date.now();
            const timeToFundingMin = (fr.nextFundingTime - now) / 60000;
            const willPay = fr.fundingRate > 0;
            if (willPay && timeToFundingMin <= minutesBefore) {
              await executor.closeOkxPerpLeg(sym);
            }
          }

          const pnl = await (async () => {
            const gross = (perpPrice - spotPrice) * bal.avail;
            const notional = spotPrice * bal.avail;
            const netPct = notional > 0 ? (gross / notional) * 100 : 0;
            return netPct;
          })();

          if (stopLossPct > 0 && pnl <= -Math.abs(stopLossPct)) {
            await executor.closeOkxBasisPosition(sym);
            continue;
          }
          if (takeProfitPct > 0 && pnl >= Math.abs(takeProfitPct)) {
            await executor.closeOkxBasisPosition(sym);
            continue;
          }
          if (apr < exitAprMin) {
            await executor.closeOkxBasisPosition(sym);
            continue;
          }
          continue;
        }

        if (!haveSpot && !haveShort) {
          if (plan && plan.feasible && apr >= targetAprMin) {
            const okxOptions = { apiKey: okx.apiKey, secretKey: okx.secretKey, passphrase: okx.passphrase, sandbox: okx.sandbox };
            const quantity = Number(plan.quantity || (executor.orderUsdtSize / plan.spotPrice));
            const ok = await SlippageCalculator.isOkxBasisSlippageAcceptable(sym, quantity, 'buy', 'sell', maxSlippage, okxOptions);
            if (!ok) continue;
            if (!executor.enableAutoTrade) continue;
            if (executor.dryRun) {
              console.log('DRY-RUN', { symbol: sym, action: 'open_both', apr: Number(apr.toFixed(2)) });
            } else {
              await executor.executeOkxBasisPlan(plan);
            }
          }
          continue;
        }

        if (haveSpot && !haveShort) {
          const qty = bal.avail;
          const netPct = plan.netProfitPercentage;
          const apr2 = aprFromNetPct(netPct, holdHoursDefault);
          if (apr2 < targetAprMin || netPct <= 0) continue;
          const okxOptions = { apiKey: okx.apiKey, secretKey: okx.secretKey, passphrase: okx.passphrase, sandbox: okx.sandbox };
          const slip = await SlippageCalculator.calculateOkxPerpSellSlippage(sym, qty, okxOptions);
          if (slip.slippage > maxSlippage || !slip.feasible) continue;
          if (!executor.enableAutoTrade) continue;
          if (executor.dryRun) {
            console.log('DRY-RUN', { symbol: sym, action: 'open_perp_only', qty: Number(qty.toFixed(6)), apr: Number(apr2.toFixed(2)) });
          } else {
            await executor.placeOkxPerpMarket(sym, 'sell', { quantity: qty });
          }
          continue;
        }

        if (!haveSpot && haveShort) {
          const qty = await getPerpBaseQty(okx, sym, perp);
          const netPct = plan.netProfitPercentage;
          const apr2 = aprFromNetPct(netPct, holdHoursDefault);
          if (apr2 < targetAprMin || netPct <= 0) continue;
          const okxOptions = { apiKey: okx.apiKey, secretKey: okx.secretKey, passphrase: okx.passphrase, sandbox: okx.sandbox };
          const slip = await SlippageCalculator.calculateOkxSpotBuySlippage(sym, qty, okxOptions);
          if (slip.slippage > maxSlippage || !slip.feasible) continue;
          if (!executor.enableAutoTrade) continue;
          const usdtAmount = qty * spotPrice;
          if (executor.dryRun) {
            console.log('DRY-RUN', { symbol: sym, action: 'open_spot_only', qty: Number(qty.toFixed(6)), apr: Number(apr2.toFixed(2)) });
          } else {
            await executor.placeOkxSpotMarket(sym, 'buy', { usdtAmount, quantity: qty });
          }
          continue;
        }
      } catch (err) {
        console.error('Error', sym, err.message);
      }
    }
  }

  await tick();
  const timer = setInterval(tick, intervalMs);
  if (runMs > 0) {
    setTimeout(() => { clearInterval(timer); console.log('Done'); }, runMs);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal', err);
    process.exit(1);
  });
}

