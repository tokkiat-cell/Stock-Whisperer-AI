import { db } from "../db";
import { userUsage, users } from "@shared/schema";
import { eq } from "drizzle-orm";

export type UsageType = "chat" | "image" | "voice" | "stockAnalysis";
export type PlanTier = "free" | "basic" | "pro";

export const FREE_TIER_LIMITS = {
  chat: 10,
  image: 3,
  voice: 5,
  stockAnalysis: 10,
} as const;

export const BASIC_TIER_LIMITS = {
  chat: 50,
  image: 20,
  voice: 20,
  stockAnalysis: 60,
} as const;

// Pro tier has unlimited usage (represented by Infinity)
export const PRO_TIER_LIMITS = {
  chat: Infinity,
  image: Infinity,
  voice: Infinity,
  stockAnalysis: Infinity,
} as const;

export interface UsageCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  usageType: UsageType;
  planTier: PlanTier;
}

export interface UsageLimits {
  chat: number;
  image: number;
  voice: number;
  stockAnalysis: number;
}

export interface UserUsageData {
  chatCount: number;
  imageCount: number;
  voiceCount: number;
  stockAnalysisCount: number;
  limits: UsageLimits;
  planTier: PlanTier;
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

async function getUserPlanTier(userId: string): Promise<PlanTier> {
  const [user] = await db
    .select({ 
      planTier: users.planTier 
    })
    .from(users)
    .where(eq(users.id, userId));
  
  // Return the stored plan tier, defaulting to "free"
  const tier = user?.planTier as PlanTier;
  if (tier === "pro" || tier === "basic") {
    return tier;
  }
  return "free";
}

function getLimitsForTier(tier: PlanTier) {
  switch (tier) {
    case "pro":
      return PRO_TIER_LIMITS;
    case "basic":
      return BASIC_TIER_LIMITS;
    default:
      return FREE_TIER_LIMITS;
  }
}

export async function checkUsageLimit(
  userId: string,
  usageType: UsageType
): Promise<UsageCheckResult> {
  const planTier = await getUserPlanTier(userId);
  const limits = getLimitsForTier(planTier);
  
  // Pro tier has unlimited usage
  if (planTier === "pro") {
    return {
      allowed: true,
      currentCount: 0,
      limit: Infinity,
      usageType,
      planTier,
    };
  }

  const usage = await getOrCreateUserUsage(userId);
  const limit = limits[usageType];
  
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
    planTier,
  };
}

export async function incrementUsage(
  userId: string,
  usageType: UsageType
): Promise<void> {
  const planTier = await getUserPlanTier(userId);
  // Pro tier doesn't need usage tracking
  if (planTier === "pro") return;

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
  const planTier = await getUserPlanTier(userId);
  const usage = await getOrCreateUserUsage(userId);
  const limits = getLimitsForTier(planTier);

  return {
    chatCount: usage.chatCount,
    imageCount: usage.imageCount,
    voiceCount: usage.voiceCount,
    stockAnalysisCount: usage.stockAnalysisCount,
    limits: planTier === "pro" ? BASIC_TIER_LIMITS : limits, // Return finite limits for display
    planTier,
    periodStart: usage.periodStart,
  };
}
