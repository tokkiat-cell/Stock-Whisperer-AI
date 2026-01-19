import { 
  users, tradeSetups, sp500Stocks, tradeRecommendations, portfolioHoldings, watchlist, savedPrompts, priceAlerts, userNotificationSettings,
  type User, type InsertUser, type UpdateUser, 
  type TradeSetup, type InsertTradeSetup,
  type UpsertUser,
  type PortfolioHolding, type InsertPortfolioHolding,
  type WatchlistItem, type InsertWatchlistItem,
  type SavedPrompt, type InsertSavedPrompt,
  type PriceAlert, type InsertPriceAlert,
  type UserNotificationSettings, type InsertUserNotificationSettings
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";

export interface IStorage {
  // Auth methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Trade Setup methods
  getTradeSetups(userId: string): Promise<TradeSetup[]>;
  createTradeSetup(trade: InsertTradeSetup): Promise<TradeSetup>;
  updateTradeStatus(id: number, status: string): Promise<TradeSetup>;
  deleteTradeSetup(id: number): Promise<void>;

  // S&P 500 methods
  getSp500Stocks(): Promise<any[]>;
  upsertSp500Stock(symbol: string, name: string, price?: string): Promise<void>;
  getTradeRecommendations(): Promise<any[]>;
  saveTradeRecommendations(recommendations: any[]): Promise<void>;

  // Portfolio Holdings methods
  getPortfolioHoldings(userId: string): Promise<PortfolioHolding[]>;
  createPortfolioHolding(holding: InsertPortfolioHolding): Promise<PortfolioHolding>;
  updatePortfolioHolding(id: number, userId: string, shares: string, avgCost: string): Promise<PortfolioHolding | null>;
  deletePortfolioHolding(id: number, userId: string): Promise<boolean>;
  bulkCreatePortfolioHoldings(holdings: InsertPortfolioHolding[]): Promise<PortfolioHolding[]>;

  // Watchlist methods
  getWatchlist(userId: string): Promise<WatchlistItem[]>;
  addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem>;
  updateWatchlistNote(id: number, userId: string, notes: string): Promise<WatchlistItem | null>;
  removeFromWatchlist(id: number, userId: string): Promise<boolean>;
  bulkAddToWatchlist(items: InsertWatchlistItem[]): Promise<WatchlistItem[]>;

  // Saved Prompts methods
  getSavedPrompts(userId: string): Promise<SavedPrompt[]>;
  createSavedPrompt(prompt: InsertSavedPrompt): Promise<SavedPrompt>;
  deleteSavedPrompt(id: number, userId: string): Promise<boolean>;

  // Price Alerts methods
  getPriceAlerts(userId: string): Promise<PriceAlert[]>;
  getPriceAlertsBySymbol(userId: string, symbol: string): Promise<PriceAlert[]>;
  getActivePriceAlerts(): Promise<PriceAlert[]>;
  getTriggeredPriceAlerts(userId: string): Promise<PriceAlert[]>;
  createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert>;
  updatePriceAlert(id: number, userId: string, updates: Partial<PriceAlert>): Promise<PriceAlert | null>;
  triggerPriceAlert(id: number, triggeredPrice: string, aiAnalysis?: string): Promise<PriceAlert | null>;
  deletePriceAlert(id: number, userId: string): Promise<boolean>;

  // User Notification Settings methods
  getUserNotificationSettings(userId: string): Promise<UserNotificationSettings | null>;
  upsertUserNotificationSettings(settings: InsertUserNotificationSettings): Promise<UserNotificationSettings>;
}

export class DatabaseStorage implements IStorage {
  // --- Auth Delegates ---
  async getUser(id: string): Promise<User | undefined> {
    return authStorage.getUser(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // --- Trade Setups ---
  async getTradeSetups(userId: string): Promise<TradeSetup[]> {
    return await db
      .select()
      .from(tradeSetups)
      .where(eq(tradeSetups.userId, userId))
      .orderBy(desc(tradeSetups.createdAt));
  }

  async createTradeSetup(trade: InsertTradeSetup): Promise<TradeSetup> {
    const [newTrade] = await db.insert(tradeSetups).values(trade).returning();
    return newTrade;
  }

  async updateTradeStatus(id: number, status: string): Promise<TradeSetup> {
    const [updated] = await db
      .update(tradeSetups)
      .set({ 
        status, 
        executedAt: status === 'EXECUTED' ? new Date() : null 
      })
      .where(eq(tradeSetups.id, id))
      .returning();
    return updated;
  }

  async deleteTradeSetup(id: number): Promise<void> {
    await db.delete(tradeSetups).where(eq(tradeSetups.id, id));
  }

  // --- S&P 500 ---
  async getSp500Stocks(): Promise<any[]> {
    return await db.select().from(sp500Stocks);
  }

  async upsertSp500Stock(symbol: string, name: string, price?: string): Promise<void> {
    await db
      .insert(sp500Stocks)
      .values({ symbol, name, lastPrice: price })
      .onConflictDoUpdate({
        target: sp500Stocks.symbol,
        set: { name, lastPrice: price, updatedAt: new Date() },
      });
  }

  async getTradeRecommendations(): Promise<any[]> {
    return await db.select().from(tradeRecommendations).orderBy(desc(tradeRecommendations.createdAt));
  }

  async saveTradeRecommendations(recommendations: any[]): Promise<void> {
    await db.delete(tradeRecommendations);
    if (recommendations && recommendations.length > 0) {
      const validRecs = recommendations
        .map(rec => {
          // Parse riskReward - it can be "1:2.1" format or just "2.1"
          let riskRewardValue = String(rec.riskReward || '0');
          if (riskRewardValue.includes(':')) {
            const parts = riskRewardValue.split(':');
            riskRewardValue = parts[1] || parts[0];
          }
          riskRewardValue = riskRewardValue.replace(/[^\d.]/g, '') || '0';
          
          // Parse price fields with fallback to 0
          const parseNumeric = (val: any): string => {
            const cleaned = String(val || '0').replace(/[^\d.]/g, '');
            const num = parseFloat(cleaned);
            return isFinite(num) && num > 0 ? cleaned : '0';
          };
          
          const entryPrice = parseNumeric(rec.entryPrice);
          const takeProfit = parseNumeric(rec.takeProfit);
          const stopLoss = parseNumeric(rec.stopLoss);
          
          return {
            symbol: String(rec.symbol || ''),
            recommendation: String(rec.recommendation || 'BUY'),
            entryPrice,
            takeProfit,
            stopLoss,
            riskReward: riskRewardValue,
            rationale: String(rec.rationale || ''),
            isValid: rec.symbol && entryPrice !== '0'
          };
        })
        .filter(rec => rec.isValid)
        .map(({ isValid, ...rec }) => rec);
      
      if (validRecs.length > 0) {
        await db.insert(tradeRecommendations).values(validRecs);
      }
    }
  }

  // --- Portfolio Holdings ---
  async getPortfolioHoldings(userId: string): Promise<PortfolioHolding[]> {
    return await db
      .select()
      .from(portfolioHoldings)
      .where(eq(portfolioHoldings.userId, userId))
      .orderBy(desc(portfolioHoldings.createdAt));
  }

  async createPortfolioHolding(holding: InsertPortfolioHolding): Promise<PortfolioHolding> {
    const [newHolding] = await db.insert(portfolioHoldings).values(holding).returning();
    return newHolding;
  }

  async updatePortfolioHolding(id: number, userId: string, shares: string, avgCost: string): Promise<PortfolioHolding | null> {
    const [updated] = await db
      .update(portfolioHoldings)
      .set({ shares, avgCost, updatedAt: new Date() })
      .where(and(eq(portfolioHoldings.id, id), eq(portfolioHoldings.userId, userId)))
      .returning();
    return updated || null;
  }

  async deletePortfolioHolding(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(portfolioHoldings).where(and(eq(portfolioHoldings.id, id), eq(portfolioHoldings.userId, userId))).returning();
    return result.length > 0;
  }

  async bulkCreatePortfolioHoldings(holdings: InsertPortfolioHolding[]): Promise<PortfolioHolding[]> {
    if (holdings.length === 0) return [];
    return await db.insert(portfolioHoldings).values(holdings).returning();
  }

  // --- Watchlist ---
  async getWatchlist(userId: string): Promise<WatchlistItem[]> {
    return await db
      .select()
      .from(watchlist)
      .where(eq(watchlist.userId, userId))
      .orderBy(desc(watchlist.createdAt));
  }

  async addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem> {
    const [newItem] = await db.insert(watchlist).values(item).returning();
    return newItem;
  }

  async updateWatchlistNote(id: number, userId: string, notes: string): Promise<WatchlistItem | null> {
    const [updated] = await db
      .update(watchlist)
      .set({ notes })
      .where(and(eq(watchlist.id, id), eq(watchlist.userId, userId)))
      .returning();
    return updated || null;
  }

  async removeFromWatchlist(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(watchlist).where(and(eq(watchlist.id, id), eq(watchlist.userId, userId))).returning();
    return result.length > 0;
  }

  async bulkAddToWatchlist(items: InsertWatchlistItem[]): Promise<WatchlistItem[]> {
    if (items.length === 0) return [];
    return await db.insert(watchlist).values(items).returning();
  }

  // --- Saved Prompts ---
  async getSavedPrompts(userId: string): Promise<SavedPrompt[]> {
    return await db
      .select()
      .from(savedPrompts)
      .where(eq(savedPrompts.userId, userId))
      .orderBy(desc(savedPrompts.createdAt));
  }

  async createSavedPrompt(prompt: InsertSavedPrompt): Promise<SavedPrompt> {
    const [newPrompt] = await db.insert(savedPrompts).values(prompt).returning();
    return newPrompt;
  }

  async deleteSavedPrompt(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(savedPrompts).where(and(eq(savedPrompts.id, id), eq(savedPrompts.userId, userId))).returning();
    return result.length > 0;
  }

  // --- Price Alerts ---
  async getPriceAlerts(userId: string): Promise<PriceAlert[]> {
    return await db
      .select()
      .from(priceAlerts)
      .where(eq(priceAlerts.userId, userId))
      .orderBy(desc(priceAlerts.createdAt));
  }

  async getPriceAlertsBySymbol(userId: string, symbol: string): Promise<PriceAlert[]> {
    return await db
      .select()
      .from(priceAlerts)
      .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.symbol, symbol.toUpperCase())))
      .orderBy(desc(priceAlerts.createdAt));
  }

  async getActivePriceAlerts(): Promise<PriceAlert[]> {
    return await db
      .select()
      .from(priceAlerts)
      .where(and(eq(priceAlerts.isActive, true), eq(priceAlerts.isTriggered, false)));
  }

  async getTriggeredPriceAlerts(userId: string): Promise<PriceAlert[]> {
    return await db
      .select()
      .from(priceAlerts)
      .where(and(eq(priceAlerts.userId, userId), eq(priceAlerts.isTriggered, true), eq(priceAlerts.isActive, true)))
      .orderBy(desc(priceAlerts.triggeredAt));
  }

  async createPriceAlert(alert: InsertPriceAlert): Promise<PriceAlert> {
    const [newAlert] = await db.insert(priceAlerts).values({
      ...alert,
      symbol: alert.symbol.toUpperCase(),
    }).returning();
    return newAlert;
  }

  async updatePriceAlert(id: number, userId: string, updates: Partial<PriceAlert>): Promise<PriceAlert | null> {
    const [updated] = await db
      .update(priceAlerts)
      .set(updates)
      .where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, userId)))
      .returning();
    return updated || null;
  }

  async triggerPriceAlert(id: number, triggeredPrice: string, aiAnalysis?: string): Promise<PriceAlert | null> {
    const [updated] = await db
      .update(priceAlerts)
      .set({
        isTriggered: true,
        triggeredAt: new Date(),
        triggeredPrice,
        aiAnalysis: aiAnalysis || null,
      })
      .where(eq(priceAlerts.id, id))
      .returning();
    return updated || null;
  }

  async deletePriceAlert(id: number, userId: string): Promise<boolean> {
    const result = await db.delete(priceAlerts).where(and(eq(priceAlerts.id, id), eq(priceAlerts.userId, userId))).returning();
    return result.length > 0;
  }

  // --- User Notification Settings ---
  async getUserNotificationSettings(userId: string): Promise<UserNotificationSettings | null> {
    const [settings] = await db
      .select()
      .from(userNotificationSettings)
      .where(eq(userNotificationSettings.userId, userId));
    return settings || null;
  }

  async upsertUserNotificationSettings(settings: InsertUserNotificationSettings): Promise<UserNotificationSettings> {
    const [result] = await db
      .insert(userNotificationSettings)
      .values(settings)
      .onConflictDoUpdate({
        target: userNotificationSettings.userId,
        set: {
          telegramChatId: settings.telegramChatId,
          telegramEnabled: settings.telegramEnabled,
          whatsappNumber: settings.whatsappNumber,
          whatsappEnabled: settings.whatsappEnabled,
          updatedAt: new Date(),
        },
      })
      .returning();
    return result;
  }
}

export const storage = new DatabaseStorage();
