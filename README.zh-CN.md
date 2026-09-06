# Coin Arbitrage

一个用于加密货币套利的工具，通过对比 OKX / Binance / Hyperliquid 交易所的价格差异来发现套利机会。

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> ⚠️ **风险声明**：本项目仅供学习与研究用途，不构成任何投资建议。加密货币交易风险极高，套利与合约交易可能导致本金全部亏损。请先在模拟/沙盒环境中验证，并自行承担使用本软件进行真实交易的一切后果。

## 功能特性

- 🔄 实时获取OKX和Binance的价格数据
- 📊 计算两个交易所之间的价差
- 💰 识别潜在的套利机会
- 🔧 模块化设计，易于扩展

## 项目结构

```
CoinArbitrage/
├── src/
│   ├── api/              # 交易所 API 集成（OKX / Binance / Hyperliquid / Lighter / WebSocket）
│   ├── config/           # 套利配置
│   └── utils/            # 套利计算、滑点、执行、实时检测、ML 预测、共享工具
├── scripts/              # 命令行入口脚本（监控、基差套利、采样、演示等）
├── test/                 # 测试脚本
├── docs/                 # 文档（使用指南、套利逻辑说明、Lighter 用法）
├── index.js              # 主程序入口（跨所价差分析）
├── package.json          # 项目配置与 npm 脚本
├── .env.example          # 环境变量示例
└── README.md             # 项目说明
```

- 命令行脚本统一放在 `scripts/`，通过 `npm run <script>` 调用（见 `package.json`）
- 测试脚本统一放在 `test/`
- 更详细的命令与环境变量说明见 [docs/USAGE_GUIDE.zh-CN.md](./docs/USAGE_GUIDE.zh-CN.md)

## 安装和使用

1. 安装依赖：
```bash
npm install
```

2. 配置环境变量：
```bash
cp .env.example .env
# 编辑 .env 文件，添加API密钥
```

3. 运行程序：
```bash
npm start
```

## 环境变量

- `OKX_API_KEY` - OKX API密钥
- `OKX_SECRET_KEY` - OKX密钥
- `OKX_PASSPHRASE` - OKX口令
- `BINANCE_API_KEY` - Binance API密钥
- `BINANCE_SECRET_KEY` - Binance密钥

## 注意事项

- 请确保API密钥具有适当的权限
- 建议在测试环境中先进行验证
- 套利交易存在风险，请谨慎操作

## License

本项目采用 [MIT License](./LICENSE)。