# Coin Arbitrage

一个用于加密货币套利的工具，通过对比OKX和Binance交易所的价格差异来发现套利机会。

## 功能特性

- 🔄 实时获取OKX和Binance的价格数据
- 📊 计算两个交易所之间的价差
- 💰 识别潜在的套利机会
- 🔧 模块化设计，易于扩展

## 项目结构

```
CoinArbitrage/
├── src/
│   ├── api/          # API集成模块
│   ├── utils/        # 工具函数
│   └── config/       # 配置文件
├── index.js          # 主程序入口
├── package.json      # 项目配置
├── .env.example      # 环境变量示例
└── README.md         # 项目说明
```

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