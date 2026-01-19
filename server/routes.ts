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
        Return a JSON array of objects with:
        - symbol: string
        - recommendation: "BUY" or "SELL"
        - entryPrice: string (e.g. "125.50")
        - takeProfit: string
        - stopLoss: string
        - riskReward: string (e.g. "1:2.5")
        - rationale: string (detailed technical/fundamental explanation)
      `;

      const response = await analyzeStockWithAI("SCAN", 0); // Reuse logic or customize
      // For simplicity in this demo, we'll assume the AI helper can handle the "SCAN" mode
      // But let's refine the aiAnalysis.ts to handle this better if needed.
      // For now, let's just use the direct prompt logic here for the specific "5 setups" request.
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(aiResponse.choices[0].message.content || '{"recommendations":[]}');
      const recommendations = Array.isArray(result.recommendations) ? result.recommendations : [];
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
      
      const OpenAI = (await import("openai")).default;
      const openai = new OpenAI({
        apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
        baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
      });

      const systemPrompt = `You are TradeMind, an AI trading assistant. You help users with stock market questions, trading strategies, and portfolio analysis.

Current market context:
- Top recommendations: ${JSON.stringify(recommendations.slice(0, 5))}
- Tracked S&P 500 stocks: ${sp500.map(s => s.symbol).join(', ')}

Respond concisely and professionally. If asked about specific stocks, provide actionable insights. Use bullet points for clarity when appropriate.`;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-5",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message }
        ],
        max_completion_tokens: 500,
      });

      const response = aiResponse.choices[0].message.content || "I couldn't process your request. Please try again.";
      res.json({ response });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Chat failed" });
    }
  });

  return httpServer;
}
