import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

interface OHLC {
  open: number;
  high: number;
  low: number;
  close: number;
}

export interface PatternResult {
  pattern: string;
  type: 'bullish' | 'bearish' | 'neutral';
  confidence: number;
  description: string;
}

export interface PatternScore {
  buyScore: number;
  sellScore: number;
  patterns: PatternResult[];
}

function bodySize(candle: OHLC): number {
  return Math.abs(candle.close - candle.open);
}

function upperShadow(candle: OHLC): number {
  return candle.high - Math.max(candle.open, candle.close);
}

function lowerShadow(candle: OHLC): number {
  return Math.min(candle.open, candle.close) - candle.low;
}

function range(candle: OHLC): number {
  return candle.high - candle.low;
}

function isBullish(candle: OHLC): boolean {
  return candle.close > candle.open;
}

function isBearish(candle: OHLC): boolean {
  return candle.close < candle.open;
}

function isDoji(candle: OHLC): boolean {
  const body = bodySize(candle);
  const totalRange = range(candle);
  return totalRange > 0 && body / totalRange < 0.1;
}

function isHammer(candle: OHLC): boolean {
  const body = bodySize(candle);
  const lower = lowerShadow(candle);
  const upper = upperShadow(candle);
  const totalRange = range(candle);
  
  if (totalRange === 0) return false;
  
  return (
    lower >= body * 2 &&
    upper <= body * 0.3 &&
    body / totalRange >= 0.1 &&
    body / totalRange <= 0.4
  );
}

function isInvertedHammer(candle: OHLC): boolean {
  const body = bodySize(candle);
  const lower = lowerShadow(candle);
  const upper = upperShadow(candle);
  const totalRange = range(candle);
  
  if (totalRange === 0) return false;
  
  return (
    upper >= body * 2 &&
    lower <= body * 0.3 &&
    body / totalRange >= 0.1 &&
    body / totalRange <= 0.4
  );
}

function isShootingStar(candle: OHLC, prevCandle: OHLC): boolean {
  return isInvertedHammer(candle) && isBullish(prevCandle) && candle.open > prevCandle.close;
}

function isHangingMan(candle: OHLC, prevCandle: OHLC): boolean {
  return isHammer(candle) && isBullish(prevCandle) && candle.open > prevCandle.close;
}

function isBullishEngulfing(curr: OHLC, prev: OHLC): boolean {
  return (
    isBearish(prev) &&
    isBullish(curr) &&
    curr.open < prev.close &&
    curr.close > prev.open
  );
}

function isBearishEngulfing(curr: OHLC, prev: OHLC): boolean {
  return (
    isBullish(prev) &&
    isBearish(curr) &&
    curr.open > prev.close &&
    curr.close < prev.open
  );
}

function isMorningStar(candles: OHLC[]): boolean {
  if (candles.length < 3) return false;
  const [first, second, third] = candles.slice(-3);
  
  const firstBody = bodySize(first);
  const secondBody = bodySize(second);
  const thirdBody = bodySize(third);
  
  return (
    isBearish(first) &&
    firstBody > secondBody * 2 &&
    isBullish(third) &&
    thirdBody > secondBody * 2 &&
    third.close > (first.open + first.close) / 2
  );
}

function isEveningStar(candles: OHLC[]): boolean {
  if (candles.length < 3) return false;
  const [first, second, third] = candles.slice(-3);
  
  const firstBody = bodySize(first);
  const secondBody = bodySize(second);
  const thirdBody = bodySize(third);
  
  return (
    isBullish(first) &&
    firstBody > secondBody * 2 &&
    isBearish(third) &&
    thirdBody > secondBody * 2 &&
    third.close < (first.open + first.close) / 2
  );
}

function isThreeWhiteSoldiers(candles: OHLC[]): boolean {
  if (candles.length < 3) return false;
  const last3 = candles.slice(-3);
  
  return last3.every((c, i) => {
    if (!isBullish(c)) return false;
    if (i === 0) return true;
    const prev = last3[i - 1];
    return c.open > prev.open && c.open < prev.close && c.close > prev.close;
  });
}

function isThreeBlackCrows(candles: OHLC[]): boolean {
  if (candles.length < 3) return false;
  const last3 = candles.slice(-3);
  
  return last3.every((c, i) => {
    if (!isBearish(c)) return false;
    if (i === 0) return true;
    const prev = last3[i - 1];
    return c.open < prev.open && c.open > prev.close && c.close < prev.close;
  });
}

function isPiercingLine(curr: OHLC, prev: OHLC): boolean {
  if (!isBearish(prev) || !isBullish(curr)) return false;
  
  const prevMid = (prev.open + prev.close) / 2;
  return curr.open < prev.close && curr.close > prevMid && curr.close < prev.open;
}

function isDarkCloudCover(curr: OHLC, prev: OHLC): boolean {
  if (!isBullish(prev) || !isBearish(curr)) return false;
  
  const prevMid = (prev.open + prev.close) / 2;
  return curr.open > prev.close && curr.close < prevMid && curr.close > prev.open;
}

function isTweezerTop(curr: OHLC, prev: OHLC): boolean {
  const tolerance = range(curr) * 0.02;
  return (
    isBullish(prev) &&
    isBearish(curr) &&
    Math.abs(curr.high - prev.high) <= tolerance
  );
}

function isTweezerBottom(curr: OHLC, prev: OHLC): boolean {
  const tolerance = range(curr) * 0.02;
  return (
    isBearish(prev) &&
    isBullish(curr) &&
    Math.abs(curr.low - prev.low) <= tolerance
  );
}

function isMarubozu(candle: OHLC): 'bullish' | 'bearish' | null {
  const body = bodySize(candle);
  const totalRange = range(candle);
  const upper = upperShadow(candle);
  const lower = lowerShadow(candle);
  
  if (totalRange === 0) return null;
  
  const shadowRatio = (upper + lower) / totalRange;
  if (shadowRatio > 0.05) return null;
  
  if (isBullish(candle)) return 'bullish';
  if (isBearish(candle)) return 'bearish';
  return null;
}

function isSpinningTop(candle: OHLC): boolean {
  const body = bodySize(candle);
  const upper = upperShadow(candle);
  const lower = lowerShadow(candle);
  const totalRange = range(candle);
  
  if (totalRange === 0) return false;
  
  return (
    body / totalRange < 0.3 &&
    upper > body &&
    lower > body
  );
}

export function detectPatterns(candles: OHLC[]): PatternResult[] {
  const patterns: PatternResult[] = [];
  
  if (candles.length < 2) return patterns;
  
  const curr = candles[candles.length - 1];
  const prev = candles[candles.length - 2];
  
  if (isDoji(curr)) {
    patterns.push({
      pattern: 'Doji',
      type: 'neutral',
      confidence: 0.7,
      description: 'Indecision in the market, potential reversal'
    });
  }
  
  if (isHammer(curr) && isBearish(prev)) {
    patterns.push({
      pattern: 'Hammer',
      type: 'bullish',
      confidence: 0.75,
      description: 'Bullish reversal pattern after downtrend'
    });
  }
  
  if (isInvertedHammer(curr) && isBearish(prev)) {
    patterns.push({
      pattern: 'Inverted Hammer',
      type: 'bullish',
      confidence: 0.65,
      description: 'Potential bullish reversal after downtrend'
    });
  }
  
  if (isShootingStar(curr, prev)) {
    patterns.push({
      pattern: 'Shooting Star',
      type: 'bearish',
      confidence: 0.75,
      description: 'Bearish reversal pattern after uptrend'
    });
  }
  
  if (isHangingMan(curr, prev)) {
    patterns.push({
      pattern: 'Hanging Man',
      type: 'bearish',
      confidence: 0.7,
      description: 'Bearish reversal warning after uptrend'
    });
  }
  
  if (isBullishEngulfing(curr, prev)) {
    patterns.push({
      pattern: 'Bullish Engulfing',
      type: 'bullish',
      confidence: 0.8,
      description: 'Strong bullish reversal pattern'
    });
  }
  
  if (isBearishEngulfing(curr, prev)) {
    patterns.push({
      pattern: 'Bearish Engulfing',
      type: 'bearish',
      confidence: 0.8,
      description: 'Strong bearish reversal pattern'
    });
  }
  
  if (isPiercingLine(curr, prev)) {
    patterns.push({
      pattern: 'Piercing Line',
      type: 'bullish',
      confidence: 0.7,
      description: 'Bullish reversal pattern'
    });
  }
  
  if (isDarkCloudCover(curr, prev)) {
    patterns.push({
      pattern: 'Dark Cloud Cover',
      type: 'bearish',
      confidence: 0.7,
      description: 'Bearish reversal pattern'
    });
  }
  
  if (isTweezerTop(curr, prev)) {
    patterns.push({
      pattern: 'Tweezer Top',
      type: 'bearish',
      confidence: 0.65,
      description: 'Bearish reversal at resistance'
    });
  }
  
  if (isTweezerBottom(curr, prev)) {
    patterns.push({
      pattern: 'Tweezer Bottom',
      type: 'bullish',
      confidence: 0.65,
      description: 'Bullish reversal at support'
    });
  }
  
  const marubozu = isMarubozu(curr);
  if (marubozu === 'bullish') {
    patterns.push({
      pattern: 'Bullish Marubozu',
      type: 'bullish',
      confidence: 0.85,
      description: 'Strong bullish momentum, no shadows'
    });
  } else if (marubozu === 'bearish') {
    patterns.push({
      pattern: 'Bearish Marubozu',
      type: 'bearish',
      confidence: 0.85,
      description: 'Strong bearish momentum, no shadows'
    });
  }
  
  if (isSpinningTop(curr)) {
    patterns.push({
      pattern: 'Spinning Top',
      type: 'neutral',
      confidence: 0.6,
      description: 'Indecision, small body with long shadows'
    });
  }
  
  if (candles.length >= 3) {
    if (isMorningStar(candles)) {
      patterns.push({
        pattern: 'Morning Star',
        type: 'bullish',
        confidence: 0.85,
        description: 'Strong bullish reversal, three-candle pattern'
      });
    }
    
    if (isEveningStar(candles)) {
      patterns.push({
        pattern: 'Evening Star',
        type: 'bearish',
        confidence: 0.85,
        description: 'Strong bearish reversal, three-candle pattern'
      });
    }
    
    if (isThreeWhiteSoldiers(candles)) {
      patterns.push({
        pattern: 'Three White Soldiers',
        type: 'bullish',
        confidence: 0.9,
        description: 'Very strong bullish continuation'
      });
    }
    
    if (isThreeBlackCrows(candles)) {
      patterns.push({
        pattern: 'Three Black Crows',
        type: 'bearish',
        confidence: 0.9,
        description: 'Very strong bearish continuation'
      });
    }
  }
  
  return patterns;
}

export function calculatePatternScore(patterns: PatternResult[]): PatternScore {
  let buyScore = 0;
  let sellScore = 0;
  
  for (const pattern of patterns) {
    const weight = pattern.confidence;
    
    if (pattern.type === 'bullish') {
      buyScore += weight * 100;
    } else if (pattern.type === 'bearish') {
      sellScore += weight * 100;
    } else {
      buyScore += weight * 25;
      sellScore += weight * 25;
    }
  }
  
  const maxScore = Math.max(buyScore, sellScore, 1);
  buyScore = Math.min(100, (buyScore / maxScore) * 100);
  sellScore = Math.min(100, (sellScore / maxScore) * 100);
  
  return {
    buyScore: Math.round(buyScore),
    sellScore: Math.round(sellScore),
    patterns
  };
}

export async function getLocalPatternAnalysis(symbol: string): Promise<PatternScore | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    
    const result = await yahooFinance.chart(symbol, {
      period1: startDate,
      period2: endDate,
      interval: '1d'
    }) as { quotes?: Array<{ open?: number; high?: number; low?: number; close?: number }> };
    
    if (!result.quotes || result.quotes.length < 5) {
      return null;
    }
    
    const candles: OHLC[] = result.quotes
      .filter((q): q is { open: number; high: number; low: number; close: number } => 
        q.open != null && q.high != null && q.low != null && q.close != null)
      .map(q => ({
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close
      }));
    
    if (candles.length < 5) {
      return null;
    }
    
    const patterns = detectPatterns(candles);
    return calculatePatternScore(patterns);
    
  } catch (error) {
    console.error(`Error getting local pattern analysis for ${symbol}:`, error);
    return null;
  }
}
