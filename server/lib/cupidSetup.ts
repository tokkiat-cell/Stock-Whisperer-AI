import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export interface CupidSetupResult {
  symbol: string;
  name: string;
  currentPrice: number;
  patternDetected: boolean;
  confidence: number;
  uptrendStrength: number;
  pullbackDepth: number;
  pullbackSmoothness: number;
  pullbackAngle: number;
  swingHigh: number;
  swingLow: number;
  entryZone: { low: number; high: number };
  stopLoss: number;
  targetPrice: number;
  riskRewardRatio: number;
  details: string[];
}

interface CandleData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function detectCupidSetup(symbol: string): Promise<CupidSetupResult | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 90);

    const historical = await yahooFinance.chart(symbol.toUpperCase(), {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });

    if (!historical || !historical.quotes || historical.quotes.length < 30) {
      return null;
    }

    const quote = await yahooFinance.quote(symbol.toUpperCase());
    const companyName = quote?.shortName || quote?.longName || symbol;
    const currentPrice = quote?.regularMarketPrice || 0;

    const candles: CandleData[] = historical.quotes
      .filter((q: any) => q.open && q.high && q.low && q.close)
      .map((q: any) => ({
        date: new Date(q.date),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume || 0,
      }));

    if (candles.length < 30) {
      return null;
    }

    const result = analyzeCupidPattern(candles, symbol, companyName, currentPrice);
    return result;
  } catch (error) {
    console.error(`Error detecting Cupid Setup for ${symbol}:`, error);
    return null;
  }
}

function analyzeCupidPattern(
  candles: CandleData[],
  symbol: string,
  name: string,
  currentPrice: number
): CupidSetupResult {
  const details: string[] = [];
  let confidence = 0;

  const { isUptrend, uptrendStrength, swingHigh, swingLow, uptrendStart, uptrendEnd } = 
    detectUptrend(candles);
  
  if (isUptrend) {
    confidence += 25;
    details.push(`Uptrend detected (strength: ${uptrendStrength.toFixed(0)}%)`);
  } else {
    details.push("No clear uptrend detected");
  }

  const { 
    hasPullback, 
    pullbackDepth, 
    pullbackSmoothness, 
    pullbackAngle,
    pullbackLow 
  } = detectPullback(candles, swingHigh, swingLow);

  if (hasPullback) {
    confidence += 20;
    details.push(`Sequential pullback detected`);
  }

  const depthInRange = pullbackDepth >= 30 && pullbackDepth <= 70;
  if (depthInRange) {
    confidence += 20;
    const idealDistance = Math.abs(50 - pullbackDepth);
    const depthBonus = Math.max(0, 10 - idealDistance);
    confidence += depthBonus;
    details.push(`Pullback depth: ${pullbackDepth.toFixed(1)}% (ideal range: 30-70%)`);
  } else {
    details.push(`Pullback depth: ${pullbackDepth.toFixed(1)}% (outside ideal range)`);
  }

  const isSmooth = pullbackSmoothness < 50;
  if (isSmooth) {
    confidence += 15;
    details.push(`Smooth pullback (${pullbackSmoothness.toFixed(0)}% overlap)`);
  } else {
    details.push(`Choppy pullback (${pullbackSmoothness.toFixed(0)}% overlap)`);
  }

  const idealAngle = pullbackAngle >= 30 && pullbackAngle <= 60;
  if (idealAngle) {
    confidence += 10;
    details.push(`Pullback angle: ${pullbackAngle.toFixed(0)}° (ideal ~45°)`);
  } else {
    details.push(`Pullback angle: ${pullbackAngle.toFixed(0)}° (steep or shallow)`);
  }

  const move = swingHigh - swingLow;
  const fib50 = swingHigh - (move * 0.5);
  const fib382 = swingHigh - (move * 0.382);
  const fib618 = swingHigh - (move * 0.618);

  const entryZone = {
    low: Math.min(fib50, fib618),
    high: Math.max(fib50, fib382),
  };

  const stopLoss = swingLow * 0.98;
  const targetPrice = swingHigh * 1.1;
  
  const entryMidpoint = (entryZone.low + entryZone.high) / 2;
  const risk = entryMidpoint - stopLoss;
  const reward = targetPrice - entryMidpoint;
  const riskRewardRatio = risk > 0 ? reward / risk : 0;

  const patternDetected = isUptrend && hasPullback && confidence >= 60;

  return {
    symbol,
    name,
    currentPrice,
    patternDetected,
    confidence: Math.min(100, confidence),
    uptrendStrength,
    pullbackDepth,
    pullbackSmoothness,
    pullbackAngle,
    swingHigh,
    swingLow,
    entryZone,
    stopLoss,
    targetPrice,
    riskRewardRatio,
    details,
  };
}

function detectUptrend(candles: CandleData[]): {
  isUptrend: boolean;
  uptrendStrength: number;
  swingHigh: number;
  swingLow: number;
  uptrendStart: number;
  uptrendEnd: number;
} {
  const recentCandles = candles.slice(-60);
  
  let swingLow = Math.min(...recentCandles.slice(0, 30).map(c => c.low));
  let swingLowIdx = recentCandles.slice(0, 30).findIndex(c => c.low === swingLow);
  
  let swingHigh = Math.max(...recentCandles.slice(swingLowIdx).map(c => c.high));
  let swingHighIdx = recentCandles.slice(swingLowIdx).findIndex(c => c.high === swingHigh) + swingLowIdx;

  const uptrendMove = ((swingHigh - swingLow) / swingLow) * 100;

  let higherHighsCount = 0;
  let higherLowsCount = 0;
  const checkCandles = recentCandles.slice(swingLowIdx, swingHighIdx + 1);
  
  for (let i = 1; i < checkCandles.length; i++) {
    if (checkCandles[i].high > checkCandles[i - 1].high) higherHighsCount++;
    if (checkCandles[i].low > checkCandles[i - 1].low) higherLowsCount++;
  }

  const higherHighsRatio = checkCandles.length > 1 ? higherHighsCount / (checkCandles.length - 1) : 0;
  const higherLowsRatio = checkCandles.length > 1 ? higherLowsCount / (checkCandles.length - 1) : 0;
  
  const uptrendStrength = ((higherHighsRatio + higherLowsRatio) / 2) * 100;
  const isUptrend = uptrendMove >= 10 && uptrendStrength >= 40;

  return {
    isUptrend,
    uptrendStrength,
    swingHigh,
    swingLow,
    uptrendStart: swingLowIdx,
    uptrendEnd: swingHighIdx,
  };
}

function detectPullback(
  candles: CandleData[],
  swingHigh: number,
  swingLow: number
): {
  hasPullback: boolean;
  pullbackDepth: number;
  pullbackSmoothness: number;
  pullbackAngle: number;
  pullbackLow: number;
} {
  const recentCandles = candles.slice(-20);
  
  const swingHighIdx = recentCandles.findIndex(c => c.high === swingHigh);
  const pullbackCandles = swingHighIdx >= 0 
    ? recentCandles.slice(swingHighIdx) 
    : recentCandles.slice(-10);

  const pullbackLow = Math.min(...pullbackCandles.map(c => c.low));
  const currentClose = recentCandles[recentCandles.length - 1].close;

  const move = swingHigh - swingLow;
  const pullbackAmount = swingHigh - pullbackLow;
  const pullbackDepth = move > 0 ? (pullbackAmount / move) * 100 : 0;

  let overlapCount = 0;
  for (let i = 1; i < pullbackCandles.length; i++) {
    const prevCandle = pullbackCandles[i - 1];
    const currCandle = pullbackCandles[i];
    
    const overlapHigh = Math.min(prevCandle.high, currCandle.high);
    const overlapLow = Math.max(prevCandle.low, currCandle.low);
    
    if (overlapHigh > overlapLow) {
      const currRange = currCandle.high - currCandle.low;
      const overlapRange = overlapHigh - overlapLow;
      if (currRange > 0 && (overlapRange / currRange) > 0.5) {
        overlapCount++;
      }
    }
  }
  
  const pullbackSmoothness = pullbackCandles.length > 1 
    ? (overlapCount / (pullbackCandles.length - 1)) * 100 
    : 0;

  const pullbackDays = pullbackCandles.length;
  const priceChange = swingHigh - pullbackLow;
  const angleRad = Math.atan2(priceChange / swingHigh * 100, pullbackDays);
  const pullbackAngle = (angleRad * 180) / Math.PI;

  const hasPullback = pullbackDepth >= 20 && pullbackCandles.length >= 3;

  return {
    hasPullback,
    pullbackDepth,
    pullbackSmoothness,
    pullbackAngle: Math.abs(pullbackAngle),
    pullbackLow,
  };
}

const SCAN_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'NVDA', 'META', 'TSLA', 'JPM', 'V', 'MA',
  'UNH', 'HD', 'PG', 'JNJ', 'XOM', 'CVX', 'ABBV', 'KO', 'PEP', 'MRK',
  'AVGO', 'COST', 'TMO', 'MCD', 'CSCO', 'ACN', 'ABT', 'DHR', 'NKE', 'CMCSA',
  'NFLX', 'ADBE', 'AMD', 'INTC', 'QCOM', 'CRM', 'ORCL', 'TXN', 'PYPL', 'SQ',
  'SHOP', 'COIN', 'PLTR', 'SOFI', 'UBER', 'ABNB', 'DKNG', 'RBLX', 'CRWD', 'PANW'
];

export async function scanForCupidSetups(): Promise<CupidSetupResult[]> {
  const results: CupidSetupResult[] = [];
  const batchSize = 5;

  for (let i = 0; i < SCAN_STOCKS.length; i += batchSize) {
    const batch = SCAN_STOCKS.slice(i, i + batchSize);
    const promises = batch.map(symbol => detectCupidSetup(symbol));
    const batchResults = await Promise.all(promises);
    
    batchResults.forEach(result => {
      if (result) {
        results.push(result);
      }
    });

    if (i + batchSize < SCAN_STOCKS.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return results
    .filter(r => r.patternDetected)
    .sort((a, b) => b.confidence - a.confidence);
}
