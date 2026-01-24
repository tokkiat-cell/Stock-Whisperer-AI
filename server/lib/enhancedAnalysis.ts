import { getLocalPatternAnalysis, PatternScore, PatternResult } from "./localCandlestickPatterns";
import { getAlphaVantageAnalysis, calculateDynamicSLTP, AlphaVantageAnalysis } from "./alphaVantageClient";
import OpenAI from "openai";

const gemini = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
});

export interface ProfileInfo {
  profileType: string | null;
  riskLevel: string | null;
  traderStyle: string | null;
  riskPerTrade: string | null;
  investmentHorizon: string | null;
}

export interface EnhancedStockAnalysis {
  symbol: string;
  currentPrice: number;
  recommendation: "BUY" | "SELL" | "HOLD";
  confidence: number;
  
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  riskReward: number;
  
  candlestickPattern: {
    pattern: string | null;
    signal: "BUY" | "SELL" | "NEUTRAL";
    buyScore: number;
    sellScore: number;
  };
  
  technicalIndicators: {
    rsi: number;
    macd: {
      value: number;
      signal: number;
      histogram: number;
      trend: "BULLISH" | "BEARISH" | "NEUTRAL";
    };
    movingAverages: {
      sma20: number;
      sma50: number;
      sma200: number;
    };
    atr: number;
    bollingerBands: {
      upper: number;
      middle: number;
      lower: number;
    };
  };
  
  supportResistance: {
    support1: number;
    support2: number;
    resistance1: number;
    resistance2: number;
    pivotPoint: number;
  };
  
  sentiment: {
    bullishPercent: number;
    bearishPercent: number;
    neutralPercent: number;
    overall: "BULLISH" | "BEARISH" | "NEUTRAL";
  };
  
  aiAnalysis: {
    rationale: string;
    trend: string;
    keyLevels: string;
    riskFactors: string;
  };
  
  optionsStrategy?: {
    strategy: string;
    description: string;
    strikePrice: number;
    targetStrike: number;
    expiry: string;
    maxProfit: string;
    maxRisk: string;
    breakeven: number;
    rationale: string;
  };
  
  dataSources: {
    localPatterns: boolean;
    alphaVantage: boolean;
    geminiAI: boolean;
  };
}

export async function getEnhancedAnalysis(
  symbol: string,
  currentPrice: number,
  timeframe: string = "swing",
  market: string = "US",
  profileInfo?: ProfileInfo
): Promise<EnhancedStockAnalysis> {
  const [localPatterns, alphaVantage] = await Promise.all([
    getLocalPatternAnalysis(symbol).catch(err => {
      console.error("Local pattern error:", err);
      return null;
    }),
    getAlphaVantageAnalysis(symbol, currentPrice).catch(err => {
      console.error("Alpha Vantage error:", err);
      return null;
    })
  ]);

  const aggregatedSignals = aggregateSignals(
    localPatterns,
    alphaVantage
  );

  const sltp = calculateOptimalSLTP(
    currentPrice,
    alphaVantage,
    timeframe,
    aggregatedSignals.recommendation
  );

  const aiEnhancement = await getAIEnhancement(
    symbol,
    currentPrice,
    aggregatedSignals,
    localPatterns,
    alphaVantage,
    timeframe,
    market
  );

  const patternNames = localPatterns?.patterns.map(p => p.pattern).join(", ") || null;
  const patternSignal = localPatterns ? 
    (localPatterns.buyScore > localPatterns.sellScore ? "BUY" : 
     localPatterns.sellScore > localPatterns.buyScore ? "SELL" : "NEUTRAL") : "NEUTRAL";

  return {
    symbol,
    currentPrice,
    recommendation: aggregatedSignals.recommendation,
    confidence: aggregatedSignals.confidence,
    
    entryPrice: currentPrice,
    stopLoss: sltp.stopLoss,
    takeProfit: sltp.takeProfit,
    riskReward: sltp.riskReward,
    
    candlestickPattern: {
      pattern: patternNames,
      signal: patternSignal,
      buyScore: localPatterns?.buyScore || 0,
      sellScore: localPatterns?.sellScore || 0
    },
    
    technicalIndicators: {
      rsi: alphaVantage?.indicators.rsi || 50,
      macd: {
        value: alphaVantage?.indicators.macd.macd || 0,
        signal: alphaVantage?.indicators.macd.signal || 0,
        histogram: alphaVantage?.indicators.macd.histogram || 0,
        trend: alphaVantage?.indicators.macd.trend || "NEUTRAL"
      },
      movingAverages: {
        sma20: alphaVantage?.indicators.sma20 || currentPrice,
        sma50: alphaVantage?.indicators.sma50 || currentPrice,
        sma200: alphaVantage?.indicators.sma200 || currentPrice
      },
      atr: alphaVantage?.indicators.atr || currentPrice * 0.02,
      bollingerBands: alphaVantage?.indicators.bollingerBands || {
        upper: currentPrice * 1.05,
        middle: currentPrice,
        lower: currentPrice * 0.95
      }
    },
    
    supportResistance: alphaVantage?.supportResistance || {
      support1: currentPrice * 0.97,
      support2: currentPrice * 0.94,
      resistance1: currentPrice * 1.03,
      resistance2: currentPrice * 1.06,
      pivotPoint: currentPrice
    },
    
    sentiment: {
      bullishPercent: localPatterns ? (localPatterns.buyScore > 50 ? 60 : 40) : 50,
      bearishPercent: localPatterns ? (localPatterns.sellScore > 50 ? 60 : 30) : 30,
      neutralPercent: 20,
      overall: patternSignal === "BUY" ? "BULLISH" : patternSignal === "SELL" ? "BEARISH" : "NEUTRAL"
    },
    
    aiAnalysis: aiEnhancement,
    
    optionsStrategy: aggregatedSignals.recommendation !== "HOLD" && market === "US" 
      ? generateOptionsStrategy(symbol, currentPrice, sltp, aggregatedSignals.recommendation)
      : undefined,
    
    dataSources: {
      localPatterns: !!localPatterns,
      alphaVantage: !!alphaVantage,
      geminiAI: true
    }
  };
}

function aggregateSignals(
  patterns: PatternScore | null,
  alpha: AlphaVantageAnalysis | null
): { recommendation: "BUY" | "SELL" | "HOLD"; confidence: number } {
  let buySignals = 0;
  let sellSignals = 0;
  let totalWeight = 0;

  if (patterns) {
    const weight = 40;
    totalWeight += weight;
    buySignals += (patterns.buyScore / 100) * weight;
    sellSignals += (patterns.sellScore / 100) * weight;
  }

  if (alpha) {
    const weight = 60;
    totalWeight += weight;
    
    if (alpha.indicators.rsi < 30) buySignals += weight * 0.25;
    else if (alpha.indicators.rsi > 70) sellSignals += weight * 0.25;
    else if (alpha.indicators.rsi < 40) buySignals += weight * 0.1;
    else if (alpha.indicators.rsi > 60) sellSignals += weight * 0.1;
    
    if (alpha.indicators.macd.trend === "BULLISH") buySignals += weight * 0.35;
    else if (alpha.indicators.macd.trend === "BEARISH") sellSignals += weight * 0.35;
    
    const price = alpha.priceHistory[0]?.close || alpha.supportResistance.pivotPoint;
    if (price && alpha.indicators.sma20) {
      if (price > alpha.indicators.sma20) buySignals += weight * 0.2;
      else sellSignals += weight * 0.2;
    }
    
    if (price && alpha.indicators.sma50) {
      if (price > alpha.indicators.sma50) buySignals += weight * 0.1;
      else sellSignals += weight * 0.1;
    }
    
    if (price && alpha.indicators.bollingerBands) {
      if (price <= alpha.indicators.bollingerBands.lower) buySignals += weight * 0.1;
      else if (price >= alpha.indicators.bollingerBands.upper) sellSignals += weight * 0.1;
    }
  }

  const buyPct = totalWeight > 0 ? (buySignals / totalWeight) * 100 : 50;
  const sellPct = totalWeight > 0 ? (sellSignals / totalWeight) * 100 : 50;
  
  let recommendation: "BUY" | "SELL" | "HOLD" = "HOLD";
  let confidence = 50;

  if (buyPct > sellPct + 12) {
    recommendation = "BUY";
    confidence = Math.min(Math.round(buyPct + 20), 95);
  } else if (sellPct > buyPct + 12) {
    recommendation = "SELL";
    confidence = Math.min(Math.round(sellPct + 20), 95);
  } else {
    recommendation = "HOLD";
    confidence = Math.round(60 - Math.abs(buyPct - sellPct));
  }

  return { recommendation, confidence };
}

function calculateOptimalSLTP(
  currentPrice: number,
  alpha: AlphaVantageAnalysis | null,
  timeframe: string,
  direction: "BUY" | "SELL" | "HOLD"
): { stopLoss: number; takeProfit: number; riskReward: number } {
  
  const actualDirection = direction === "HOLD" ? "BUY" : direction;
  
  if (alpha) {
    return calculateDynamicSLTP(
      currentPrice,
      alpha.supportResistance,
      alpha.indicators.atr,
      timeframe,
      actualDirection
    );
  }
  
  const timeframeMultipliers: Record<string, { sl: number; tp: number }> = {
    day: { sl: 0.01, tp: 0.02 },
    swing: { sl: 0.03, tp: 0.06 },
    month: { sl: 0.05, tp: 0.10 },
    longterm: { sl: 0.08, tp: 0.16 }
  };
  
  const mult = timeframeMultipliers[timeframe] || timeframeMultipliers.swing;
  
  return {
    stopLoss: Math.round(currentPrice * (1 - mult.sl) * 100) / 100,
    takeProfit: Math.round(currentPrice * (1 + mult.tp) * 100) / 100,
    riskReward: Math.round((mult.tp / mult.sl) * 100) / 100
  };
}

async function getAIEnhancement(
  symbol: string,
  currentPrice: number,
  signals: { recommendation: "BUY" | "SELL" | "HOLD"; confidence: number },
  patterns: PatternScore | null,
  alpha: AlphaVantageAnalysis | null,
  timeframe: string,
  market: string
): Promise<{ rationale: string; trend: string; keyLevels: string; riskFactors: string }> {
  const patternNames = patterns?.patterns.map(p => p.pattern).join(", ") || "No clear pattern";
  const patternSignal = patterns ? 
    (patterns.buyScore > patterns.sellScore ? "Bullish" : 
     patterns.sellScore > patterns.buyScore ? "Bearish" : "Neutral") : "Neutral";

  try {
    const prompt = `
Analyze ${symbol} at $${currentPrice} for ${timeframe} trading in the ${market} market.

Technical Data:
- Candlestick Patterns: ${patternNames}
- Pattern Signal: ${patternSignal} (Buy Score: ${patterns?.buyScore || 0}, Sell Score: ${patterns?.sellScore || 0})
- RSI: ${alpha?.indicators.rsi?.toFixed(1) || "N/A"}
- MACD Trend: ${alpha?.indicators.macd.trend || "N/A"}
- SMA20: ${alpha?.indicators.sma20?.toFixed(2) || "N/A"}
- SMA50: ${alpha?.indicators.sma50?.toFixed(2) || "N/A"}
- Support 1: ${alpha?.supportResistance.support1?.toFixed(2) || "N/A"}
- Resistance 1: ${alpha?.supportResistance.resistance1?.toFixed(2) || "N/A"}
- ATR: ${alpha?.indicators.atr?.toFixed(2) || "N/A"}

Aggregated Signal: ${signals.recommendation} (${signals.confidence}% confidence)

Provide a brief JSON analysis:
{
  "rationale": "2-3 sentence explanation of the trade setup",
  "trend": "Current trend description (e.g., Strong uptrend, Consolidating, Bearish reversal)",
  "keyLevels": "Key support/resistance to watch",
  "riskFactors": "Main risks to consider"
}
`;

    const response = await gemini.chat.completions.create({
      model: "gemini-2.5-flash",
      messages: [
        { role: "system", content: "You are an expert technical analyst. Provide concise, actionable insights." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (content) {
      return JSON.parse(content);
    }
  } catch (error) {
    console.error("AI enhancement error:", error);
  }

  return {
    rationale: `${signals.recommendation} signal with ${signals.confidence}% confidence based on technical indicators and pattern analysis.`,
    trend: patternSignal === "Bullish" ? "Bullish momentum" : 
           patternSignal === "Bearish" ? "Bearish pressure" : "Consolidating",
    keyLevels: `Watch support at $${(currentPrice * 0.97).toFixed(2)} and resistance at $${(currentPrice * 1.03).toFixed(2)}`,
    riskFactors: "Monitor volume confirmation and broader market conditions."
  };
}

function generateOptionsStrategy(
  symbol: string,
  currentPrice: number,
  sltp: { stopLoss: number; takeProfit: number; riskReward: number },
  recommendation: "BUY" | "SELL"
): EnhancedStockAnalysis["optionsStrategy"] {
  const roundToStrike = (price: number) => Math.round(price / 5) * 5;
  
  if (recommendation === "BUY") {
    const longStrike = roundToStrike(currentPrice);
    const shortStrike = roundToStrike(sltp.takeProfit);
    const maxProfit = (shortStrike - longStrike) * 100;
    
    return {
      strategy: "Bull Call Spread",
      description: `Buy ${symbol} $${longStrike} Call, Sell ${symbol} $${shortStrike} Call`,
      strikePrice: longStrike,
      targetStrike: shortStrike,
      expiry: "30-45 days",
      maxProfit: `$${maxProfit} per spread (width minus net debit)`,
      maxRisk: "Limited to net debit paid",
      breakeven: longStrike + (shortStrike - longStrike) * 0.4,
      rationale: "Defined-risk bullish strategy with capped upside at resistance level"
    };
  } else {
    const longStrike = roundToStrike(currentPrice);
    const shortStrike = roundToStrike(sltp.takeProfit);
    const maxProfit = (longStrike - shortStrike) * 100;
    
    return {
      strategy: "Bear Put Spread",
      description: `Buy ${symbol} $${longStrike} Put, Sell ${symbol} $${shortStrike} Put`,
      strikePrice: longStrike,
      targetStrike: shortStrike,
      expiry: "30-45 days",
      maxProfit: `$${maxProfit} per spread (width minus net debit)`,
      maxRisk: "Limited to net debit paid",
      breakeven: longStrike - (longStrike - shortStrike) * 0.4,
      rationale: "Defined-risk bearish strategy targeting support level breakdown"
    };
  }
}

export async function scanMarketWithEnhancedAnalysis(
  symbols: string[],
  prices: Map<string, number>,
  timeframe: string,
  market: string,
  limit: number = 5,
  profileInfo?: ProfileInfo
): Promise<EnhancedStockAnalysis[]> {
  const analyses: EnhancedStockAnalysis[] = [];
  
  console.log(`Scanning with profile: ${profileInfo?.profileType || 'default'} ${profileInfo?.riskLevel || profileInfo?.traderStyle || ''}`);
  
  const batchSize = 3;
  for (let i = 0; i < symbols.length && analyses.length < limit * 2; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const batchPromises = batch.map(async (symbol) => {
      const price = prices.get(symbol);
      if (!price) return null;
      
      try {
        return await getEnhancedAnalysis(symbol, price, timeframe, market, profileInfo);
      } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(batchPromises);
    analyses.push(...results.filter((a): a is EnhancedStockAnalysis => a !== null));
  }

  let actionable = analyses.filter(a => a.recommendation !== "HOLD");
  
  // For investors with conservative risk, prioritize lower volatility stocks
  if (profileInfo?.profileType === "INVESTOR" && profileInfo?.riskLevel === "CONSERVATIVE") {
    actionable.sort((a, b) => {
      // Lower ATR = less volatile = better for conservative investors
      const aVolatility = a.technicalIndicators.atr / a.currentPrice;
      const bVolatility = b.technicalIndicators.atr / b.currentPrice;
      return aVolatility - bVolatility || b.confidence - a.confidence;
    });
  } else {
    // Default: sort by confidence
    actionable.sort((a, b) => b.confidence - a.confidence);
  }
  
  return actionable.slice(0, limit);
}
