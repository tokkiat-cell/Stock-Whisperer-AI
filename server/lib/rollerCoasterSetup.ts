import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

interface CandleData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface RollerCoasterSetup {
  symbol: string;
  name: string;
  currentPrice: number;
  patternDetected: boolean;
  confidence: number;
  marketStage: 'Accumulation' | 'Uptrend' | 'Distribution' | 'Downtrend';
  entryLevel: number;
  stopLoss: number;
  targetPrice: number;
  riskRewardRatio: number;
  waterfallDepth: number;
  retracementLevel: number;
  wideRangeBarCount: number;
  entryBarType: string;
  isGoodLocation: boolean;
  setupNotes: string[];
  supportLevel: number;
  resistanceLevel: number;
  trendDirection: 'up' | 'down' | 'sideways';
}

export interface RollerCoasterScanResult {
  results: RollerCoasterSetup[];
  totalScanned: number;
  scanTime: number;
}

const POPULAR_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'NFLX', 'CRM',
  'ADBE', 'INTC', 'PYPL', 'SHOP', 'SQ', 'UBER', 'LYFT', 'SNAP', 'PINS', 'RBLX',
  'COIN', 'HOOD', 'PLTR', 'SNOW', 'DKNG', 'ROKU', 'ZM', 'DOCU', 'CRWD', 'NET',
  'ABNB', 'BA', 'DIS', 'JPM', 'GS', 'V', 'MA', 'WMT', 'TGT', 'COST',
  'HD', 'LOW', 'NKE', 'SBUX', 'MCD', 'PEP', 'KO', 'XOM', 'CVX', 'BABA'
];

async function getHistoricalData(symbol: string, days: number = 60): Promise<CandleData[]> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result: any = await yahooFinance.chart(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    });
    
    if (!result.quotes || result.quotes.length === 0) {
      return [];
    }
    
    return result.quotes
      .filter((q: any) => q.open && q.high && q.low && q.close && q.volume)
      .map((q: any) => ({
        date: new Date(q.date),
        open: q.open!,
        high: q.high!,
        low: q.low!,
        close: q.close!,
        volume: q.volume!
      }));
  } catch (error) {
    console.error(`Error fetching data for ${symbol}:`, error);
    return [];
  }
}

function calculateAverageRange(candles: CandleData[]): number {
  if (candles.length === 0) return 0;
  const ranges = candles.map(c => c.high - c.low);
  return ranges.reduce((a, b) => a + b, 0) / ranges.length;
}

function detectWaterfallPattern(candles: CandleData[]): {
  hasWaterfall: boolean;
  waterfallDepth: number;
  wideRangeBarCount: number;
  waterfallHigh: number;
  waterfallLow: number;
  waterfallStartIndex: number;
  waterfallEndIndex: number;
} {
  if (candles.length < 10) {
    return { hasWaterfall: false, waterfallDepth: 0, wideRangeBarCount: 0, waterfallHigh: 0, waterfallLow: 0, waterfallStartIndex: -1, waterfallEndIndex: -1 };
  }
  
  const avgRange = calculateAverageRange(candles.slice(0, 20));
  const wideRangeThreshold = avgRange * 1.5;
  
  const recentCandles = candles.slice(-30);
  let waterfallStartIndex = -1;
  let waterfallEndIndex = -1;
  let consecutiveRedBars = 0;
  let wideRangeRedBars = 0;
  let waterfallHigh = 0;
  let waterfallLow = Infinity;
  
  for (let i = 0; i < recentCandles.length; i++) {
    const candle = recentCandles[i];
    const isRedBar = candle.close < candle.open;
    const barRange = candle.high - candle.low;
    const isWideRange = barRange >= wideRangeThreshold;
    
    if (isRedBar) {
      if (waterfallStartIndex === -1) {
        waterfallStartIndex = i;
        waterfallHigh = candle.high;
      }
      consecutiveRedBars++;
      if (isWideRange) {
        wideRangeRedBars++;
      }
      waterfallLow = Math.min(waterfallLow, candle.low);
      waterfallEndIndex = i;
    } else if (consecutiveRedBars >= 3) {
      break;
    } else {
      waterfallStartIndex = -1;
      consecutiveRedBars = 0;
      wideRangeRedBars = 0;
      waterfallHigh = 0;
      waterfallLow = Infinity;
    }
  }
  
  const hasWaterfall = consecutiveRedBars >= 3 && wideRangeRedBars >= 1;
  const waterfallDepth = waterfallHigh > 0 ? ((waterfallHigh - waterfallLow) / waterfallHigh) * 100 : 0;
  
  return {
    hasWaterfall,
    waterfallDepth,
    wideRangeBarCount: wideRangeRedBars,
    waterfallHigh,
    waterfallLow,
    waterfallStartIndex: waterfallStartIndex + (candles.length - 30),
    waterfallEndIndex: waterfallEndIndex + (candles.length - 30)
  };
}

function detectEntryBar(candles: CandleData[], waterfallEndIndex: number): {
  hasEntryBar: boolean;
  entryBarType: string;
  entryLevel: number;
  stopLevel: number;
} {
  if (waterfallEndIndex < 0 || waterfallEndIndex >= candles.length - 1) {
    return { hasEntryBar: false, entryBarType: '', entryLevel: 0, stopLevel: 0 };
  }
  
  const postWaterfallCandles = candles.slice(waterfallEndIndex);
  
  for (let i = 0; i < Math.min(5, postWaterfallCandles.length); i++) {
    const candle = postWaterfallCandles[i];
    const isGreenBar = candle.close > candle.open;
    const bodySize = Math.abs(candle.close - candle.open);
    const totalRange = candle.high - candle.low;
    const lowerTail = Math.min(candle.open, candle.close) - candle.low;
    const upperTail = candle.high - Math.max(candle.open, candle.close);
    
    const hasLongTail = lowerTail > bodySize * 1.5;
    const hasNarrowBody = bodySize < totalRange * 0.3;
    
    if (isGreenBar) {
      return {
        hasEntryBar: true,
        entryBarType: 'Green Bar',
        entryLevel: candle.high,
        stopLevel: candle.low
      };
    }
    
    if (hasNarrowBody && hasLongTail) {
      return {
        hasEntryBar: true,
        entryBarType: 'Narrow Body with Long Tail (Hammer)',
        entryLevel: candle.high,
        stopLevel: candle.low
      };
    }
  }
  
  return { hasEntryBar: false, entryBarType: '', entryLevel: 0, stopLevel: 0 };
}

function calculate50Retracement(waterfallHigh: number, waterfallLow: number): number {
  return waterfallLow + (waterfallHigh - waterfallLow) * 0.5;
}

function detectMarketStage(candles: CandleData[]): 'Accumulation' | 'Uptrend' | 'Distribution' | 'Downtrend' {
  if (candles.length < 50) return 'Accumulation';
  
  const recentCandles = candles.slice(-50);
  const prices = recentCandles.map(c => c.close);
  
  const sma20 = prices.slice(-20).reduce((a, b) => a + b, 0) / 20;
  const sma50 = prices.reduce((a, b) => a + b, 0) / 50;
  
  const currentPrice = prices[prices.length - 1];
  const priceStart = prices[0];
  const priceChange = ((currentPrice - priceStart) / priceStart) * 100;
  
  const highs = recentCandles.slice(-20).map(c => c.high);
  const lows = recentCandles.slice(-20).map(c => c.low);
  const highestHigh = Math.max(...highs);
  const lowestLow = Math.min(...lows);
  const range = ((highestHigh - lowestLow) / lowestLow) * 100;
  
  const isNarrowRange = range < 8;
  const isMakingHigherLows = lows.slice(-5).every((l, i, arr) => i === 0 || l >= arr[i-1] * 0.98);
  const isMakingLowerHighs = highs.slice(-5).every((h, i, arr) => i === 0 || h <= arr[i-1] * 1.02);
  
  if (currentPrice > sma20 && sma20 > sma50 && priceChange > 5 && isMakingHigherLows) {
    return 'Uptrend';
  }
  
  if (currentPrice < sma20 && sma20 < sma50 && priceChange < -5) {
    return 'Downtrend';
  }
  
  if (isNarrowRange && priceChange > 10) {
    return 'Distribution';
  }
  
  if (isNarrowRange && priceChange < 0) {
    return 'Accumulation';
  }
  
  if (priceChange > 0) {
    return 'Uptrend';
  } else {
    return 'Downtrend';
  }
}

function calculateSupportResistance(candles: CandleData[]): { support: number; resistance: number } {
  if (candles.length < 20) {
    const currentPrice = candles[candles.length - 1]?.close || 0;
    return { support: currentPrice * 0.95, resistance: currentPrice * 1.05 };
  }
  
  const recentCandles = candles.slice(-30);
  const lows = recentCandles.map(c => c.low);
  const highs = recentCandles.map(c => c.high);
  
  const sortedLows = [...lows].sort((a, b) => a - b);
  const sortedHighs = [...highs].sort((a, b) => b - a);
  
  const support = sortedLows.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  const resistance = sortedHighs.slice(0, 3).reduce((a, b) => a + b, 0) / 3;
  
  return { support, resistance };
}

function getTrendDirection(candles: CandleData[]): 'up' | 'down' | 'sideways' {
  if (candles.length < 20) return 'sideways';
  
  const recentPrices = candles.slice(-20).map(c => c.close);
  const startPrice = recentPrices[0];
  const endPrice = recentPrices[recentPrices.length - 1];
  const change = ((endPrice - startPrice) / startPrice) * 100;
  
  if (change > 5) return 'up';
  if (change < -5) return 'down';
  return 'sideways';
}

export async function analyzeRollerCoasterSetup(symbol: string): Promise<RollerCoasterSetup | null> {
  try {
    const candles = await getHistoricalData(symbol, 60);
    if (candles.length < 30) return null;
    
    const quote: any = await yahooFinance.quote(symbol);
    const currentPrice = quote.regularMarketPrice || candles[candles.length - 1].close;
    const name = quote.shortName || quote.longName || symbol;
    
    const waterfall = detectWaterfallPattern(candles);
    const entryBar = detectEntryBar(candles, waterfall.waterfallEndIndex);
    const target50 = calculate50Retracement(waterfall.waterfallHigh, waterfall.waterfallLow);
    const marketStage = detectMarketStage(candles);
    const { support, resistance } = calculateSupportResistance(candles);
    const trendDirection = getTrendDirection(candles);
    
    const patternDetected = waterfall.hasWaterfall && entryBar.hasEntryBar;
    
    let confidence = 0;
    const setupNotes: string[] = [];
    
    if (waterfall.hasWaterfall) {
      confidence += 30;
      setupNotes.push(`Waterfall decline: ${waterfall.waterfallDepth.toFixed(1)}%`);
    }
    
    if (waterfall.wideRangeBarCount >= 2) {
      confidence += 15;
      setupNotes.push(`${waterfall.wideRangeBarCount} wide-range red bars`);
    }
    
    if (entryBar.hasEntryBar) {
      confidence += 25;
      setupNotes.push(`Entry bar: ${entryBar.entryBarType}`);
    }
    
    if (marketStage === 'Downtrend' || marketStage === 'Accumulation') {
      confidence += 15;
      setupNotes.push(`Good stage for reversal: ${marketStage}`);
    }
    
    const targetBelowRetracement = target50 < waterfall.waterfallHigh * 0.5;
    if (targetBelowRetracement) {
      confidence += 15;
      setupNotes.push('Target below 50% retracement');
    }
    
    const entryLevel = entryBar.entryLevel || currentPrice;
    const stopLoss = entryBar.stopLevel || currentPrice * 0.97;
    const targetPrice = target50;
    
    const riskAmount = entryLevel - stopLoss;
    const rewardAmount = targetPrice - entryLevel;
    const riskRewardRatio = riskAmount > 0 ? rewardAmount / riskAmount : 0;
    
    const isGoodLocation = marketStage === 'Downtrend' || marketStage === 'Accumulation';
    
    return {
      symbol,
      name,
      currentPrice,
      patternDetected,
      confidence: Math.min(100, confidence),
      marketStage,
      entryLevel,
      stopLoss,
      targetPrice,
      riskRewardRatio,
      waterfallDepth: waterfall.waterfallDepth,
      retracementLevel: 50,
      wideRangeBarCount: waterfall.wideRangeBarCount,
      entryBarType: entryBar.entryBarType,
      isGoodLocation,
      setupNotes,
      supportLevel: support,
      resistanceLevel: resistance,
      trendDirection
    };
  } catch (error) {
    console.error(`Error analyzing ${symbol}:`, error);
    return null;
  }
}

export async function scanForRollerCoasterSetups(): Promise<RollerCoasterScanResult> {
  const startTime = Date.now();
  const results: RollerCoasterSetup[] = [];
  
  for (const symbol of POPULAR_STOCKS) {
    try {
      const result = await analyzeRollerCoasterSetup(symbol);
      if (result && result.patternDetected && result.confidence >= 50) {
        results.push(result);
      }
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`Error scanning ${symbol}:`, error);
    }
  }
  
  results.sort((a, b) => b.confidence - a.confidence);
  
  return {
    results,
    totalScanned: POPULAR_STOCKS.length,
    scanTime: Date.now() - startTime
  };
}

export { detectMarketStage, calculateSupportResistance, getTrendDirection };
