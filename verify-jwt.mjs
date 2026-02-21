import { jwtVerify } from "jose";

const token = "eyJhbGciOiJIUzI1NiJ9.eyJvcmRlcklkIjo3NTAwMDEsImN1c3RvbWVySWQiOjYwMDQ2LCJ0b3RhbFdlaWdodCI6NS41LCJmaW5hbEFtb3VudCI6MTMuNzUsImV4cCI6MTc3MTU2ODM1MX0.M53Me49hEHzoRVFhEqCyrNUMR874slFy1MNL_ygYJbI";
const secret = process.env.JWT_SHARED_SECRET || "";

console.log("[JWT Verification]");
console.log("Token:", token.substring(0, 50) + "...");
console.log("Secret configured:", !!secret);
console.log("Secret value:", secret ? "***" : "NOT SET");

if (!secret) {
  console.log("RESULT: FAILED - JWT_SHARED_SECRET not set");
  process.exit(1);
}

try {
  const secretBytes = new TextEncoder().encode(secret);
  const { payload } = await jwtVerify(token, secretBytes);
  console.log("RESULT: SUCCESS - Token verified");
  console.log("Payload:", JSON.stringify(payload, null, 2));
} catch (error) {
  console.log("RESULT: FAILED - Token verification error");
  console.log("Error code:", error.code);
  console.log("Error message:", error.message);
}
