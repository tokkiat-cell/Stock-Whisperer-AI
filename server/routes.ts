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

  return httpServer;
}
