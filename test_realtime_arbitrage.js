require('dotenv').config();
const RealtimeArbitrageDetector = require('./src/utils/realtime_arbitrage');

async function testRealtimeArbitrage() {
  console.log('🚀 测试实时套利检测（包含Binance、OKX、Hyperliquid）...\n');
  
  const detector = new RealtimeArbitrageDetector();
  const symbols = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];
  
  try {
    // 启动实时检测
    console.log('🔍 启动实时套利检测...');
    await detector.startRealTimeDetection(symbols);
    
    console.log('✅ 实时检测已启动');
    console.log('📊 等待10秒检测套利机会...\n');
    
    // 等待10秒检测套利机会
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    console.log('\n✅ 实时套利检测测试完成');
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    // 停止检测
    console.log('\n⏹️ 停止实时检测...');
    detector.stop();
    console.log('✅ 实时检测已停止');
  }
}

// 运行测试
if (require.main === module) {
  testRealtimeArbitrage();
}