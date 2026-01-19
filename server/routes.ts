import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { setupAuth, registerAuthRoutes, isAuthenticated } from "./replit_integrations/auth";
import { searchStocks, getStockQuote } from "./lib/marketData";
import { analyzeStockWithAI } from "./lib/aiAnalysis";
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
      // 1. Get a subset of S&P 500 stocks for analysis (top 10 for speed)
      const symbols = ["NVDA", "AAPL", "MSFT", "AMZN", "GOOGL", "META", "TSLA", "AVGO", "COST", "NFLX"];
      const quotes = await Promise.all(symbols.map(s => getStockQuote(s)));
      const validQuotes = quotes.filter(q => q !== null);

      // 2. Generate 5 recommendations using AI
      const prompt = `
        Scan the following S&P 500 stocks and current prices: ${JSON.stringify(validQuotes)}.
        Generate exactly 5 high-probability trade setups for today's market.
        
        Return a JSON object with this exact structure:
        {
          "recommendations": [
            {
              "symbol": "AAPL",
              "recommendation": "BUY",
              "entryPrice": "125.50",
              "takeProfit": "130.00",
              "stopLoss": "122.00",
              "riskReward": "2.5",
              "rationale": "detailed technical/fundamental explanation"
            }
          ]
        }
        
        Important: 
        - recommendation must be exactly "BUY" or "SELL"
        - All price values must be numeric strings without currency symbols (e.g., "125.50" not "$125.50")
        - riskReward must be a single numeric value (e.g., "2.5" not "1:2.5")
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
        console.log("AI returned no recommendations. Raw response:", aiResponse.choices[0].message.content);
      }
      
      await storage.saveTradeRecommendations(recommendations);

      res.json({ message: "Scan complete. 5 new setups generated." });
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
      
      res.json(sorted.slice(0, 5).map(q => ({
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

  // --- Dashboard Chat ---
  app.post(api.dashboard.chat.path, isAuthenticated, async (req, res) => {
    try {
      const parsed = api.dashboard.chat.input.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid request: message is required" });
      }
      const { message } = parsed.data;
      
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

Respond concisely and professionally. If asked about specific stocks, provide actionable insights. Use bullet points for clarity when appropriate.`;

      const aiResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `${systemPrompt}\n\nUser: ${message}`,
      });

      const response = aiResponse.text || "I couldn't process your request. Please try again.";
      res.json({ response });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Chat failed" });
    }
  });

  return httpServer;
}
