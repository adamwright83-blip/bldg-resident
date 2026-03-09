# AGENTS.md

## Cursor Cloud specific instructions

### Project overview

BLDG.chat is a full-stack TypeScript AI concierge app for luxury buildings. Single repo (not a monorepo): React frontend (Vite) + Express/tRPC backend, MySQL via Drizzle ORM.

### Dev commands

See `package.json` scripts:
- `pnpm dev` — starts Express server with Vite HMR (serves both frontend and API on port 3000)
- `pnpm run check` — TypeScript type-checking (`tsc --noEmit`)
- `pnpm run test` — Vitest (server-side tests in `server/**/*.test.ts`)
- `pnpm run format` — Prettier auto-format
- `pnpm run build` — production build (Vite + esbuild)
- `pnpm run db:push` — generate and run Drizzle migrations

### MySQL setup

MySQL 8.0 must be running. Start with `sudo mysqld --user=mysql --daemonize` and ensure the socket directory is accessible: `sudo chmod 755 /var/run/mysqld/`. The dev database is `bldg_chat` on localhost with user `root` / password `devpassword`.

### Environment variables

A `.env` file at the repo root is loaded by `dotenv/config` in the server. Key variables:
- `DATABASE_URL` — MySQL connection string (required for DB features)
- `JWT_SECRET` — session cookie signing
- `STRIPE_SECRET_KEY` — **must be set** (even a placeholder) or the server crashes at import time (`server/lib/stripeHelper.ts` throws on missing key)
- `OTP_BYPASS_CODE` — set to `123456` for dev to skip real SMS OTP
- `ANTHROPIC_API_KEY` — required for AI chat responses; without it the chat returns "I'm having a moment" fallback

Vitest does NOT auto-load `.env`. Export env vars in the shell or pass them inline when running tests.

### Gotchas

- `pnpm install` may warn about ignored build scripts for `@tailwindcss/oxide` and `esbuild`. Run `pnpm rebuild @tailwindcss/oxide esbuild` after install if native binaries are missing.
- The TypeScript codebase has some pre-existing type errors (19 errors across `chat.ts`, `ownerNotify.ts`, `Home.tsx`). These do not block `pnpm dev` or `pnpm run test`.
- Prettier reports 193 pre-existing style issues — these are not blockers.
- The 28 pre-existing test failures are mostly snapshot-like assertions on code content and missing optional env vars.
