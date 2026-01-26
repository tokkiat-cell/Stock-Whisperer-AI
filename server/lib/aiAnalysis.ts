import OpenAI from "openai";

// Initialize OpenAI client using Replit AI Integration env vars
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

type Timeframe = "day" | "month" | "swing" | "longterm";

const timeframeContext: Record<Timeframe, string> = {
  day: "Day Trading (Intraday) - Focus on short-term momentum, price action, and quick entry/exit points within the trading day",
  month: "Monthly Trade (1-4 weeks) - Focus on swing setups, weekly patterns, and medium-term trends",
  swing: "Swing Trade (3-9 months) - Focus on intermediate trends, sector rotation, and multi-month price targets",
  longterm: "Long-term Investment (1+ year) - Focus on fundamental value, long-term growth potential, and major support/resistance levels"
};

export async function analyzeStockWithAI(symbol: string, price: number, timeframe?: Timeframe) {
  try {
    const tf = timeframe || "day";
    const timeframeInfo = timeframeContext[tf];
    
    const prompt = `
Analyze the stock ${symbol} which is currently trading at $${price}.
TRADING TIMEFRAME: ${timeframeInfo}

Provide a comprehensive trading recommendation with detailed technical analysis and options trading setup tailored for this timeframe.

Return a valid JSON object with the following structure:
{
  "symbol": "${symbol}",
  "recommendation": "BUY" | "SELL" | "HOLD",
  "entryPrice": number (suggested entry price),
  "takeProfit": number (target price),
  "stopLoss": number (stop loss price),
  "rationale": "Detailed explanation of the trade setup (2-3 sentences)",
  "confidence": number (0-100),
  "riskReward": number (risk/reward ratio, e.g. 2.5),
  "positionSize": "Suggested position size based on $1000 risk budget",
  "technicalAnalysis": {
    "trend": "Uptrend/Downtrend/Sideways with description",
    "candlePattern": "Current candlestick pattern (e.g., Bullish Engulfing, Hammer)",
    "movingAverages": {
      "ma20": number (20-day MA estimate),
      "ma50": number (50-day MA estimate),
      "ma200": number (200-day MA estimate)
    },
    "rsi": number (estimated RSI 0-100),
    "macd": "Bullish/Bearish crossover description"
  },
  "supportResistance": {
    "support1": number (nearest support level),
    "support2": number (secondary support),
    "resistance1": number (nearest resistance),
    "resistance2": number (secondary resistance)
  },
  "optionsStrategy": {
    "strategy": "Bull Call Spread" | "Bear Put Spread" | "Iron Condor" | "Long Call" | "Long Put" | "Covered Call" | "Protective Put",
    "description": "Description of the options trade (e.g., Buy 150 Call, Sell 160 Call expiring in 30 days)",
    "strikePrice": number (primary strike),
    "targetStrike": number (target/sold strike if spread),
    "expiry": "Recommended expiration (e.g., 30 days, 45 days)",
    "maxProfit": "Description of max profit potential",
    "maxRisk": "Description of max risk",
    "breakeven": number (breakeven price),
    "rationale": "Why this options strategy suits the current setup"
  }
}

RULES:
- For options, choose a strategy that aligns with the directional bias (Bull Call Spread for BUY, Bear Put Spread for SELL)
- If HOLD, optionsStrategy can suggest neutral strategies like Iron Condor or null
- All prices should be realistic numbers based on the current price of $${price}
- Support levels should be below current price, resistance above
- Moving averages should reflect realistic values relative to price
- Do not include markdown formatting, just the raw JSON.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-5.1",
      messages: [
        { role: "system", content: "You are an expert stock and options trading analyst. Provide comprehensive, institutional-grade analysis with specific actionable setups. Always include options trading recommendations when applicable." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error("No analysis generated");

    return JSON.parse(content);
  } catch (error) {
    console.error("AI Analysis Error:", error);
    throw new Error("Failed to generate AI analysis");
  }
}
