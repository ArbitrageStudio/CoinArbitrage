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

## 🧪 OKX 单所基差套利（干跑验证）

用于验证 OKX 现货-永续基差套利（买现货、做空永续）的可行性与潜在净收益。

- 启动命令：`npm run basis:dryrun`
- 配置项：
  - `ARBITRAGE_SYMBOLS`（或在 `src/config/arbitrageConfig.js` 中设置）
  - `BASIS_HOLD_HOURS`（默认 `8`，对应一个资金费周期）
  - `OKX_SPOT_FEE`（默认 `0.001`，即 0.1%）
  - `OKX_PERP_FEE`（默认 `0.0005`，即 0.05%）
  - `ORDER_USDT_SIZE`（默认 `50`，用于估算规模）
  - `BASIS_MIN_PROFIT` 或 `AUTO_TRADE_MIN_PROFIT`（最低净利百分比阈值）

输出包含：现货价、永续价、基差百分比、资金费估算、手续费估算、预期净利与净利百分比；标记 `✅ 可行计划` 表示净利百分比超过你设定的阈值。

说明：
- 这是干跑验证，不会提交真实订单；真实执行需要另行实现 OKX 永续下单与仓位管理。
- 资金费率是每 8 小时的周期费率，脚本采用线性近似作为验证参考。
- 建议先在 OKX 沙盒环境用小额受控范围做真下单验证，再迁移到实盘。

### 🧪→🧰 沙盒真单执行（OKX 永续）

- 启动命令：`npm run basis:sandbox`
- 前置要求：
  - `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE` 已配置
  - `OKX_SANDBOX=true`（启用模拟交易头 `x-simulated-trading: 1`）
  - 如需仅观察，不下真单：保留 `AUTO_TRADE_DRY_RUN=true`
- 行为说明：
  - 脚本读取 `src/utils/intra_exchange_arbitrage.js` 生成的计划（买现货、卖永续），在沙盒环境下按市价执行。
  - 合约张数依据 OKX 合约参数 `ctVal/lotSz/minSz` 自动换算并向下取整，避免最小张数限制报错。

示例环境变量：
```env
OKX_SANDBOX=true
ENABLE_AUTO_TRADE=true
AUTO_TRADE_DRY_RUN=false
ORDER_USDT_SIZE=50
ARBITRAGE_SYMBOLS=BTC-USDT,ETH-USDT
```

注意：
- 合约张数计算需拉取 `public/instruments` 参数，若 `ORDER_USDT_SIZE` 极小可能低于 `minSz` 而被拒绝。
- 初次验证建议小额、分批次执行，并观察资金费率影响与成交回报结构。

### 🔄 闭环与风控（仓位查询 / 平仓 / 资金费）

- 仓位查询与闭环：
  - 关闭两腿：`npm run basis:close`
  - 说明：先平永续、再卖出现货余额，避免敞口扩大。
- 资金费风控：
  - 提前在资金费前平掉可能支付资金费的空头：`npm run basis:risk`
  - 环境变量：`FUNDING_CLOSE_BEFORE_MINUTES=5`
  - 规则：若永续持空且 `fundingRate > 0` 并临近资金费时间（≤阈值分钟），则执行平仓。

注意：
- OKX 现货余额读取依赖 `account/balance` 的 `details.ccy`，若资产不足则跳过现货腿。
- 永续仓位读取依赖 `account/positions?instType=SWAP&instId=...`，若无持仓则跳过永续腿。

### 滑点检查与流动性验证
在自动执行基差套利计划时，系统现在会在下单前查询 OKX 现货/永续订单簿深度，计算预期滑点：
- 若总滑点（现货 + 永续）超过阈值（默认 0.5%），则跳过执行。
- 环境变量：`MAX_SLIPPAGE_PCT=0.5`（可自定义阈值百分比）。

此功能确保在高波动市场中避免过度滑点导致实际利润低于预期。

- 启动命令：`npm run basis:sandbox`
- 前置要求：
  - `OKX_API_KEY`, `OKX_SECRET_KEY`, `OKX_PASSPHRASE` 已配置
  - `OKX_SANDBOX=true`（启用模拟交易头 `x-simulated-trading: 1`）
  - 如需仅观察，不下真单：保留 `AUTO_TRADE_DRY_RUN=true`
- 行为说明：
  - 脚本读取 `src/utils/intra_exchange_arbitrage.js` 生成的计划（买现货、卖永续），在沙盒环境下按市价执行。
  - 合约张数依据 OKX 合约参数 `ctVal/lotSz/minSz` 自动换算并向下取整，避免最小张数限制报错。

示例环境变量：
```env
OKX_SANDBOX=true
ENABLE_AUTO_TRADE=true
AUTO_TRADE_DRY_RUN=false
ORDER_USDT_SIZE=50
ARBITRAGE_SYMBOLS=BTC-USDT,ETH-USDT
```

注意：
- 合约张数计算需拉取 `public/instruments` 参数，若 `ORDER_USDT_SIZE` 极小可能低于 `minSz` 而被拒绝。
- 初次验证建议小额、分批次执行，并观察资金费率影响与成交回报结构。

### 🔄 闭环与风控（仓位查询 / 平仓 / 资金费）

- 仓位查询与闭环：
  - 关闭两腿：`npm run basis:close`
  - 说明：先平永续、再卖出现货余额，避免敞口扩大。
- 资金费风控：
  - 提前在资金费前平掉可能支付资金费的空头：`npm run basis:risk`
  - 环境变量：`FUNDING_CLOSE_BEFORE_MINUTES=5`
  - 规则：若永续持空且 `fundingRate > 0` 并临近资金费时间（≤阈值分钟），则执行平仓。

注意：
- OKX 现货余额读取依赖 `account/balance` 的 `details.ccy`，若资产不足则跳过现货腿。
- 永续仓位读取依赖 `account/positions?instType=SWAP&instId=...`，若无持仓则跳过永续腿。

### 🧭 经理脚本（连续管理与自动闭环）

- 命令：`npm run basis:manager`
- 功能：按固定周期巡检 `ARBITRAGE_SYMBOLS`，对 OKX 现货+永续基差进行“自动开仓 + 连续管理 + 自动闭环”：
  - 资金费窗口风控：若永续为空且 `fundingRate > 0` 且距离下一次资金费 ≤ 阈值分钟，则提前平掉永续腿。
  - 持有时长闭环：达到 `BASIS_HOLD_HOURS` 后自动先平永续、再卖出现货，完整闭环。
  - 止损/止盈：依据当前现货/永续价格粗略计算净利润率，触发止损或止盈阈值时自动闭环。
  - 自动开仓：当基差计划可行（`feasible=true`）且启用自动交易时，自动按市价买现货、做空永续，规模取 `ORDER_USDT_SIZE`。

环境变量：
- `ARBITRAGE_SYMBOLS`: 例 `BTC-USDT,ETH-USDT`
- `BASIS_HOLD_HOURS`: 达到持有时长后自动闭环，默认 `8`
- `FUNDING_CLOSE_BEFORE_MINUTES`: 资金费窗口前多少分钟平永续，默认 `5`
- `BASIS_STOP_LOSS_PCT`: 止损百分比（净利率阈值，负方向），默认 `0` 表示禁用
- `BASIS_TAKE_PROFIT_PCT`: 止盈百分比（净利率阈值），默认 `0` 表示禁用
- `MANAGER_CHECK_INTERVAL_MS`: 巡检间隔毫秒数，默认 `60000`
- `MANAGER_RUN_MS`: 运行时长毫秒数，默认 `0` 表示持续运行
- `ENABLE_AUTO_TRADE`: 开启自动交易（用于自动开仓），默认 `false`
- `AUTO_TRADE_DRY_RUN`: 干跑模式（打印计划但不下单），默认 `true`

注意事项：
- 脚本使用本地状态文件 `.basis_state.json` 记录持仓起始时间；若你在外部平仓或账户资产变动，脚本会在巡检时同步更新并清理状态。
- 若使用沙盒，请设置 `OKX_SANDBOX=true` 并确保 `OKX_API_KEY/SECRET_KEY/PASSPHRASE` 有效；真实环境下请谨慎评估风险与权限。
- 自动开仓依赖 `ENABLE_AUTO_TRADE=true`；干跑模式下只打印不下单，持仓记录不会落地。

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