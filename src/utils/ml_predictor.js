class MLPricePredictor {
  constructor() {
    this.trainingData = new Map();
    this.models = new Map();
    this.windowSize = 10; // 滑动窗口大小
  }

  // 添加训练数据
  addTrainingData(symbol, price, timestamp = Date.now()) {
    if (!this.trainingData.has(symbol)) {
      this.trainingData.set(symbol, []);
    }
    
    const data = this.trainingData.get(symbol);
    data.push({ price, timestamp });
    
    // 保持数据大小
    if (data.length > 1000) {
      data.shift();
    }
  }

  // 简单移动平均预测
  predictSMA(symbol, window = this.windowSize) {
    const data = this.trainingData.get(symbol) || [];
    if (data.length < window) {
      return null;
    }
    
    const recentPrices = data.slice(-window).map(item => item.price);
    const sma = recentPrices.reduce((sum, price) => sum + price, 0) / window;
    
    return {
      symbol,
      prediction: sma,
      confidence: 0.6,
      method: 'SMA',
      windowSize: window,
      timestamp: Date.now()
    };
  }

  // 指数移动平均预测
  predictEMA(symbol, window = this.windowSize, alpha = 0.3) {
    const data = this.trainingData.get(symbol) || [];
    if (data.length < window) {
      return null;
    }
    
    const prices = data.slice(-window).map(item => item.price);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = alpha * prices[i] + (1 - alpha) * ema;
    }
    
    return {
      symbol,
      prediction: ema,
      confidence: 0.7,
      method: 'EMA',
      windowSize: window,
      alpha,
      timestamp: Date.now()
    };
  }

  // RSI（相对强弱指数）计算
  calculateRSI(symbol, period = 14) {
    const data = this.trainingData.get(symbol) || [];
    if (data.length < period + 1) {
      return null;
    }
    
    const prices = data.slice(-period - 1).map(item => item.price);
    const changes = [];
    
    for (let i = 1; i < prices.length; i++) {
      changes.push(prices[i] - prices[i - 1]);
    }
    
    const gains = changes.filter(change => change > 0).reduce((sum, gain) => sum + gain, 0);
    const losses = changes.filter(change => change < 0).reduce((sum, loss) => sum + Math.abs(loss), 0);
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return {
      symbol,
      rsi,
      signal: this.getRSISignal(rsi),
      period,
      timestamp: Date.now()
    };
  }

  getRSISignal(rsi) {
    if (rsi > 70) return 'OVERSOLD';
    if (rsi < 30) return 'OVERBOUGHT';
    return 'NEUTRAL';
  }

  // Bollinger Bands（布林带）
  calculateBollingerBands(symbol, window = 20, numStd = 2) {
    const data = this.trainingData.get(symbol) || [];
    if (data.length < window) {
      return null;
    }
    
    const prices = data.slice(-window).map(item => item.price);
    const sma = prices.reduce((sum, price) => sum + price, 0) / window;
    
    const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / window;
    const std = Math.sqrt(variance);
    
    const upperBand = sma + numStd * std;
    const lowerBand = sma - numStd * std;
    
    const currentPrice = prices[prices.length - 1];
    const bandwidth = (upperBand - lowerBand) / sma;
    
    return {
      symbol,
      upperBand,
      lowerBand,
      middleBand: sma,
      currentPrice,
      bandwidth,
      signal: this.getBollingerSignal(currentPrice, upperBand, lowerBand),
      window,
      numStd,
      timestamp: Date.now()
    };
  }

  getBollingerSignal(price, upperBand, lowerBand) {
    if (price > upperBand) return 'SELL';
    if (price < lowerBand) return 'BUY';
    return 'HOLD';
  }

  // MACD（移动平均收敛散度）
  calculateMACD(symbol, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const data = this.trainingData.get(symbol) || [];
    if (data.length < slowPeriod + signalPeriod) {
      return null;
    }
    
    const prices = data.map(item => item.price);
    
    // 计算EMA
    const fastEMA = this.calculateEMAValues(prices, fastPeriod);
    const slowEMA = this.calculateEMAValues(prices, slowPeriod);
    
    // 计算MACD线
    const macdLine = [];
    for (let i = 0; i < Math.min(fastEMA.length, slowEMA.length); i++) {
      macdLine.push(fastEMA[i] - slowEMA[i]);
    }
    
    // 计算信号线
    const signalLine = this.calculateEMAValues(macdLine, signalPeriod);
    
    // 计算柱状图
    const histogram = [];
    for (let i = 0; i < Math.min(macdLine.length, signalLine.length); i++) {
      histogram.push(macdLine[i] - signalLine[i]);
    }
    
    const currentMACD = macdLine[macdLine.length - 1];
    const currentSignal = signalLine[signalLine.length - 1];
    const currentHistogram = histogram[histogram.length - 1];
    
    return {
      symbol,
      macdLine: currentMACD,
      signalLine: currentSignal,
      histogram: currentHistogram,
      signal: this.getMACDSignal(currentMACD, currentSignal, currentHistogram),
      fastPeriod,
      slowPeriod,
      signalPeriod,
      timestamp: Date.now()
    };
  }

  calculateEMAValues(prices, period) {
    const emaValues = [];
    const alpha = 2 / (period + 1);
    
    let ema = prices.slice(0, period).reduce((sum, price) => sum + price, 0) / period;
    emaValues.push(ema);
    
    for (let i = period; i < prices.length; i++) {
      ema = alpha * prices[i] + (1 - alpha) * ema;
      emaValues.push(ema);
    }
    
    return emaValues;
  }

  getMACDSignal(macd, signal, histogram) {
    if (macd > signal && histogram > 0) return 'BULLISH';
    if (macd < signal && histogram < 0) return 'BEARISH';
    return 'NEUTRAL';
  }

  // 综合技术指标分析
  analyzeTechnicalIndicators(symbol) {
    const indicators = {
      rsi: this.calculateRSI(symbol),
      bollinger: this.calculateBollingerBands(symbol),
      macd: this.calculateMACD(symbol),
      sma: this.predictSMA(symbol),
      ema: this.predictEMA(symbol)
    };
    
    // 计算综合信号
    const signals = [];
    if (indicators.rsi) signals.push(indicators.rsi.signal);
    if (indicators.bollinger) signals.push(indicators.bollinger.signal);
    if (indicators.macd) signals.push(indicators.macd.signal);
    
    const buySignals = signals.filter(s => s === 'BUY' || s === 'BULLISH').length;
    const sellSignals = signals.filter(s => s === 'SELL' || s === 'BEARISH').length;
    
    let overallSignal = 'NEUTRAL';
    if (buySignals >= 2) overallSignal = 'BUY';
    if (sellSignals >= 2) overallSignal = 'SELL';
    
    return {
      symbol,
      indicators,
      overallSignal,
      signalStrength: this.calculateSignalStrength(signals),
      timestamp: Date.now()
    };
  }

  calculateSignalStrength(signals) {
    const buyCount = signals.filter(s => s === 'BUY' || s === 'BULLISH').length;
    const sellCount = signals.filter(s => s === 'SELL' || s === 'BEARISH').length;
    
    return (buyCount - sellCount) / signals.length;
  }

  // 批量更新数据
  updateAllData(tickersByExchange) {
    Object.entries(tickersByExchange).forEach(([exchange, tickers]) => {
      tickers.forEach(ticker => {
        this.addTrainingData(ticker.symbol, ticker.price);
      });
    });
  }

  // 预测价格方向
  predictPriceDirection(symbol) {
    const technicalAnalysis = this.analyzeTechnicalIndicators(symbol);
    const smaPrediction = this.predictSMA(symbol);
    const emaPrediction = this.predictEMA(symbol);
    
    let direction = 'SIDEWAYS';
    let confidence = 0.5;
    
    if (technicalAnalysis.overallSignal === 'BUY') {
      direction = 'UP';
      confidence = 0.6 + technicalAnalysis.signalStrength * 0.2;
    } else if (technicalAnalysis.overallSignal === 'SELL') {
      direction = 'DOWN';
      confidence = 0.6 + Math.abs(technicalAnalysis.signalStrength) * 0.2;
    }
    
    // 结合移动平均预测
    if (smaPrediction && emaPrediction) {
      const currentData = this.trainingData.get(symbol);
      const currentPrice = currentData[currentData.length - 1].price;
      
      if (smaPrediction.prediction > currentPrice && emaPrediction.prediction > currentPrice) {
        confidence += 0.1;
      } else if (smaPrediction.prediction < currentPrice && emaPrediction.prediction < currentPrice) {
        confidence += 0.1;
      }
    }
    
    return {
      symbol,
      direction,
      confidence: Math.min(0.95, Math.max(0.05, confidence)),
      technicalAnalysis,
      timestamp: Date.now()
    };
  }
}

module.exports = MLPricePredictor;