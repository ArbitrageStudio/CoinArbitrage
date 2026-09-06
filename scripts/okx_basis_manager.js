require('dotenv').config();

const path = require('path');
const TradeExecutor = require('../src/utils/execution');
const OKXApi = require('../src/api/okx');
const OkxBasisArbitrage = require('../src/utils/intra_exchange_arbitrage');
const { loadJsonState, saveJsonState } = require('../src/utils/stateStore');

const STATE_FILE = path.join(process.cwd(), '.basis_state.json');

async function detectOpenBasis(executor, okx, symbol) {
  // 基准：现货余额>0 且 永续有空头持仓
  const bal = await executor.getOkxSpotBalanceForSymbol(symbol);
  const positions = await executor.getOkxPerpPositions(symbol);
  const instId = `${symbol}-SWAP`;
  const perp = positions.find(p => p.instId === instId && Math.abs(p.pos) > 0);
  const open = (bal.avail > 0.0000001) && !!perp && (perp.posSide === 'short');
  return { open, bal, perp };
}

async function estimatePnL(okx, symbol, balQty, perpPos) {
  // 粗略估算净值：按当前现货价与永续价、忽略费用（或用固定费率估算）
  const spotTicker = await okx.getTicker(symbol);
  const perpTicker = await okx.getFuturesTicker(symbol);
  const spotPrice = spotTicker.price;
  const perpPrice = perpTicker.price;
  const gross = (perpPrice - spotPrice) * balQty; // 买现货+卖永续
  const notional = spotPrice * balQty;
  const netPct = (gross / notional) * 100;
  return { spotPrice, perpPrice, grossProfit: gross, netProfitPercentage: netPct };
}

async function main() {
  const symbolsEnv = process.env.ARBITRAGE_SYMBOLS || 'BTC-USDT,ETH-USDT';
  const symbols = symbolsEnv.split(',').map(s => s.trim()).filter(Boolean);
  const holdHoursDefault = parseFloat(process.env.BASIS_HOLD_HOURS || '8');
  const stopLossPct = parseFloat(process.env.BASIS_STOP_LOSS_PCT || '0'); // 允许 0 表示禁用
  const takeProfitPct = parseFloat(process.env.BASIS_TAKE_PROFIT_PCT || '0');
  const intervalMs = parseInt(process.env.MANAGER_CHECK_INTERVAL_MS || '60000');
  const runMs = parseInt(process.env.MANAGER_RUN_MS || '0'); // 0 表示持续运行

  const executor = new TradeExecutor();
  const okx = new OKXApi(
    process.env.OKX_API_KEY,
    process.env.OKX_SECRET_KEY,
    process.env.OKX_PASSPHRASE,
    process.env.OKX_SANDBOX === 'true'
  );

  const connected = await okx.testConnection();
  console.log('OKX Connection Test:', connected ? 'Success' : 'Failed');

  const planner = new OkxBasisArbitrage();

  const state = loadJsonState(STATE_FILE);

  async function tick() {
    for (const sym of symbols) {
      try {
        const { open, bal, perp } = await detectOpenBasis(executor, okx, sym);
        if (!open) {
          // 尝试自动开仓：当计划可行且启用自动交易
          try {
            const plans = await planner.analyzeSymbols([sym], holdHoursDefault);
            const plan = plans && plans[0];
            if (plan && plan.feasible) {
              const res = await executor.executeOkxBasisPlan(plan);
              if (res && res.ok) {
                console.log(`📥 ${sym} 自动开仓完成，记录持仓开始时间`);
                state[sym] = { startAt: Date.now(), holdHours: holdHoursDefault };
              } else if (res && res.dryRun) {
                console.log(`🧪 ${sym} [DRY-RUN] 计划可行，将在实盘模式开仓`);
              }
            }
          } catch (e) {
            // 计划或下单失败则忽略本轮
          }
          // 无仓位则继续下一个交易对
          continue;
        }

        // 初始化或读取持仓记录
        if (!state[sym]) {
          state[sym] = { startAt: Date.now(), holdHours: holdHoursDefault };
        }
        const rec = state[sym];

        // 资金费窗口风控（提前平掉永续腿）
        const fr = await okx.getFundingRate(sym);
        if (fr) {
          const minutesBefore = parseInt(process.env.FUNDING_CLOSE_BEFORE_MINUTES || '5');
          const now = Date.now();
          const timeToFundingMin = (fr.nextFundingTime - now) / 60000;
          const willPay = (perp.posSide === 'short') && (fr.fundingRate > 0);
          if (willPay && timeToFundingMin <= minutesBefore) {
            console.log(`🛡️ ${sym} 资金费前平永续：${timeToFundingMin.toFixed(1)} 分钟`);
            await executor.closeOkxPerpLeg(sym);
          }
        }

        // 达到持有时长，闭环两腿
        const elapsedMs = Date.now() - rec.startAt;
        const needCloseByTime = elapsedMs >= rec.holdHours * 3600000;
        if (needCloseByTime) {
          console.log(`⏱️ ${sym} 达到持有时长 ${rec.holdHours}h，执行闭环`);
          await executor.closeOkxBasisPosition(sym);
          delete state[sym];
          continue;
        }

        // 止损/止盈
        if (stopLossPct > 0 || takeProfitPct > 0) {
          const pnl = await estimatePnL(okx, sym, bal.avail, perp);
          if (stopLossPct > 0 && pnl.netProfitPercentage <= -Math.abs(stopLossPct)) {
            console.log(`⛔ ${sym} 触发止损 ${pnl.netProfitPercentage.toFixed(3)}%（阈值 ${-Math.abs(stopLossPct)}%）`);
            await executor.closeOkxBasisPosition(sym);
            delete state[sym];
            continue;
          }
          if (takeProfitPct > 0 && pnl.netProfitPercentage >= Math.abs(takeProfitPct)) {
            console.log(`✅ ${sym} 触发止盈 ${pnl.netProfitPercentage.toFixed(3)}%（阈值 ${Math.abs(takeProfitPct)}%）`);
            await executor.closeOkxBasisPosition(sym);
            delete state[sym];
            continue;
          }
        }

      } catch (err) {
        console.error(`❌ 管理 ${sym} 失败:`, err.message);
      } finally {
        saveJsonState(STATE_FILE, state);
      }
    }
  }

  await tick();
  const timer = setInterval(tick, intervalMs);
  if (runMs > 0) {
    setTimeout(() => { clearInterval(timer); console.log('⏹️ 经理运行结束'); }, runMs);
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}