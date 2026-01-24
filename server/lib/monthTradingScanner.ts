import yahooFinance from "yahoo-finance2";

export type MonthPatternType = 'breakout' | 'accumulation' | 'momentum' | 'value';

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

async function detectBreakoutPattern(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getWeeklyData(symbol);
    if (!candles || candles.length < 20) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    const recent12 = candles.slice(-12);
    const prior = candles.slice(-24, -12);
    
    const rangeHigh = Math.max(...prior.map(c => c.high));
    const rangeLow = Math.min(...prior.map(c => c.low));
    
    const isBreakingOut = recent12[recent12.length - 1].close > rangeHigh * 0.98;
    const volumeIncrease = recent12.slice(-4).reduce((sum, c) => sum + c.volume, 0) / 
                          prior.slice(-4).reduce((sum, c) => sum + c.volume, 0);
    
    if (!isBreakingOut || volumeIncrease < 1.2) return null;
    
    const weeklyChange = currentPrice - recent12[recent12.length - 2]?.close || 0;
    const weeklyChangePercent = (weeklyChange / (recent12[recent12.length - 2]?.close || 1)) * 100;
    const monthlyChange = currentPrice - recent12[recent12.length - 5]?.close || 0;
    const monthlyChangePercent = (monthlyChange / (recent12[recent12.length - 5]?.close || 1)) * 100;
    
    const entryPrice = currentPrice;
    const stopLoss = rangeLow + (rangeHigh - rangeLow) * 0.3;
    const targetPrice = rangeHigh + (rangeHigh - rangeLow) * 1.5;
    const risk = entryPrice - stopLoss;
    const reward = targetPrice - entryPrice;
    const riskRewardRatio = reward / risk;
    
    return {
      symbol,
      name,
      currentPrice,
      patternType: 'breakout',
      patternName: 'Monthly Breakout',
      confidence: Math.min(95, 60 + volumeIncrease * 10),
      entryPrice,
      stopLoss,
      targetPrice,
      riskRewardRatio,
      supportLevel: rangeLow,
      resistanceLevel: rangeHigh,
      details: [
        `Breaking out above 3-month range high of $${rangeHigh.toFixed(2)}`,
        `Volume increase: ${(volumeIncrease * 100 - 100).toFixed(0)}% above average`,
        `Monthly momentum: ${monthlyChangePercent.toFixed(1)}%`,
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

async function detectAccumulationPattern(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getWeeklyData(symbol);
    if (!candles || candles.length < 20) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    const recent8 = candles.slice(-8);
    const rangeHigh = Math.max(...recent8.map(c => c.high));
    const rangeLow = Math.min(...recent8.map(c => c.low));
    const range = rangeHigh - rangeLow;
    const avgPrice = recent8.reduce((sum, c) => sum + c.close, 0) / recent8.length;
    
    const tightRange = (range / avgPrice) < 0.15;
    
    const volumeTrend = recent8.slice(-4).reduce((sum, c) => sum + c.volume, 0) /
                        recent8.slice(0, 4).reduce((sum, c) => sum + c.volume, 0);
    
    const priceNearLow = (currentPrice - rangeLow) / range < 0.4;
    
    if (!tightRange || !priceNearLow || volumeTrend > 0.8) return null;
    
    const weeklyChange = currentPrice - recent8[recent8.length - 2]?.close || 0;
    const weeklyChangePercent = (weeklyChange / (recent8[recent8.length - 2]?.close || 1)) * 100;
    const monthlyChange = currentPrice - recent8[0]?.close || 0;
    const monthlyChangePercent = (monthlyChange / (recent8[0]?.close || 1)) * 100;
    
    const entryPrice = currentPrice;
    const stopLoss = rangeLow - range * 0.2;
    const targetPrice = rangeHigh + range * 0.5;
    const risk = entryPrice - stopLoss;
    const reward = targetPrice - entryPrice;
    const riskRewardRatio = reward / risk;
    
    return {
      symbol,
      name,
      currentPrice,
      patternType: 'accumulation',
      patternName: 'Accumulation Zone',
      confidence: Math.min(90, 55 + (1 - volumeTrend) * 30),
      entryPrice,
      stopLoss,
      targetPrice,
      riskRewardRatio,
      supportLevel: rangeLow,
      resistanceLevel: rangeHigh,
      details: [
        `Tight 8-week range: $${rangeLow.toFixed(2)} - $${rangeHigh.toFixed(2)}`,
        `Price near support at ${((currentPrice - rangeLow) / range * 100).toFixed(0)}% of range`,
        `Volume drying up: ${((1 - volumeTrend) * 100).toFixed(0)}% decrease`,
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

async function detectMomentumPattern(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getWeeklyData(symbol);
    if (!candles || candles.length < 26) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    const ma8 = candles.slice(-8).reduce((sum, c) => sum + c.close, 0) / 8;
    const ma21 = candles.slice(-21).reduce((sum, c) => sum + c.close, 0) / 21;
    
    const uptrend = currentPrice > ma8 && ma8 > ma21;
    const pullback = (currentPrice - ma8) / ma8 < 0.03;
    
    const recent = candles.slice(-4);
    const higherLows = recent.every((c, i) => i === 0 || c.low >= recent[i-1].low * 0.98);
    
    if (!uptrend || !pullback || !higherLows) return null;
    
    const weeklyChange = currentPrice - candles[candles.length - 2]?.close || 0;
    const weeklyChangePercent = (weeklyChange / (candles[candles.length - 2]?.close || 1)) * 100;
    const monthlyChange = currentPrice - candles[candles.length - 5]?.close || 0;
    const monthlyChangePercent = (monthlyChange / (candles[candles.length - 5]?.close || 1)) * 100;
    
    const recentLow = Math.min(...recent.map(c => c.low));
    const recentHigh = Math.max(...recent.map(c => c.high));
    
    const entryPrice = currentPrice;
    const stopLoss = recentLow - (recentHigh - recentLow) * 0.3;
    const targetPrice = currentPrice + (currentPrice - stopLoss) * 2.5;
    const risk = entryPrice - stopLoss;
    const reward = targetPrice - entryPrice;
    const riskRewardRatio = reward / risk;
    
    return {
      symbol,
      name,
      currentPrice,
      patternType: 'momentum',
      patternName: 'Momentum Pullback',
      confidence: Math.min(85, 65 + ((ma8 - ma21) / ma21) * 100),
      entryPrice,
      stopLoss,
      targetPrice,
      riskRewardRatio,
      supportLevel: ma8,
      resistanceLevel: recentHigh,
      details: [
        `Price above 8-week MA ($${ma8.toFixed(2)}) and 21-week MA ($${ma21.toFixed(2)})`,
        `Pullback to 8-week MA with higher lows pattern`,
        `Strong monthly momentum: ${monthlyChangePercent.toFixed(1)}%`,
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

async function detectValuePattern(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getWeeklyData(symbol);
    if (!candles || candles.length < 52) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    const high52 = Math.max(...candles.map(c => c.high));
    const low52 = Math.min(...candles.map(c => c.low));
    const range52 = high52 - low52;
    
    const nearLow = (currentPrice - low52) / range52 < 0.25;
    
    const recent8 = candles.slice(-8);
    const volumeRecovery = recent8.slice(-4).reduce((sum, c) => sum + c.volume, 0) /
                           recent8.slice(0, 4).reduce((sum, c) => sum + c.volume, 0);
    
    const priceRecovery = recent8[recent8.length - 1].close > recent8[0].close;
    
    if (!nearLow || !priceRecovery || volumeRecovery < 1.1) return null;
    
    const weeklyChange = currentPrice - candles[candles.length - 2]?.close || 0;
    const weeklyChangePercent = (weeklyChange / (candles[candles.length - 2]?.close || 1)) * 100;
    const monthlyChange = currentPrice - candles[candles.length - 5]?.close || 0;
    const monthlyChangePercent = (monthlyChange / (candles[candles.length - 5]?.close || 1)) * 100;
    
    const entryPrice = currentPrice;
    const stopLoss = low52 - range52 * 0.1;
    const targetPrice = low52 + range52 * 0.5;
    const risk = entryPrice - stopLoss;
    const reward = targetPrice - entryPrice;
    const riskRewardRatio = reward / risk;
    
    return {
      symbol,
      name,
      currentPrice,
      patternType: 'value',
      patternName: 'Value Recovery',
      confidence: Math.min(80, 50 + volumeRecovery * 15),
      entryPrice,
      stopLoss,
      targetPrice,
      riskRewardRatio,
      supportLevel: low52,
      resistanceLevel: high52,
      details: [
        `Trading near 52-week low: ${((currentPrice - low52) / range52 * 100).toFixed(0)}% of range`,
        `52-week range: $${low52.toFixed(2)} - $${high52.toFixed(2)}`,
        `Volume recovery: ${((volumeRecovery - 1) * 100).toFixed(0)}% increase`,
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
  
  console.log(`Month Trading Scanner: Analyzing ${symbols.length} stocks...`);
  
  const scanPromises = symbols.map(async (symbol) => {
    try {
      const [breakout, accumulation, momentum, value] = await Promise.all([
        detectBreakoutPattern(symbol).catch(() => null),
        detectAccumulationPattern(symbol).catch(() => null),
        detectMomentumPattern(symbol).catch(() => null),
        detectValuePattern(symbol).catch(() => null),
      ]);
      
      const results: MonthTradingSetup[] = [];
      
      if (breakout && breakout.confidence >= 60) {
        results.push(breakout);
      }
      if (accumulation && accumulation.confidence >= 55) {
        results.push(accumulation);
      }
      if (momentum && momentum.confidence >= 60) {
        results.push(momentum);
      }
      if (value && value.confidence >= 50) {
        results.push(value);
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
