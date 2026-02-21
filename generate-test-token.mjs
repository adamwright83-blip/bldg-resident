import { SignJWT } from "jose";

const JWT_SECRET = process.env.JWT_SECRET;
const bldgUserId = 1; // Test user ID

const secret = new TextEncoder().encode(JWT_SECRET);

const token = await new SignJWT({ bldgUserId })
  .setProtectedHeader({ alg: "HS256" })
  .setExpirationTime("7d")
  .sign(secret);

console.log("Test JWT token:");
console.log(token);
console.log("\nSet cookie manually in browser:");
console.log(`document.cookie = "bldg_session=${token}; path=/; max-age=604800";`);
