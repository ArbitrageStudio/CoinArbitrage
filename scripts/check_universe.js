const HyperliquidApi = require('./src/api/hyperliquid');

// 创建Hyperliquid API实例
const hyperliquid = new HyperliquidApi();

async function checkUniverse() {
  console.log('Checking Hyperliquid universe array...');
  
  try {
    // 获取meta信息
    const response = await hyperliquid.client.post('/info', {
      type: 'meta'
    });
    
    const universe = response.data.universe;
    console.log('✅ Universe array length:', universe.length);
    console.log('✅ Universe array type:', Array.isArray(universe) ? 'Array' : typeof universe);
    
    // 检查前20个元素
    console.log('\nFirst 20 elements in universe:');
    universe.slice(0, 20).forEach((item, index) => {
      console.log(`${index + 1}.`, item);
    });
    
    // 检查是否有BTC、ETH、SOL
    console.log('\nChecking for BTC, ETH, SOL in universe:');
    const hasBTC = universe.includes('BTC');
    const hasETH = universe.includes('ETH');
    const hasSOL = universe.includes('SOL');
    
    console.log('BTC in universe:', hasBTC);
    console.log('ETH in universe:', hasETH);
    console.log('SOL in universe:', hasSOL);
    
    // 如果不在，检查是否包含这些符号
    if (!hasBTC || !hasETH || !hasSOL) {
      console.log('\nSearching for BTC, ETH, SOL in universe objects...');
      
      const btcItem = universe.find(item => item && (item.name === 'BTC' || item.symbol === 'BTC'));
      const ethItem = universe.find(item => item && (item.name === 'ETH' || item.symbol === 'ETH'));
      const solItem = universe.find(item => item && (item.name === 'SOL' || item.symbol === 'SOL'));
      
      console.log('BTC object:', btcItem);
      console.log('ETH object:', ethItem);
      console.log('SOL object:', solItem);
    }
    
  } catch (error) {
    console.error('❌ Error checking universe:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

checkUniverse();