import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

export type MonthPatternType = 'powerranger' | 'cupid' | 'tugofwar' | 'rollercoaster' | 'breakout' | 'accumulation' | 'momentum' | 'value';

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
  marketCap?: number;
}

interface StockCandle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function getDailyData(symbol: string): Promise<StockCandle[] | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    const historical: any = await yahooFinance.chart(symbol.toUpperCase(), {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });
    
    if (!historical?.quotes || historical.quotes.length < 20) {
      console.log(`[MonthScanner] ${symbol}: insufficient daily data`);
      return null;
    }
    
    const candles = historical.quotes
      .filter((q: any) => q.open && q.high && q.low && q.close)
      .map((q: any) => ({
        date: new Date(q.date),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume || 0,
      }));
    
    console.log(`[MonthScanner] ${symbol}: got ${candles.length} daily candles`);
    return candles;
  } catch (error) {
    console.error(`[MonthScanner] ${symbol}: fetch error`, error);
    return null;
  }
}

async function getQuoteData(symbol: string): Promise<{ price: number; name: string; marketCap?: number } | null> {
  try {
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    return {
      price: quote?.regularMarketPrice || 0,
      name: quote?.shortName || quote?.longName || symbol,
      marketCap: quote?.marketCap,
    };
  } catch {
    return null;
  }
}

function calculateChanges(candles: StockCandle[], currentPrice: number) {
  // For daily candles: weekly = last 5 trading days, monthly = last 22 trading days
  const weeklyChange = currentPrice - (candles[candles.length - 6]?.close || currentPrice);
  const weeklyChangePercent = (weeklyChange / (candles[candles.length - 6]?.close || 1)) * 100;
  const monthlyChange = currentPrice - (candles[candles.length - 23]?.close || currentPrice);
  const monthlyChangePercent = (monthlyChange / (candles[candles.length - 23]?.close || 1)) * 100;
  return { weeklyChange, weeklyChangePercent, monthlyChange, monthlyChangePercent };
}

async function detectPowerRangerDaily(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getDailyData(symbol);
    if (!candles || candles.length < 30) return null;
    
    const quoteData = await getQuoteData(symbol);
    if (!quoteData) return null;
    const { price: currentPrice, name, marketCap } = quoteData;
    
    // Look at last 20 daily candles (~1 month)
    const recent = candles.slice(-20);
    
    let gapUpDay = -1;
    let gapPercent = 0;
    for (let i = 1; i < recent.length; i++) {
      const gap = ((recent[i].open - recent[i-1].close) / recent[i-1].close) * 100;
      if (gap >= 1.5) {
        gapUpDay = i;
        gapPercent = gap;
        break;
      }
    }
    
    if (gapUpDay < 0) return null;
    
    const rangeCandles = recent.slice(gapUpDay);
    if (rangeCandles.length < 3) return null;
    
    const rangeHigh = Math.max(...rangeCandles.map(c => c.high));
    const rangeLow = Math.min(...rangeCandles.map(c => c.low));
    const rangePercent = ((rangeHigh - rangeLow) / rangeLow) * 100;
    
    // Daily consolidation should be tighter: < 12%
    if (rangePercent > 12) return null;
    
    const changes = calculateChanges(candles, currentPrice);
    
    const entryPrice = rangeHigh;
    const stopLoss = rangeLow - (rangeHigh - rangeLow) * 0.2;
    const targetPrice = rangeHigh + (rangeHigh - rangeLow) * 2;
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = (targetPrice - entryPrice) / risk;
    
    return {
      symbol, name, currentPrice, marketCap,
      patternType: 'powerranger',
      patternName: 'Power Ranger (Daily)',
      confidence: Math.min(85, 55 + gapPercent * 5),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: rangeLow, resistanceLevel: rangeHigh,
      details: [`Gap up: ${gapPercent.toFixed(1)}%`, `Range: ${rangePercent.toFixed(1)}%`, `Entry above $${rangeHigh.toFixed(2)}`],
      ...changes,
    };
  } catch { return null; }
}

async function detectCupidDaily(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getDailyData(symbol);
    if (!candles || candles.length < 40) return null;
    
    const quoteData = await getQuoteData(symbol);
    if (!quoteData) return null;
    const { price: currentPrice, name, marketCap } = quoteData;
    
    // Look at last 40 daily candles (~2 months)
    const recent = candles.slice(-40);
    const firstHalf = recent.slice(0, 25);
    const secondHalf = recent.slice(25);
    
    const firstHalfTrend = (firstHalf[24].close - firstHalf[0].close) / firstHalf[0].close;
    if (firstHalfTrend < 0.05) return null;
    
    const swingHigh = Math.max(...firstHalf.map(c => c.high));
    const pullbackLow = Math.min(...secondHalf.slice(0, 10).map(c => c.low));
    const pullbackPercent = ((swingHigh - pullbackLow) / swingHigh) * 100;
    
    if (pullbackPercent < 3 || pullbackPercent > 25) return null;
    
    const isRecovering = secondHalf[secondHalf.length - 1].close > secondHalf[0].close;
    if (!isRecovering) return null;
    
    const changes = calculateChanges(candles, currentPrice);
    
    const entryPrice = currentPrice;
    const stopLoss = pullbackLow - (swingHigh - pullbackLow) * 0.2;
    const targetPrice = swingHigh + (swingHigh - pullbackLow);
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = Math.max(0.5, (targetPrice - entryPrice) / risk);
    
    return {
      symbol, name, currentPrice, marketCap,
      patternType: 'cupid',
      patternName: 'Cupid (Daily Pullback)',
      confidence: Math.min(80, 50 + firstHalfTrend * 100),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: pullbackLow, resistanceLevel: swingHigh,
      details: [`Uptrend: ${(firstHalfTrend * 100).toFixed(1)}%`, `Pullback: ${pullbackPercent.toFixed(1)}%`, `Recovering from $${pullbackLow.toFixed(2)}`],
      ...changes,
    };
  } catch { return null; }
}

async function detectTugOfWarDaily(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getDailyData(symbol);
    if (!candles || candles.length < 30) return null;
    
    const quoteData = await getQuoteData(symbol);
    if (!quoteData) return null;
    const { price: currentPrice, name, marketCap } = quoteData;
    
    // Look at last 20 daily candles (~1 month)
    const recent = candles.slice(-20);
    const rangeHigh = Math.max(...recent.map(c => c.high));
    const rangeLow = Math.min(...recent.map(c => c.low));
    const avgPrice = recent.reduce((sum, c) => sum + c.close, 0) / recent.length;
    const rangePercent = ((rangeHigh - rangeLow) / avgPrice) * 100;
    
    // Daily range threshold: < 15%
    if (rangePercent > 15) return null;
    
    const changes = calculateChanges(candles, currentPrice);
    
    const range = rangeHigh - rangeLow;
    const entryPrice = rangeHigh;
    const stopLoss = rangeLow - range * 0.15;
    const targetPrice = rangeHigh + range * 1.5;
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = (targetPrice - entryPrice) / risk;
    
    return {
      symbol, name, currentPrice, marketCap,
      patternType: 'tugofwar',
      patternName: 'Tug of War (Daily)',
      confidence: Math.min(75, 45 + (10 - rangePercent) * 3),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: rangeLow, resistanceLevel: rangeHigh,
      details: [`20-day range: ${rangePercent.toFixed(1)}%`, `Support: $${rangeLow.toFixed(2)}`, `Resistance: $${rangeHigh.toFixed(2)}`],
      ...changes,
    };
  } catch { return null; }
}

async function detectRollercoasterDaily(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getDailyData(symbol);
    if (!candles || candles.length < 50) return null;
    
    const quoteData = await getQuoteData(symbol);
    if (!quoteData) return null;
    const { price: currentPrice, name, marketCap } = quoteData;
    
    // Look at 40 days for decline, last 10 for reversal
    const older = candles.slice(-50, -10);
    const recent = candles.slice(-10);
    
    const olderHigh = Math.max(...older.map(c => c.high));
    const olderLow = Math.min(...older.map(c => c.low));
    const declinePercent = ((olderHigh - olderLow) / olderHigh) * 100;
    
    // Need at least 8% decline
    if (declinePercent < 8) return null;
    
    const recentLow = Math.min(...recent.map(c => c.low));
    const isReversal = currentPrice > recentLow * 1.02;
    if (!isReversal) return null;
    
    const changes = calculateChanges(candles, currentPrice);
    
    const entryPrice = currentPrice;
    const stopLoss = recentLow * 0.97;
    const targetPrice = olderHigh * 0.85;
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = Math.max(0.5, (targetPrice - entryPrice) / risk);
    
    return {
      symbol, name, currentPrice, marketCap,
      patternType: 'rollercoaster',
      patternName: 'Rollercoaster (Daily)',
      confidence: Math.min(70, 40 + declinePercent * 1.2),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: recentLow, resistanceLevel: olderHigh,
      details: [`Prior decline: ${declinePercent.toFixed(1)}%`, `Reversal from $${recentLow.toFixed(2)}`, `Target: $${targetPrice.toFixed(2)}`],
      ...changes,
    };
  } catch { return null; }
}

async function detectBreakoutDaily(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getDailyData(symbol);
    if (!candles || candles.length < 30) return null;
    
    const quoteData = await getQuoteData(symbol);
    if (!quoteData) return null;
    const { price: currentPrice, name, marketCap } = quoteData;
    
    // Look at 25 days for base, last 5 for breakout
    const older = candles.slice(-30, -5);
    const recent = candles.slice(-5);
    
    const resistanceLevel = Math.max(...older.map(c => c.high));
    const supportLevel = Math.min(...older.map(c => c.low));
    
    const isBreakingOut = recent.some(c => c.close > resistanceLevel * 0.99);
    const avgVolume = older.slice(-10).reduce((sum, c) => sum + c.volume, 0) / 10;
    const recentAvgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length;
    const volumeIncrease = recentAvgVolume > avgVolume * 1.2;
    
    if (!isBreakingOut) return null;
    
    const changes = calculateChanges(candles, currentPrice);
    
    const range = resistanceLevel - supportLevel;
    const entryPrice = resistanceLevel;
    const stopLoss = resistanceLevel - range * 0.25;
    const targetPrice = resistanceLevel + range * 0.7;
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = (targetPrice - entryPrice) / risk;
    
    return {
      symbol, name, currentPrice, marketCap,
      patternType: 'breakout',
      patternName: 'Breakout (Daily)',
      confidence: Math.min(80, 55 + (volumeIncrease ? 15 : 0)),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel, resistanceLevel,
      details: [`Breaking $${resistanceLevel.toFixed(2)} resistance`, volumeIncrease ? 'Volume confirming' : 'Low volume', `Target: $${targetPrice.toFixed(2)}`],
      ...changes,
    };
  } catch { return null; }
}

async function detectAccumulationDaily(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getDailyData(symbol);
    if (!candles || candles.length < 30) return null;
    
    const quoteData = await getQuoteData(symbol);
    if (!quoteData) return null;
    const { price: currentPrice, name, marketCap } = quoteData;
    
    // Look at last 25 daily candles (~5 weeks)
    const recent = candles.slice(-25);
    const rangeHigh = Math.max(...recent.map(c => c.high));
    const rangeLow = Math.min(...recent.map(c => c.low));
    const rangePercent = ((rangeHigh - rangeLow) / rangeLow) * 100;
    
    // Daily range threshold: < 10%
    if (rangePercent > 10) return null;
    
    const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length;
    const recentVolume = recent.slice(-5).reduce((sum, c) => sum + c.volume, 0) / 5;
    const volumeIncreasing = recentVolume > avgVolume * 0.9;
    
    const priceNearHigh = currentPrice > rangeLow + (rangeHigh - rangeLow) * 0.6;
    
    if (!priceNearHigh) return null;
    
    const changes = calculateChanges(candles, currentPrice);
    
    const range = rangeHigh - rangeLow;
    const entryPrice = rangeHigh;
    const stopLoss = rangeLow - range * 0.1;
    const targetPrice = rangeHigh + range * 1.5;
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = (targetPrice - entryPrice) / risk;
    
    return {
      symbol, name, currentPrice, marketCap,
      patternType: 'accumulation',
      patternName: 'Accumulation (Daily)',
      confidence: Math.min(75, 50 + (volumeIncreasing ? 15 : 0) + (10 - rangePercent)),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: rangeLow, resistanceLevel: rangeHigh,
      details: [`25-day base: ${rangePercent.toFixed(1)}% range`, volumeIncreasing ? 'Volume building' : 'Steady volume', `Entry above $${rangeHigh.toFixed(2)}`],
      ...changes,
    };
  } catch { return null; }
}

async function detectMomentumDaily(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getDailyData(symbol);
    if (!candles || candles.length < 40) return null;
    
    const quoteData = await getQuoteData(symbol);
    if (!quoteData) return null;
    const { price: currentPrice, name, marketCap } = quoteData;
    
    // Look at last 20 days vs prior 20 days
    const recent20 = candles.slice(-20);
    const older20 = candles.slice(-40, -20);
    
    const recentTrend = (recent20[recent20.length-1].close - recent20[0].close) / recent20[0].close * 100;
    const olderTrend = older20.length >= 20 ? (older20[older20.length-1].close - older20[0].close) / older20[0].close * 100 : 0;
    
    // Need at least 3% trend
    if (recentTrend < 3) return null;
    
    const accelerating = recentTrend > olderTrend;
    
    const changes = calculateChanges(candles, currentPrice);
    
    const recentHigh = Math.max(...recent20.map(c => c.high));
    const recentLow = Math.min(...recent20.map(c => c.low));
    
    const entryPrice = currentPrice;
    const stopLoss = recentLow - (recentHigh - recentLow) * 0.15;
    const targetPrice = currentPrice * (1 + recentTrend / 100 * 0.6);
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = Math.max(0.5, (targetPrice - entryPrice) / risk);
    
    return {
      symbol, name, currentPrice, marketCap,
      patternType: 'momentum',
      patternName: 'Momentum (Daily)',
      confidence: Math.min(80, 45 + recentTrend * 1.2 + (accelerating ? 10 : 0)),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: recentLow, resistanceLevel: recentHigh,
      details: [`20-day gain: ${recentTrend.toFixed(1)}%`, accelerating ? 'Momentum accelerating' : 'Steady momentum', `Target: $${targetPrice.toFixed(2)}`],
      ...changes,
    };
  } catch { return null; }
}

async function detectValueDaily(symbol: string): Promise<MonthTradingSetup | null> {
  try {
    const candles = await getDailyData(symbol);
    if (!candles || candles.length < 60) return null;
    
    const quoteData = await getQuoteData(symbol);
    if (!quoteData) return null;
    const { price: currentPrice, name, marketCap } = quoteData;
    
    const allHighs = candles.map(c => c.high);
    const high52w = Math.max(...allHighs);
    const low52w = Math.min(...candles.map(c => c.low));
    
    const fromHigh = ((high52w - currentPrice) / high52w) * 100;
    const fromLow = ((currentPrice - low52w) / low52w) * 100;
    
    if (fromHigh < 5 || fromHigh > 60) return null;
    
    const recent = candles.slice(-4);
    const isStabilizing = recent.every(c => c.close > low52w * 1.05);
    
    if (!isStabilizing) return null;
    
    const changes = calculateChanges(candles, currentPrice);
    
    const entryPrice = currentPrice;
    const stopLoss = low52w * 0.95;
    const targetPrice = high52w * 0.8;
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = Math.max(0.5, (targetPrice - entryPrice) / risk);
    
    return {
      symbol, name, currentPrice, marketCap,
      patternType: 'value',
      patternName: 'Value (Pullback Opportunity)',
      confidence: Math.min(70, 40 + fromHigh * 0.8),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: low52w, resistanceLevel: high52w,
      details: [`${fromHigh.toFixed(1)}% off 52w high`, `${fromLow.toFixed(1)}% above 52w low`, 'Price stabilizing'],
      ...changes,
    };
  } catch { return null; }
}

export async function scanMonthTradingSetups(symbols: string[]): Promise<MonthTradingSetup[]> {
  const setups: MonthTradingSetup[] = [];
  
  console.log(`Month Trading Scanner: Analyzing ${symbols.length} stocks with 8 pattern types...`);
  
  const batchSize = 5;
  for (let i = 0; i < symbols.length; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    
    const batchResults = await Promise.all(
      batch.map(async (symbol) => {
        try {
          const [powerranger, cupid, tugofwar, rollercoaster, breakout, accumulation, momentum, value] = await Promise.all([
            detectPowerRangerDaily(symbol).catch((e: any) => { console.log(`[MonthScanner] ${symbol} powerranger error:`, e); return null; }),
            detectCupidDaily(symbol).catch((e: any) => { console.log(`[MonthScanner] ${symbol} cupid error:`, e); return null; }),
            detectTugOfWarDaily(symbol).catch((e: any) => { console.log(`[MonthScanner] ${symbol} tugofwar error:`, e); return null; }),
            detectRollercoasterDaily(symbol).catch((e: any) => { console.log(`[MonthScanner] ${symbol} rollercoaster error:`, e); return null; }),
            detectBreakoutDaily(symbol).catch((e: any) => { console.log(`[MonthScanner] ${symbol} breakout error:`, e); return null; }),
            detectAccumulationDaily(symbol).catch((e: any) => { console.log(`[MonthScanner] ${symbol} accumulation error:`, e); return null; }),
            detectMomentumDaily(symbol).catch((e: any) => { console.log(`[MonthScanner] ${symbol} momentum error:`, e); return null; }),
            detectValueDaily(symbol).catch((e: any) => { console.log(`[MonthScanner] ${symbol} value error:`, e); return null; }),
          ]);
          
          const results: MonthTradingSetup[] = [];
          
          console.log(`[MonthScanner] ${symbol} patterns: pr=${powerranger?.confidence || 'null'}, cu=${cupid?.confidence || 'null'}, tow=${tugofwar?.confidence || 'null'}, rc=${rollercoaster?.confidence || 'null'}, br=${breakout?.confidence || 'null'}, acc=${accumulation?.confidence || 'null'}, mom=${momentum?.confidence || 'null'}, val=${value?.confidence || 'null'}`);
          
          if (powerranger && powerranger.confidence >= 30) results.push(powerranger);
          if (cupid && cupid.confidence >= 25) results.push(cupid);
          if (tugofwar && tugofwar.confidence >= 20) results.push(tugofwar);
          if (rollercoaster && rollercoaster.confidence >= 20) results.push(rollercoaster);
          if (breakout && breakout.confidence >= 30) results.push(breakout);
          if (accumulation && accumulation.confidence >= 25) results.push(accumulation);
          if (momentum && momentum.confidence >= 25) results.push(momentum);
          if (value && value.confidence >= 20) results.push(value);
          
          console.log(`[MonthScanner] ${symbol}: ${results.length} patterns detected`);
          
          return results;
        } catch (error) {
          console.error(`[MonthScanner] ${symbol} batch error:`, error);
          return [];
        }
      })
    );
    
    batchResults.forEach(results => setups.push(...results));
    
    if (i + batchSize < symbols.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }
  
  setups.sort((a, b) => b.confidence - a.confidence);
  
  const limitedSetups = setups.slice(0, 20);
  
  console.log(`Month Trading Scanner: Found ${setups.length} setups, returning top 20`);
  
  return limitedSetups;
}

const DEFAULT_SWING_STOCKS = [
  'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'META', 'NVDA', 'TSLA', 'AMD', 'NFLX', 'CRM',
  'ADBE', 'INTC', 'QCOM', 'AVGO', 'TXN', 'MU', 'AMAT', 'LRCX', 'KLAC', 'SNPS',
  'JPM', 'BAC', 'WFC', 'GS', 'MS', 'BLK', 'SCHW', 'USB', 'PNC', 'COF',
  'UNH', 'JNJ', 'PFE', 'ABBV', 'MRK', 'LLY', 'TMO', 'DHR', 'ABT', 'ISRG',
  'XOM', 'CVX', 'COP', 'SLB', 'EOG', 'MPC', 'VLO', 'PSX', 'OXY', 'HAL',
];

export async function scanDefaultMonthSetups(): Promise<MonthTradingSetup[]> {
  return scanMonthTradingSetups(DEFAULT_SWING_STOCKS);
}
