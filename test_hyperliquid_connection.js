const HyperliquidApi = require('./src/api/hyperliquid');

// 创建Hyperliquid API实例
const hyperliquid = new HyperliquidApi();

async function testHyperliquidConnection() {
  console.log('Testing Hyperliquid API connection...');
  
  try {
    // 测试连接
    const isConnected = await hyperliquid.testConnection();
    console.log('Connection test result:', isConnected);
    
    if (isConnected) {
      console.log('✅ Hyperliquid API connection successful!');
      
      // 测试获取市场信息
      console.log('\nTesting market info...');
      try {
        const marketInfo = await hyperliquid.getAllMarketInfo();
        console.log('Market info retrieved successfully');
        console.log('Available assets:', marketInfo.universe ? marketInfo.universe.length : 'N/A');
      } catch (marketError) {
        console.log('Market info test failed:', marketError.message);
      }
      
      // 测试获取单个交易对
      console.log('\nTesting ticker data...');
      try {
        const ticker = await hyperliquid.getTicker('BTC-USDT');
        console.log('BTC-USDT ticker:', ticker);
      } catch (tickerError) {
        console.log('Ticker test failed:', tickerError.message);
      }
      
    } else {
      console.log('❌ Hyperliquid API connection failed');
    }
    
  } catch (error) {
    console.error('❌ Connection test error:', error.message);
    console.error('Error details:', error.response ? error.response.data : error);
  }
}

testHyperliquidConnection();