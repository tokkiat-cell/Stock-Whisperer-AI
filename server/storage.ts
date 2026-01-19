import { 
  users, tradeSetups, sp500Stocks, tradeRecommendations,
  type User, type InsertUser, type UpdateUser, 
  type TradeSetup, type InsertTradeSetup,
  type UpsertUser 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
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
}

export const storage = new DatabaseStorage();
