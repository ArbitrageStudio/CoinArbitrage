# 📖 加密货币套利系统 - 使用指南

## 🚀 快速开始

### 1. 环境准备
```bash
# 安装依赖
npm install

# 复制环境变量文件
cp .env.example .env
```

### 2. 配置环境变量
编辑 `.env` 文件：
```env
# 监控的交易对（逗号分隔）
ARBITRAGE_SYMBOLS="BTC-USDT,ETH-USDT,SOL-USDT"

# 最小利润阈值（百分比）
MIN_PROFIT_THRESHOLD=0.1

# 交易所配置（true/false）
BINANCE_ENABLED=true
OKX_ENABLED=true  
HYPERLIQUID_ENABLED=true
```

### 3. 启动实时监控
```bash
# 启动实时套利监控
node realtime_monitor.js

# 或者使用npm脚本
npm run monitor
```

## ⚙️ 配置说明

### 核心配置文件
主要配置在 `src/config/arbitrageConfig.js`：

```javascript
// 默认监控交易对
const DEFAULT_SYMBOLS = ['BTC-USDT', 'ETH-USDT', 'SOL-USDT'];

// 最小利润阈值（0.1%）
const DEFAULT_MIN_PROFIT_THRESHOLD = 0.1;

// 实时检测配置
const REALTIME_CONFIG = {
  checkInterval: 2000,        // 检查间隔2秒
  priceCacheTTL: 10000,      // 价格缓存10秒
  maxOpportunityAge: 30000    // 机会有效期30秒
};
```

### 环境变量优先级
系统按以下优先级读取配置：
1. **环境变量** (最高优先级)
2. **配置文件默认值**
3. **代码硬编码值**

## 📊 监控功能

### 实时监控命令
```bash
# 基本监控
node realtime_monitor.js

# 指定交易对监控
ARBITRAGE_SYMBOLS="BTC-USDT,ETH-USDT" node realtime_monitor.js

# 自定义利润阈值  
MIN_PROFIT_THRESHOLD=0.2 node realtime_monitor.js
```

### 监控输出示例
```
🌐 启动加密货币实时套利监控...
📊 监控交易对: BTC-USDT, ETH-USDT, SOL-USDT
⚡ 检测频率: 毫秒级 (WebSocket实时数据)
💡 最小利润阈值: 0.3%
⏰ 开始时间: 2025/10/31 下午3:18:12
============================================================
🚀 启动实时套利检测...
🌐 连接Binance WebSocket...
✅ binance WebSocket连接成功
🌐 连接OKX WebSocket...
✅ okx WebSocket连接成功
🌐 连接Hyperliquid WebSocket...
✅ hyperliquid WebSocket连接成功
```

## 🎯 套利机会通知

### 机会显示格式
```
🎯 发现套利机会！
📈 利润: 0.45%
🔄 路径: Binance → OKX
💰 交易对: BTC-USDT
🕒 时间: 2025-01-31 15:20:30
📊 买价: $42,100.50 (Binance)
📊 卖价: $42,290.25 (OKX)
💸 价差: $189.75
```

### 高利润机会
当利润超过0.5%时显示为：
```
🚀 高利润套利机会！
📈 利润: 0.78%
🔄 路径: Hyperliquid → Binance
💰 交易对: ETH-USDT
⚠️ 注意: 需要快速执行！
```

## 🔧 高级配置

### 自定义交易对
在 `.env` 文件中添加：
```env
ARBITRAGE_SYMBOLS="BTC-USDT,ETH-USDT,XRP-USDT,LTC-USDT,ADA-USDT"
```

### 调整检测频率
修改 `src/config/arbitrageConfig.js`：
```javascript
const REALTIME_CONFIG = {
  checkInterval: 1000,        // 降低到1秒（更频繁）
  priceCacheTTL: 5000,       // 缓存5秒
  maxOpportunityAge: 15000   // 机会有效期15秒
};
```

### 禁用特定交易所
在 `.env` 文件中设置：
```env
# 禁用OKX交易所
OKX_ENABLED=false

# 只使用Binance
BINANCE_ENABLED=true
OKX_ENABLED=false
HYPERLIQUID_ENABLED=false
```

## 🤖 自动下单（可选）

默认不开启自动下单，开启方式如下：

1) 在 `.env` 中开启并设置参数：
```env
ENABLE_AUTO_TRADE=true          # 开启自动下单
AUTO_TRADE_DRY_RUN=true         # 干跑模式，仅打印不下单（建议先开启）
ORDER_USDT_SIZE=50              # 每次交易使用的USDT金额
AUTO_TRADE_MIN_PROFIT=0.5       # 仅当机会利润超过该阈值才下单
AUTO_TRADE_COOLDOWN_MS=15000    # 同一交易对下单冷却时间，毫秒
```

2) 确保已正确配置交易所密钥且具备交易权限：
- `BINANCE_API_KEY`, `BINANCE_SECRET_KEY`
- `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE`

3) 启动实时监控后，系统在检测到满足阈值的机会时将：
- 在买方交易所以市价按 USDT 金额买入（Binance 支持 `quoteOrderQty`，OKX 使用 `tgtCcy=quote_ccy`）。
- 在卖方交易所以市价按买入数量卖出。
- 冷却时间内对同一交易对不重复下单。

4) 风险与注意事项：
- 市价单可能产生滑点和手续费误差，建议从 `AUTO_TRADE_DRY_RUN=true` 验证流程开始。
- Binance 的卖出市价单需要指定 `quantity`；若精度或 LOT_SIZE 不匹配可能报错。
- OKX 现货市价买入按 USDT 金额下单需 `tdMode=cash` 且 `tgtCcy=quote_ccy`。
- Hyperliquid 的自动交易暂未集成，当前仅用于价格与机会检测。

## 🛠️ 故障排除

### 常见问题

#### 1. WebSocket连接失败
```bash
# 检查网络连接
ping api.binance.com

# 检查防火墙设置
sudo ufw status
```

#### 2. API限制错误
```
Hyperliquid getTicker error: Request failed with status code 429
```

**解决方案：**
- 增加检查间隔时间
- 减少监控交易对数量
- 启用价格缓存

#### 3. 价格数据不同步
```
# 检查系统时间同步
sudo ntpdate pool.ntp.org
```

### 日志调试
```bash
# 启用详细日志
DEBUG=* node realtime_monitor.js

# 仅显示错误日志  
DEBUG=error node realtime_monitor.js
```

## 📈 性能优化建议

### 对于低配置服务器
```javascript
// 减少监控交易对
ARBITRAGE_SYMBOLS="BTC-USDT,ETH-USDT"

// 增加检查间隔  
checkInterval: 3000

// 禁用非必要交易所
HYPERLIQUID_ENABLED=false
```

### 对于高频率交易
```javascript
// 增加监控交易对
ARBITRAGE_SYMBOLS="BTC-USDT,ETH-USDT,SOL-USDT,ADA-USDT,XRP-USDT"

// 减少检查间隔
checkInterval: 500

// 缩短缓存时间
priceCacheTTL: 2000
```

## 🔄 系统维护

### 定期检查
```bash
# 检查依赖更新
npm outdated

# 更新依赖
npm update

# 安全检查  
npm audit
```

### 监控系统状态
```bash
# 查看系统资源使用
htop

# 监控网络连接
netstat -tulpn

# 检查日志文件
tail -f logs/arbitrage.log
```

## 🚨 重要注意事项

1. **风险提示**: 套利交易存在风险，实际执行时需考虑滑点和手续费
2. **API限制**: 遵守各交易所的API调用频率限制
3. **网络延迟**: 跨交易所套利对网络延迟敏感
4. **资金安全**: 建议使用小资金测试后再扩大规模
5. **法律合规**: 确保所在地区加密货币交易合法

---

*最后更新: 2025年1月*  
*如有问题，请查看日志文件或联系开发人员*