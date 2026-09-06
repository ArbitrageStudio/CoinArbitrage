require('dotenv').config();
const OkxBasisArbitrage = require('../src/utils/intra_exchange_arbitrage');
const arbitrageConfig = require('../src/config/arbitrageConfig');

async function main() {
  console.log('🧪 OKX 现货-永续基差套利 干跑验证启动');
  const symbols = arbitrageConfig.getSymbols();
  const holdHours = parseFloat(process.env.BASIS_HOLD_HOURS || '8');

  const analyzer = new OkxBasisArbitrage();
  const plans = await analyzer.analyzeSymbols(symbols, holdHours);
  console.log('🚀', plans);

  const feasiblePlans = plans.filter(p => p.feasible);
  const infeasiblePlans = plans.filter(p => !p.feasible);

  console.log(`📈 检测完成：可行 ${feasiblePlans.length} / 总计 ${plans.length}`);

  for (const plan of feasiblePlans) {
    console.log('✅ 可行计划:', {
      symbol: plan.symbol,
      basisPct: Number(plan.basisPercentage).toFixed(4) + '%',
      netProfitPct: Number(plan.netProfitPercentage).toFixed(4) + '%',
      netProfit: Number(plan.netProfit).toFixed(4),
      holdHours: plan.holdHours,
      quantity: Number(plan.quantity).toFixed(6),
      legs: plan.legs
    });
  }

  if (infeasiblePlans.length) {
    console.log('⚠️ 不可行计划（仅供参考）:');
    for (const plan of infeasiblePlans) {
      if (plan.error) {
        console.log('❌ 错误:', plan.symbol, plan.error);
      } else {
        console.log('🚫', plan.symbol, {
          basisPct: Number(plan.basisPercentage).toFixed(4) + '%',
          netProfitPct: Number(plan.netProfitPercentage).toFixed(4) + '%',
          netProfit: Number(plan.netProfit).toFixed(4),
          holdHours: plan.holdHours
        });
      }
    }
  }

  console.log('🧪 干跑结束。未进行任何真实下单。');
}

main().catch(err => {
  console.error('干跑失败：', err);
  process.exit(1);
});