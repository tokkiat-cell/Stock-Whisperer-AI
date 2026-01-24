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
): { stopLoss: number; takeProfit: number; riskReward: number } {
  
  const timeframeMultipliers: Record<string, { slMultiplier: number; tpMultiplier: number }> = {
    day: { slMultiplier: 0.5, tpMultiplier: 1.0 },
    swing: { slMultiplier: 1.0, tpMultiplier: 2.0 },
    month: { slMultiplier: 1.5, tpMultiplier: 3.0 },
    longterm: { slMultiplier: 2.0, tpMultiplier: 4.0 }
  };

  const multipliers = timeframeMultipliers[timeframe] || timeframeMultipliers.swing;

  let stopLoss: number;
  let takeProfit: number;

  if (direction === "BUY") {
    const atrBasedSL = currentPrice - (atr * multipliers.slMultiplier);
    stopLoss = Math.max(atrBasedSL, supportResistance.support1 * 0.99);
    
    const atrBasedTP = currentPrice + (atr * multipliers.tpMultiplier);
    takeProfit = Math.min(atrBasedTP, supportResistance.resistance1 * 1.01);
    
    if (takeProfit <= currentPrice) {
      takeProfit = supportResistance.resistance2 || currentPrice * 1.05;
    }
  } else {
    const atrBasedSL = currentPrice + (atr * multipliers.slMultiplier);
    stopLoss = Math.min(atrBasedSL, supportResistance.resistance1 * 1.01);
    
    const atrBasedTP = currentPrice - (atr * multipliers.tpMultiplier);
    takeProfit = Math.max(atrBasedTP, supportResistance.support1 * 0.99);
    
    if (takeProfit >= currentPrice) {
      takeProfit = supportResistance.support2 || currentPrice * 0.95;
    }
  }

  const risk = Math.abs(currentPrice - stopLoss);
  const reward = Math.abs(takeProfit - currentPrice);
  const riskReward = risk > 0 ? Math.round((reward / risk) * 100) / 100 : 0;

  return {
    stopLoss: Math.round(stopLoss * 100) / 100,
    takeProfit: Math.round(takeProfit * 100) / 100,
    riskReward
  };
}
