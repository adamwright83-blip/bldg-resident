import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("proposal feature source isolation", () => {
  it("never references APP_SHARED_API_SECRET anywhere under client/", () => {
    const clientDir = path.join(process.cwd(), "client");
    const files = walk(clientDir);
    for (const file of files) {
      const source = fs.readFileSync(file, "utf8");
      expect(source).not.toMatch(/APP_SHARED_API_SECRET/);
    }
  });

  it("the proposals router contains exactly one mutation -- approve -- and it accepts no tenantId/bldgUserId input", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/routers/proposals.ts"), "utf8");
    const mutationCalls = source.match(/\.mutation\(/g) ?? [];
    expect(mutationCalls).toHaveLength(1);
    expect(source).toMatch(/approve:\s*publicProcedure/);
    expect(source).not.toMatch(/z\.object\(\{[^}]*tenantId/);
    expect(source).not.toMatch(/z\.object\(\{[^}]*bldgUserId/);
  });

  it("the approve mutation's only outbound call is submitResidentProposalConsent -- no Stripe/LLM identifiers introduced", () => {
    const routerSource = fs.readFileSync(path.join(process.cwd(), "server/routers/proposals.ts"), "utf8");
    const proxySource = fs.readFileSync(path.join(process.cwd(), "server/proposals/proposalClient.ts"), "utf8");
    for (const source of [routerSource, proxySource]) {
      expect(source).not.toMatch(/\bstripe\b/i);
      expect(source).not.toMatch(/openai|anthropic|chatgpt/i);
    }
    const postCalls = proxySource.match(/method:\s*["']POST["']/g) ?? [];
    expect(postCalls).toHaveLength(1);
  });

  it("the proposal client never reads APP_SHARED_API_SECRET from anywhere but process.env", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/proposals/proposalClient.ts"), "utf8");
    const secretReads = source.match(/APP_SHARED_API_SECRET/g) ?? [];
    expect(secretReads.length).toBeGreaterThan(0);
    expect(source).not.toMatch(/req\.headers\[["']x-app-shared-secret["']\]/);
  });

  it("the proposal client never forwards inbound x-tenant-id or x-bldg-user-id from the request", () => {
    const source = fs.readFileSync(path.join(process.cwd(), "server/proposals/proposalClient.ts"), "utf8");
    expect(source).not.toMatch(/req\.headers\[["']x-tenant-id["']\]/);
    expect(source).not.toMatch(/req\.headers\[["']x-bldg-user-id["']\]/);
  });
});
