import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  json,
  bigint,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing Manus OAuth auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * BLDG resident users — phone-based auth from Laundry Butler JWT handoff.
 * Upserted by phone_e164 when a resident arrives via /welcome?token=JWT.
 */
export const bldgUsers = mysqlTable("bldg_users", {
  id: int("id").autoincrement().primaryKey(),
  phoneE164: varchar("phoneE164", { length: 20 }).notNull().unique(),
  firstName: varchar("firstName", { length: 100 }),
  lastName: varchar("lastName", { length: 100 }),
  unit: varchar("unit", { length: 50 }),
  buildingSlug: varchar("buildingSlug", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastLoginAt: timestamp("lastLoginAt").defaultNow().notNull(),
  stripeCustomerId: varchar("stripeCustomerId", { length: 100 }),
  stripePaymentMethodId: varchar("stripePaymentMethodId", { length: 100 }), // Stripe payment method ID (pm_xxxxx)
  paymentMethodSaved: int("paymentMethodSaved").default(0).notNull(), // 0 = false, 1 = true
  cardLast4: varchar("cardLast4", { length: 4 }), // Last 4 digits of saved card
  onboardingStep: int("onboardingStep").default(0).notNull(), // 0=not started, 1=asked name, 2=asked building, 3=asked unit, 4=asked phone, 5=complete
});

export type BldgUser = typeof bldgUsers.$inferSelect;
export type InsertBldgUser = typeof bldgUsers.$inferInsert;

/**
 * Chat messages — stores the conversation between a BLDG resident and the AI concierge.
 * Each message has a role (user or assistant) and content.
 * System messages are NOT stored — they're injected at LLM call time.
 */
export const chatMessages = mysqlTable("chat_messages", {
  id: int("id").autoincrement().primaryKey(),
  bldgUserId: int("bldgUserId").notNull(),
  role: mysqlEnum("role", ["user", "assistant"]).notNull(),
  content: text("content").notNull(),
  /** Optional metadata: receipt data, service request refs, etc. */
  metadata: json("metadata"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = typeof chatMessages.$inferInsert;

/**
 * Service requests — tracks requests initiated through chat.
 * Created when the AI identifies a service intent and the user confirms.
 */
export const serviceRequests = mysqlTable("service_requests", {
  id: int("id").autoincrement().primaryKey(),
  bldgUserId: int("bldgUserId").notNull(),
  serviceType: mysqlEnum("serviceType", [
    "laundry",
    "dry-cleaning",
    "car-wash",
    "cleaning",
    "grooming",
    "amenity",
    "maintenance",
    "other",
  ]).notNull(),
  status: mysqlEnum("status", [
    "pending",
    "confirmed",
    "in-progress",
    "completed",
    "cancelled",
  ])
    .default("pending")
    .notNull(),
  requestSummary: text("requestSummary"),
  requestJson: json("requestJson"),
  scheduledDate: varchar("scheduledDate", { length: 32 }),
  scheduledWindow: varchar("scheduledWindow", { length: 64 }),
  // Dual time format (ISO 8601)
  scheduledStartUtc: varchar("scheduledStartUtc", { length: 32 }),
  scheduledEndUtc: varchar("scheduledEndUtc", { length: 32 }),
  scheduledStartLocal: varchar("scheduledStartLocal", { length: 32 }),
  scheduledEndLocal: varchar("scheduledEndLocal", { length: 32 }),
  timezone: varchar("timezone", { length: 64 }),
  // Upgrade fields
  upgradeCode: varchar("upgradeCode", { length: 64 }),
  upgradePriceCents: int("upgradePriceCents"),
  upgradeLabel: varchar("upgradeLabel", { length: 255 }),
  paymentAdjustmentDueCents: int("paymentAdjustmentDueCents"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ServiceRequest = typeof serviceRequests.$inferSelect;
export type InsertServiceRequest = typeof serviceRequests.$inferInsert;

/**
 * Preferences — stores resident booking preferences for auto-scheduling.
 * Updated after each booking to learn preferred times and recurrence patterns.
 */
export const preferences = mysqlTable("preferences", {
  id: int("id").autoincrement().primaryKey(),
  bldgUserId: int("bldgUserId").notNull(),
  serviceCategory: mysqlEnum("serviceCategory", [
    "laundry",
    "car-wash",
    "cleaning",
    "grooming",
    "amenity",
    "maintenance",
  ]).notNull(),
  autoSchedule: mysqlEnum("autoSchedule", ["enabled", "disabled"])
    .default("enabled")
    .notNull(),
  preferredDay: varchar("preferredDay", { length: 32 }),
  preferredWindow: varchar("preferredWindow", { length: 64 }),
  lastBookedDate: varchar("lastBookedDate", { length: 32 }),
  recurrenceInterval: varchar("recurrenceInterval", { length: 32 }),
  vendorId: varchar("vendorId", { length: 100 }),
  // Silent drift tracking for window (day + time)
  driftWindowLastVal: varchar("driftWindowLastVal", { length: 64 }),
  driftWindowCount: int("driftWindowCount").default(0),
  driftWindowLastAt: timestamp("driftWindowLastAt"),
  // Silent drift tracking for service type
  driftTypeLastVal: varchar("driftTypeLastVal", { length: 64 }),
  driftTypeCount: int("driftTypeCount").default(0),
  driftTypeLastAt: timestamp("driftTypeLastAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Preference = typeof preferences.$inferSelect;
export type InsertPreference = typeof preferences.$inferInsert;

/**
 * Onboarding flags — tracks which service category onboarding messages have been shown to each user.
 * Used to send first-time explainer messages after the first booking per category.
 */
export const onboardingFlags = mysqlTable("onboarding_flags", {
  id: int("id").autoincrement().primaryKey(),
  bldgUserId: int("bldgUserId").notNull(),
  serviceCategory: mysqlEnum("serviceCategory", [
    "laundry",
    "car-wash",
    "cleaning",
    "grooming",
    "amenity",
    "maintenance",
  ]).notNull(),
  shownAt: timestamp("shownAt").defaultNow().notNull(),
});

export type OnboardingFlag = typeof onboardingFlags.$inferSelect;
export type InsertOnboardingFlag = typeof onboardingFlags.$inferInsert;
