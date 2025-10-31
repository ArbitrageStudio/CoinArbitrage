const HyperliquidApi = require('./src/api/hyperliquid');

// 创建Hyperliquid API实例
const hyperliquid = new HyperliquidApi();

async function debugHyperliquid() {
  console.log('Debugging Hyperliquid API...');
  
  try {
    // 直接测试allMids端点
    console.log('1. Testing allMids endpoint directly...');
    
    const response = await hyperliquid.client.post('/info', {
      type: 'allMids'
    });
    
    console.log('✅ allMids response status:', response.status);
    console.log('✅ allMids response keys:', Object.keys(response.data));
    
    // 检查是否有BTC数据
    if (response.data.BTC) {
      console.log('✅ BTC price:', response.data.BTC);
    } else {
      console.log('❌ BTC not found in allMids');
    }
    
    // 检查是否有ETH数据
    if (response.data.ETH) {
      console.log('✅ ETH price:', response.data.ETH);
    } else {
      console.log('❌ ETH not found in allMids');
    }
    
    // 检查是否有SOL数据
    if (response.data.SOL) {
      console.log('✅ SOL price:', response.data.SOL);
    } else {
      console.log('❌ SOL not found in allMids');
    }
    
    // 显示前10个交易对的价格
    console.log('\nFirst 10 assets and prices:');
    const assets = Object.keys(response.data);
    assets.slice(0, 10).forEach((asset, index) => {
      console.log(`${index + 1}. ${asset}: ${response.data[asset]}`);
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
    }
  }
}

debugHyperliquid();