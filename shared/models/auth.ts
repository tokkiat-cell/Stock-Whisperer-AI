import { sql } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

// Session storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)]
);

// User storage table.
// (IMPORTANT) This table is mandatory for Replit Auth, don't drop it.
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  totpSecret: varchar("totp_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false).notNull(),
  stripeCustomerId: varchar("stripe_customer_id"),
  stripeSubscriptionId: varchar("stripe_subscription_id"),
  planTier: varchar("plan_tier").default("free"), // 'free', 'basic', or 'pro'
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// === USER USAGE TRACKING ===
// Tracks monthly usage of AI features for free tier limits
export const userUsage = pgTable("user_usage", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  chatCount: integer("chat_count").default(0).notNull(),
  imageCount: integer("image_count").default(0).notNull(),
  voiceCount: integer("voice_count").default(0).notNull(),
  stockAnalysisCount: integer("stock_analysis_count").default(0).notNull(),
  periodStart: timestamp("period_start").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UserUsage = typeof userUsage.$inferSelect;
export type InsertUserUsage = typeof userUsage.$inferInsert;
