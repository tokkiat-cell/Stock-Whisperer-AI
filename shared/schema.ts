import { pgTable, text, serial, integer, boolean, timestamp, numeric, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Import Auth and Chat models as required by integrations
export * from "./models/auth";
export * from "./models/chat";

import { users } from "./models/auth";

// === TRADE SETUPS ===
export const tradeSetups = pgTable("trade_setups", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id), // Link to Replit Auth user
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(), // 'LONG' or 'SHORT'
  entryPrice: numeric("entry_price").notNull(),
  takeProfit: numeric("take_profit").notNull(),
  stopLoss: numeric("stop_loss").notNull(),
  rationale: text("rationale"), // AI Analysis
  status: text("status").default("PENDING_APPROVAL").notNull(), // PENDING_APPROVAL, EXECUTED, REJECTED
  createdAt: timestamp("created_at").defaultNow(),
  executedAt: timestamp("executed_at"),
});

export const sp500Stocks = pgTable("sp500_stocks", {
  symbol: varchar("symbol", { length: 10 }).primaryKey(),
  name: text("name").notNull(),
  lastPrice: numeric("last_price"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tradeRecommendations = pgTable("trade_recommendations", {
  id: serial("id").primaryKey(),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  recommendation: text("recommendation").notNull(),
  entryPrice: numeric("entry_price").notNull(),
  takeProfit: numeric("take_profit").notNull(),
  stopLoss: numeric("stop_loss").notNull(),
  riskReward: numeric("risk_reward").notNull(),
  rationale: text("rationale").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertTradeSetupSchema = createInsertSchema(tradeSetups).omit({ 
  id: true, 
  createdAt: true, 
  executedAt: true 
});

// Explicit Types
export type TradeSetup = typeof tradeSetups.$inferSelect;
export type InsertTradeSetup = z.infer<typeof insertTradeSetupSchema>;

// API Types
export type CreateTradeRequest = InsertTradeSetup;
export type UpdateTradeStatusRequest = { status: "EXECUTED" | "REJECTED" };

export type AnalysisResponse = {
  symbol: string;
  recommendation: "BUY" | "SELL" | "HOLD";
  entryPrice: number;
  takeProfit: number;
  stopLoss: number;
  rationale: string;
  confidence: number;
};

export type StockQuote = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  companyName?: string;
};

// === PORTFOLIO HOLDINGS ===
export const portfolioHoldings = pgTable("portfolio_holdings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  shares: numeric("shares").notNull(),
  avgCost: numeric("avg_cost").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertPortfolioHoldingSchema = createInsertSchema(portfolioHoldings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type PortfolioHolding = typeof portfolioHoldings.$inferSelect;
export type InsertPortfolioHolding = z.infer<typeof insertPortfolioHoldingSchema>;

// === WATCHLIST ===
export const watchlist = pgTable("watchlist", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertWatchlistSchema = createInsertSchema(watchlist).omit({
  id: true,
  createdAt: true,
});

export type WatchlistItem = typeof watchlist.$inferSelect;
export type InsertWatchlistItem = z.infer<typeof insertWatchlistSchema>;
