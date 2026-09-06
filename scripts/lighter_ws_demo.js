require('dotenv').config();

const LighterApi = require('../src/api/lighter');

async function main() {
  const marketIndex = parseInt(process.env.LIGHTER_MARKET_INDEX || '0');
  const lighter = new LighterApi({
    baseURL: process.env.LIGHTER_BASE_URL || 'https://mainnet.zklighter.elliot.ai',
    authToken: process.env.LIGHTER_AUTH_TOKEN
  });

  console.log(`🔌 连接 Lighter WebSocket: 市场 ${marketIndex}`);
  const ws = lighter.connectOrderBook(marketIndex, {
    onOpen: () => console.log('✅ WS 已连接，已发起订阅'),
    onUpdate: (msg) => {
      const ob = msg.order_book;
      const bestAsk = ob.asks && ob.asks.length ? ob.asks[0] : null;
      const bestBid = ob.bids && ob.bids.length ? ob.bids[0] : null;
      console.log(`📈 更新 offset=${msg.offset} bid=${bestBid?.price} ask=${bestAsk?.price}`);
    },
    onError: (err) => console.error('WS 错误:', err.message || err)
  });

  // 自动关闭演示
  setTimeout(() => {
    console.log('⏹️ 关闭 Lighter WS 演示');
    try { ws.close(); } catch {}
    process.exit(0);
  }, parseInt(process.env.LIGHTER_WS_DEMO_MS || '20000'));
}

if (require.main === module) {
  main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
  });
}