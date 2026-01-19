import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { searchStocks, getStockQuote, getStockHistory } from "./lib/marketData";
import { analyzeStockWithAI } from "./lib/aiAnalysis";
import { sendAlertNotifications, formatAlertMessage } from "./notification-service";
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
      const { symbol } = req.body;
      const quote = await getStockQuote(symbol);
      
      if (!quote) {
        return res.status(404).json({ message: "Stock not found for analysis" });
      }

      const analysis = await analyzeStockWithAI(symbol, quote.price);
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

  app.post(api.sp500.scan.path, isAuthenticated, async (req, res) => {
    try {
      // Validate input parameters
      const parsed = api.sp500.scan.input?.safeParse(req.body);
      const validTimeframes = ["day", "month", "swing", "longterm"];
      
      let riskAmount = 100;
      let timeframe = "day";
      
      if (req.body.riskAmount !== undefined) {
        const parsedRisk = parseFloat(req.body.riskAmount);
        if (!isNaN(parsedRisk) && parsedRisk > 0) {
          riskAmount = parsedRisk;
        }
      }
      
      if (req.body.timeframe !== undefined && validTimeframes.includes(req.body.timeframe)) {
        timeframe = req.body.timeframe;
      }
      
      const timeframeDescriptions: Record<string, string> = {
        day: "day trading (intraday, holding for minutes to hours)",
        month: "monthly trading (holding 1-4 weeks)",
        swing: "swing trading (holding 3-9 months)",
        longterm: "long-term investing (holding 1+ years)"
      };

      // 1. Get a subset of S&P 500 stocks for analysis (top 10 for speed)
      const symbols = ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "COST", "NFLX"];
      const quotes = await Promise.all(symbols.map(s => getStockQuote(s)));
      const validQuotes = quotes.filter(q => q !== null);

      // 2. Generate 5 recommendations using AI with detailed technical analysis
      const prompt = `
You are an expert technical analyst. Analyze the following S&P 500 stocks: ${JSON.stringify(validQuotes)}.

Trading parameters:
- Risk per trade: $${riskAmount}
- Trading style: ${timeframeDescriptions[timeframe] || "day trading"}

Generate exactly 5 high-probability trade setups optimized for ${timeframeDescriptions[timeframe] || "day trading"}.

For each recommendation, provide DETAILED technical analysis including:
1. Candlestick pattern identification (e.g., "Bullish Engulfing", "Hammer", "Doji", "Waterfall pattern", "Roller coaster", "Tow pattern")
2. Trend type classification (e.g., "Waterfall downtrend", "Roller coaster consolidation", "Tow uptrend", "Channel breakout")
3. Moving average analysis for 20, 40, 100, 150, and 200-day periods
4. Calculate position size based on ${riskAmount} risk and the stop loss distance

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
      "positionSize": "18",
      "riskAmount": "${riskAmount}"
    }
  ]
}

CRITICAL RULES:
- recommendation must be exactly "BUY" or "SELL"
- All price values must be numeric strings WITHOUT currency symbols (e.g., "185.50" not "$185.50")
- riskReward must be a single numeric value (e.g., "1.7" not "1:1.7")
- positionSize = Math.floor(riskAmount / (entryPrice - stopLoss)) for BUY, or Math.floor(riskAmount / (stopLoss - entryPrice)) for SELL
- Include realistic moving average values based on current price levels
- candlePattern should describe the specific pattern observed
- trendType should classify as: Waterfall (sharp decline), Roller coaster (high volatility), Tow (steady trend), Channel, or Breakout
- Adjust stop loss and take profit distances based on the timeframe (tighter for day trading, wider for swing/long-term)
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
        positionSize: rec.positionSize ? String(rec.positionSize).replace(/[^0-9]/g, '') : undefined,
        riskAmount: rec.riskAmount ? String(rec.riskAmount).replace(/[^0-9.]/g, '') : String(riskAmount),
      }));
      
      await storage.saveTradeRecommendations(cleanedRecommendations);

      res.json({ message: `Scan complete. 5 ${timeframe} trading setups generated with $${riskAmount} risk.` });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Market scan failed" });
    }
  });

  // --- Market Routes ---
  app.get(api.market.premarketMovers.path, isAuthenticated, async (req, res) => {
    try {
      const symbols = ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "AMD", "NFLX"];
      const quotes = await Promise.all(symbols.map(s => getStockQuote(s)));
      const validQuotes = quotes.filter(q => q !== null) as any[];
      
      const sorted = validQuotes.sort((a, b) => Math.abs(b.changePercent) - Math.abs(a.changePercent));
      
      res.json(sorted.slice(0, 10).map(q => ({
        symbol: q.symbol,
        name: q.companyName || q.symbol,
        price: q.price,
        change: q.change,
        changePercent: q.changePercent,
      })));
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Failed to fetch premarket movers" });
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

      const systemPrompt = `You are TradeMind, an AI trading assistant. You help users with stock market questions, trading strategies, and portfolio analysis.

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

  return httpServer;
}
