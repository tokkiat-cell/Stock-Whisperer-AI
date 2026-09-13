const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;
const FINNHUB_BASE_URL = "https://finnhub.io/api/v1";

export interface PatternRecognition {
  symbol: string;
  patternname: string;
  patterntype: string;
  agodays: number;
  signal: string;
}

export interface CandlestickPattern {
  patterns: PatternRecognition[];
  buyScore: number;
  sellScore: number;
  dominantPattern: string | null;
  patternSignal: "BUY" | "SELL" | "NEUTRAL";
}

export interface TechnicalIndicator {
  buy: number;
  neutral: number;
  sell: number;
  signal: string;
}

export interface TechnicalAnalysisResult {
  technicalAnalysis: {
    count: {
      buy: number;
      neutral: number;
      sell: number;
    };
    signal: string;
  };
  trend: {
    adx: number;
    trending: boolean;
  };
}

export interface FinnhubQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
}

export async function getFinnhubQuote(symbol: string): Promise<FinnhubQuote | null> {
  if (!FINNHUB_API_KEY) {
    console.warn("FINNHUB_API_KEY not set for real-time quote");
    return null;
  }

  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/quote?symbol=${symbol.toUpperCase()}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) {
      throw new Error(`Finnhub API error: ${response.status}`);
    }

    const data = await response.json();

    // Finnhub returns all-zero fields (rather than an error) for an unknown symbol.
    if (!data || (data.c === 0 && data.pc === 0)) {
      console.warn(`Finnhub: No quote data for ${symbol}`);
      return null;
    }

    return {
      symbol: symbol.toUpperCase(),
      price: data.c,
      change: data.d,
      changePercent: data.dp,
      open: data.o,
      high: data.h,
      low: data.l,
      previousClose: data.pc,
    };
  } catch (error) {
    console.error(`Finnhub Quote Error for ${symbol}:`, error);
    return null;
  }
}

export async function getPatternRecognition(symbol: string): Promise<CandlestickPattern> {
  if (!FINNHUB_API_KEY) {
    console.warn("FINNHUB_API_KEY not set, returning mock pattern data");
    return getMockPatternData(symbol);
  }

  try {
    const resolution = "D";
    const response = await fetch(
      `${FINNHUB_BASE_URL}/scan/pattern?symbol=${symbol}&resolution=${resolution}&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status}`);
      return getMockPatternData(symbol);
    }

    const data = await response.json();
    const points = data.points || [];

    let buyScore = 0;
    let sellScore = 0;
    const patterns: PatternRecognition[] = [];

    for (const point of points) {
      const pattern: PatternRecognition = {
        symbol: point.symbol || symbol,
        patternname: point.patternname || "Unknown",
        patterntype: point.patterntype || "unknown",
        agodays: point.agodays || 0,
        signal: point.signal || "unknown"
      };
      patterns.push(pattern);

      if (pattern.patterntype === "bullish") {
        buyScore += 10 - Math.min(pattern.agodays, 5);
      } else if (pattern.patterntype === "bearish") {
        sellScore += 10 - Math.min(pattern.agodays, 5);
      }
    }

    const dominantPattern = patterns.length > 0 ? patterns[0].patternname : null;
    let patternSignal: "BUY" | "SELL" | "NEUTRAL" = "NEUTRAL";
    
    if (buyScore > sellScore + 5) {
      patternSignal = "BUY";
    } else if (sellScore > buyScore + 5) {
      patternSignal = "SELL";
    }

    return {
      patterns,
      buyScore,
      sellScore,
      dominantPattern,
      patternSignal
    };
  } catch (error) {
    console.error("Finnhub pattern recognition error:", error);
    return getMockPatternData(symbol);
  }
}

export async function getTechnicalIndicators(symbol: string): Promise<TechnicalAnalysisResult> {
  if (!FINNHUB_API_KEY) {
    console.warn("FINNHUB_API_KEY not set, returning mock technical data");
    return getMockTechnicalData();
  }

  try {
    const response = await fetch(
      `${FINNHUB_BASE_URL}/scan/technical-indicator?symbol=${symbol}&resolution=D&token=${FINNHUB_API_KEY}`
    );

    if (!response.ok) {
      console.error(`Finnhub technical indicator error: ${response.status}`);
      return getMockTechnicalData();
    }

    const data = await response.json();
    
    return {
      technicalAnalysis: {
        count: {
          buy: data.technicalAnalysis?.count?.buy || 0,
          neutral: data.technicalAnalysis?.count?.neutral || 0,
          sell: data.technicalAnalysis?.count?.sell || 0
        },
        signal: data.technicalAnalysis?.signal || "neutral"
      },
      trend: {
        adx: data.trend?.adx || 0,
        trending: data.trend?.trending || false
      }
    };
  } catch (error) {
    console.error("Finnhub technical indicator error:", error);
    return getMockTechnicalData();
  }
}

function getMockPatternData(symbol: string): CandlestickPattern {
  const patterns = [
    { patternname: "Bullish Engulfing", patterntype: "bullish", signal: "buy" },
    { patternname: "Hammer", patterntype: "bullish", signal: "buy" },
    { patternname: "Morning Star", patterntype: "bullish", signal: "buy" },
    { patternname: "Bearish Engulfing", patterntype: "bearish", signal: "sell" },
    { patternname: "Evening Star", patterntype: "bearish", signal: "sell" },
    { patternname: "Doji", patterntype: "neutral", signal: "neutral" }
  ];
  
  const randomPattern = patterns[Math.floor(Math.random() * patterns.length)];
  
  return {
    patterns: [{
      symbol,
      patternname: randomPattern.patternname,
      patterntype: randomPattern.patterntype,
      agodays: Math.floor(Math.random() * 3),
      signal: randomPattern.signal
    }],
    buyScore: randomPattern.patterntype === "bullish" ? 15 : 5,
    sellScore: randomPattern.patterntype === "bearish" ? 15 : 5,
    dominantPattern: randomPattern.patternname,
    patternSignal: randomPattern.patterntype === "bullish" ? "BUY" : 
                   randomPattern.patterntype === "bearish" ? "SELL" : "NEUTRAL"
  };
}

function getMockTechnicalData(): TechnicalAnalysisResult {
  return {
    technicalAnalysis: {
      count: { buy: 8, neutral: 5, sell: 4 },
      signal: "buy"
    },
    trend: {
      adx: 25,
      trending: true
    }
  };
}
