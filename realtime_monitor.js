require('dotenv').config();
const RealtimeArbitrageDetector = require('./src/utils/realtime_arbitrage');

class RealTimeMonitor {
  constructor() {
    this.detector = new RealtimeArbitrageDetector();
    this.isRunning = false;
    this.stopFunction = null;
  }

  // 启动实时监控
  async start() {
    if (this.isRunning) {
      console.log('⚠️  实时监控已经在运行中');
      return;
    }

    console.log('🌐 启动加密货币实时套利监控...');
    console.log('📊 监控交易对:', this.detector.symbols.join(', '));
    console.log('⚡ 检测频率: 毫秒级 (WebSocket实时数据)');
    console.log('💡 最小利润阈值: 0.3%');
    console.log('⏰ 程序启动时间:', new Date().toLocaleString('zh-CN'));
    console.log('🔄 检查间隔:', process.env.CHECK_INTERVAL || '2000', '毫秒');
    console.log('📈 价格缓存时间:', process.env.PRICE_CACHE_TTL || '5000', '毫秒');
    console.log('='.repeat(60));

    try {
      // 使用配置文件中定义的交易对，而不是硬编码列表
      this.stopFunction = await this.detector.startRealTimeDetection();

      this.isRunning = true;
      
      // 设置优雅退出
      process.on('SIGINT', () => {
        console.log('\n🛑 接收到停止信号，正在关闭实时监控...');
        this.stop();
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        console.log('\n🛑 接收到终止信号，正在关闭实时监控...');
        this.stop();
        process.exit(0);
      });

      console.log('✅ 实时监控已成功启动');
      console.log('💡 按 Ctrl+C 停止监控');

    } catch (error) {
      console.error('❌ 启动实时监控失败:', error.message);
      this.isRunning = false;
    }
  }

  // 停止监控
  stop() {
    if (this.isRunning && this.stopFunction) {
      this.stopFunction();
      this.isRunning = false;
      console.log('✅ 实时监控已停止');
    } else {
      console.log('⚠️  实时监控未在运行');
    }
  }

  // 获取当前状态
  getStatus() {
    return {
      isRunning: this.isRunning,
      startTime: this.startTime,
      opportunities: this.detector.getAllOpportunities()
    };
  }

  // 设置利润阈值
  setProfitThreshold(threshold) {
    this.detector.setMinProfitThreshold(threshold);
    console.log(`✅ 最小利润阈值已设置为: ${threshold}%`);
  }
}

// 命令行界面
if (require.main === module) {
  const monitor = new RealTimeMonitor();
  
  // 解析命令行参数
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log('🚀 加密货币实时套利监控工具');
    console.log('使用方法:');
    console.log('  node realtime_monitor.js         启动实时监控');
    console.log('  node realtime_monitor.js --stop  停止监控');
    console.log('  node realtime_monitor.js --status 查看状态');
    console.log('  node realtime_monitor.js --set-threshold=0.5 设置利润阈值');
    process.exit(0);
  }

  if (args.includes('--stop')) {
    monitor.stop();
    process.exit(0);
  }

  if (args.includes('--status')) {
    const status = monitor.getStatus();
    console.log('📊 监控状态:', status.isRunning ? '运行中' : '已停止');
    if (status.opportunities && status.opportunities.length > 0) {
      console.log('💰 当前机会:', status.opportunities.length);
      status.opportunities.slice(0, 3).forEach(opp => {
        console.log(`   ${opp.symbol}: ${opp.netProfitPercentage.toFixed(2)}%`);
      });
    }
    process.exit(0);
  }

  const thresholdArg = args.find(arg => arg.startsWith('--set-threshold='));
  if (thresholdArg) {
    const threshold = parseFloat(thresholdArg.split('=')[1]);
    if (!isNaN(threshold)) {
      monitor.setProfitThreshold(threshold);
    }
  }

  // 启动监控
  monitor.start();
}

module.exports = RealTimeMonitor;