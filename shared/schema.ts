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
  userId: true,  // userId is added by the server from session
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
  // Enhanced analysis fields
  technicalAnalysis?: {
    trend: string;
    candlePattern: string;
    movingAverages: {
      ma20: number;
      ma50: number;
      ma200: number;
    };
    rsi: number;
    macd: string;
  };
  supportResistance?: {
    support1: number;
    support2: number;
    resistance1: number;
    resistance2: number;
  };
  optionsStrategy?: {
    strategy: string;
    description: string;
    strikePrice: number;
    targetStrike: number;
    expiry: string;
    maxProfit: string;
    maxRisk: string;
    breakeven: number;
    rationale: string;
  } | null;
  riskReward?: number;
  positionSize?: string;
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

// === SAVED PROMPTS ===
export const savedPrompts = pgTable("saved_prompts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: varchar("title", { length: 100 }).notNull(),
  prompt: text("prompt").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSavedPromptSchema = createInsertSchema(savedPrompts).omit({
  id: true,
  createdAt: true,
});

export type SavedPrompt = typeof savedPrompts.$inferSelect;
export type InsertSavedPrompt = z.infer<typeof insertSavedPromptSchema>;

// === PRICE ALERTS ===
export const priceAlerts = pgTable("price_alerts", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  targetPrice: numeric("target_price").notNull(),
  direction: text("direction").notNull(), // 'ABOVE' or 'BELOW'
  alertType: text("alert_type").notNull(), // 'PRICE' or 'AI_MODEL'
  notifyChannels: text("notify_channels").array().default([]).notNull(), // ['APP', 'TELEGRAM', 'WHATSAPP']
  isActive: boolean("is_active").default(true).notNull(),
  isTriggered: boolean("is_triggered").default(false).notNull(),
  triggeredAt: timestamp("triggered_at"),
  triggeredPrice: numeric("triggered_price"),
  aiAnalysis: text("ai_analysis"), // AI model analysis result when triggered
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertPriceAlertSchema = createInsertSchema(priceAlerts).omit({
  id: true,
  isTriggered: true,
  triggeredAt: true,
  triggeredPrice: true,
  aiAnalysis: true,
  createdAt: true,
});

export type PriceAlert = typeof priceAlerts.$inferSelect;
export type InsertPriceAlert = z.infer<typeof insertPriceAlertSchema>;

// === USER NOTIFICATION SETTINGS ===
export const userNotificationSettings = pgTable("user_notification_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  telegramChatId: varchar("telegram_chat_id", { length: 50 }),
  telegramEnabled: boolean("telegram_enabled").default(false).notNull(),
  whatsappNumber: varchar("whatsapp_number", { length: 20 }),
  whatsappEnabled: boolean("whatsapp_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserNotificationSettingsSchema = createInsertSchema(userNotificationSettings).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type UserNotificationSettings = typeof userNotificationSettings.$inferSelect;
export type InsertUserNotificationSettings = z.infer<typeof insertUserNotificationSettingsSchema>;

// === IBKR BROKER SETTINGS ===
export const ibkrSettings = pgTable("ibkr_settings", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  host: varchar("host", { length: 100 }).default("127.0.0.1").notNull(),
  port: integer("port").default(4002).notNull(), // 4002 = IB Gateway paper, 4001 = live
  clientId: integer("client_id").default(1).notNull(),
  isConnected: boolean("is_connected").default(false).notNull(),
  lastConnectedAt: timestamp("last_connected_at"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertIbkrSettingsSchema = createInsertSchema(ibkrSettings).omit({
  id: true,
  isConnected: true,
  lastConnectedAt: true,
  createdAt: true,
  updatedAt: true,
});

export type IbkrSettings = typeof ibkrSettings.$inferSelect;
export type InsertIbkrSettings = z.infer<typeof insertIbkrSettingsSchema>;

// === TRADING ORDERS ===
export const tradingOrders = pgTable("trading_orders", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  action: text("action").notNull(), // 'BUY' or 'SELL'
  orderType: text("order_type").notNull(), // 'LIMIT', 'MARKET', 'STOP'
  quantity: integer("quantity").notNull(),
  entryPrice: numeric("entry_price").notNull(),
  stopLoss: numeric("stop_loss"),
  takeProfit: numeric("take_profit"),
  status: text("status").default("DRAFT").notNull(), // 'DRAFT', 'PENDING', 'SUBMITTED', 'FILLED', 'CANCELLED', 'REJECTED'
  ibkrOrderId: integer("ibkr_order_id"), // Order ID from IBKR
  filledQuantity: integer("filled_quantity").default(0),
  avgFillPrice: numeric("avg_fill_price"),
  sourceRecommendationId: integer("source_recommendation_id"), // Link to trade recommendation
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  submittedAt: timestamp("submitted_at"),
  filledAt: timestamp("filled_at"),
});

export const insertTradingOrderSchema = createInsertSchema(tradingOrders).omit({
  id: true,
  status: true,
  ibkrOrderId: true,
  filledQuantity: true,
  avgFillPrice: true,
  createdAt: true,
  updatedAt: true,
  submittedAt: true,
  filledAt: true,
});

export type TradingOrder = typeof tradingOrders.$inferSelect;
export type InsertTradingOrder = z.infer<typeof insertTradingOrderSchema>;

// === MARKET PREFERENCES ===
export const marketPreferences = pgTable("market_preferences", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  selectedIndices: text("selected_indices").array().default([]).notNull(), // e.g., ['^GSPC', '^DJI', '^IXIC', '^STI']
  selectedStocks: text("selected_stocks").array().default([]).notNull(), // Custom stocks to track
  showUSMarket: boolean("show_us_market").default(true).notNull(),
  showSGMarket: boolean("show_sg_market").default(false).notNull(),
  showHKMarket: boolean("show_hk_market").default(false).notNull(),
  showCNMarket: boolean("show_cn_market").default(false).notNull(),
  showEUMarket: boolean("show_eu_market").default(false).notNull(),
  selectedMoversMarket: text("selected_movers_market").default("US").notNull(), // Market for top 10 movers
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMarketPreferencesSchema = createInsertSchema(marketPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type MarketPreferences = typeof marketPreferences.$inferSelect;
export type InsertMarketPreferences = z.infer<typeof insertMarketPreferencesSchema>;

// Market Index type for API response
export type MarketIndex = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
  market: 'US' | 'SG' | 'HK' | 'CN' | 'EU';
};

// Supported markets for movers
export type MoversMarket = 'US' | 'SG' | 'HK' | 'CN' | 'EU';

// === INVESTOR PROFILES ===
export const investorProfiles = pgTable("investor_profiles", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  profileType: text("profile_type").notNull(), // 'INVESTOR' or 'TRADER'
  // Investor fields
  riskLevel: text("risk_level"), // 'CONSERVATIVE', 'MODERATE', 'AGGRESSIVE'
  investmentHorizon: text("investment_horizon"), // '1_3_YEARS', '3_5_YEARS', '5_PLUS_YEARS'
  // Trader fields
  traderStyle: text("trader_style"), // 'DAY_TRADER', 'SWING_TRADER', 'POSITION_TRADER'
  riskPerTrade: text("risk_per_trade"), // '1_2_PERCENT', '3_5_PERCENT', '5_PLUS_PERCENT'
  // Risk assessment answers (JSON stored as text)
  riskAssessmentAnswers: text("risk_assessment_answers"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvestorProfileSchema = createInsertSchema(investorProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InvestorProfile = typeof investorProfiles.$inferSelect;
export type InsertInvestorProfile = z.infer<typeof insertInvestorProfileSchema>;

// Profile type enums for frontend
export type ProfileType = 'INVESTOR' | 'TRADER';
export type RiskLevel = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
export type InvestmentHorizon = '1_3_YEARS' | '3_5_YEARS' | '5_PLUS_YEARS';
export type TraderStyle = 'DAY_TRADER' | 'SWING_TRADER' | 'POSITION_TRADER';
export type RiskPerTrade = '1_2_PERCENT' | '3_5_PERCENT' | '5_PLUS_PERCENT';

// === INVESTOR TARGET LIST (Stocks with Intrinsic Values) ===
export const investorTargetList = pgTable("investor_target_list", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  symbol: varchar("symbol", { length: 10 }).notNull(),
  companyName: text("company_name"),
  intrinsicValue: numeric("intrinsic_value").notNull(),
  notes: text("notes"),
  source: text("source"), // 'AI_RECOMMENDED' or 'USER_UPLOADED'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertInvestorTargetListSchema = createInsertSchema(investorTargetList).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type InvestorTargetItem = typeof investorTargetList.$inferSelect;
export type InsertInvestorTargetItem = z.infer<typeof insertInvestorTargetListSchema>;
