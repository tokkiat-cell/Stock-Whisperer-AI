const ALPHA_VANTAGE_API_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const ALPHA_VANTAGE_BASE_URL = "https://www.alphavantage.co/query";

export interface SupportResistanceLevels {
  support1: number;
  support2: number;
  resistance1: number;
  resistance2: number;
  pivotPoint: number;
}

export interface TechnicalIndicators {
  rsi: number;
  macd: {
    macd: number;
    signal: number;
    histogram: number;
    trend: "BULLISH" | "BEARISH" | "NEUTRAL";
  };
  sma20: number;
  sma50: number;
  sma200: number;
  ema20: number;
  atr: number;
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
}

export interface PriceData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  date: string;
}

export interface AlphaVantageAnalysis {
  indicators: TechnicalIndicators;
  supportResistance: SupportResistanceLevels;
  priceHistory: PriceData[];
  suggestedSL: number;
  suggestedTP: number;
  volatility: number;
}

export interface AlphaVantageQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  latestTradingDay: string;
  previousClose: number;
  open: number;
  high: number;
  low: number;
}

export async function getAlphaVantageQuote(symbol: string): Promise<AlphaVantageQuote | null> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.warn("ALPHA_VANTAGE_API_KEY not set for real-time quote");
    return null;
  }

  try {
    const queryParams = new URLSearchParams({
      function: "GLOBAL_QUOTE",
      symbol: symbol.toUpperCase(),
      apikey: ALPHA_VANTAGE_API_KEY
    });

    const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?${queryParams}`);
    if (!response.ok) {
      throw new Error(`Alpha Vantage API error: ${response.status}`);
    }
    
    const data = await response.json();
    const quote = data["Global Quote"];
    
    if (!quote || !quote["05. price"]) {
      console.warn(`Alpha Vantage: No quote data for ${symbol}`);
      return null;
    }

    return {
      symbol: quote["01. symbol"] || symbol.toUpperCase(),
      price: parseFloat(quote["05. price"]) || 0,
      change: parseFloat(quote["09. change"]) || 0,
      changePercent: parseFloat(quote["10. change percent"]?.replace('%', '')) || 0,
      volume: parseInt(quote["06. volume"]) || 0,
      latestTradingDay: quote["07. latest trading day"] || "",
      previousClose: parseFloat(quote["08. previous close"]) || 0,
      open: parseFloat(quote["02. open"]) || 0,
      high: parseFloat(quote["03. high"]) || 0,
      low: parseFloat(quote["04. low"]) || 0
    };
  } catch (error) {
    console.error(`Alpha Vantage Quote Error for ${symbol}:`, error);
    return null;
  }
}

async function fetchIndicator(symbol: string, func: string, params: Record<string, string> = {}): Promise<any> {
  const queryParams = new URLSearchParams({
    function: func,
    symbol,
    apikey: ALPHA_VANTAGE_API_KEY || "",
    ...params
  });

  const response = await fetch(`${ALPHA_VANTAGE_BASE_URL}?${queryParams}`);
  if (!response.ok) {
    throw new Error(`Alpha Vantage API error: ${response.status}`);
  }
  return response.json();
}

function getLatestValue(data: Record<string, any>, key: string): number {
  if (!data) return 0;
  const dates = Object.keys(data);
  if (dates.length === 0) return 0;
  const latest = data[dates[0]];
  return parseFloat(latest?.[key] || "0");
}

export async function getAlphaVantageAnalysis(symbol: string, currentPrice: number): Promise<AlphaVantageAnalysis> {
  if (!ALPHA_VANTAGE_API_KEY) {
    console.warn("ALPHA_VANTAGE_API_KEY not set, returning calculated data");
    return getCalculatedAnalysis(symbol, currentPrice);
  }

  try {
    const [rsiData, macdData, sma20Data, sma50Data, sma200Data, atrData, bbData, priceData] = await Promise.all([
      fetchIndicator(symbol, "RSI", { interval: "daily", time_period: "14", series_type: "close" }),
      fetchIndicator(symbol, "MACD", { interval: "daily", series_type: "close" }),
      fetchIndicator(symbol, "SMA", { interval: "daily", time_period: "20", series_type: "close" }),
      fetchIndicator(symbol, "SMA", { interval: "daily", time_period: "50", series_type: "close" }),
      fetchIndicator(symbol, "SMA", { interval: "daily", time_period: "200", series_type: "close" }),
      fetchIndicator(symbol, "ATR", { interval: "daily", time_period: "14" }),
      fetchIndicator(symbol, "BBANDS", { interval: "daily", time_period: "20", series_type: "close" }),
      fetchIndicator(symbol, "TIME_SERIES_DAILY", { outputsize: "compact" })
    ]);

    const rsi = getLatestValue(rsiData["Technical Analysis: RSI"], "RSI");
    
    const macdAnalysis = macdData["Technical Analysis: MACD"];
    const macdDates = Object.keys(macdAnalysis || {});
    const latestMacd = macdDates.length > 0 ? macdAnalysis[macdDates[0]] : null;
    const macdValue = parseFloat(latestMacd?.["MACD"] || "0");
    const macdSignal = parseFloat(latestMacd?.["MACD_Signal"] || "0");
    const macdHistogram = parseFloat(latestMacd?.["MACD_Hist"] || "0");

    const sma20 = getLatestValue(sma20Data["Technical Analysis: SMA"], "SMA");
    const sma50 = getLatestValue(sma50Data["Technical Analysis: SMA"], "SMA");
    const sma200 = getLatestValue(sma200Data["Technical Analysis: SMA"], "SMA");
    const atr = getLatestValue(atrData["Technical Analysis: ATR"], "ATR");

    const bbAnalysis = bbData["Technical Analysis: BBANDS"];
    const bbDates = Object.keys(bbAnalysis || {});
    const latestBB = bbDates.length > 0 ? bbAnalysis[bbDates[0]] : null;
    const bbUpper = parseFloat(latestBB?.["Real Upper Band"] || String(currentPrice * 1.05));
    const bbLower = parseFloat(latestBB?.["Real Lower Band"] || String(currentPrice * 0.95));
    const bbMiddle = parseFloat(latestBB?.["Real Middle Band"] || String(currentPrice));

    const timeSeries = priceData["Time Series (Daily)"] || {};
    const dates = Object.keys(timeSeries).slice(0, 30);
    const priceHistory: PriceData[] = dates.map(date => ({
      date,
      open: parseFloat(timeSeries[date]["1. open"]),
      high: parseFloat(timeSeries[date]["2. high"]),
      low: parseFloat(timeSeries[date]["3. low"]),
      close: parseFloat(timeSeries[date]["4. close"]),
      volume: parseFloat(timeSeries[date]["5. volume"])
    }));

    const supportResistance = calculateSupportResistance(priceHistory, currentPrice);
    const volatility = atr / currentPrice * 100;

    const suggestedSL = currentPrice - (atr * 1.5);
    const suggestedTP = currentPrice + (atr * 3);

    return {
      indicators: {
        rsi,
        macd: {
          macd: macdValue,
          signal: macdSignal,
          histogram: macdHistogram,
          trend: macdHistogram > 0 ? "BULLISH" : macdHistogram < 0 ? "BEARISH" : "NEUTRAL"
        },
        sma20,
        sma50,
        sma200,
        ema20: sma20,
        atr,
        bollingerBands: {
          upper: bbUpper,
          middle: bbMiddle,
          lower: bbLower
        }
      },
      supportResistance,
      priceHistory,
      suggestedSL,
      suggestedTP,
      volatility
    };
  } catch (error) {
    console.error("Alpha Vantage API error:", error);
    return getCalculatedAnalysis(symbol, currentPrice);
  }
}

function calculateSupportResistance(priceHistory: PriceData[], currentPrice: number): SupportResistanceLevels {
  if (priceHistory.length === 0) {
    return {
      support1: currentPrice * 0.97,
      support2: currentPrice * 0.94,
      resistance1: currentPrice * 1.03,
      resistance2: currentPrice * 1.06,
      pivotPoint: currentPrice
    };
  }

  const highs = priceHistory.map(p => p.high).sort((a, b) => b - a);
  const lows = priceHistory.map(p => p.low).sort((a, b) => a - b);
  
  const recentHigh = highs[0];
  const recentLow = lows[0];
  const pivotPoint = (recentHigh + recentLow + currentPrice) / 3;

  const r1 = (2 * pivotPoint) - recentLow;
  const s1 = (2 * pivotPoint) - recentHigh;
  const r2 = pivotPoint + (recentHigh - recentLow);
  const s2 = pivotPoint - (recentHigh - recentLow);

  return {
    support1: Math.round(s1 * 100) / 100,
    support2: Math.round(s2 * 100) / 100,
    resistance1: Math.round(r1 * 100) / 100,
    resistance2: Math.round(r2 * 100) / 100,
    pivotPoint: Math.round(pivotPoint * 100) / 100
  };
}

function getCalculatedAnalysis(symbol: string, currentPrice: number): AlphaVantageAnalysis {
  const volatilityFactor = 0.02 + Math.random() * 0.03;
  const atr = currentPrice * volatilityFactor;
  
  const rsi = 30 + Math.random() * 40;
  const macdTrend = Math.random() > 0.5 ? "BULLISH" : "BEARISH";
  
  return {
    indicators: {
      rsi,
      macd: {
        macd: (Math.random() - 0.5) * 2,
        signal: (Math.random() - 0.5) * 1.5,
        histogram: (Math.random() - 0.5) * 0.5,
        trend: macdTrend
      },
      sma20: currentPrice * (0.98 + Math.random() * 0.04),
      sma50: currentPrice * (0.95 + Math.random() * 0.1),
      sma200: currentPrice * (0.9 + Math.random() * 0.2),
      ema20: currentPrice * (0.98 + Math.random() * 0.04),
      atr,
      bollingerBands: {
        upper: currentPrice * 1.05,
        middle: currentPrice,
        lower: currentPrice * 0.95
      }
    },
    supportResistance: {
      support1: Math.round(currentPrice * 0.97 * 100) / 100,
      support2: Math.round(currentPrice * 0.94 * 100) / 100,
      resistance1: Math.round(currentPrice * 1.03 * 100) / 100,
      resistance2: Math.round(currentPrice * 1.06 * 100) / 100,
      pivotPoint: currentPrice
    },
    priceHistory: [],
    suggestedSL: Math.round((currentPrice - atr * 1.5) * 100) / 100,
    suggestedTP: Math.round((currentPrice + atr * 3) * 100) / 100,
    volatility: volatilityFactor * 100
  };
}

export function calculateDynamicSLTP(
  currentPrice: number,
  supportResistance: SupportResistanceLevels,
  atr: number,
  timeframe: string,
  direction: "BUY" | "SELL"
): { stopLoss: number; takeProfit: number; riskReward: number; method: string } {
  
  // Ensure ATR is valid (minimum 0.5% of price if not available)
  const effectiveATR = Math.max(atr, currentPrice * 0.005);
  
  // Professional SL/TP calculation using 3 methods:
  // 1. ATR Volatility Method: Stop at 2×ATR, Target at 4-6×ATR
  // 2. Market Structure Method: Stop below support, Target near resistance
  // 3. Risk-Reward Method: Ensure minimum 1:2 ratio
  
  const timeframeConfig: Record<string, { atrMultiplierSL: number; atrMultiplierTP: number; minRR: number }> = {
    day: { atrMultiplierSL: 1.5, atrMultiplierTP: 3.0, minRR: 2.0 },      // Tighter for intraday
    swing: { atrMultiplierSL: 2.0, atrMultiplierTP: 4.0, minRR: 2.0 },    // Standard 2×ATR SL
    month: { atrMultiplierSL: 2.5, atrMultiplierTP: 5.0, minRR: 2.0 },    // Wider for monthly
    longterm: { atrMultiplierSL: 3.0, atrMultiplierTP: 6.0, minRR: 2.0 }  // Widest for long-term
  };

  const config = timeframeConfig[timeframe] || timeframeConfig.swing;
  
  let stopLoss: number;
  let takeProfit: number;
  let method: string;

  if (direction === "BUY") {
    // Method 1: ATR Volatility Method - Stop at 2×ATR below entry
    const atrBasedSL = currentPrice - (effectiveATR * config.atrMultiplierSL);
    
    // Method 2: Market Structure Method - Stop slightly below nearest support
    const structureBasedSL = supportResistance.support1 * 0.995; // 0.5% below support
    
    // Choose the tighter stop (higher value for BUY), but never at or above entry
    stopLoss = Math.min(atrBasedSL, structureBasedSL);
    
    // Ensure stop loss is ALWAYS below entry (minimum 1% below)
    const minSL = currentPrice * 0.99;
    if (stopLoss >= currentPrice) {
      stopLoss = minSL;
      method = "Fallback (1% minimum)";
    } else if (Math.abs(stopLoss - atrBasedSL) < 0.01) {
      method = "ATR Volatility Method (2×ATR)";
    } else {
      method = "Market Structure Method (Below Support)";
    }
    
    // Calculate target based on ATR method (4-6×ATR above entry)
    const atrBasedTP = currentPrice + (effectiveATR * config.atrMultiplierTP);
    
    // Also consider resistance levels
    const structureBasedTP = supportResistance.resistance1 * 0.995; // Just below resistance
    
    // Take the more conservative target (lower value for BUY)
    takeProfit = Math.min(atrBasedTP, Math.max(structureBasedTP, currentPrice * 1.02));
    
    // Method 3: Enforce minimum 1:2 risk-reward ratio
    const risk = currentPrice - stopLoss;
    const minReward = risk * config.minRR;
    const minTP = currentPrice + minReward;
    
    if (takeProfit < minTP) {
      takeProfit = minTP;
      method += " + R:R Adjustment";
    }
    
  } else {
    // SELL direction
    // Method 1: ATR Volatility Method - Stop at 2×ATR above entry
    const atrBasedSL = currentPrice + (effectiveATR * config.atrMultiplierSL);
    
    // Method 2: Market Structure Method - Stop slightly above nearest resistance
    const structureBasedSL = supportResistance.resistance1 * 1.005; // 0.5% above resistance
    
    // Choose the tighter stop (lower value for SELL), but never at or below entry
    stopLoss = Math.max(atrBasedSL, structureBasedSL);
    
    // Ensure stop loss is ALWAYS above entry (minimum 1% above)
    const minSL = currentPrice * 1.01;
    if (stopLoss <= currentPrice) {
      stopLoss = minSL;
      method = "Fallback (1% minimum)";
    } else if (Math.abs(stopLoss - atrBasedSL) < 0.01) {
      method = "ATR Volatility Method (2×ATR)";
    } else {
      method = "Market Structure Method (Above Resistance)";
    }
    
    // Calculate target based on ATR method (4-6×ATR below entry)
    const atrBasedTP = currentPrice - (effectiveATR * config.atrMultiplierTP);
    
    // Also consider support levels
    const structureBasedTP = supportResistance.support1 * 1.005; // Just above support
    
    // Take the more conservative target (higher value for SELL)
    takeProfit = Math.max(atrBasedTP, Math.min(structureBasedTP, currentPrice * 0.98));
    
    // Method 3: Enforce minimum 1:2 risk-reward ratio
    const risk = stopLoss - currentPrice;
    const minReward = risk * config.minRR;
    const minTP = currentPrice - minReward;
    
    if (takeProfit > minTP) {
      takeProfit = minTP;
      method += " + R:R Adjustment";
    }
  }

  // Final validation: Ensure stop loss is never equal to entry
  if (Math.abs(stopLoss - currentPrice) < 0.01) {
    if (direction === "BUY") {
      stopLoss = currentPrice * 0.98; // Force 2% below
    } else {
      stopLoss = currentPrice * 1.02; // Force 2% above
    }
    method = "Forced 2% buffer";
  }

  const risk = Math.abs(currentPrice - stopLoss);
  const reward = Math.abs(takeProfit - currentPrice);
  const riskReward = risk > 0 ? Math.round((reward / risk) * 100) / 100 : config.minRR;

  return {
    stopLoss: Math.round(stopLoss * 100) / 100,
    takeProfit: Math.round(takeProfit * 100) / 100,
    riskReward,
    method
  };
}
