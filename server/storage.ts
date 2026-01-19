import { 
  users, tradeSetups, 
  type User, type InsertUser, type UpdateUser, 
  type TradeSetup, type InsertTradeSetup,
  type UpsertUser 
} from "@shared/schema";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import { authStorage } from "./replit_integrations/auth/storage";

export interface IStorage {
  // Auth methods (delegated or re-implemented if needed, but we use authStorage for Auth)
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
    // Replit Auth uses email/id, but if we needed username lookup:
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // This is mostly for local dev if not using Replit Auth, 
    // but with Replit Auth we use upsertUser from authStorage.
    // We'll just implement it to satisfy the interface or delegate.
    // Since Replit Auth uses upsert, we can just call that if the types matched perfectly,
    // but InsertUser (username/password) is different from UpsertUser (email/replit_id).
    // For this app, we rely on Replit Auth, so this might be unused or we can adapt.
    // Let's just implement a basic insert for the 'users' table if it was used directly.
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
    // Clear old recommendations first (optional, based on "today's market")
    await db.delete(tradeRecommendations);
    await db.insert(tradeRecommendations).values(recommendations);
  }
}

export const storage = new DatabaseStorage();
