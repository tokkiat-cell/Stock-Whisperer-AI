import { getPatternRecognition, getTechnicalIndicators, CandlestickPattern, TechnicalAnalysisResult } from "./finnhubClient";
import { getAlphaVantageAnalysis, calculateDynamicSLTP, AlphaVantageAnalysis } from "./alphaVantageClient";
import { getTradefeedsAnalysis, TradefeedsAnalysis } from "./tradefeedsClient";
import OpenAI from "openai";

const gemini = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
});

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
    finnhub: boolean;
    alphaVantage: boolean;
    tradefeeds: boolean;
    geminiAI: boolean;
  };
}

export async function getEnhancedAnalysis(
  symbol: string,
  currentPrice: number,
  timeframe: string = "swing",
  market: string = "US"
): Promise<EnhancedStockAnalysis> {
  const [finnhubPattern, finnhubTechnical, alphaVantage, tradefeeds] = await Promise.all([
    getPatternRecognition(symbol).catch(err => {
      console.error("Finnhub pattern error:", err);
      return null;
    }),
    getTechnicalIndicators(symbol).catch(err => {
      console.error("Finnhub technical error:", err);
      return null;
    }),
    getAlphaVantageAnalysis(symbol, currentPrice).catch(err => {
      console.error("Alpha Vantage error:", err);
      return null;
    }),
    getTradefeedsAnalysis(symbol, currentPrice, timeframe).catch(err => {
      console.error("Tradefeeds error:", err);
      return null;
    })
  ]);

  const aggregatedSignals = aggregateSignals(
    finnhubPattern,
    finnhubTechnical,
    alphaVantage,
    tradefeeds
  );

  const sltp = calculateOptimalSLTP(
    currentPrice,
    alphaVantage,
    tradefeeds,
    timeframe,
    aggregatedSignals.recommendation
  );

  const aiEnhancement = await getAIEnhancement(
    symbol,
    currentPrice,
    aggregatedSignals,
    finnhubPattern,
    alphaVantage,
    timeframe,
    market
  );

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
      pattern: finnhubPattern?.dominantPattern || null,
      signal: finnhubPattern?.patternSignal || "NEUTRAL",
      buyScore: finnhubPattern?.buyScore || 0,
      sellScore: finnhubPattern?.sellScore || 0
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
      bullishPercent: tradefeeds?.sentiment.bullishPercent || 50,
      bearishPercent: tradefeeds?.sentiment.bearishPercent || 30,
      neutralPercent: tradefeeds?.sentiment.neutralPercent || 20,
      overall: tradefeeds?.sentiment.overallSentiment || "NEUTRAL"
    },
    
    aiAnalysis: aiEnhancement,
    
    optionsStrategy: aggregatedSignals.recommendation !== "HOLD" && market === "US" 
      ? generateOptionsStrategy(symbol, currentPrice, sltp, aggregatedSignals.recommendation)
      : undefined,
    
    dataSources: {
      finnhub: !!finnhubPattern || !!finnhubTechnical,
      alphaVantage: !!alphaVantage,
      tradefeeds: !!tradefeeds,
      geminiAI: true
    }
  };
}

function aggregateSignals(
  pattern: CandlestickPattern | null,
  technical: TechnicalAnalysisResult | null,
  alpha: AlphaVantageAnalysis | null,
  tradefeeds: TradefeedsAnalysis | null
): { recommendation: "BUY" | "SELL" | "HOLD"; confidence: number } {
  let buySignals = 0;
  let sellSignals = 0;
  let totalWeight = 0;

  if (pattern) {
    const weight = 25;
    totalWeight += weight;
    if (pattern.patternSignal === "BUY") buySignals += weight;
    else if (pattern.patternSignal === "SELL") sellSignals += weight;
  }

  if (technical) {
    const weight = 20;
    totalWeight += weight;
    const signal = technical.technicalAnalysis.signal.toLowerCase();
    if (signal === "buy" || signal === "strong_buy") buySignals += weight;
    else if (signal === "sell" || signal === "strong_sell") sellSignals += weight;
  }

  if (alpha) {
    const weight = 30;
    totalWeight += weight;
    
    if (alpha.indicators.rsi < 30) buySignals += weight * 0.3;
    else if (alpha.indicators.rsi > 70) sellSignals += weight * 0.3;
    
    if (alpha.indicators.macd.trend === "BULLISH") buySignals += weight * 0.4;
    else if (alpha.indicators.macd.trend === "BEARISH") sellSignals += weight * 0.4;
    
    const price = alpha.priceHistory[0]?.close || alpha.supportResistance.pivotPoint;
    if (price && alpha.indicators.sma20 && price > alpha.indicators.sma20) {
      buySignals += weight * 0.3;
    } else if (price && alpha.indicators.sma20 && price < alpha.indicators.sma20) {
      sellSignals += weight * 0.3;
    }
  }

  if (tradefeeds) {
    const weight = 25;
    totalWeight += weight;
    
    if (tradefeeds.recommendation === "STRONG_BUY") buySignals += weight;
    else if (tradefeeds.recommendation === "BUY") buySignals += weight * 0.7;
    else if (tradefeeds.recommendation === "STRONG_SELL") sellSignals += weight;
    else if (tradefeeds.recommendation === "SELL") sellSignals += weight * 0.7;
  }

  const buyPct = totalWeight > 0 ? (buySignals / totalWeight) * 100 : 50;
  const sellPct = totalWeight > 0 ? (sellSignals / totalWeight) * 100 : 50;
  
  let recommendation: "BUY" | "SELL" | "HOLD" = "HOLD";
  let confidence = 50;

  if (buyPct > sellPct + 15) {
    recommendation = "BUY";
    confidence = Math.min(Math.round(buyPct), 95);
  } else if (sellPct > buyPct + 15) {
    recommendation = "SELL";
    confidence = Math.min(Math.round(sellPct), 95);
  } else {
    recommendation = "HOLD";
    confidence = Math.round(100 - Math.abs(buyPct - sellPct));
  }

  return { recommendation, confidence };
}

function calculateOptimalSLTP(
  currentPrice: number,
  alpha: AlphaVantageAnalysis | null,
  tradefeeds: TradefeedsAnalysis | null,
  timeframe: string,
  direction: "BUY" | "SELL" | "HOLD"
): { stopLoss: number; takeProfit: number; riskReward: number } {
  
  const actualDirection = direction === "HOLD" ? "BUY" : direction;
  
  if (alpha) {
    const dynamicSLTP = calculateDynamicSLTP(
      currentPrice,
      alpha.supportResistance,
      alpha.indicators.atr,
      timeframe,
      actualDirection
    );
    
    if (tradefeeds) {
      const tradeSL = tradefeeds.riskManagement.suggestedSL;
      const tradeTP = tradefeeds.riskManagement.suggestedTP;
      
      const avgSL = (dynamicSLTP.stopLoss + tradeSL) / 2;
      const avgTP = (dynamicSLTP.takeProfit + tradeTP) / 2;
      
      const risk = Math.abs(currentPrice - avgSL);
      const reward = Math.abs(avgTP - currentPrice);
      
      return {
        stopLoss: Math.round(avgSL * 100) / 100,
        takeProfit: Math.round(avgTP * 100) / 100,
        riskReward: risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0
      };
    }
    
    return dynamicSLTP;
  }
  
  if (tradefeeds) {
    const risk = Math.abs(currentPrice - tradefeeds.riskManagement.suggestedSL);
    const reward = Math.abs(tradefeeds.riskManagement.suggestedTP - currentPrice);
    
    return {
      stopLoss: tradefeeds.riskManagement.suggestedSL,
      takeProfit: tradefeeds.riskManagement.suggestedTP,
      riskReward: risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0
    };
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
  pattern: CandlestickPattern | null,
  alpha: AlphaVantageAnalysis | null,
  timeframe: string,
  market: string
): Promise<{ rationale: string; trend: string; keyLevels: string; riskFactors: string }> {
  try {
    const prompt = `
Analyze ${symbol} at $${currentPrice} for ${timeframe} trading in the ${market} market.

Technical Data:
- Candlestick Pattern: ${pattern?.dominantPattern || "No clear pattern"}
- Pattern Signal: ${pattern?.patternSignal || "Neutral"}
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
    trend: pattern?.patternSignal === "BUY" ? "Bullish momentum" : 
           pattern?.patternSignal === "SELL" ? "Bearish pressure" : "Consolidating",
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
  limit: number = 5
): Promise<EnhancedStockAnalysis[]> {
  const analyses: EnhancedStockAnalysis[] = [];
  
  const batchSize = 3;
  for (let i = 0; i < symbols.length && analyses.length < limit * 2; i += batchSize) {
    const batch = symbols.slice(i, i + batchSize);
    const batchPromises = batch.map(async (symbol) => {
      const price = prices.get(symbol);
      if (!price) return null;
      
      try {
        return await getEnhancedAnalysis(symbol, price, timeframe, market);
      } catch (error) {
        console.error(`Error analyzing ${symbol}:`, error);
        return null;
      }
    });
    
    const results = await Promise.all(batchPromises);
    analyses.push(...results.filter((a): a is EnhancedStockAnalysis => a !== null));
  }

  const actionable = analyses.filter(a => a.recommendation !== "HOLD");
  
  actionable.sort((a, b) => b.confidence - a.confidence);
  
  return actionable.slice(0, limit);
}
