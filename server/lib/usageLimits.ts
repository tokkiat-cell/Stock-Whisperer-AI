import { db } from "../db";
import { userUsage, users } from "@shared/schema";
import { eq } from "drizzle-orm";

export type UsageType = "chat" | "image" | "voice" | "stockAnalysis";

export const FREE_TIER_LIMITS = {
  chat: 10,
  image: 3,
  voice: 5,
  stockAnalysis: 10,
} as const;

export interface UsageCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  usageType: UsageType;
  isSubscribed: boolean;
}

export interface UserUsageData {
  chatCount: number;
  imageCount: number;
  voiceCount: number;
  stockAnalysisCount: number;
  limits: typeof FREE_TIER_LIMITS;
  isSubscribed: boolean;
  periodStart: Date | null;
}

function getMonthStart(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

async function getOrCreateUserUsage(userId: string) {
  const monthStart = getMonthStart();
  
  const [existing] = await db
    .select()
    .from(userUsage)
    .where(eq(userUsage.userId, userId));

  if (!existing) {
    const [created] = await db
      .insert(userUsage)
      .values({
        userId,
        chatCount: 0,
        imageCount: 0,
        voiceCount: 0,
        stockAnalysisCount: 0,
        periodStart: monthStart,
      })
      .returning();
    return created;
  }

  if (existing.periodStart < monthStart) {
    const [reset] = await db
      .update(userUsage)
      .set({
        chatCount: 0,
        imageCount: 0,
        voiceCount: 0,
        stockAnalysisCount: 0,
        periodStart: monthStart,
        updatedAt: new Date(),
      })
      .where(eq(userUsage.userId, userId))
      .returning();
    return reset;
  }

  return existing;
}

async function isUserSubscribed(userId: string): Promise<boolean> {
  const [user] = await db
    .select({ stripeSubscriptionId: users.stripeSubscriptionId })
    .from(users)
    .where(eq(users.id, userId));
  
  return !!user?.stripeSubscriptionId;
}

export async function checkUsageLimit(
  userId: string,
  usageType: UsageType
): Promise<UsageCheckResult> {
  const isSubscribed = await isUserSubscribed(userId);
  
  if (isSubscribed) {
    return {
      allowed: true,
      currentCount: 0,
      limit: Infinity,
      usageType,
      isSubscribed: true,
    };
  }

  const usage = await getOrCreateUserUsage(userId);
  const limit = FREE_TIER_LIMITS[usageType];
  
  const countMap: Record<UsageType, number> = {
    chat: usage.chatCount,
    image: usage.imageCount,
    voice: usage.voiceCount,
    stockAnalysis: usage.stockAnalysisCount,
  };
  
  const currentCount = countMap[usageType];
  
  return {
    allowed: currentCount < limit,
    currentCount,
    limit,
    usageType,
    isSubscribed: false,
  };
}

export async function incrementUsage(
  userId: string,
  usageType: UsageType
): Promise<void> {
  const isSubscribed = await isUserSubscribed(userId);
  if (isSubscribed) return;

  await getOrCreateUserUsage(userId);

  const fieldMap: Record<UsageType, keyof typeof userUsage.$inferSelect> = {
    chat: "chatCount",
    image: "imageCount",
    voice: "voiceCount",
    stockAnalysis: "stockAnalysisCount",
  };

  const field = fieldMap[usageType];
  
  const [current] = await db
    .select()
    .from(userUsage)
    .where(eq(userUsage.userId, userId));
  
  if (current) {
    await db
      .update(userUsage)
      .set({
        [field]: (current[field] as number) + 1,
        updatedAt: new Date(),
      })
      .where(eq(userUsage.userId, userId));
  }
}

export async function getUserUsageData(userId: string): Promise<UserUsageData> {
  const isSubscribed = await isUserSubscribed(userId);
  const usage = await getOrCreateUserUsage(userId);

  return {
    chatCount: usage.chatCount,
    imageCount: usage.imageCount,
    voiceCount: usage.voiceCount,
    stockAnalysisCount: usage.stockAnalysisCount,
    limits: FREE_TIER_LIMITS,
    isSubscribed,
    periodStart: usage.periodStart,
  };
}
