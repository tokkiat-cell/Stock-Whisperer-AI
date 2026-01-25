import { getPremarketGainersAndLosers } from "./marketData";
import { detectCupidSetup, CupidSetupResult } from "./cupidSetup";
import { analyzeRollerCoasterSetup, RollerCoasterSetup } from "./rollerCoasterSetup";
import { analyzeTugOfWarSetup, TugOfWarSetup } from "./tugOfWarSetup";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

interface IntradayCandle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function get5MinuteData(symbol: string, days: number = 5): Promise<IntradayCandle[] | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result: any = await yahooFinance.chart(symbol.toUpperCase(), {
      period1: startDate,
      period2: endDate,
      interval: "5m",
    });
    
    if (!result?.quotes || result.quotes.length < 10) return null;
    
    return result.quotes
      .filter((q: any) => q.open && q.high && q.low && q.close)
      .map((q: any) => ({
        date: new Date(q.date),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume || 0,
      }));
  } catch {
    return null;
  }
}

async function get2MinuteData(symbol: string, days: number = 3): Promise<IntradayCandle[] | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const result: any = await yahooFinance.chart(symbol.toUpperCase(), {
      period1: startDate,
      period2: endDate,
      interval: "2m",
    });
    
    if (!result?.quotes || result.quotes.length < 10) return null;
    
    return result.quotes
      .filter((q: any) => q.open && q.high && q.low && q.close)
      .map((q: any) => ({
        date: new Date(q.date),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume || 0,
      }));
  } catch {
    return null;
  }
}

export type PatternType = 'cupid' | 'powerRanger' | 'rollerCoaster' | 'tugOfWar' | 'breakout' | 'accumulation' | 'momentum' | 'value';

export interface DayTradingSetup {
  symbol: string;
  name: string;
  currentPrice: number;
  patternType: PatternType;
  patternName: string;
  confidence: number;
  entryPrice: number;
  stopLoss: number;
  targetPrice: number;
  riskRewardRatio: number;
  supportLevel: number;
  resistanceLevel: number;
  details: string[];
  premarketChange: number;
  premarketChangePercent: number;
  marketCap?: number;
}

interface PowerRangerResult {
  symbol: string;
  name: string;
  currentPrice: number;
  patternDetected: boolean;
  confidence: number;
  entryLevel: number;
  stopLoss: number;
  targetPrice: number;
  riskRewardRatio: number;
  rangeHigh: number;
  rangeLow: number;
  details: string[];
}

async function detectPowerRangerForSymbol(symbol: string): Promise<PowerRangerResult | null> {
  try {
    // Use 5-minute candles for intraday Power Ranger detection
    const candles = await get5MinuteData(symbol, 3);
    if (!candles || candles.length < 30) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    // Look at the last 30 candles (2.5 hours of 5-min data)
    const recent = candles.slice(-30);
    
    // Find gap up: compare opening of first candle to previous session's last candle
    const prevSession = candles.slice(-60, -30);
    const prevClose = prevSession.length > 0 ? prevSession[prevSession.length - 1]?.close : recent[0].open * 0.98;
    const gapPercent = ((recent[0].open - prevClose) / prevClose) * 100;
    
    // For intraday, even 0.5% gap is significant
    if (gapPercent < 0.5) return null;
    
    // Check for tight consolidation in recent candles
    const consolidationCandles = recent.slice(-15); // Last 15 candles (1.25 hours)
    const rangeHigh = Math.max(...consolidationCandles.map(c => c.high));
    const rangeLow = Math.min(...consolidationCandles.map(c => c.low));
    const range = rangeHigh - rangeLow;
    const rangePercent = (range / rangeLow) * 100;
    
    // Tight consolidation: range should be < 2% for intraday
    if (rangePercent > 2) return null;
    
    const avgBodySize = consolidationCandles.reduce((sum, c) => sum + Math.abs(c.close - c.open), 0) / consolidationCandles.length;
    const avgRange = range / consolidationCandles.length;
    
    // Bodies should be small relative to range
    const consolidating = avgBodySize < avgRange * 1.5;
    if (!consolidating) return null;
    
    const entryLevel = rangeHigh;
    const stopLoss = rangeLow - (range * 0.3);
    const risk = entryLevel - stopLoss;
    const targetPrice = entryLevel + (risk * 2);
    const riskRewardRatio = 2;
    
    return {
      symbol,
      name,
      currentPrice,
      patternDetected: true,
      confidence: 65 + Math.min(gapPercent * 5, 25),
      entryLevel,
      stopLoss,
      targetPrice,
      riskRewardRatio,
      rangeHigh,
      rangeLow,
      details: [
        `5-min chart: Gap up ${gapPercent.toFixed(2)}%`,
        `Consolidation: $${rangeLow.toFixed(2)} - $${rangeHigh.toFixed(2)}`,
        `Entry on breakout above $${entryLevel.toFixed(2)}`,
      ],
    };
  } catch (error) {
    return null;
  }
}

interface WeeklyCandle {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

async function getWeeklyDataForDay(symbol: string): Promise<WeeklyCandle[] | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 12);
    
    const result: any = await yahooFinance.chart(symbol.toUpperCase(), {
      period1: startDate,
      period2: endDate,
      interval: "1wk",
    });
    
    if (!result?.quotes || result.quotes.length < 8) return null;
    
    return result.quotes
      .filter((q: any) => q.open && q.high && q.low && q.close)
      .map((q: any) => ({
        date: new Date(q.date),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume || 0,
      }));
  } catch {
    return null;
  }
}

async function detectBreakoutIntraday(symbol: string): Promise<DayTradingSetup | null> {
  try {
    // Use 5-minute candles for intraday breakout detection
    const candles = await get5MinuteData(symbol, 5);
    if (!candles || candles.length < 50) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    const marketCap = quote?.marketCap;
    
    // Look at range from earlier candles and check for breakout in recent
    const older = candles.slice(-50, -10);
    const recent = candles.slice(-10);
    
    const resistanceLevel = Math.max(...older.map(c => c.high));
    const supportLevel = Math.min(...older.map(c => c.low));
    
    // Check if recent candles are breaking out
    const isBreakingOut = recent.some(c => c.close > resistanceLevel * 0.995);
    
    if (!isBreakingOut) return null;
    
    const range = resistanceLevel - supportLevel;
    const entryPrice = resistanceLevel;
    const stopLoss = resistanceLevel - range * 0.3;
    const targetPrice = resistanceLevel + range * 0.5;
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = Math.max(0.5, (targetPrice - entryPrice) / risk);
    
    return {
      symbol, name, currentPrice, marketCap,
      patternType: 'breakout',
      patternName: '5-min Breakout',
      confidence: Math.min(80, 55 + (recent[recent.length-1].close > resistanceLevel ? 20 : 0)),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel, resistanceLevel,
      details: [`5-min: Breaking $${resistanceLevel.toFixed(2)}`, `Target: $${targetPrice.toFixed(2)}`],
      premarketChange: 0,
      premarketChangePercent: 0,
    };
  } catch { return null; }
}

async function detectAccumulationIntraday(symbol: string): Promise<DayTradingSetup | null> {
  try {
    // Use 5-minute candles for intraday accumulation detection
    const candles = await get5MinuteData(symbol, 3);
    if (!candles || candles.length < 40) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    const marketCap = quote?.marketCap;
    
    // Look at recent 40 candles (~3.3 hours)
    const recent = candles.slice(-40);
    const rangeHigh = Math.max(...recent.map(c => c.high));
    const rangeLow = Math.min(...recent.map(c => c.low));
    const rangePercent = ((rangeHigh - rangeLow) / rangeLow) * 100;
    
    // Tight range for intraday: < 3%
    if (rangePercent > 3) return null;
    
    // Price should be in upper half of range
    const priceNearHigh = currentPrice > rangeLow + (rangeHigh - rangeLow) * 0.55;
    if (!priceNearHigh) return null;
    
    const range = rangeHigh - rangeLow;
    const entryPrice = rangeHigh;
    const stopLoss = rangeLow - range * 0.2;
    const targetPrice = rangeHigh + range * 0.8;
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = Math.max(0.5, (targetPrice - entryPrice) / risk);
    
    return {
      symbol, name, currentPrice, marketCap,
      patternType: 'accumulation',
      patternName: '5-min Accumulation',
      confidence: Math.min(75, 50 + (3 - rangePercent) * 5),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: rangeLow, resistanceLevel: rangeHigh,
      details: [`5-min base: ${rangePercent.toFixed(2)}% range`, `Entry above $${rangeHigh.toFixed(2)}`],
      premarketChange: 0,
      premarketChangePercent: 0,
    };
  } catch { return null; }
}

async function detectMomentumIntraday(symbol: string): Promise<DayTradingSetup | null> {
  try {
    // Use 5-minute candles for intraday momentum
    const candles = await get5MinuteData(symbol, 2);
    if (!candles || candles.length < 30) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    const marketCap = quote?.marketCap;
    
    // Look at last 30 candles (2.5 hours)
    const recent30 = candles.slice(-30);
    const recentTrend = (recent30[recent30.length-1].close - recent30[0].close) / recent30[0].close * 100;
    
    // Require positive momentum for intraday
    if (recentTrend < 0.3) return null;
    
    const recentHigh = Math.max(...recent30.map(c => c.high));
    const recentLow = Math.min(...recent30.map(c => c.low));
    
    const entryPrice = currentPrice;
    const stopLoss = recentLow - (recentHigh - recentLow) * 0.2;
    const targetPrice = currentPrice * (1 + recentTrend / 100 * 0.5);
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = Math.max(0.5, (targetPrice - entryPrice) / risk);
    
    return {
      symbol, name, currentPrice, marketCap,
      patternType: 'momentum',
      patternName: '5-min Momentum',
      confidence: Math.min(80, 45 + recentTrend * 10),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: recentLow, resistanceLevel: recentHigh,
      details: [`5-min trend: +${recentTrend.toFixed(2)}%`, `Target: $${targetPrice.toFixed(2)}`],
      premarketChange: 0,
      premarketChangePercent: 0,
    };
  } catch { return null; }
}

async function detect2MinuteEntry(symbol: string): Promise<DayTradingSetup | null> {
  try {
    // Use 2-minute candles for precise entry timing
    const candles = await get2MinuteData(symbol, 2);
    if (!candles || candles.length < 30) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    const marketCap = quote?.marketCap;
    
    // Look at last 30 candles (1 hour of 2-min data)
    const recent = candles.slice(-30);
    
    // Calculate short-term momentum
    const shortTrend = (recent[recent.length-1].close - recent[0].close) / recent[0].close * 100;
    
    // Look for micro pullback in uptrend (last 10 candles)
    const last10 = recent.slice(-10);
    const pullbackLow = Math.min(...last10.map(c => c.low));
    const pullbackHigh = Math.max(...last10.map(c => c.high));
    
    // Price should be recovering from pullback
    const recoveryPercent = (currentPrice - pullbackLow) / (pullbackHigh - pullbackLow);
    if (recoveryPercent < 0.6 || shortTrend < 0.1) return null;
    
    // Check for increasing volume in last candles (sign of buying pressure)
    const avgVolume = recent.reduce((sum, c) => sum + c.volume, 0) / recent.length;
    const recentVolume = last10.reduce((sum, c) => sum + c.volume, 0) / last10.length;
    const volumeRatio = recentVolume / avgVolume;
    
    if (volumeRatio < 0.8) return null;
    
    const entryPrice = currentPrice;
    const stopLoss = pullbackLow - (pullbackHigh - pullbackLow) * 0.2;
    const targetPrice = pullbackHigh + (pullbackHigh - pullbackLow) * 0.5;
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = Math.max(0.5, (targetPrice - entryPrice) / risk);
    
    return {
      symbol, name, currentPrice, marketCap,
      patternType: 'value',
      patternName: '2-min Entry',
      confidence: Math.min(85, 50 + shortTrend * 15 + volumeRatio * 10),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: pullbackLow, resistanceLevel: pullbackHigh,
      details: [
        `2-min: Pullback recovery ${(recoveryPercent * 100).toFixed(0)}%`,
        `Volume: ${volumeRatio.toFixed(1)}x avg`,
      ],
      premarketChange: 0,
      premarketChangePercent: 0,
    };
  } catch { return null; }
}

export async function scanDayTradingSetups(): Promise<DayTradingSetup[]> {
  const setups: DayTradingSetup[] = [];
  
  try {
    const premarketData = await getPremarketGainersAndLosers();
    const allMovers = [...premarketData.gainers, ...premarketData.losers];
    
    const uniqueSymbols = Array.from(new Set(allMovers.map(m => m.symbol))).slice(0, 40);
    
    console.log(`Day Trading Scanner: Analyzing ${uniqueSymbols.length} premarket movers...`);
    
    const scanPromises = uniqueSymbols.map(async (symbol) => {
      const mover = allMovers.find(m => m.symbol === symbol);
      const premarketChange = mover?.change || 0;
      const premarketChangePercent = mover?.changePercent || 0;
      
      let marketCap: number | undefined;
      try {
        const quote: any = await yahooFinance.quote(symbol.toUpperCase());
        marketCap = quote?.marketCap;
      } catch {}
      
      try {
        const [cupidResult, powerRangerResult, rollerCoasterResult, tugOfWarResult, breakoutResult, accumulationResult, momentumResult, twoMinEntryResult] = await Promise.all([
          detectCupidSetup(symbol).catch(() => null),
          detectPowerRangerForSymbol(symbol).catch(() => null),
          analyzeRollerCoasterSetup(symbol).catch(() => null),
          analyzeTugOfWarSetup(symbol).catch(() => null),
          detectBreakoutIntraday(symbol).catch(() => null),
          detectAccumulationIntraday(symbol).catch(() => null),
          detectMomentumIntraday(symbol).catch(() => null),
          detect2MinuteEntry(symbol).catch(() => null),
        ]);
        
        const results: DayTradingSetup[] = [];
        
        if (cupidResult && cupidResult.patternDetected && cupidResult.confidence >= 40) {
          results.push({
            symbol: cupidResult.symbol,
            name: cupidResult.name,
            currentPrice: cupidResult.currentPrice,
            marketCap,
            patternType: 'cupid',
            patternName: 'Cupid Setup',
            confidence: cupidResult.confidence,
            entryPrice: cupidResult.entryZone.high,
            stopLoss: cupidResult.stopLoss,
            targetPrice: cupidResult.targetPrice,
            riskRewardRatio: cupidResult.riskRewardRatio,
            supportLevel: cupidResult.swingLow,
            resistanceLevel: cupidResult.swingHigh,
            details: cupidResult.details,
            premarketChange,
            premarketChangePercent,
          });
        }
        
        if (powerRangerResult && powerRangerResult.patternDetected && powerRangerResult.confidence >= 40) {
          results.push({
            symbol: powerRangerResult.symbol,
            name: powerRangerResult.name,
            currentPrice: powerRangerResult.currentPrice,
            marketCap,
            patternType: 'powerRanger',
            patternName: 'Power Ranger',
            confidence: powerRangerResult.confidence,
            entryPrice: powerRangerResult.entryLevel,
            stopLoss: powerRangerResult.stopLoss,
            targetPrice: powerRangerResult.targetPrice,
            riskRewardRatio: powerRangerResult.riskRewardRatio,
            supportLevel: powerRangerResult.rangeLow,
            resistanceLevel: powerRangerResult.rangeHigh,
            details: powerRangerResult.details,
            premarketChange,
            premarketChangePercent,
          });
        }
        
        if (rollerCoasterResult && rollerCoasterResult.patternDetected && rollerCoasterResult.confidence >= 40) {
          results.push({
            symbol: rollerCoasterResult.symbol,
            name: rollerCoasterResult.name,
            currentPrice: rollerCoasterResult.currentPrice,
            marketCap,
            patternType: 'rollerCoaster',
            patternName: 'Roller Coaster',
            confidence: rollerCoasterResult.confidence,
            entryPrice: rollerCoasterResult.entryLevel,
            stopLoss: rollerCoasterResult.stopLoss,
            targetPrice: rollerCoasterResult.targetPrice,
            riskRewardRatio: rollerCoasterResult.riskRewardRatio,
            supportLevel: rollerCoasterResult.supportLevel,
            resistanceLevel: rollerCoasterResult.resistanceLevel,
            details: rollerCoasterResult.setupNotes,
            premarketChange,
            premarketChangePercent,
          });
        }
        
        if (tugOfWarResult && tugOfWarResult.patternDetected && tugOfWarResult.confidence >= 40) {
          results.push({
            symbol: tugOfWarResult.symbol,
            name: tugOfWarResult.name,
            currentPrice: tugOfWarResult.currentPrice,
            marketCap,
            patternType: 'tugOfWar',
            patternName: 'Tug of War',
            confidence: tugOfWarResult.confidence,
            entryPrice: tugOfWarResult.entryLevel,
            stopLoss: tugOfWarResult.stopLoss,
            targetPrice: tugOfWarResult.targetPrice,
            riskRewardRatio: tugOfWarResult.riskRewardRatio,
            supportLevel: tugOfWarResult.supportLevel,
            resistanceLevel: tugOfWarResult.resistanceLevel,
            details: tugOfWarResult.setupNotes,
            premarketChange,
            premarketChangePercent,
          });
        }
        
        if (breakoutResult && breakoutResult.confidence >= 35) {
          breakoutResult.premarketChange = premarketChange;
          breakoutResult.premarketChangePercent = premarketChangePercent;
          results.push(breakoutResult);
        }
        
        if (accumulationResult && accumulationResult.confidence >= 35) {
          accumulationResult.premarketChange = premarketChange;
          accumulationResult.premarketChangePercent = premarketChangePercent;
          results.push(accumulationResult);
        }
        
        if (momentumResult && momentumResult.confidence >= 30) {
          momentumResult.premarketChange = premarketChange;
          momentumResult.premarketChangePercent = premarketChangePercent;
          results.push(momentumResult);
        }
        
        if (twoMinEntryResult && twoMinEntryResult.confidence >= 30) {
          twoMinEntryResult.premarketChange = premarketChange;
          twoMinEntryResult.premarketChangePercent = premarketChangePercent;
          results.push(twoMinEntryResult);
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
    
    const limitedSetups = setups.slice(0, 20);
    
    console.log(`Day Trading Scanner: Found ${setups.length} setups, returning top 20`);
    
    return limitedSetups;
    
  } catch (error) {
    console.error('Day Trading Scanner error:', error);
    return [];
  }
}
