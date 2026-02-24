#!/usr/bin/env node
import mysql from "mysql2/promise";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error("[migrate-otp] DATABASE_URL is required");
  process.exit(1);
}

async function run() {
  const conn = await mysql.createConnection(databaseUrl);
  try {
    console.log("[migrate-otp] Connected");

    await conn.query(
      "ALTER TABLE `bldg_users` ADD COLUMN IF NOT EXISTS `otpCode` varchar(6) NULL"
    );
    await conn.query(
      "ALTER TABLE `bldg_users` ADD COLUMN IF NOT EXISTS `otpExpiresAt` timestamp NULL"
    );
    await conn.query(
      "ALTER TABLE `bldg_users` ADD COLUMN IF NOT EXISTS `otpAttempts` int NOT NULL DEFAULT 0"
    );

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
