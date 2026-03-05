import { eq, desc, asc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  bldgUsers,
  InsertBldgUser,
  BldgUser,
  chatMessages,
  InsertChatMessage,
  ChatMessage,
  serviceRequests,
  InsertServiceRequest,
  ServiceRequest,
  preferences,
  InsertPreference,
  Preference,
  onboardingFlags,
  InsertOnboardingFlag,
  OnboardingFlag,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ─── BLDG Resident Users (phone-based from Laundry Butler) ───

/**
 * Upsert a BLDG resident user by phone_e164.
 * If exists: update firstName, buildingSlug, lastLoginAt.
 * If not: create the record.
 */
export async function upsertBldgUser(data: {
  phoneE164: string;
  firstName?: string | null;
  buildingSlug?: string | null;
}): Promise<BldgUser> {
  const db = await getDb();
  if (!db) {
    throw new Error(
      "[Database] Cannot upsert bldg user: database not available"
    );
  }

  const now = new Date();
  const values: InsertBldgUser = {
    phoneE164: data.phoneE164,
    firstName: data.firstName ?? null,
    buildingSlug: data.buildingSlug ?? null,
    lastLoginAt: now,
  };

  const updateSet: Record<string, unknown> = {
    lastLoginAt: now,
  };
  if (data.firstName !== undefined) {
    updateSet.firstName = data.firstName;
  }
  if (data.buildingSlug !== undefined) {
    updateSet.buildingSlug = data.buildingSlug;
  }

  await db.insert(bldgUsers).values(values).onDuplicateKeyUpdate({
    set: updateSet,
  });

  // Fetch the upserted user
  const result = await db
    .select()
    .from(bldgUsers)
    .where(eq(bldgUsers.phoneE164, data.phoneE164))
    .limit(1);

  return result[0];
}

/**
 * Get a BLDG resident user by their phone number (E.164 format).
 */
export async function getBldgUserByPhone(
  phoneE164: string
): Promise<BldgUser | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get bldg user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(bldgUsers)
    .where(eq(bldgUsers.phoneE164, phoneE164))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Get a BLDG resident user by their ID.
 */
export async function getBldgUserById(
  id: number
): Promise<BldgUser | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get bldg user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(bldgUsers)
    .where(eq(bldgUsers.id, id))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}

/**
 * Update a BLDG user's profile fields.
 */
export async function updateBldgUser(
  id: number,
  updates: Partial<InsertBldgUser>
): Promise<BldgUser | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot update bldg user: database not available");
  }

  await db.update(bldgUsers).set(updates).where(eq(bldgUsers.id, id));

  const rows = await db
    .select()
    .from(bldgUsers)
    .where(eq(bldgUsers.id, id))
    .limit(1);

  return rows.length > 0 ? rows[0] : undefined;
}

// ─── Chat Messages ───

/**
 * Insert a chat message (user or assistant).
 */
export async function insertChatMessage(
  data: InsertChatMessage
): Promise<ChatMessage> {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot insert chat message: database not available");
  }

  const result = await db.insert(chatMessages).values(data);
  const insertId = result[0].insertId;

  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.id, insertId))
    .limit(1);

  return rows[0];
}

/**
 * Get the last N chat messages for a bldg user, ordered oldest-first.
 */
export async function getChatHistory(
  bldgUserId: number,
  limit: number = 20
): Promise<ChatMessage[]> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get chat history: database not available");
    return [];
  }

  // Get the most recent N messages (desc), then reverse to oldest-first
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.bldgUserId, bldgUserId))
    .orderBy(desc(chatMessages.id))
    .limit(limit);

  return rows.reverse();
}

/**
 * Delete all chat messages for a bldg user (clear conversation).
 */
export async function clearChatHistory(bldgUserId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("[Database] Cannot clear chat: database not available");
  }

  await db
    .delete(chatMessages)
    .where(eq(chatMessages.bldgUserId, bldgUserId));
}

// ─── Service Requests ───

/**
 * Create a service request from a chat interaction.
 */
export async function createServiceRequest(
  data: InsertServiceRequest
): Promise<ServiceRequest> {
  const db = await getDb();
  if (!db) {
    throw new Error(
      "[Database] Cannot create service request: database not available"
    );
  }

  const result = await db.insert(serviceRequests).values(data);
  const insertId = result[0].insertId;

  const rows = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, insertId))
    .limit(1);

  return rows[0];
}

/**
 * Get service requests for a bldg user.
 */
export async function getServiceRequests(
  bldgUserId: number,
  limit: number = 20
): Promise<ServiceRequest[]> {
  const db = await getDb();
  if (!db) {
    return [];
  }

  return db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.bldgUserId, bldgUserId))
    .orderBy(desc(serviceRequests.createdAt))
    .limit(limit);
}

/**
 * Get a service request by bldg user id and order id (for receipt webhook matching).
 */
export async function getServiceRequestByBldgUserAndOrderId(
  bldgUserId: number,
  orderId: number
): Promise<ServiceRequest | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }
  const rows = await db
    .select()
    .from(serviceRequests)
    .where(
      and(
        eq(serviceRequests.bldgUserId, bldgUserId),
        eq(serviceRequests.orderId, orderId)
      )
    )
    .limit(1);
  return rows[0];
}

/**
 * Update a service request (for modify/cancel flows).
 */
export async function updateServiceRequest(
  id: number,
  updates: Partial<InsertServiceRequest>
): Promise<ServiceRequest | undefined> {
  const db = await getDb();
  if (!db) {
    throw new Error(
      "[Database] Cannot update service request: database not available"
    );
  }

  await db.update(serviceRequests).set(updates).where(eq(serviceRequests.id, id));

  const rows = await db
    .select()
    .from(serviceRequests)
    .where(eq(serviceRequests.id, id))
    .limit(1);

  return rows.length > 0 ? rows[0] : undefined;
}

// ─── Preferences ───

/**
 * Get preference for a user + service category.
 */
export async function getPreference(
  bldgUserId: number,
  serviceCategory: string
): Promise<Preference | undefined> {
  const db = await getDb();
  if (!db) {
    return undefined;
  }

  const rows = await db
    .select()
    .from(preferences)
    .where(
      and(
        eq(preferences.bldgUserId, bldgUserId),
        eq(preferences.serviceCategory, serviceCategory as any)
      )
    )
    .limit(1);

  return rows.length > 0 ? rows[0] : undefined;
}

/**
 * Upsert a preference (create or update).
 */
export async function upsertPreference(
  data: InsertPreference
): Promise<Preference> {
  const db = await getDb();
  if (!db) {
    throw new Error(
      "[Database] Cannot upsert preference: database not available"
    );
  }

  const updateSet: Record<string, unknown> = {};
  if (data.autoSchedule !== undefined) updateSet.autoSchedule = data.autoSchedule;
  if (data.preferredDay !== undefined) updateSet.preferredDay = data.preferredDay;
  if (data.preferredWindow !== undefined)
    updateSet.preferredWindow = data.preferredWindow;
  if (data.lastBookedDate !== undefined)
    updateSet.lastBookedDate = data.lastBookedDate;
  if (data.recurrenceInterval !== undefined)
    updateSet.recurrenceInterval = data.recurrenceInterval;
  if (data.vendorId !== undefined) updateSet.vendorId = data.vendorId;

  await db.insert(preferences).values(data).onDuplicateKeyUpdate({
    set: updateSet,
  });

  // Fetch the upserted preference
  const rows = await db
    .select()
    .from(preferences)
    .where(
      and(
        eq(preferences.bldgUserId, data.bldgUserId),
        eq(preferences.serviceCategory, data.serviceCategory as any)
      )
    )
    .limit(1);

  return rows[0];
}

/**
 * Check if onboarding has been shown for a user + service category.
 */
export async function hasShownOnboarding(
  bldgUserId: number,
  serviceCategory: string
): Promise<boolean> {
  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] Cannot check onboarding: database not available"
    );
    return false;
  }

  const rows = await db
    .select()
    .from(onboardingFlags)
    .where(
      and(
        eq(onboardingFlags.bldgUserId, bldgUserId),
        eq(onboardingFlags.serviceCategory, serviceCategory as any)
      )
    )
    .limit(1);

  return rows.length > 0;
}

/**
 * Mark onboarding as shown for a user + service category (idempotent).
 */
export async function markOnboardingShown(
  bldgUserId: number,
  serviceCategory: string
): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn(
      "[Database] Cannot mark onboarding shown: database not available"
    );
    return;
  }

  // Check if already exists
  const exists = await hasShownOnboarding(bldgUserId, serviceCategory);
  if (exists) {
    return;
  }

  // Insert new flag
  await db.insert(onboardingFlags).values({
    bldgUserId,
    serviceCategory: serviceCategory as any,
  });
}

// ─── Booking Stats (for Emotional Architecture) ───

export interface BookingStats {
  totalBookings: number;
  bookingsByService: Record<string, number>;
  daysSinceLastInteraction: number;
  lastServiceType: string | null;
  lastBookingDay: string | null; // e.g., "Tuesday"
  totalSessions: number; // approximate: count of distinct dates with messages
}

/**
 * Get booking statistics for a resident.
 * Used by Phantom Thread, Return Recognition, and Variable Depth Charge.
 */
export async function getBookingStats(bldgUserId: number): Promise<BookingStats> {
  const db = await getDb();
  const defaults: BookingStats = {
    totalBookings: 0,
    bookingsByService: {},
    daysSinceLastInteraction: 999,
    lastServiceType: null,
    lastBookingDay: null,
    totalSessions: 0,
  };

  if (!db) return defaults;

  try {
    // Get all service requests (non-cancelled)
    const allRequests = await db
      .select()
      .from(serviceRequests)
      .where(eq(serviceRequests.bldgUserId, bldgUserId))
      .orderBy(desc(serviceRequests.createdAt));

    const activeRequests = allRequests.filter(
      (r) => r.status !== "cancelled"
    );

    // Total bookings
    const totalBookings = activeRequests.length;

    // Bookings by service type
    const bookingsByService: Record<string, number> = {};
    for (const req of activeRequests) {
      const svc = req.serviceType;
      bookingsByService[svc] = (bookingsByService[svc] || 0) + 1;
    }

    // Last service type and booking day
    let lastServiceType: string | null = null;
    let lastBookingDay: string | null = null;
    if (activeRequests.length > 0) {
      lastServiceType = activeRequests[0].serviceType;
      // Extract day name from scheduledDate (e.g., "Tuesday, Feb 18" → "Tuesday")
      const dayMatch = activeRequests[0].scheduledDate?.match(
        /^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/
      );
      lastBookingDay = dayMatch ? dayMatch[1] : null;
    }

    // Days since last interaction (from most recent chat message)
    const recentMessages = await db
      .select()
      .from(chatMessages)
      .where(eq(chatMessages.bldgUserId, bldgUserId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(1);

    let daysSinceLastInteraction = 999;
    if (recentMessages.length > 0 && recentMessages[0].createdAt) {
      const lastMsgTime = new Date(recentMessages[0].createdAt).getTime();
      const now = Date.now();
      daysSinceLastInteraction = Math.floor((now - lastMsgTime) / (1000 * 60 * 60 * 24));
    }

    // Approximate total sessions: count distinct dates with messages
    const allMessages = await db
      .select({ createdAt: chatMessages.createdAt })
      .from(chatMessages)
      .where(eq(chatMessages.bldgUserId, bldgUserId))
      .orderBy(asc(chatMessages.createdAt));

    const distinctDates = new Set<string>();
    for (const msg of allMessages) {
      if (msg.createdAt) {
        distinctDates.add(new Date(msg.createdAt).toISOString().slice(0, 10));
      }
    }
    const totalSessions = distinctDates.size;

    return {
      totalBookings,
      bookingsByService,
      daysSinceLastInteraction,
      lastServiceType,
      lastBookingDay,
      totalSessions,
    };
  } catch (error) {
    console.error("[Database] Failed to get booking stats:", error);
    return defaults;
  }
}
