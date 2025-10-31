const HyperliquidApi = require('./src/api/hyperliquid');

// 创建Hyperliquid API实例
const hyperliquid = new HyperliquidApi();

async function testHyperliquidSymbols() {
  console.log('Testing Hyperliquid API symbols...');
  
  try {
    // 获取所有市场信息
    const marketInfo = await hyperliquid.getAllMarketInfo();
    console.log('Available assets count:', marketInfo.universe.length);
    
    // 显示前20个交易对
    console.log('\nFirst 20 assets:');
    marketInfo.universe.slice(0, 20).forEach((asset, index) => {
      console.log(`${index + 1}. Name: ${asset.name}, Symbol: ${asset.symbol}`);
    });
    
    // 检查是否有BTC相关的交易对
    console.log('\nBTC-related assets:');
    const btcAssets = marketInfo.universe.filter(asset => 
      asset.name && (asset.name.includes('BTC') || asset.name.includes('btc') ||
                   asset.symbol && (asset.symbol.includes('BTC') || asset.symbol.includes('btc')))
    );
    
    if (btcAssets.length > 0) {
      btcAssets.forEach((asset, index) => {
        console.log(`${index + 1}. Name: ${asset.name}, Symbol: ${asset.symbol}`);
      });
    } else {
      console.log('No BTC-related assets found');
    }
    
    // 检查是否有ETH相关的交易对
    console.log('\nETH-related assets:');
    const ethAssets = marketInfo.universe.filter(asset => 
      asset.name && (asset.name.includes('ETH') || asset.name.includes('eth') ||
                   asset.symbol && (asset.symbol.includes('ETH') || asset.symbol.includes('eth')))
    );
    
    if (ethAssets.length > 0) {
      ethAssets.forEach((asset, index) => {
        console.log(`${index + 1}. Name: ${asset.name}, Symbol: ${asset.symbol}`);
      });
    } else {
      console.log('No ETH-related assets found');
    }
    
    // 检查是否有SOL相关的交易对
    console.log('\nSOL-related assets:');
    const solAssets = marketInfo.universe.filter(asset => 
      asset.name && (asset.name.includes('SOL') || asset.name.includes('sol') ||
                   asset.symbol && (asset.symbol.includes('SOL') || asset.symbol.includes('sol')))
    );
    
    if (solAssets.length > 0) {
      solAssets.forEach((asset, index) => {
        console.log(`${index + 1}. Name: ${asset.name}, Symbol: ${asset.symbol}`);
      });
    } else {
      console.log('No SOL-related assets found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testHyperliquidSymbols();