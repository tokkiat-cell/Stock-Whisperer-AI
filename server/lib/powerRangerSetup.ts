import yahooFinance from "yahoo-finance2";

interface CandleData {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface PowerRangerResult {
  symbol: string;
  name: string;
  currentPrice: number;
  patternDetected: boolean;
  confidence: number;
  gapPercent: number;
  gapQualityScore: number;
  relativeStrength: number;
  rangeHigh: number;
  rangeLow: number;
  entryLevel: number;
  stopLoss: number;
  targetPrice: number;
  roomToTarget: number;
  riskRewardRatio: number;
  shockValue: string;
  details: string[];
}

const POPULAR_STOCKS = [
  "AAPL", "MSFT", "GOOGL", "AMZN", "NVDA", "META", "TSLA", "AMD", "NFLX", "CRM",
  "ORCL", "INTC", "QCOM", "AVGO", "TXN", "MU", "AMAT", "LRCX", "KLAC", "SNPS",
  "NOW", "PANW", "CRWD", "ZS", "DDOG", "NET", "SNOW", "MDB", "COIN", "SQ",
  "PYPL", "SHOP", "UBER", "LYFT", "ABNB", "DASH", "RBLX", "ROKU", "SPOT", "ZM",
  "PLTR", "PATH", "AI", "IONQ", "SMCI", "ARM", "MRVL", "ON", "ENPH", "SEDG"
];

export async function scanPowerRangerSetups(): Promise<{
  matches: PowerRangerResult[];
  totalScanned: number;
  scanTime: number;
}> {
  const startTime = Date.now();
  const matches: PowerRangerResult[] = [];
  
  const spyData = await getSpyPerformance();
  
  const batchSize = 5;
  for (let i = 0; i < POPULAR_STOCKS.length; i += batchSize) {
    const batch = POPULAR_STOCKS.slice(i, i + batchSize);
    const results = await Promise.all(
      batch.map(symbol => detectPowerRangerSetup(symbol, spyData))
    );
    
    for (const result of results) {
      if (result && result.patternDetected) {
        matches.push(result);
      }
    }
    
    if (i + batchSize < POPULAR_STOCKS.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  matches.sort((a, b) => b.confidence - a.confidence);
  
  return {
    matches,
    totalScanned: POPULAR_STOCKS.length,
    scanTime: Date.now() - startTime,
  };
}

async function getSpyPerformance(): Promise<{ dailyChange: number; price: number }> {
  try {
    const quote = await yahooFinance.quote("SPY") as any;
    const dailyChange = quote.regularMarketChangePercent || 0;
    return { dailyChange, price: quote.regularMarketPrice || 0 };
  } catch (error) {
    console.error("Error fetching SPY data:", error);
    return { dailyChange: 0, price: 0 };
  }
}

async function detectPowerRangerSetup(
  symbol: string,
  spyData: { dailyChange: number; price: number }
): Promise<PowerRangerResult | null> {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const [historical, quote] = await Promise.all([
      yahooFinance.chart(symbol, {
        period1: startDate,
        period2: endDate,
        interval: "1d",
      }) as any,
      yahooFinance.quote(symbol) as any,
    ]);

    const quotes = historical.quotes;
    if (!quotes || quotes.length < 5) {
      return null;
    }

    const candles: CandleData[] = quotes
      .filter((q: any) => q.open && q.high && q.low && q.close && q.volume)
      .map((q: any) => ({
        date: new Date(q.date),
        open: q.open,
        high: q.high,
        low: q.low,
        close: q.close,
        volume: q.volume,
      }));

    if (candles.length < 5) {
      return null;
    }

    const currentPrice = quote.regularMarketPrice || candles[candles.length - 1].close;
    const companyName = quote.shortName || quote.longName || symbol;

    const result = analyzePowerRangerPattern(candles, symbol, companyName, currentPrice, spyData);
    return result;
  } catch (error) {
    console.error(`Error detecting Power Ranger Setup for ${symbol}:`, error);
    return null;
  }
}

function analyzePowerRangerPattern(
  candles: CandleData[],
  symbol: string,
  name: string,
  currentPrice: number,
  spyData: { dailyChange: number; price: number }
): PowerRangerResult {
  const details: string[] = [];
  let confidence = 0;
  let gapQualityScore = 0;

  const today = candles[candles.length - 1];
  const yesterday = candles[candles.length - 2];
  
  const gapPercent = ((today.open - yesterday.close) / yesterday.close) * 100;
  const hasGapUp = gapPercent >= 2;
  
  if (hasGapUp) {
    confidence += 20;
    gapQualityScore += 25;
    details.push(`Gap up: ${gapPercent.toFixed(2)}%`);
    
    if (gapPercent >= 5) {
      confidence += 10;
      gapQualityScore += 15;
      details.push("Strong gap (5%+)");
    }
  } else if (gapPercent > 0) {
    details.push(`Small gap: ${gapPercent.toFixed(2)}% (need 2%+ for quality)`);
  } else {
    details.push("No gap up detected");
  }

  const { shockValue, shockScore, shockDetails } = analyzeShockValue(candles);
  gapQualityScore += shockScore;
  confidence += Math.min(shockScore, 15);
  details.push(...shockDetails);

  const stockDailyChange = ((today.close - yesterday.close) / yesterday.close) * 100;
  const relativeStrength = stockDailyChange - spyData.dailyChange;
  
  if (relativeStrength > 2) {
    confidence += 15;
    gapQualityScore += 20;
    details.push(`Strong relative strength: +${relativeStrength.toFixed(2)}% vs SPY`);
  } else if (relativeStrength > 0) {
    confidence += 8;
    gapQualityScore += 10;
    details.push(`Positive relative strength: +${relativeStrength.toFixed(2)}% vs SPY`);
  } else {
    details.push(`Weak relative strength: ${relativeStrength.toFixed(2)}% vs SPY`);
  }

  const { hasRange, rangeHigh, rangeLow, rangePercent } = detectConsolidationRange(candles);
  
  if (hasRange) {
    confidence += 20;
    details.push(`Consolidation range detected: $${rangeLow.toFixed(2)} - $${rangeHigh.toFixed(2)} (${rangePercent.toFixed(1)}% tight)`);
    
    if (rangePercent < 3) {
      confidence += 10;
      details.push("Tight consolidation (ideal for breakout)");
    }
  } else {
    details.push("No clear consolidation range");
  }

  const { hasRedBarAfterGap, heldAboveLow } = analyzePostGapAction(candles);
  
  if (hasRedBarAfterGap && heldAboveLow) {
    confidence += 15;
    details.push("Ideal pattern: Red bar after gap but held above lows");
  } else if (heldAboveLow) {
    confidence += 8;
    details.push("Price holding above gap lows");
  }

  const { nextResistance, roomPercent } = findNextResistance(candles, currentPrice);
  gapQualityScore += Math.min(roomPercent, 20);
  
  if (roomPercent >= 5) {
    confidence += 10;
    details.push(`Room to resistance: ${roomPercent.toFixed(1)}% ($${nextResistance.toFixed(2)})`);
  } else {
    details.push(`Limited room: ${roomPercent.toFixed(1)}% to resistance at $${nextResistance.toFixed(2)}`);
  }

  const entryLevel = rangeHigh * 1.001;
  const gapLow = today.open;
  const stopLoss = Math.min(rangeLow * 0.99, gapLow * 0.99);
  
  const risk = entryLevel - stopLoss;
  const minTarget2R = entryLevel + (risk * 2);
  const minTarget3R = entryLevel + (risk * 3);
  const targetPrice = Math.max(nextResistance, minTarget2R);
  
  const reward = targetPrice - entryLevel;
  const riskRewardRatio = risk > 0 ? reward / risk : 0;
  const roomToTarget = ((targetPrice - currentPrice) / currentPrice) * 100;
  
  const hasGoodRR = riskRewardRatio >= 2;

  if (riskRewardRatio >= 3) {
    confidence += 15;
    gapQualityScore += 20;
    details.push(`Excellent R:R ratio: ${riskRewardRatio.toFixed(2)}:1 (room for 3R+)`);
  } else if (riskRewardRatio >= 2) {
    confidence += 10;
    gapQualityScore += 15;
    details.push(`Good R:R ratio: ${riskRewardRatio.toFixed(2)}:1 (meets 2R minimum)`);
  } else {
    details.push(`Low R:R ratio: ${riskRewardRatio.toFixed(2)}:1 (need 2R minimum)`);
  }

  const hasPositiveRS = relativeStrength > 0;
  const patternDetected = hasGapUp && hasRange && hasPositiveRS && hasGoodRR && confidence >= 50;

  return {
    symbol,
    name,
    currentPrice,
    patternDetected,
    confidence: Math.min(100, confidence),
    gapPercent,
    gapQualityScore: Math.min(100, gapQualityScore),
    relativeStrength,
    rangeHigh,
    rangeLow,
    entryLevel,
    stopLoss,
    targetPrice,
    roomToTarget,
    riskRewardRatio,
    shockValue,
    details,
  };
}

function analyzeShockValue(candles: CandleData[]): {
  shockValue: string;
  shockScore: number;
  shockDetails: string[];
} {
  const details: string[] = [];
  let score = 0;
  let shockValue = "None";

  if (candles.length < 5) {
    return { shockValue, shockScore: score, shockDetails: details };
  }

  const today = candles[candles.length - 1];
  const recentCandles = candles.slice(-10, -1);
  
  let wideRangeRedBars = 0;
  let pivotsCrossed = 0;
  const avgRange = recentCandles.reduce((sum, c) => sum + (c.high - c.low), 0) / recentCandles.length;
  
  for (const candle of recentCandles) {
    const range = candle.high - candle.low;
    const isRed = candle.close < candle.open;
    const isWideRange = range > avgRange * 1.5;
    
    if (isRed && isWideRange && today.open > candle.high) {
      wideRangeRedBars++;
    }
    
    const pivot = (candle.high + candle.low + candle.close) / 3;
    if (today.open > pivot && candle.close < pivot) {
      pivotsCrossed++;
    }
  }

  if (wideRangeRedBars >= 2) {
    score += 25;
    shockValue = "High";
    details.push(`Gapped over ${wideRangeRedBars} wide-range red bars (shock value)`);
  } else if (wideRangeRedBars === 1) {
    score += 15;
    shockValue = "Medium";
    details.push("Gapped over 1 wide-range red bar");
  }

  if (pivotsCrossed >= 3) {
    score += 15;
    if (shockValue === "None") shockValue = "Medium";
    details.push(`Gapped over ${pivotsCrossed} pivot levels`);
  } else if (pivotsCrossed >= 1) {
    score += 8;
    details.push(`Gapped over ${pivotsCrossed} pivot level(s)`);
  }

  return { shockValue, shockScore: score, shockDetails: details };
}

function detectConsolidationRange(candles: CandleData[]): {
  hasRange: boolean;
  rangeHigh: number;
  rangeLow: number;
  rangePercent: number;
  gapDayIndex: number;
} {
  if (candles.length < 5) {
    return { hasRange: false, rangeHigh: 0, rangeLow: 0, rangePercent: 0, gapDayIndex: -1 };
  }

  let gapDayIndex = -1;
  for (let i = candles.length - 5; i < candles.length - 1; i++) {
    if (i < 1) continue;
    const gapPercent = ((candles[i].open - candles[i-1].close) / candles[i-1].close) * 100;
    if (gapPercent >= 2) {
      gapDayIndex = i;
      break;
    }
  }
  
  if (gapDayIndex === -1) {
    return { hasRange: false, rangeHigh: 0, rangeLow: 0, rangePercent: 0, gapDayIndex: -1 };
  }
  
  const postGapCandles = candles.slice(gapDayIndex + 1);
  
  if (postGapCandles.length < 2) {
    return { hasRange: false, rangeHigh: 0, rangeLow: 0, rangePercent: 0, gapDayIndex };
  }
  
  const highs = postGapCandles.map(c => c.high);
  const lows = postGapCandles.map(c => c.low);
  
  const rangeHigh = Math.max(...highs);
  const rangeLow = Math.min(...lows);
  const rangePercent = ((rangeHigh - rangeLow) / rangeLow) * 100;
  
  const hasRange = rangePercent < 8 && rangePercent > 0 && postGapCandles.length >= 2;

  return { hasRange, rangeHigh, rangeLow, rangePercent, gapDayIndex };
}

function analyzePostGapAction(candles: CandleData[]): {
  hasRedBarAfterGap: boolean;
  heldAboveLow: boolean;
} {
  if (candles.length < 2) {
    return { hasRedBarAfterGap: false, heldAboveLow: false };
  }

  const today = candles[candles.length - 1];
  const isRedBar = today.close < today.open;
  const heldAboveLow = today.close > today.low * 1.01;

  return { hasRedBarAfterGap: isRedBar, heldAboveLow };
}

function findNextResistance(candles: CandleData[], currentPrice: number): {
  nextResistance: number;
  roomPercent: number;
} {
  const recentHighs = candles.slice(-20).map(c => c.high);
  const highsAbovePrice = recentHighs.filter(h => h > currentPrice * 1.02);
  
  let nextResistance: number;
  
  if (highsAbovePrice.length > 0) {
    nextResistance = Math.min(...highsAbovePrice);
  } else {
    nextResistance = Math.max(...recentHighs) * 1.05;
  }
  
  const roomPercent = ((nextResistance - currentPrice) / currentPrice) * 100;
  
  return { nextResistance, roomPercent };
}
