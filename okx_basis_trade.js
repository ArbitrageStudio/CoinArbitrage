require('dotenv').config();

const OkxBasisArbitrage = require('./src/utils/intra_exchange_arbitrage');
const TradeExecutor = require('./src/utils/execution');

async function main() {
  const symbolsEnv = process.env.ARBITRAGE_SYMBOLS || 'BTC-USDT,ETH-USDT';
  const symbols = symbolsEnv.split(',').map(s => s.trim()).filter(Boolean);
  const holdHours = parseFloat(process.env.BASIS_HOLD_HOURS || '8');

  const arbitrage = new OkxBasisArbitrage();
  const executor = new TradeExecutor();

  for (const sym of symbols) {
    try {
      const plan = await arbitrage.analyzeSymbol(sym, { holdHours });
      if (!plan) {
        console.log(`⚠️ ${sym} 未生成计划`);
        continue;
      }

      console.log(`📋 计划(${sym}): 净利 ${plan.netProfitPercentage.toFixed(3)}% / ${plan.netProfit.toFixed(4)} USDT`);
      if (!plan.feasible) {
        console.log(`❎ ${sym} 计划不可行（净利不足阈值或为负）`);
        continue;
      }

      const dryRun = (process.env.AUTO_TRADE_DRY_RUN || 'true') === 'true';
      const sandbox = (process.env.OKX_SANDBOX || 'false') === 'true';
      if (!sandbox) {
        console.log('⚠️ 未启用 OKX_SANDBOX=true，出于安全不执行真单。');
        continue;
      }

      if (dryRun) {
        console.log('🧪 [DRY-RUN] 将执行 OKX 基差计划（沙盒）');
        console.log(JSON.stringify(plan, null, 2));
        continue;
      }

      const res = await executor.executeOkxBasisPlan(plan);
      if (res.ok) {
        console.log(`✅ ${sym} 沙盒真单下单完成`);
      } else {
        console.log(`❌ ${sym} 下单失败: ${res.error}`);
      }
    } catch (err) {
      console.error(`❌ ${sym} 处理失败:`, err.message);
    }
  }
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}