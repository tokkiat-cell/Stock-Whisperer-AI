import { getPremarketGainersAndLosers } from "./marketData";
import { detectCupidSetup, CupidSetupResult } from "./cupidSetup";
import { analyzeRollerCoasterSetup, RollerCoasterSetup } from "./rollerCoasterSetup";
import { analyzeTugOfWarSetup, TugOfWarSetup } from "./tugOfWarSetup";
import yahooFinance from "yahoo-finance2";

export type PatternType = 'cupid' | 'powerRanger' | 'rollerCoaster' | 'tugOfWar';

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
        const [cupidResult, powerRangerResult, rollerCoasterResult, tugOfWarResult] = await Promise.all([
          detectCupidSetup(symbol).catch(() => null),
          detectPowerRangerForSymbol(symbol).catch(() => null),
          analyzeRollerCoasterSetup(symbol).catch(() => null),
          analyzeTugOfWarSetup(symbol).catch(() => null),
        ]);
        
        const results: DayTradingSetup[] = [];
        
        if (cupidResult && cupidResult.patternDetected && cupidResult.confidence >= 60) {
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
        
        if (powerRangerResult && powerRangerResult.patternDetected && powerRangerResult.confidence >= 60) {
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
        
        if (rollerCoasterResult && rollerCoasterResult.patternDetected && rollerCoasterResult.confidence >= 60) {
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
        
        if (tugOfWarResult && tugOfWarResult.patternDetected && tugOfWarResult.confidence >= 60) {
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
        
        return results;
      } catch (error) {
        console.error(`Error scanning ${symbol}:`, error);
        return [];
      }
    });
    
    const allResults = await Promise.all(scanPromises);
    allResults.forEach(results => setups.push(...results));
    
    setups.sort((a, b) => b.confidence - a.confidence);
    
    console.log(`Day Trading Scanner: Found ${setups.length} setups`);
    
    return setups;
    
  } catch (error) {
    console.error('Day Trading Scanner error:', error);
    return [];
  }
}
