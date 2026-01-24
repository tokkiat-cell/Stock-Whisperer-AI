import yahooFinance from "yahoo-finance2";

export type MonthPatternType = 'powerranger' | 'cupid' | 'tugofwar' | 'rollercoaster';

export interface MonthTradingSetup {
  symbol: string;
  name: string;
  currentPrice: number;
  patternType: MonthPatternType;
  patternName: string;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  riskRewardRatio: number;
  supportLevel: number;
  resistanceLevel: number;
  details: string[];
  weeklyChange: number;
  weeklyChangePercent: number;
  monthlyChange: number;
  monthlyChangePercent: number;
}

interface StockCandle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function getWeeklyData(symbol: string): Promise<StockCandle[] | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    const historical: any = await yahooFinance.chart(symbol.toUpperCase(), {
      period1: startDate,
      period2: endDate,
      interval: "1wk",
    });
    
    if (!historical?.quotes || historical.quotes.length < 10) return null;
    
    return historical.quotes
      .filter((q: any) => q.open && q.high && q.low && q.close)
      .map((q: any) => ({
        date: new Date(q.date),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume || 0,
      }));
  } catch (error) {
    return null;
  }
}

async function detectPowerRangerWeekly(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getWeeklyData(symbol);
    if (!candles || candles.length < 20) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    const recent = candles.slice(-12);
    const prior = candles.slice(-24, -12);
    
    let gapUpWeek = -1;
    for (let i = 1; i < recent.length; i++) {
      const gapPercent = ((recent[i].open - recent[i-1].close) / recent[i-1].close) * 100;
      if (gapPercent >= 3) {
        gapUpWeek = i;
        break;
      }
    }
    
    if (gapUpWeek < 0) return null;
    
    const rangeStart = gapUpWeek;
    const rangeCandles = recent.slice(rangeStart);
    if (rangeCandles.length < 3) return null;
    
    const rangeHigh = Math.max(...rangeCandles.map(c => c.high));
    const rangeLow = Math.min(...rangeCandles.map(c => c.low));
    const rangePercent = ((rangeHigh - rangeLow) / rangeLow) * 100;
    
    if (rangePercent > 15 || currentPrice < rangeLow * 0.98) return null;
    
    const gapPercent = ((recent[gapUpWeek].open - recent[gapUpWeek-1].close) / recent[gapUpWeek-1].close) * 100;
    const weeklyChange = currentPrice - recent[recent.length - 2]?.close || 0;
    const weeklyChangePercent = (weeklyChange / (recent[recent.length - 2]?.close || 1)) * 100;
    const monthlyChange = currentPrice - recent[0]?.close || 0;
    const monthlyChangePercent = (monthlyChange / (recent[0]?.close || 1)) * 100;
    
    const entryPrice = rangeHigh;
    const stopLoss = rangeLow - (rangeHigh - rangeLow) * 0.2;
    const targetPrice = rangeHigh + (rangeHigh - rangeLow) * 2;
    const risk = entryPrice - stopLoss;
    const reward = targetPrice - entryPrice;
    const riskRewardRatio = reward / risk;
    
    return {
      symbol,
      name,
      currentPrice,
      patternType: 'powerranger',
      patternName: 'Power Ranger (Weekly Gap & Range)',
      confidence: Math.min(90, 60 + gapPercent * 3),
      entryPrice,
      stopLoss,
      targetPrice,
      riskRewardRatio,
      supportLevel: rangeLow,
      resistanceLevel: rangeHigh,
      details: [
        `Weekly gap up: ${gapPercent.toFixed(1)}%`,
        `Consolidating in ${rangePercent.toFixed(1)}% range`,
        `Entry on breakout above $${rangeHigh.toFixed(2)}`,
      ],
      weeklyChange,
      weeklyChangePercent,
      monthlyChange,
      monthlyChangePercent,
    };
  } catch (error) {
    return null;
  }
}

async function detectCupidWeekly(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getWeeklyData(symbol);
    if (!candles || candles.length < 20) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    const recent20 = candles.slice(-20);
    const firstHalf = recent20.slice(0, 10);
    const secondHalf = recent20.slice(10);
    
    const firstHalfTrend = (firstHalf[9].close - firstHalf[0].close) / firstHalf[0].close;
    const isUptrend = firstHalfTrend > 0.05;
    
    if (!isUptrend) return null;
    
    const swingHigh = Math.max(...firstHalf.map(c => c.high));
    const swingHighIdx = firstHalf.findIndex(c => c.high === swingHigh);
    
    const pullbackCandles = secondHalf.slice(0, 6);
    const pullbackLow = Math.min(...pullbackCandles.map(c => c.low));
    const pullbackPercent = ((swingHigh - pullbackLow) / swingHigh) * 100;
    
    if (pullbackPercent < 5 || pullbackPercent > 25) return null;
    
    const recentCandles = secondHalf.slice(-4);
    const isRecovering = recentCandles[recentCandles.length - 1].close > recentCandles[0].close;
    
    if (!isRecovering) return null;
    
    const weeklyChange = currentPrice - candles[candles.length - 2]?.close || 0;
    const weeklyChangePercent = (weeklyChange / (candles[candles.length - 2]?.close || 1)) * 100;
    const monthlyChange = currentPrice - candles[candles.length - 5]?.close || 0;
    const monthlyChangePercent = (monthlyChange / (candles[candles.length - 5]?.close || 1)) * 100;
    
    const entryPrice = currentPrice;
    const stopLoss = pullbackLow - (swingHigh - pullbackLow) * 0.2;
    const targetPrice = swingHigh + (swingHigh - pullbackLow);
    const risk = entryPrice - stopLoss;
    const reward = targetPrice - entryPrice;
    const riskRewardRatio = reward / risk;
    
    return {
      symbol,
      name,
      currentPrice,
      patternType: 'cupid',
      patternName: 'Cupid (Uptrend Pullback)',
      confidence: Math.min(85, 55 + firstHalfTrend * 100),
      entryPrice,
      stopLoss,
      targetPrice,
      riskRewardRatio,
      supportLevel: pullbackLow,
      resistanceLevel: swingHigh,
      details: [
        `Uptrend strength: ${(firstHalfTrend * 100).toFixed(1)}%`,
        `Pullback depth: ${pullbackPercent.toFixed(1)}%`,
        `Recovering from pullback low $${pullbackLow.toFixed(2)}`,
      ],
      weeklyChange,
      weeklyChangePercent,
      monthlyChange,
      monthlyChangePercent,
    };
  } catch (error) {
    return null;
  }
}

async function detectTugOfWarWeekly(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getWeeklyData(symbol);
    if (!candles || candles.length < 20) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    const recent10 = candles.slice(-10);
    const rangeHigh = Math.max(...recent10.map(c => c.high));
    const rangeLow = Math.min(...recent10.map(c => c.low));
    const range = rangeHigh - rangeLow;
    const avgPrice = recent10.reduce((sum, c) => sum + c.close, 0) / recent10.length;
    
    const tightRange = (range / avgPrice) < 0.10;
    
    if (!tightRange) return null;
    
    const bodyRanges = recent10.map(c => Math.abs(c.close - c.open) / (c.high - c.low || 1));
    const avgBodyRange = bodyRanges.reduce((sum, r) => sum + r, 0) / bodyRanges.length;
    const hasIndecision = avgBodyRange < 0.5;
    
    if (!hasIndecision) return null;
    
    const priceNearMid = Math.abs(currentPrice - (rangeHigh + rangeLow) / 2) / range < 0.3;
    
    const weeklyChange = currentPrice - candles[candles.length - 2]?.close || 0;
    const weeklyChangePercent = (weeklyChange / (candles[candles.length - 2]?.close || 1)) * 100;
    const monthlyChange = currentPrice - candles[candles.length - 5]?.close || 0;
    const monthlyChangePercent = (monthlyChange / (candles[candles.length - 5]?.close || 1)) * 100;
    
    const entryPrice = rangeHigh;
    const stopLoss = rangeLow - range * 0.1;
    const targetPrice = rangeHigh + range * 2;
    const risk = entryPrice - stopLoss;
    const reward = targetPrice - entryPrice;
    const riskRewardRatio = reward / risk;
    
    return {
      symbol,
      name,
      currentPrice,
      patternType: 'tugofwar',
      patternName: 'Tug of War (Tight Consolidation)',
      confidence: Math.min(80, 50 + (1 - avgBodyRange) * 50),
      entryPrice,
      stopLoss,
      targetPrice,
      riskRewardRatio,
      supportLevel: rangeLow,
      resistanceLevel: rangeHigh,
      details: [
        `10-week range: ${((range / avgPrice) * 100).toFixed(1)}%`,
        `Price consolidating between $${rangeLow.toFixed(2)} - $${rangeHigh.toFixed(2)}`,
        `Entry on breakout above resistance`,
      ],
      weeklyChange,
      weeklyChangePercent,
      monthlyChange,
      monthlyChangePercent,
    };
  } catch (error) {
    return null;
  }
}

async function detectRollercoasterWeekly(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getWeeklyData(symbol);
    if (!candles || candles.length < 30) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    const older = candles.slice(-30, -10);
    const recent = candles.slice(-10);
    
    const olderHigh = Math.max(...older.map(c => c.high));
    const olderLow = Math.min(...older.map(c => c.low));
    const declinePercent = ((olderHigh - olderLow) / olderHigh) * 100;
    
    if (declinePercent < 15) return null;
    
    const recentHigh = Math.max(...recent.map(c => c.high));
    const recentLow = Math.min(...recent.map(c => c.low));
    const isReversal = currentPrice > recentLow + (recentHigh - recentLow) * 0.5;
    
    const volumeRecent = recent.slice(-3).reduce((sum, c) => sum + c.volume, 0) / 3;
    const volumeOlder = older.slice(-3).reduce((sum, c) => sum + c.volume, 0) / 3;
    const volumeIncrease = volumeRecent > volumeOlder * 0.8;
    
    if (!isReversal || !volumeIncrease) return null;
    
    const weeklyChange = currentPrice - candles[candles.length - 2]?.close || 0;
    const weeklyChangePercent = (weeklyChange / (candles[candles.length - 2]?.close || 1)) * 100;
    const monthlyChange = currentPrice - candles[candles.length - 5]?.close || 0;
    const monthlyChangePercent = (monthlyChange / (candles[candles.length - 5]?.close || 1)) * 100;
    
    const entryPrice = currentPrice;
    const stopLoss = recentLow - (recentHigh - recentLow) * 0.2;
    const targetPrice = olderHigh * 0.8;
    const risk = entryPrice - stopLoss;
    const reward = targetPrice - entryPrice;
    const riskRewardRatio = Math.max(0.5, reward / risk);
    
    return {
      symbol,
      name,
      currentPrice,
      patternType: 'rollercoaster',
      patternName: 'Rollercoaster (Decline & Reversal)',
      confidence: Math.min(75, 45 + declinePercent),
      entryPrice,
      stopLoss,
      targetPrice,
      riskRewardRatio,
      supportLevel: recentLow,
      resistanceLevel: olderHigh,
      details: [
        `Prior decline: ${declinePercent.toFixed(1)}%`,
        `Reversal from $${recentLow.toFixed(2)}`,
        `Target recovery to $${targetPrice.toFixed(2)}`,
      ],
      weeklyChange,
      weeklyChangePercent,
      monthlyChange,
      monthlyChangePercent,
    };
  } catch (error) {
    return null;
  }
}

export async function scanMonthTradingSetups(symbols: string[]): Promise<MonthTradingSetup[]> {
  const setups: MonthTradingSetup[] = [];
  
  console.log(`Month Trading Scanner: Analyzing ${symbols.length} stocks with 4 pattern types...`);
  
  const scanPromises = symbols.map(async (symbol) => {
    try {
      const [powerranger, cupid, tugofwar, rollercoaster] = await Promise.all([
        detectPowerRangerWeekly(symbol).catch(() => null),
        detectCupidWeekly(symbol).catch(() => null),
        detectTugOfWarWeekly(symbol).catch(() => null),
        detectRollercoasterWeekly(symbol).catch(() => null),
      ]);
      
      const results: MonthTradingSetup[] = [];
      
      if (powerranger && powerranger.confidence >= 60) {
        results.push(powerranger);
      }
      if (cupid && cupid.confidence >= 55) {
        results.push(cupid);
      }
      if (tugofwar && tugofwar.confidence >= 50) {
        results.push(tugofwar);
      }
      if (rollercoaster && rollercoaster.confidence >= 45) {
        results.push(rollercoaster);
      }
      
      return results;
    } catch (error) {
      console.error(`Error scanning ${symbol}:`, error);
      return [];
    }
  });
  
  const allResults = await Promise.all(scanPromises);
  allResults.forEach(results => setups.push(...results));
  
  setups.sort((a, b) => b.confidence - a.confidence);
  
  console.log(`Month Trading Scanner: Found ${setups.length} setups`);
  
  return setups;
}

const DEFAULT_SWING_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'NFLX', 'CRM',
  'ADBE', 'INTC', 'QCOM', 'AVGO', 'TXN', 'MU', 'AMAT', 'LRCX', 'KLAC', 'SNPS',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'SCHW', 'USB', 'PNC', 'COF',
  'UNH', 'JNJ', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'DHR', 'ABT', 'ISRG',
];

export async function scanDefaultMonthSetups(): Promise<MonthTradingSetup[]> {
  return scanMonthTradingSetups(DEFAULT_SWING_STOCKS);
}
