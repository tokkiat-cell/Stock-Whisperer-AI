import YahooFinance from 'yahoo-finance2';
import { detectMarketStage, calculateSupportResistance, getTrendDirection } from './rollerCoasterSetup';

const yahooFinance = new YahooFinance();

interface CandleData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TugOfWarSetup {
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
  consolidationTightness: number;
  hasShakeoutBar: boolean;
  nearMovingAverage: boolean;
  maDistance: number;
  isUptrend: boolean;
  isGoodLocation: boolean;
  setupNotes: string[];
  supportLevel: number;
  resistanceLevel: number;
  trendDirection: 'up' | 'down' | 'sideways';
  consolidationHigh: number;
  consolidationLow: number;
}

export interface TugOfWarScanResult {
  results: TugOfWarSetup[];
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

function detectTightConsolidation(candles: CandleData[]): {
  hasTightConsolidation: boolean;
  consolidationTightness: number;
  consolidationHigh: number;
  consolidationLow: number;
  hasFlatTop: boolean;
} {
  if (candles.length < 10) {
    return { hasTightConsolidation: false, consolidationTightness: 0, consolidationHigh: 0, consolidationLow: 0, hasFlatTop: false };
  }
  
  const recentCandles = candles.slice(-10);
  const highs = recentCandles.map(c => c.high);
  const lows = recentCandles.map(c => c.low);
  
  const consolidationHigh = Math.max(...highs);
  const consolidationLow = Math.min(...lows);
  const range = consolidationHigh - consolidationLow;
  const avgPrice = (consolidationHigh + consolidationLow) / 2;
  const consolidationTightness = (range / avgPrice) * 100;
  
  const highVariance = Math.max(...highs) - Math.min(...highs);
  const hasFlatTop = (highVariance / avgPrice) * 100 < 2;
  
  const hasTightConsolidation = consolidationTightness < 6 && hasFlatTop;
  
  return {
    hasTightConsolidation,
    consolidationTightness,
    consolidationHigh,
    consolidationLow,
    hasFlatTop
  };
}

function detectShakeoutBar(candles: CandleData[], consolidationLow: number): {
  hasShakeout: boolean;
  shakeoutIndex: number;
} {
  if (candles.length < 5) {
    return { hasShakeout: false, shakeoutIndex: -1 };
  }
  
  const recentCandles = candles.slice(-8);
  
  for (let i = 0; i < recentCandles.length; i++) {
    const candle = recentCandles[i];
    const wentBelowConsolidation = candle.low < consolidationLow * 0.99;
    const closedAbove = candle.close > consolidationLow;
    const hasLongTail = (candle.close - candle.low) > (candle.high - candle.close);
    
    if (wentBelowConsolidation && closedAbove && hasLongTail) {
      return { hasShakeout: true, shakeoutIndex: candles.length - 8 + i };
    }
  }
  
  return { hasShakeout: false, shakeoutIndex: -1 };
}

function calculateSMA(candles: CandleData[], period: number): number {
  if (candles.length < period) return 0;
  const recentCandles = candles.slice(-period);
  return recentCandles.reduce((sum, c) => sum + c.close, 0) / period;
}

function isNearMovingAverage(candles: CandleData[]): {
  nearMA: boolean;
  maDistance: number;
  sma20: number;
} {
  const sma20 = calculateSMA(candles, 20);
  const currentPrice = candles[candles.length - 1].close;
  const maDistance = ((currentPrice - sma20) / sma20) * 100;
  const nearMA = Math.abs(maDistance) < 5;
  
  return { nearMA, maDistance, sma20 };
}

function isInUptrend(candles: CandleData[]): boolean {
  if (candles.length < 50) return false;
  
  const sma20 = calculateSMA(candles, 20);
  const sma50 = calculateSMA(candles, 50);
  const currentPrice = candles[candles.length - 1].close;
  
  const pricesAboveSMA = candles.slice(-20).filter(c => c.close > sma20).length;
  
  return currentPrice > sma20 && sma20 > sma50 && pricesAboveSMA >= 15;
}

export async function analyzeTugOfWarSetup(symbol: string): Promise<TugOfWarSetup | null> {
  try {
    const candles = await getHistoricalData(symbol, 60);
    if (candles.length < 30) return null;
    
    const quote: any = await yahooFinance.quote(symbol);
    const currentPrice = quote.regularMarketPrice || candles[candles.length - 1].close;
    const name = quote.shortName || quote.longName || symbol;
    
    const consolidation = detectTightConsolidation(candles);
    const shakeout = detectShakeoutBar(candles, consolidation.consolidationLow);
    const maInfo = isNearMovingAverage(candles);
    const uptrend = isInUptrend(candles);
    const marketStage = detectMarketStage(candles);
    const { support, resistance } = calculateSupportResistance(candles);
    const trendDirection = getTrendDirection(candles);
    
    const patternDetected = consolidation.hasTightConsolidation && uptrend;
    
    let confidence = 0;
    const setupNotes: string[] = [];
    
    if (uptrend) {
      confidence += 25;
      setupNotes.push('In uptrend (above 20/50 SMA)');
    }
    
    if (consolidation.hasTightConsolidation) {
      confidence += 25;
      setupNotes.push(`Tight consolidation: ${consolidation.consolidationTightness.toFixed(1)}%`);
    }
    
    if (consolidation.hasFlatTop) {
      confidence += 15;
      setupNotes.push('Flat top pattern (ruler-like)');
    }
    
    if (shakeout.hasShakeout) {
      confidence += 20;
      setupNotes.push('Shakeout bar detected');
    }
    
    if (maInfo.nearMA) {
      confidence += 15;
      setupNotes.push(`Near 20 SMA (${maInfo.maDistance.toFixed(1)}% away)`);
    }
    
    const entryLevel = consolidation.consolidationHigh * 1.005;
    const stopLoss = consolidation.consolidationLow * 0.99;
    const riskAmount = entryLevel - stopLoss;
    const targetPrice = entryLevel + (riskAmount * 2);
    const riskRewardRatio = riskAmount > 0 ? (targetPrice - entryLevel) / riskAmount : 0;
    
    const isGoodLocation = uptrend && marketStage === 'Uptrend';
    
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
      consolidationTightness: consolidation.consolidationTightness,
      hasShakeoutBar: shakeout.hasShakeout,
      nearMovingAverage: maInfo.nearMA,
      maDistance: maInfo.maDistance,
      isUptrend: uptrend,
      isGoodLocation,
      setupNotes,
      supportLevel: support,
      resistanceLevel: resistance,
      trendDirection,
      consolidationHigh: consolidation.consolidationHigh,
      consolidationLow: consolidation.consolidationLow
    };
  } catch (error) {
    console.error(`Error analyzing ${symbol}:`, error);
    return null;
  }
}

export async function scanForTugOfWarSetups(): Promise<TugOfWarScanResult> {
  const startTime = Date.now();
  const results: TugOfWarSetup[] = [];
  
  for (const symbol of POPULAR_STOCKS) {
    try {
      const result = await analyzeTugOfWarSetup(symbol);
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
