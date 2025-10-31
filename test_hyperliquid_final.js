const HyperliquidApi = require('./src/api/hyperliquid');

// 创建Hyperliquid API实例
const hyperliquid = new HyperliquidApi();

async function testHyperliquidFinal() {
  console.log('Final Hyperliquid API test...');
  
  try {
    // 测试连接
    console.log('1. Testing connection...');
    const isConnected = await hyperliquid.testConnection();
    console.log('✅ Connection test:', isConnected);
    
    if (!isConnected) {
      console.log('❌ Connection failed');
      return;
    }
    
    // 测试获取市场信息
    console.log('\n2. Testing market info...');
    const marketInfo = await hyperliquid.getAllMarketInfo();
    console.log('✅ Market info retrieved, assets count:', marketInfo.universe.length);
    
    // 测试获取价格数据
    console.log('\n3. Testing price data for BTC...');
    try {
      const btcTicker = await hyperliquid.getTicker('BTC');
      console.log('✅ BTC ticker:', {
        price: btcTicker.price,
        bid: btcTicker.bid,
        ask: btcTicker.ask,
        exchange: btcTicker.exchange
      });
    } catch (error) {
      console.log('❌ BTC ticker failed:', error.message);
    }
    
    // 测试获取ETH价格
    console.log('\n4. Testing price data for ETH...');
    try {
      const ethTicker = await hyperliquid.getTicker('ETH');
      console.log('✅ ETH ticker:', {
        price: ethTicker.price,
        bid: ethTicker.bid,
        ask: ethTicker.ask,
        exchange: ethTicker.exchange
      });
    } catch (error) {
      console.log('❌ ETH ticker failed:', error.message);
    }
    
    // 测试获取SOL价格
    console.log('\n5. Testing price data for SOL...');
    try {
      const solTicker = await hyperliquid.getTicker('SOL');
      console.log('✅ SOL ticker:', {
        price: solTicker.price,
        bid: solTicker.bid,
        ask: solTicker.ask,
        exchange: solTicker.exchange
      });
    } catch (error) {
      console.log('❌ SOL ticker failed:', error.message);
    }
    
    // 测试获取多个交易对
    console.log('\n6. Testing multiple tickers...');
    try {
      const multipleTickers = await hyperliquid.getMultipleTickers(['BTC', 'ETH', 'SOL']);
      console.log('✅ Multiple tickers retrieved:', multipleTickers.length);
      multipleTickers.forEach(ticker => {
        console.log(`   ${ticker.symbol}: $${ticker.price}`);
      });
    } catch (error) {
      console.log('❌ Multiple tickers failed:', error.message);
    }
    
    console.log('\n🎉 Hyperliquid API test completed successfully!');
    
  } catch (error) {
    console.error('❌ Final test error:', error.message);
  }
}

testHyperliquidFinal();