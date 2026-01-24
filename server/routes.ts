import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { searchStocks, getStockQuote, getStockHistory } from "./lib/marketData";
import { analyzeStockWithAI } from "./lib/aiAnalysis";
import { sendAlertNotifications, formatAlertMessage } from "./notification-service";
import { ibkrService } from "./ibkr-service";
import { z } from "zod";

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {
  // Setup Auth
  await setupAuth(app);
  registerAuthRoutes(app);

  // --- Stock Routes ---
  app.get(api.stocks.search.path, isAuthenticated, async (req, res) => {
    try {
      const query = req.query.query as string;
      if (!query) return res.json([]);
      const results = await searchStocks(query);
      res.json(results);
    } catch (error) {
      res.status(500).json({ message: "Search failed" });
    }
  });

  app.get(api.stocks.quote.path, isAuthenticated, async (req, res) => {
    try {
      const { symbol } = req.params;
      const quote = await getStockQuote(symbol);
      if (!quote) return res.status(404).json({ message: "Stock not found" });
      res.json(quote);
    } catch (error) {
      res.status(500).json({ message: "Quote failed" });
    }
  });

  app.get(api.stocks.history.path, isAuthenticated, async (req, res) => {
    try {
      const { symbol } = req.params;
      const history = await getStockHistory(symbol);
      
      if (!history) {
        return res.status(404).json({ message: "No historical data found" });
      }
      
      res.json(history);
    } catch (error) {
      console.error("History fetch error:", error);
      res.status(500).json({ message: "Failed to fetch history" });
    }
  });

  // --- Analysis Routes ---
  app.post(api.analysis.analyze.path, isAuthenticated, async (req, res) => {
    try {
      if (!req.user) return res.status(401).send();
      // @ts-ignore
      const userId = req.user.claims.sub;

      const { checkUsageLimit, incrementUsage } = await import("./lib/usageLimits");
      const usageCheck = await checkUsageLimit(userId, "stockAnalysis");
      if (!usageCheck.allowed) {
        return res.status(403).json({ 
          message: "Free tier limit reached",
          usageType: "stockAnalysis",
          currentCount: usageCheck.currentCount,
          limit: usageCheck.limit,
          requiresUpgrade: true
        });
      }

      const { symbol } = req.body;
      const quote = await getStockQuote(symbol);
      
      if (!quote) {
        return res.status(404).json({ message: "Stock not found for analysis" });
      }

      const analysis = await analyzeStockWithAI(symbol, quote.price);
      
      await incrementUsage(userId, "stockAnalysis");
      
      res.json({ symbol, ...analysis });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Analysis failed" });
    }
  });

  // --- Trade Routes ---
  app.get(api.trades.list.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    // @ts-ignore - claims.sub comes from Replit Auth
    const userId = req.user.claims.sub;
    const trades = await storage.getTradeSetups(userId);
    res.json(trades);
  });

  app.post(api.trades.create.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const tradeData = api.trades.create.input.parse(req.body);
      
      const trade = await storage.createTradeSetup({
        ...tradeData,
        userId,
      });
      
      res.status(201).json(trade);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to create trade" });
      }
    }
  });

  app.patch(api.trades.updateStatus.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status } = req.body;
      const updated = await storage.updateTradeStatus(id, status);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update status" });
    }
  });

  app.delete(api.trades.delete.path, isAuthenticated, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      await storage.deleteTradeSetup(id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete trade" });
    }
  });

  // --- S&P 500 Routes ---
  app.get(api.sp500.list.path, isAuthenticated, async (req, res) => {
    try {
      const stocks = await storage.getSp500Stocks();
      res.json(stocks);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch S&P 500 stocks" });
    }
  });

  app.get(api.sp500.recommendations.path, isAuthenticated, async (req, res) => {
    try {
      const recs = await storage.getTradeRecommendations();
      res.json(recs);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch recommendations" });
    }
  });

  // Market stocks configuration for scanner (shared with movers)
  const marketStocksConfig: Record<string, string[]> = {
    US: ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "COST", "NFLX"],
    SG: ["D05.SI", "O39.SI", "U11.SI", "C09.SI", "Z74.SI", "G13.SI", "BN4.SI", "C38U.SI", "A17U.SI", "Y92.SI"],
    HK: ["0700.HK", "9988.HK", "1299.HK", "0005.HK", "0941.HK", "2318.HK", "0388.HK", "0001.HK", "3690.HK", "1810.HK"],
    CN: ["600519.SS", "601398.SS", "601288.SS", "600036.SS", "601318.SS", "600900.SS", "601857.SS", "600276.SS", "000858.SZ", "002594.SZ"],
    EU: ["ASML.AS", "MC.PA", "SAP.DE", "SIE.DE", "OR.PA", "AIR.PA", "BNP.PA", "DTE.DE", "ALV.DE", "SAN.MC"],
  };

  const marketNames: Record<string, string> = {
    US: "US",
    SG: "Singapore",
    HK: "Hong Kong",
    CN: "China",
    EU: "European",
  };

  app.post(api.sp500.scan.path, isAuthenticated, async (req, res) => {
    try {
      // Validate input parameters
      const parsed = api.sp500.scan.input?.safeParse(req.body);
      const validTimeframes = ["day", "month", "swing", "longterm"];
      const validMarkets = ["US", "SG", "HK", "CN", "EU"];
      
      let timeframe = "day";
      let market = "US";
      
      if (req.body.timeframe !== undefined && validTimeframes.includes(req.body.timeframe)) {
        timeframe = req.body.timeframe;
      }

      if (req.body.market !== undefined && validMarkets.includes(req.body.market)) {
        market = req.body.market;
      }
      
      const timeframeDescriptions: Record<string, string> = {
        day: "day trading (intraday, holding for minutes to hours)",
        month: "monthly trading (holding 1-4 weeks)",
        swing: "swing trading (holding 3-9 months)",
        longterm: "long-term investing (holding 1+ years)"
      };

      // Stop loss and take profit guidance based on timeframe
      const timeframeSLTPGuidance: Record<string, string> = {
        day: "Use tight stop losses (0.5-2% from entry) and take profits (1-3% from entry). Target 1.5:1 to 2:1 risk/reward ratio.",
        month: "Use moderate stop losses (3-5% from entry) and take profits (6-10% from entry). Target 2:1 to 3:1 risk/reward ratio.",
        swing: "Use wider stop losses (5-10% from entry) and take profits (15-25% from entry). Target 2:1 to 3:1 risk/reward ratio.",
        longterm: "Use wide stop losses (10-20% from entry) and take profits (30-50% from entry). Target 2:1 to 3:1 risk/reward ratio."
      };

      // 1. Get stocks based on selected market
      const symbols = marketStocksConfig[market] || marketStocksConfig.US;
      const quotes = await Promise.all(symbols.map(s => getStockQuote(s)));
      const validQuotes = quotes.filter(q => q !== null);

      // 2. Generate 5 recommendations using AI with detailed technical analysis and options
      const marketName = marketNames[market] || "US";
      const prompt = `
You are an expert technical analyst. Analyze the following ${marketName} market stocks: ${JSON.stringify(validQuotes)}.

Trading parameters:
- Trading style: ${timeframeDescriptions[timeframe] || "day trading"}
- Market: ${marketName}
- Stop Loss / Take Profit Guidance: ${timeframeSLTPGuidance[timeframe] || timeframeSLTPGuidance.day}

Generate exactly 5 high-probability trade setups optimized for ${timeframeDescriptions[timeframe] || "day trading"}.

For each recommendation, provide DETAILED technical analysis including:
1. Candlestick pattern identification (e.g., "Bullish Engulfing", "Hammer", "Doji", "Waterfall pattern", "Roller coaster", "Tow pattern")
2. Trend type classification (e.g., "Waterfall downtrend", "Roller coaster consolidation", "Tow uptrend", "Channel breakout")
3. Moving average analysis for 20, 40, 100, 150, and 200-day periods
4. Support and resistance levels for precise entry/exit points
5. Options trading recommendation (if the stock has liquid options)

CRITICAL: Determine stop loss and take profit based on the timeframe:
- For day trading: Use tight stops (0.5-2% from entry), tight targets (1-3% from entry)
- For monthly trading: Use moderate stops (3-5% from entry), moderate targets (6-10% from entry)
- For swing trading: Use wider stops (5-10% from entry), wider targets (15-25% from entry)
- For long-term investing: Use wide stops (10-20% from entry), wide targets (30-50% from entry)

Return a JSON object with this EXACT structure:
{
  "recommendations": [
    {
      "symbol": "AAPL",
      "recommendation": "BUY",
      "entryPrice": "185.50",
      "takeProfit": "195.00",
      "stopLoss": "180.00",
      "riskReward": "1.7",
      "rationale": "Strong bullish momentum with price breaking above 20-day MA...",
      "candlePattern": "Bullish Engulfing pattern on daily chart, signaling reversal from recent pullback",
      "trendType": "Tow uptrend - consistent higher highs and higher lows with steady momentum",
      "movingAverages": {
        "ma20": "182.30",
        "ma40": "178.50",
        "ma100": "172.00",
        "ma150": "168.25",
        "ma200": "165.80"
      },
      "technicalSummary": "Price is trading above all major MAs indicating bullish trend. 20 MA > 40 MA > 100 MA confirms uptrend. RSI at 58 shows room for upside. Volume increasing on breakout.",
      "supportResistance": {
        "support1": "180.00",
        "support2": "175.50",
        "resistance1": "190.00",
        "resistance2": "195.00"
      },
      "optionsStrategy": {
        "strategy": "Bull Call Spread",
        "description": "Buy 185 Call, Sell 195 Call expiring in 30 days",
        "strikePrice": "185.00",
        "targetStrike": "195.00",
        "expiry": "30 days",
        "maxProfit": "Difference between strikes minus premium paid",
        "maxRisk": "Premium paid for the spread",
        "rationale": "Limited risk bullish play with defined profit potential"
      }
    }
  ]
}

CRITICAL RULES:
- recommendation must be exactly "BUY" or "SELL"
- All price values must be numeric strings WITHOUT currency symbols (e.g., "185.50" not "$185.50")
- riskReward must be a single numeric value (e.g., "1.7" not "1:1.7")
- Include realistic moving average values based on current price levels
- candlePattern should describe the specific pattern observed
- trendType should classify as: Waterfall (sharp decline), Roller coaster (high volatility), Tow (steady trend), Channel, or Breakout
- Stop loss and take profit MUST be calculated based on the timeframe guidance above - this is CRITICAL
- For optionsStrategy: suggest appropriate strategies like Bull Call Spread, Bear Put Spread, Iron Condor, Covered Call, or Protective Put based on the directional bias
- Support and resistance levels should be realistic based on recent price action
- For non-US markets, options may not be available - set optionsStrategy to null in that case
      `;

      // Use Gemini for AI analysis
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
        },
      });

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });

      const responseText = aiResponse.text || '{}';
      // Extract JSON from response (may be wrapped in markdown code blocks)
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      const result = JSON.parse(jsonMatch ? jsonMatch[0] : '{}');
      // Handle both array format and object with recommendations key
      const recommendations = Array.isArray(result) 
        ? result 
        : (Array.isArray(result.recommendations) ? result.recommendations : []);
      
      if (recommendations.length === 0) {
        console.log("AI returned no recommendations. Raw response:", responseText);
      }
      
      // Validate and clean numeric fields
      const cleanedRecommendations = recommendations.map((rec: any) => ({
        ...rec,
        entryPrice: String(rec.entryPrice).replace(/[^0-9.]/g, ''),
        takeProfit: String(rec.takeProfit).replace(/[^0-9.]/g, ''),
        stopLoss: String(rec.stopLoss).replace(/[^0-9.]/g, ''),
        riskReward: String(rec.riskReward).replace(/[^0-9.]/g, ''),
      }));
      
      await storage.saveTradeRecommendations(cleanedRecommendations);

      res.json({ message: `Scan complete. 5 ${marketName} market ${timeframe} trading setups generated.` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Market scan failed" });
    }
  });

  // --- Market Routes ---
  
  // Popular stocks for each market (for movers) - declared before use
  const marketMoversConfigForMovers: Record<string, string[]> = {
    US: ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "AMD", "NFLX"],
    SG: ["D05.SI", "O39.SI", "U11.SI", "C09.SI", "Z74.SI", "G13.SI", "BN4.SI", "C38U.SI", "A17U.SI", "Y92.SI"],
    HK: ["0700.HK", "9988.HK", "1299.HK", "0005.HK", "0941.HK", "2318.HK", "0388.HK", "0001.HK", "3690.HK", "1810.HK"],
    CN: ["600519.SS", "601398.SS", "601288.SS", "600036.SS", "601318.SS", "600900.SS", "601857.SS", "600276.SS", "000858.SZ", "002594.SZ"],
    EU: ["ASML.AS", "MC.PA", "SAP.DE", "SIE.DE", "OR.PA", "AIR.PA", "BNP.PA", "DTE.DE", "ALV.DE", "SAN.MC"],
  };
  
  app.get(api.market.premarketMovers.path, isAuthenticated, async (req, res) => {
    try {
      // Get market from query parameter, default to US
      const market = (req.query.market as string) || 'US';
      const validMarkets = ['US', 'SG', 'HK', 'CN', 'EU'];
      const selectedMarket = validMarkets.includes(market) ? market : 'US';
      
      const symbols = marketMoversConfigForMovers[selectedMarket] || marketMoversConfigForMovers.US;
      const quotes = await Promise.all(symbols.map(s => getStockQuote(s)));
      const validQuotes = quotes.filter(q => q !== null) as any[];
      
      const sorted = validQuotes.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      
      res.json(sorted.slice(0, 10).map(q => ({
        symbol: q.symbol,
        name: q.companyName || q.symbol,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
        market: selectedMarket,
      })));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch market movers" });
    }
  });

  // Market Indices - US, Singapore, Hong Kong, China, Europe
  const marketIndicesConfig: Record<string, { symbol: string; name: string }[]> = {
    US: [
      { symbol: '^GSPC', name: 'S&P 500' },
      { symbol: '^DJI', name: 'Dow Jones' },
      { symbol: '^IXIC', name: 'Nasdaq' },
      { symbol: '^RUT', name: 'Russell 2000' },
    ],
    SG: [
      { symbol: '^STI', name: 'Straits Times Index' },
      { symbol: 'ES3.SI', name: 'STI ETF' },
      { symbol: 'D05.SI', name: 'DBS Group' },
      { symbol: 'O39.SI', name: 'OCBC Bank' },
      { symbol: 'U11.SI', name: 'UOB' },
    ],
    HK: [
      { symbol: '^HSI', name: 'Hang Seng Index' },
      { symbol: '^HSCE', name: 'Hang Seng China Enterprises' },
      { symbol: '0700.HK', name: 'Tencent' },
      { symbol: '9988.HK', name: 'Alibaba HK' },
      { symbol: '1299.HK', name: 'AIA Group' },
    ],
    CN: [
      { symbol: '000001.SS', name: 'Shanghai Composite' },
      { symbol: '399001.SZ', name: 'Shenzhen Component' },
      { symbol: '000300.SS', name: 'CSI 300' },
      { symbol: '000016.SS', name: 'SSE 50' },
    ],
    EU: [
      { symbol: '^STOXX50E', name: 'Euro Stoxx 50' },
      { symbol: '^FTSE', name: 'FTSE 100' },
      { symbol: '^GDAXI', name: 'DAX' },
      { symbol: '^FCHI', name: 'CAC 40' },
    ],
  };

  app.get(api.market.indices.path, isAuthenticated, async (req, res) => {
    try {
      // @ts-ignore
      const userId = req.user?.claims?.sub;
      const prefs = userId ? await storage.getMarketPreferences(userId) : null;
      
      const showUS = prefs?.showUSMarket ?? true;
      const showSG = prefs?.showSGMarket ?? false;
      const showHK = prefs?.showHKMarket ?? false;
      const showCN = prefs?.showCNMarket ?? false;
      const showEU = prefs?.showEUMarket ?? false;
      
      type MarketKey = 'US' | 'SG' | 'HK' | 'CN' | 'EU';
      const indicesToFetch: { symbol: string; name: string; market: MarketKey }[] = [];
      
      if (showUS && marketIndicesConfig.US) {
        marketIndicesConfig.US.forEach(idx => indicesToFetch.push({ ...idx, market: 'US' }));
      }
      if (showSG && marketIndicesConfig.SG) {
        marketIndicesConfig.SG.forEach(idx => indicesToFetch.push({ ...idx, market: 'SG' }));
      }
      if (showHK && marketIndicesConfig.HK) {
        marketIndicesConfig.HK.forEach(idx => indicesToFetch.push({ ...idx, market: 'HK' }));
      }
      if (showCN && marketIndicesConfig.CN) {
        marketIndicesConfig.CN.forEach(idx => indicesToFetch.push({ ...idx, market: 'CN' }));
      }
      if (showEU && marketIndicesConfig.EU) {
        marketIndicesConfig.EU.forEach(idx => indicesToFetch.push({ ...idx, market: 'EU' }));
      }
      
      // Also add any custom selected indices
      if (prefs?.selectedIndices?.length) {
        prefs.selectedIndices.forEach(symbol => {
          if (!indicesToFetch.find(i => i.symbol === symbol)) {
            indicesToFetch.push({ symbol, name: symbol, market: 'US' });
          }
        });
      }
      
      const quotes = await Promise.all(
        indicesToFetch.map(async (idx) => {
          try {
            const quote = await getStockQuote(idx.symbol);
            if (!quote) return null;
            return {
              symbol: idx.symbol,
              name: idx.name,
              price: quote.price,
              change: quote.change,
              changePercent: quote.changePercent,
              previousClose: quote.price - quote.change,
              market: idx.market,
            };
          } catch {
            return null;
          }
        })
      );
      
      res.json(quotes.filter(q => q !== null));
    } catch (error) {
      console.error("Failed to fetch market indices:", error);
      res.status(500).json({ message: "Failed to fetch market indices" });
    }
  });

  // Market Preferences
  app.get(api.market.preferences.path, isAuthenticated, async (req, res) => {
    try {
      // @ts-ignore
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const prefs = await storage.getMarketPreferences(userId);
      
      res.json({
        selectedIndices: prefs?.selectedIndices ?? [],
        selectedStocks: prefs?.selectedStocks ?? [],
        showUSMarket: prefs?.showUSMarket ?? true,
        showSGMarket: prefs?.showSGMarket ?? false,
        showHKMarket: prefs?.showHKMarket ?? false,
        showCNMarket: prefs?.showCNMarket ?? false,
        showEUMarket: prefs?.showEUMarket ?? false,
        selectedMoversMarket: prefs?.selectedMoversMarket ?? 'US',
      });
    } catch (error) {
      console.error("Failed to get market preferences:", error);
      res.status(500).json({ message: "Failed to get market preferences" });
    }
  });

  app.put(api.market.updatePreferences.path, isAuthenticated, async (req, res) => {
    try {
      // @ts-ignore
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      
      const updates = api.market.updatePreferences.input.parse(req.body);
      const prefs = await storage.upsertMarketPreferences(userId, updates);
      
      res.json({
        selectedIndices: prefs.selectedIndices,
        selectedStocks: prefs.selectedStocks,
        showUSMarket: prefs.showUSMarket,
        showSGMarket: prefs.showSGMarket,
        showHKMarket: prefs.showHKMarket,
        showCNMarket: prefs.showCNMarket,
        showEUMarket: prefs.showEUMarket,
        selectedMoversMarket: prefs.selectedMoversMarket,
      });
    } catch (error) {
      console.error("Failed to update market preferences:", error);
      res.status(500).json({ message: "Failed to update market preferences" });
    }
  });

  // --- Portfolio Holdings Routes ---
  
  // Image extraction endpoint using Gemini vision
  app.post(api.portfolio.extractFromImage.path, isAuthenticated, async (req, res) => {
    try {
      const parsed = api.portfolio.extractFromImage.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: image is required" });
      }
      const { imageBase64 } = parsed.data;
      
      // Validate image size (max 10MB base64 = ~7.5MB actual image)
      const MAX_BASE64_SIZE = 10 * 1024 * 1024;
      if (imageBase64.length > MAX_BASE64_SIZE) {
        return res.status(400).json({ message: "Image too large. Maximum size is 10MB." });
      }

      // Extract base64 data and mime type from data URL
      const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) {
        return res.status(400).json({ message: "Invalid image format" });
      }
      const mimeType = matches[1];
      const base64Data = matches[2];

      // Validate mime type is an image
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
      if (!allowedMimeTypes.includes(mimeType)) {
        return res.status(400).json({ message: "Invalid image type. Supported: JPEG, PNG, GIF, WebP" });
      }
      
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
        },
      });

      const prompt = `Analyze this image and extract all stock ticker symbols you can find.
      Look for:
      - Stock symbols/tickers (like AAPL, MSFT, GOOGL, NVDA, etc.)
      - Company names that you can map to their ticker symbols
      - Any portfolio or trading related stock listings

      Return ONLY a JSON object with a "symbols" array containing the ticker symbols found.
      Example: {"symbols": ["AAPL", "MSFT", "GOOGL"]}
      
      If no stock symbols are found, return: {"symbols": []}
      Do not include any markdown formatting, just the raw JSON.`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: base64Data,
            },
          },
        ],
      });

      const responseText = aiResponse.text || '{"symbols": []}';
      
      // Parse the response to extract symbols
      try {
        const cleanJson = responseText.replace(/```json\n?|\n?```/g, '').trim();
        const parsed = JSON.parse(cleanJson);
        const rawSymbols = (parsed.symbols || [])
          .filter((s: string) => 
            typeof s === 'string' && s.length > 0 && s.length <= 5 && /^[A-Z]+$/i.test(s)
          )
          .map((s: string) => s.toUpperCase());
        
        // Deduplicate symbols
        const symbols = [...new Set(rawSymbols)];
        res.json({ symbols });
      } catch (parseError) {
        console.error("Failed to parse AI response:", parseError, "Response:", responseText);
        res.json({ symbols: [], message: "AI response was not in expected format" });
      }
    } catch (error) {
      console.error("Image extraction error:", error);
      res.status(500).json({ message: "Failed to extract from image" });
    }
  });

  app.get(api.portfolio.list.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    // @ts-ignore
    const userId = req.user.claims.sub;
    const holdings = await storage.getPortfolioHoldings(userId);
    res.json(holdings);
  });

  app.post(api.portfolio.create.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const parsed = api.portfolio.create.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const holding = await storage.createPortfolioHolding({
        userId,
        symbol: parsed.data.symbol.toUpperCase(),
        shares: parsed.data.shares,
        avgCost: parsed.data.avgCost,
      });
      res.status(201).json(holding);
    } catch (error) {
      res.status(500).json({ message: "Failed to create holding" });
    }
  });

  app.patch(api.portfolio.update.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const parsed = api.portfolio.update.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const updated = await storage.updatePortfolioHolding(id, userId, parsed.data.shares, parsed.data.avgCost);
      if (!updated) {
        return res.status(404).json({ message: "Holding not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update holding" });
    }
  });

  app.delete(api.portfolio.delete.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePortfolioHolding(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Holding not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete holding" });
    }
  });

  app.post(api.portfolio.bulkCreate.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const parsed = api.portfolio.bulkCreate.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const holdingsToCreate = parsed.data.holdings.map(h => ({
        userId,
        symbol: h.symbol.toUpperCase(),
        shares: h.shares,
        avgCost: h.avgCost,
      }));
      const holdings = await storage.bulkCreatePortfolioHoldings(holdingsToCreate);
      res.status(201).json(holdings);
    } catch (error) {
      res.status(500).json({ message: "Failed to create holdings" });
    }
  });

  // Get current prices for portfolio holdings
  app.get('/api/portfolio/prices', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const holdings = await storage.getPortfolioHoldings(userId);
      
      if (holdings.length === 0) {
        return res.json({});
      }
      
      const symbols = holdings.map(h => h.symbol);
      const { getBatchQuotes } = await import('./lib/marketData');
      const prices = await getBatchQuotes(symbols);
      
      res.json(prices);
    } catch (error) {
      console.error("Failed to fetch portfolio prices:", error);
      res.status(500).json({ message: "Failed to fetch prices" });
    }
  });

  // --- Watchlist Routes ---
  app.get(api.watchlist.list.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    // @ts-ignore
    const userId = req.user.claims.sub;
    const items = await storage.getWatchlist(userId);
    res.json(items);
  });

  app.post(api.watchlist.add.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const parsed = api.watchlist.add.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const item = await storage.addToWatchlist({
        userId,
        symbol: parsed.data.symbol.toUpperCase(),
        notes: parsed.data.notes || null,
      });
      res.status(201).json(item);
    } catch (error) {
      res.status(500).json({ message: "Failed to add to watchlist" });
    }
  });

  app.patch(api.watchlist.updateNote.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const parsed = api.watchlist.updateNote.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const updated = await storage.updateWatchlistNote(id, userId, parsed.data.notes);
      if (!updated) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update note" });
    }
  });

  app.delete(api.watchlist.remove.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const deleted = await storage.removeFromWatchlist(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Item not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove from watchlist" });
    }
  });

  app.post(api.watchlist.bulkAdd.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const parsed = api.watchlist.bulkAdd.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const itemsToAdd = parsed.data.symbols.map(symbol => ({
        userId,
        symbol: symbol.toUpperCase(),
        notes: null,
      }));
      const items = await storage.bulkAddToWatchlist(itemsToAdd);
      res.status(201).json(items);
    } catch (error) {
      res.status(500).json({ message: "Failed to add to watchlist" });
    }
  });

  // --- Dashboard Chat ---
  app.post(api.dashboard.chat.path, isAuthenticated, async (req, res) => {
    try {
      if (!req.user) return res.status(401).send();
      // @ts-ignore
      const userId = req.user.claims.sub;

      const { checkUsageLimit, incrementUsage } = await import("./lib/usageLimits");
      const usageCheck = await checkUsageLimit(userId, "chat");
      if (!usageCheck.allowed) {
        return res.status(403).json({ 
          message: "Free tier limit reached",
          usageType: "chat",
          currentCount: usageCheck.currentCount,
          limit: usageCheck.limit,
          requiresUpgrade: true
        });
      }

      const parsed = api.dashboard.chat.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: message is required" });
      }
      const { message, imageBase64 } = parsed.data;
      
      const recommendations = await storage.getTradeRecommendations();
      const sp500 = await storage.getSp500Stocks();
      
      // Use Gemini for AI chat
      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({
        apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
        httpOptions: {
          apiVersion: "",
          baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
        },
      });

      const systemPrompt = `You are stockwhisperer.AI, an AI trading assistant. You help users with stock market questions, trading strategies, and portfolio analysis.

Current market context:
- Top recommendations: ${JSON.stringify(recommendations.slice(0, 5))}
- Tracked S&P 500 stocks: ${sp500.map(s => s.symbol).join(', ')}

Response formatting rules (MUST follow):
1. Structure your response with clear sections using headers (##) when covering multiple topics
2. Use bullet points (-) for listing items, recommendations, or key points
3. Use numbered lists (1. 2. 3.) for step-by-step instructions or ranked items
4. Add blank lines between sections for readability
5. Keep paragraphs short (2-3 sentences max)
6. Use **bold** for important terms, stock symbols, and key numbers
7. Be concise but thorough - aim for clarity over brevity

If an image is provided:
- If it contains a list of stocks, symbols, or a portfolio screenshot, extract and list all the stock symbols you can identify
- If it's a chart, analyze the technical patterns you see
- Provide actionable insights based on the image content

Respond professionally. If asked about specific stocks, provide actionable insights with clear entry/exit points when applicable.`;

      let contents: any;
      
      if (imageBase64) {
        // Extract base64 data and mime type from data URL
        const matches = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          const base64Data = matches[2];
          
          contents = [
            { text: `${systemPrompt}\n\nUser: ${message}` },
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
          ];
        } else {
          contents = `${systemPrompt}\n\nUser: ${message}`;
        }
      } else {
        contents = `${systemPrompt}\n\nUser: ${message}`;
      }

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: contents,
      });

      const response = aiResponse.text || "I couldn't process your request. Please try again.";
      
      await incrementUsage(userId, "chat");
      
      res.json({ response });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Chat failed" });
    }
  });

  // --- Saved Prompts Routes ---
  app.get(api.savedPrompts.list.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    // @ts-ignore
    const userId = req.user.claims.sub;
    const prompts = await storage.getSavedPrompts(userId);
    res.json(prompts);
  });

  app.post(api.savedPrompts.create.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const parsed = api.savedPrompts.create.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const prompt = await storage.createSavedPrompt({
        userId,
        title: parsed.data.title,
        prompt: parsed.data.prompt,
      });
      res.status(201).json(prompt);
    } catch (error) {
      res.status(500).json({ message: "Failed to save prompt" });
    }
  });

  app.delete(api.savedPrompts.delete.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSavedPrompt(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Prompt not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete prompt" });
    }
  });

  // --- Price Alerts Routes ---
  app.get(api.priceAlerts.list.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    // @ts-ignore
    const userId = req.user.claims.sub;
    const alerts = await storage.getPriceAlerts(userId);
    res.json(alerts);
  });

  app.get(api.priceAlerts.listBySymbol.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    // @ts-ignore
    const userId = req.user.claims.sub;
    const symbol = req.params.symbol;
    const alerts = await storage.getPriceAlertsBySymbol(userId, symbol);
    res.json(alerts);
  });

  app.get(api.priceAlerts.triggered.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    // @ts-ignore
    const userId = req.user.claims.sub;
    const alerts = await storage.getTriggeredPriceAlerts(userId);
    res.json(alerts);
  });

  app.post(api.priceAlerts.create.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const parsed = api.priceAlerts.create.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const alert = await storage.createPriceAlert({
        userId,
        symbol: parsed.data.symbol.toUpperCase(),
        targetPrice: parsed.data.targetPrice,
        direction: parsed.data.direction,
        alertType: parsed.data.alertType,
        notifyChannels: parsed.data.notifyChannels || ['APP'],
        isActive: parsed.data.isActive ?? true,
      });
      res.status(201).json(alert);
    } catch (error) {
      res.status(500).json({ message: "Failed to create price alert" });
    }
  });

  app.patch(api.priceAlerts.update.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const parsed = api.priceAlerts.update.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const updated = await storage.updatePriceAlert(id, userId, parsed.data);
      if (!updated) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to update alert" });
    }
  });

  app.delete(api.priceAlerts.delete.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const deleted = await storage.deletePriceAlert(id, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete alert" });
    }
  });

  app.post(api.priceAlerts.dismissTriggered.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const id = parseInt(req.params.id);
      const updated = await storage.updatePriceAlert(id, userId, { isActive: false });
      if (!updated) {
        return res.status(404).json({ message: "Alert not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ message: "Failed to dismiss alert" });
    }
  });

  // Check all active alerts against current prices
  app.post(api.priceAlerts.checkAlerts.path, isAuthenticated, async (req, res) => {
    try {
      const activeAlerts = await storage.getActivePriceAlerts();
      const triggeredAlerts: any[] = [];
      
      // Group alerts by symbol to minimize API calls
      const alertsBySymbol = new Map<string, typeof activeAlerts>();
      for (const alert of activeAlerts) {
        const existing = alertsBySymbol.get(alert.symbol) || [];
        existing.push(alert);
        alertsBySymbol.set(alert.symbol, existing);
      }
      
      for (const [symbol, alerts] of alertsBySymbol) {
        try {
          const quote = await yahooFinance.quote(symbol);
          if (!quote || !quote.regularMarketPrice) continue;
          
          const currentPrice = quote.regularMarketPrice;
          
          for (const alert of alerts) {
            const targetPrice = parseFloat(alert.targetPrice);
            let shouldTrigger = false;
            
            if (alert.direction === 'ABOVE' && currentPrice >= targetPrice) {
              shouldTrigger = true;
            } else if (alert.direction === 'BELOW' && currentPrice <= targetPrice) {
              shouldTrigger = true;
            }
            
            if (shouldTrigger) {
              let aiAnalysis: string | undefined;
              
              // If alert type is AI_MODEL, run AI analysis
              if (alert.alertType === 'AI_MODEL') {
                try {
                  const { GoogleGenAI } = await import("@google/genai");
                  const ai = new GoogleGenAI({
                    apiKey: process.env.AI_INTEGRATIONS_GEMINI_API_KEY!,
                    httpOptions: {
                      apiVersion: "",
                      baseUrl: process.env.AI_INTEGRATIONS_GEMINI_BASE_URL,
                    },
                  });
                  
                  const prompt = `Analyze ${symbol} stock which just hit price $${currentPrice}. 
                  The user had an alert set for when price went ${alert.direction === 'ABOVE' ? 'above' : 'below'} $${targetPrice}.
                  Provide a brief analysis:
                  1. What this price movement means
                  2. Whether to BUY, SELL, or HOLD
                  3. Key levels to watch
                  Keep response under 200 words.`;
                  
                  const aiResponse = await ai.models.generateContent({
                    model: "gemini-2.5-flash",
                    contents: prompt,
                  });
                  
                  aiAnalysis = aiResponse.text || undefined;
                } catch (aiError) {
                  console.error("AI analysis error:", aiError);
                }
              }
              
              const triggered = await storage.triggerPriceAlert(
                alert.id,
                currentPrice.toString(),
                aiAnalysis
              );
              if (triggered) {
                triggeredAlerts.push(triggered);
                // Send notifications to external channels
                const message = formatAlertMessage(triggered);
                sendAlertNotifications(triggered, message).catch(err => {
                  console.error("Notification error:", err);
                });
              }
            }
          }
        } catch (quoteError) {
          console.error(`Error fetching quote for ${symbol}:`, quoteError);
        }
      }
      
      res.json({
        checked: activeAlerts.length,
        triggered: triggeredAlerts.length,
        alerts: triggeredAlerts,
      });
    } catch (error) {
      console.error("Check alerts error:", error);
      res.status(500).json({ message: "Failed to check alerts" });
    }
  });

  // --- Notification Settings Routes ---
  app.get(api.notificationSettings.get.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const settings = await storage.getUserNotificationSettings(userId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get notification settings" });
    }
  });

  app.post(api.notificationSettings.update.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const parsed = api.notificationSettings.update.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const settings = await storage.upsertUserNotificationSettings({
        userId,
        telegramChatId: parsed.data.telegramChatId ?? null,
        telegramEnabled: parsed.data.telegramEnabled ?? false,
        whatsappNumber: parsed.data.whatsappNumber ?? null,
        whatsappEnabled: parsed.data.whatsappEnabled ?? false,
      });
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update notification settings" });
    }
  });

  // --- IBKR Settings Routes ---
  app.get(api.ibkr.settings.get.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const settings = await storage.getIbkrSettings(userId);
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get IBKR settings" });
    }
  });

  app.post(api.ibkr.settings.update.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const parsed = api.ibkr.settings.update.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      const settings = await storage.upsertIbkrSettings({
        userId,
        host: parsed.data.host ?? "127.0.0.1",
        port: parsed.data.port ?? 4002,
        clientId: parsed.data.clientId ?? 1,
      });
      res.json(settings);
    } catch (error) {
      res.status(500).json({ message: "Failed to update IBKR settings" });
    }
  });

  app.post(api.ibkr.testConnection.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const result = await ibkrService.testConnection(userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: "Connection test failed", error: "Internal server error" });
    }
  });

  // --- Trading Orders Routes ---
  app.get(api.tradingOrders.list.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const orders = await storage.getTradingOrders(userId);
      res.json(orders);
    } catch (error) {
      res.status(500).json({ message: "Failed to get trading orders" });
    }
  });

  app.get(api.tradingOrders.get.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const orderId = parseInt(req.params.id);
      const order = await storage.getTradingOrderById(orderId, userId);
      if (!order) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to get trading order" });
    }
  });

  app.post(api.tradingOrders.create.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const parsed = api.tradingOrders.create.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }
      
      const validation = ibkrService.validateOrder({ ...parsed.data, userId });
      if (!validation.valid) {
        return res.status(400).json({ message: validation.errors.join(", ") });
      }

      const order = await storage.createTradingOrder({
        userId,
        symbol: parsed.data.symbol,
        action: parsed.data.action,
        orderType: parsed.data.orderType,
        quantity: parsed.data.quantity,
        entryPrice: parsed.data.entryPrice,
        stopLoss: parsed.data.stopLoss ?? null,
        takeProfit: parsed.data.takeProfit ?? null,
        sourceRecommendationId: parsed.data.sourceRecommendationId ?? null,
        notes: parsed.data.notes ?? null,
      });
      res.status(201).json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to create trading order" });
    }
  });

  app.patch(api.tradingOrders.update.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const orderId = parseInt(req.params.id);
      const parsed = api.tradingOrders.update.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: parsed.error.message });
      }

      const existingOrder = await storage.getTradingOrderById(orderId, userId);
      if (!existingOrder) {
        return res.status(404).json({ message: "Order not found" });
      }

      if (existingOrder.status !== "DRAFT") {
        return res.status(400).json({ message: "Only draft orders can be modified" });
      }

      const order = await storage.updateTradingOrder(orderId, userId, parsed.data);
      res.json(order);
    } catch (error) {
      res.status(500).json({ message: "Failed to update trading order" });
    }
  });

  app.delete(api.tradingOrders.delete.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const orderId = parseInt(req.params.id);
      const deleted = await storage.deleteTradingOrder(orderId, userId);
      if (!deleted) {
        return res.status(404).json({ message: "Order not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete trading order" });
    }
  });

  app.post(api.tradingOrders.submit.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const orderId = parseInt(req.params.id);
      const result = await ibkrService.submitOrder(orderId, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to submit order", error: "Internal server error" });
    }
  });

  app.post(api.tradingOrders.cancel.path, isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const orderId = parseInt(req.params.id);
      const result = await ibkrService.cancelOrder(orderId, userId);
      res.json(result);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to cancel order", error: "Internal server error" });
    }
  });

  // --- Usage Limits API ---
  app.get('/api/usage', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const { getUserUsageData } = await import("./lib/usageLimits");
      const usageData = await getUserUsageData(userId);
      res.json(usageData);
    } catch (error) {
      console.error("Failed to get usage data:", error);
      res.status(500).json({ message: "Failed to get usage data" });
    }
  });

  // --- Lemon Squeezy Checkout ---
  app.post('/api/lemonsqueezy/checkout', isAuthenticated, async (req, res) => {
    if (!req.user) return res.status(401).send();
    try {
      // @ts-ignore
      const userId = req.user.claims.sub;
      const { tier, email } = req.body;

      const storeId = process.env.LEMONSQUEEZY_STORE_ID;
      const apiKey = process.env.LEMONSQUEEZY_API_KEY;
      
      if (!storeId || !apiKey) {
        return res.status(500).json({ error: 'Payment system not configured' });
      }

      // Get variant ID based on tier
      const variantIds: Record<string, string | undefined> = {
        basic: process.env.LEMONSQUEEZY_BASIC_VARIANT_ID,
        pro: process.env.LEMONSQUEEZY_PRO_VARIANT_ID,
      };

      const variantId = variantIds[tier];
      if (!variantId) {
        return res.status(400).json({ error: 'Invalid subscription tier' });
      }

      // Create checkout via Lemon Squeezy API
      const response = await fetch('https://api.lemonsqueezy.com/v1/checkouts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/vnd.api+json',
          'Accept': 'application/vnd.api+json',
        },
        body: JSON.stringify({
          data: {
            type: 'checkouts',
            attributes: {
              checkout_options: {
                embed: true,
                media: false,
                logo: true,
                dark: true,
              },
              checkout_data: {
                email: email || undefined,
                custom: {
                  user_id: userId,
                },
              },
              product_options: {
                enabled_variants: [parseInt(variantId)],
                redirect_url: `${process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : 'http://localhost:5000'}/checkout/success`,
                receipt_button_text: 'Go to Dashboard',
                receipt_thank_you_note: 'Thank you for subscribing to stockwhisperer.AI!',
              },
            },
            relationships: {
              store: {
                data: {
                  type: 'stores',
                  id: storeId,
                },
              },
              variant: {
                data: {
                  type: 'variants',
                  id: variantId,
                },
              },
            },
          },
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Lemon Squeezy checkout error:', errorData);
        return res.status(500).json({ error: 'Failed to create checkout' });
      }

      const data = await response.json();
      const checkoutUrl = data.data?.attributes?.url;

      if (!checkoutUrl) {
        return res.status(500).json({ error: 'No checkout URL returned' });
      }

      res.json({ checkoutUrl });
    } catch (error) {
      console.error('Checkout creation error:', error);
      res.status(500).json({ error: 'Failed to create checkout' });
    }
  });

  // --- Lemon Squeezy Webhook ---
  app.post('/api/lemonsqueezy/webhook', async (req, res) => {
    try {
      const event = req.body;
      const eventName = event.meta?.event_name;
      console.log('Lemon Squeezy webhook received:', eventName);

      // Handle subscription events
      if (eventName === 'subscription_created' || eventName === 'subscription_updated') {
        const subscriptionId = event.data?.id;
        const customerId = event.data?.attributes?.customer_id;
        const variantId = event.data?.attributes?.variant_id?.toString();
        const status = event.data?.attributes?.status;
        const customData = event.meta?.custom_data;
        const userId = customData?.user_id;

        if (!userId) {
          console.error('No user_id in custom_data for subscription:', subscriptionId);
          return res.status(200).json({ received: true });
        }

        // Only process active subscriptions
        if (status !== 'active') {
          console.log(`Subscription ${subscriptionId} status is ${status}, skipping tier update`);
          return res.status(200).json({ received: true });
        }

        // Determine tier from variant ID
        const basicVariantId = process.env.LEMONSQUEEZY_BASIC_VARIANT_ID;
        const proVariantId = process.env.LEMONSQUEEZY_PRO_VARIANT_ID;
        
        let planTier = 'free';
        if (variantId === basicVariantId) {
          planTier = 'basic';
        } else if (variantId === proVariantId) {
          planTier = 'pro';
        }

        // Update user subscription
        await storage.updateUserSubscription(userId, {
          paddleCustomerId: customerId?.toString(),
          paddleSubscriptionId: subscriptionId?.toString(),
          planTier,
        });

        console.log(`Updated user ${userId} to ${planTier} tier`);
      }

      if (eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
        const customData = event.meta?.custom_data;
        const userId = customData?.user_id;

        if (userId) {
          // Downgrade to free tier
          await storage.updateUserSubscription(userId, {
            paddleSubscriptionId: null,
            planTier: 'free',
          });
          console.log(`Downgraded user ${userId} to free tier`);
        }
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error('Lemon Squeezy webhook error:', error);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  return httpServer;
}
