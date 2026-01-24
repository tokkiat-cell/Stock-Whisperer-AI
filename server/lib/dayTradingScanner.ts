import { getPremarketGainersAndLosers } from "./marketData";
import { detectCupidSetup, CupidSetupResult } from "./cupidSetup";
import { analyzeRollerCoasterSetup, RollerCoasterSetup } from "./rollerCoasterSetup";
import { analyzeTugOfWarSetup, TugOfWarSetup } from "./tugOfWarSetup";
import YahooFinance from "yahoo-finance2";

const yahooFinance = new YahooFinance();

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
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 60);
    
    const historical: any = await yahooFinance.chart(symbol.toUpperCase(), {
      period1: startDate,
      period2: endDate,
      interval: "1d",
    });
    
    if (!historical?.quotes || historical.quotes.length < 20) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
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
    
    if (candles.length < 10) return null;
    
    const recent = candles.slice(-10);
    const first = recent[0];
    const last = recent[recent.length - 1];
    
    const gapPercent = ((first.open - candles[candles.length - 11]?.close) / candles[candles.length - 11]?.close) * 100;
    
    if (gapPercent < 3) return null;
    
    const rangeHigh = Math.max(...recent.map((c: any) => c.high));
    const rangeLow = Math.min(...recent.map((c: any) => c.low));
    const range = rangeHigh - rangeLow;
    const avgRange = range / recent.length;
    
    const consolidating = recent.slice(1).every((c: any) => {
      const bodySize = Math.abs(c.close - c.open);
      return bodySize < avgRange * 2;
    });
    
    if (!consolidating) return null;
    
    const entryLevel = rangeHigh;
    const stopLoss = rangeLow - (range * 0.1);
    const risk = entryLevel - stopLoss;
    const targetPrice = entryLevel + (risk * 2);
    const riskRewardRatio = 2;
    
    return {
      symbol,
      name,
      currentPrice,
      patternDetected: true,
      confidence: 70 + Math.min(gapPercent * 2, 20),
      entryLevel,
      stopLoss,
      targetPrice,
      riskRewardRatio,
      rangeHigh,
      rangeLow,
      details: [
        `Gap up of ${gapPercent.toFixed(1)}% detected`,
        `Consolidation range: $${rangeLow.toFixed(2)} - $${rangeHigh.toFixed(2)}`,
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

async function detectBreakoutDaily(symbol: string): Promise<DayTradingSetup | null> {
  try {
    const candles = await getWeeklyDataForDay(symbol);
    if (!candles || candles.length < 10) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    const older = candles.slice(-10, -2);
    const recent = candles.slice(-2);
    
    const resistanceLevel = Math.max(...older.map(c => c.high));
    const supportLevel = Math.min(...older.map(c => c.low));
    
    const isBreakingOut = recent.some(c => c.close > resistanceLevel * 0.97);
    
    if (!isBreakingOut) return null;
    
    const range = resistanceLevel - supportLevel;
    const entryPrice = resistanceLevel;
    const stopLoss = resistanceLevel - range * 0.25;
    const targetPrice = resistanceLevel + range * 0.7;
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = Math.max(0.5, (targetPrice - entryPrice) / risk);
    
    return {
      symbol, name, currentPrice,
      patternType: 'breakout',
      patternName: 'Breakout Setup',
      confidence: Math.min(75, 50 + (recent[recent.length-1].close > resistanceLevel ? 20 : 0)),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel, resistanceLevel,
      details: [`Breaking $${resistanceLevel.toFixed(2)} resistance`, `Target: $${targetPrice.toFixed(2)}`],
      premarketChange: 0,
      premarketChangePercent: 0,
    };
  } catch { return null; }
}

async function detectAccumulationDaily(symbol: string): Promise<DayTradingSetup | null> {
  try {
    const candles = await getWeeklyDataForDay(symbol);
    if (!candles || candles.length < 10) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    const recent = candles.slice(-8);
    const rangeHigh = Math.max(...recent.map(c => c.high));
    const rangeLow = Math.min(...recent.map(c => c.low));
    const rangePercent = ((rangeHigh - rangeLow) / rangeLow) * 100;
    
    if (rangePercent > 15) return null;
    
    const priceNearHigh = currentPrice > rangeLow + (rangeHigh - rangeLow) * 0.55;
    
    if (!priceNearHigh) return null;
    
    const range = rangeHigh - rangeLow;
    const entryPrice = rangeHigh;
    const stopLoss = rangeLow - range * 0.1;
    const targetPrice = rangeHigh + range * 1.2;
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = Math.max(0.5, (targetPrice - entryPrice) / risk);
    
    return {
      symbol, name, currentPrice,
      patternType: 'accumulation',
      patternName: 'Accumulation Base',
      confidence: Math.min(70, 45 + (15 - rangePercent)),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: rangeLow, resistanceLevel: rangeHigh,
      details: [`8-week base: ${rangePercent.toFixed(1)}% range`, `Entry above $${rangeHigh.toFixed(2)}`],
      premarketChange: 0,
      premarketChangePercent: 0,
    };
  } catch { return null; }
}

async function detectMomentumDaily(symbol: string): Promise<DayTradingSetup | null> {
  try {
    const candles = await getWeeklyDataForDay(symbol);
    if (!candles || candles.length < 10) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    const recent6 = candles.slice(-6);
    const recentTrend = (recent6[recent6.length-1].close - recent6[0].close) / recent6[0].close * 100;
    
    if (recentTrend < 1) return null;
    
    const recentHigh = Math.max(...recent6.map(c => c.high));
    const recentLow = Math.min(...recent6.map(c => c.low));
    
    const entryPrice = currentPrice;
    const stopLoss = recentLow - (recentHigh - recentLow) * 0.12;
    const targetPrice = currentPrice * (1 + recentTrend / 100 * 0.6);
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = Math.max(0.5, (targetPrice - entryPrice) / risk);
    
    return {
      symbol, name, currentPrice,
      patternType: 'momentum',
      patternName: 'Momentum Trend',
      confidence: Math.min(75, 40 + recentTrend * 2),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: recentLow, resistanceLevel: recentHigh,
      details: [`6-week gain: ${recentTrend.toFixed(1)}%`, `Target: $${targetPrice.toFixed(2)}`],
      premarketChange: 0,
      premarketChangePercent: 0,
    };
  } catch { return null; }
}

async function detectValueDaily(symbol: string): Promise<DayTradingSetup | null> {
  try {
    const candles = await getWeeklyDataForDay(symbol);
    if (!candles || candles.length < 12) return null;
    
    const quote: any = await yahooFinance.quote(symbol.toUpperCase());
    const currentPrice = quote?.regularMarketPrice || 0;
    const name = quote?.shortName || quote?.longName || symbol;
    
    const high52w = Math.max(...candles.map(c => c.high));
    const low52w = Math.min(...candles.map(c => c.low));
    
    const fromHigh = ((high52w - currentPrice) / high52w) * 100;
    
    if (fromHigh < 3 || fromHigh > 55) return null;
    
    const recent = candles.slice(-3);
    const isStabilizing = recent.every(c => c.close > low52w * 1.03);
    
    if (!isStabilizing) return null;
    
    const entryPrice = currentPrice;
    const stopLoss = low52w * 0.95;
    const targetPrice = high52w * 0.75;
    const risk = entryPrice - stopLoss;
    const riskRewardRatio = Math.max(0.5, (targetPrice - entryPrice) / risk);
    
    return {
      symbol, name, currentPrice,
      patternType: 'value',
      patternName: 'Value Pullback',
      confidence: Math.min(70, 35 + fromHigh * 0.7),
      entryPrice, stopLoss, targetPrice, riskRewardRatio,
      supportLevel: low52w, resistanceLevel: high52w,
      details: [`${fromHigh.toFixed(1)}% off 52w high`, 'Price stabilizing'],
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
      
      try {
        const [cupidResult, powerRangerResult, rollerCoasterResult, tugOfWarResult, breakoutResult, accumulationResult, momentumResult, valueResult] = await Promise.all([
          detectCupidSetup(symbol).catch(() => null),
          detectPowerRangerForSymbol(symbol).catch(() => null),
          analyzeRollerCoasterSetup(symbol).catch(() => null),
          analyzeTugOfWarSetup(symbol).catch(() => null),
          detectBreakoutDaily(symbol).catch(() => null),
          detectAccumulationDaily(symbol).catch(() => null),
          detectMomentumDaily(symbol).catch(() => null),
          detectValueDaily(symbol).catch(() => null),
        ]);
        
        const results: DayTradingSetup[] = [];
        
        if (cupidResult && cupidResult.patternDetected && cupidResult.confidence >= 40) {
          results.push({
            symbol: cupidResult.symbol,
            name: cupidResult.name,
            currentPrice: cupidResult.currentPrice,
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
        
        if (valueResult && valueResult.confidence >= 30) {
          valueResult.premarketChange = premarketChange;
          valueResult.premarketChangePercent = premarketChangePercent;
          results.push(valueResult);
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
