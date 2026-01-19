import { 
  users, tradeSetups, sp500Stocks, tradeRecommendations, portfolioHoldings, watchlist,
  type User, type InsertUser, type UpdateUser, 
  type TradeSetup, type InsertTradeSetup,
  type UpsertUser,
  type PortfolioHolding, type InsertPortfolioHolding,
  type WatchlistItem, type InsertWatchlistItem
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
  updatePortfolioHolding(id: number, shares: string, avgCost: string): Promise<PortfolioHolding>;
  deletePortfolioHolding(id: number): Promise<void>;
  bulkCreatePortfolioHoldings(holdings: InsertPortfolioHolding[]): Promise<PortfolioHolding[]>;

  // Watchlist methods
  getWatchlist(userId: string): Promise<WatchlistItem[]>;
  addToWatchlist(item: InsertWatchlistItem): Promise<WatchlistItem>;
  updateWatchlistNote(id: number, notes: string): Promise<WatchlistItem>;
  removeFromWatchlist(id: number): Promise<void>;
  bulkAddToWatchlist(items: InsertWatchlistItem[]): Promise<WatchlistItem[]>;
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

  async updatePortfolioHolding(id: number, shares: string, avgCost: string): Promise<PortfolioHolding> {
    const [updated] = await db
      .update(portfolioHoldings)
      .set({ shares, avgCost, updatedAt: new Date() })
      .where(eq(portfolioHoldings.id, id))
      .returning();
    return updated;
  }

  async deletePortfolioHolding(id: number): Promise<void> {
    await db.delete(portfolioHoldings).where(eq(portfolioHoldings.id, id));
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

  async updateWatchlistNote(id: number, notes: string): Promise<WatchlistItem> {
    const [updated] = await db
      .update(watchlist)
      .set({ notes })
      .where(eq(watchlist.id, id))
      .returning();
    return updated;
  }

  async removeFromWatchlist(id: number): Promise<void> {
    await db.delete(watchlist).where(eq(watchlist.id, id));
  }

  async bulkAddToWatchlist(items: InsertWatchlistItem[]): Promise<WatchlistItem[]> {
    if (items.length === 0) return [];
    return await db.insert(watchlist).values(items).returning();
  }
}

export const storage = new DatabaseStorage();
