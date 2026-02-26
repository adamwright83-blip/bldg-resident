#!/usr/bin/env node
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[migrate-otp] DATABASE_URL is required");
  process.exit(1);
}

async function addColumnIfMissing(conn, table, column, definition) {
  const [rows] = await conn.query(
    `SELECT COUNT(*) AS cnt FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  if (rows[0].cnt === 0) {
    await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
    console.log(`[migrate-otp] Added column ${column}`);
  } else {
    console.log(`[migrate-otp] Column ${column} already exists, skipping`);
  }
}

async function run() {
  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("[migrate-otp] Connected");

    await addColumnIfMissing(conn, "bldg_users", "otpCode", "varchar(6) NULL");
    await addColumnIfMissing(conn, "bldg_users", "otpExpiresAt", "timestamp NULL");
    await addColumnIfMissing(conn, "bldg_users", "otpAttempts", "int NOT NULL DEFAULT 0");

    await conn.query(
      "UPDATE `bldg_users` SET `onboardingStep` = 5 WHERE `onboardingStep` > 0 AND `onboardingStep` < 5"
    );

    console.log("[migrate-otp] Migration complete");
  } finally {
    await conn.end();
  }
}

run().catch((err) => {
  console.error("[migrate-otp] Failed:", err);
  process.exit(1);
});
