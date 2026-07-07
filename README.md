# GearUp API

Backend for **GearUp**, a sports & outdoor gear rental marketplace, built for Programming Hero Level 2 Batch 7, Assignment 4 (student ID `L2B7-0384`, variant selected by last digit `4` → GearUp).

Node.js + Express + TypeScript, PostgreSQL via Prisma, JWT auth with role-based access control for three roles (`CUSTOMER`, `PROVIDER`, `ADMIN`), and real SSLCommerz payment integration.

## Contents

- [Tech stack](#tech-stack)
- [Features](#features)
- [Folder structure](#folder-structure)
- [Local setup](#local-setup)
- [Environment variables](#environment-variables)
- [Database setup, migrations & seeding](#database-setup-migrations--seeding)
- [Seed / admin credentials](#seed--admin-credentials)
- [API documentation](#api-documentation)
- [Payments (SSLCommerz)](#payments-sslcommerz)
- [Deployment](#deployment)
- [Design decisions & known simplifications](#design-decisions--known-simplifications)
- [Known dependency advisories](#known-dependency-advisories)

## Tech stack

| Concern | Choice |
|---|---|
| Runtime | Node.js 20+, TypeScript 6 (strict, NodeNext resolution, compiled to CommonJS) |
| Framework | Express 5 |
| Database | PostgreSQL, via Prisma ORM 7 (driver adapter: `@prisma/adapter-pg`) |
| Auth | JWT (access + rotating refresh tokens), bcrypt password hashing |
| Validation | Zod, on every endpoint |
| Payments | SSLCommerz (sandbox-ready), via `sslcommerz-lts` |
| Docs | OpenAPI 3.0 (Swagger UI at `/api-docs`) + Postman collection |

This project intentionally targets **current** major versions (Express 5, Prisma 7, Zod 4, TypeScript 6) rather than the older majors most tutorials show. Each of those introduced real breaking changes that affect this codebase directly (see [Design decisions](#design-decisions--known-simplifications)) - notably, Prisma 7 requires a driver adapter (no more bare `new PrismaClient()`), and Express 5 auto-forwards async errors so there's no `asyncHandler` wrapper boilerplate anywhere in this codebase.

## Features

**Public (no auth)**
Browse/search/filter gear, view gear details + reviews, list categories, list reviews for a gear item.

**Customer**
Register/login, manage own profile, place rental orders (multi-item, single-provider-per-order), view/cancel own orders, pay via SSLCommerz, view payment history, leave a review after a rental is returned.

**Provider**
Everything a customer can do for their own account, plus: manage own gear inventory (CRUD), view incoming orders for their gear, advance order status (confirm → mark picked up → mark returned).

**Admin**
Manage categories (CRUD), manage users (list/filter, suspend/reactivate), platform-wide read oversight of all gear and all rental orders, force-cancel any non-terminal order (automatically refunds via SSLCommerz if a completed payment exists).

## Folder structure

```
gearup-backend/
├── api/index.ts              # Vercel serverless entry point
├── docs/openapi.yaml         # OpenAPI 3.0 spec (served at /api-docs)
├── postman/                  # Postman collection + variables
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
├── src/
│   ├── app.ts                # Express app (no .listen() - shared by server.ts and api/index.ts)
│   ├── server.ts             # Local/Render entry point
│   ├── config/               # env loader (Zod-validated) + constants
│   ├── lib/                  # Prisma client singleton, logger
│   ├── middlewares/          # auth, rbac, validate, error handler, rate limiting
│   ├── utils/                # ApiError, ApiResponse, jwt, password, pagination, id generators
│   ├── types/                # Express Request augmentation, sslcommerz-lts ambient types
│   └── modules/
│       ├── auth/
│       ├── categories/
│       ├── gear/
│       ├── rentals/         # also exports the provider-orders router
│       ├── payments/        # includes sslcommerz.gateway.ts
│       ├── reviews/
│       └── admin/
├── .env.example
├── Dockerfile
├── vercel.json
└── render.yaml
```

Each module follows the same shape: `*.validation.ts` (Zod schemas) → `*.routes.ts` (thin, wires middleware) → `*.controller.ts` (thin, no business logic) → `*.service.ts` (all business logic + Prisma calls). Provider-scoped and admin-scoped routers live next to the public router for the same resource (e.g. `gear.routes.ts` exports both `publicGearRouter` and `providerGearRouter`) so the business logic for one resource stays in one service file instead of being split across modules.

## Local setup

Prerequisites: Node.js ≥ 20, a PostgreSQL database (local, or a free hosted one - see below), and an SSLCommerz sandbox account (free, see [Payments](#payments-sslcommerz)).

```bash
git clone <your-repo-url>
cd gearup-backend
npm install                    # also runs `prisma generate` via postinstall
cp .env.example .env           # then fill in real values
npx prisma migrate dev         # creates tables from prisma/schema.prisma
npm run prisma:seed            # populates categories, users, gear, sample orders
npm run dev                    # starts on http://localhost:5000
```

Verify it's running: `curl http://localhost:5000/health`.

Other useful scripts:

```bash
npm run build          # tsc build -> dist/
npm start              # run the compiled build (production)
npm run typecheck      # tsc --noEmit across src/, prisma/, and api/
npm test               # unit tests (Node's built-in test runner) for pure utility functions
npm run lint            # eslint
npm run format          # prettier --write
npm run prisma:studio   # visual DB browser
```

### Don't have Postgres locally?

Any of these work and have a free tier: [Neon](https://neon.tech), [Supabase](https://supabase.com), [Railway](https://railway.app), or Render's own managed Postgres. For Neon/Supabase, use the **pooled** connection string for `DATABASE_URL` and the **direct** connection string for `DIRECT_URL` (see `.env.example` for why the split exists).

## Environment variables

See `.env.example` for the full list with inline documentation. Nothing is hardcoded - the app fails fast at startup with a clear message if a required variable is missing or malformed (see `src/config/env.ts`).

## Database setup, migrations & seeding

```bash
npx prisma migrate dev --name init   # first migration
npx prisma generate                  # regenerate the client after any schema change
npm run prisma:seed                  # idempotent - safe to re-run, clears and re-seeds
```

`prisma/seed.ts` creates: 1 admin, 2 providers, 2 customers, 12 gear items across 6 categories, and 6 rental orders that together cover **every** status in the order state machine (`PLACED`, `CONFIRMED`, `PAID`, `PICKED_UP`, `RETURNED`, `CANCELLED`) with matching payments and a review - so the full lifecycle is inspectable immediately without manually walking every order through every state.

## Seed / admin credentials

All seeded accounts share one password for convenience during grading:

| Role | Email | Password |
|---|---|---|
| Admin | `admin@gearup.com` | `Password123` |
| Provider | `provider1@gearup.com` (Dhaka Adventure Gear) | `Password123` |
| Provider | `provider2@gearup.com` (Chittagong Outdoor Co) | `Password123` |
| Customer | `customer1@gearup.com` (Rafiq Ahmed) | `Password123` |
| Customer | `customer2@gearup.com` (Nusrat Jahan) | `Password123` |

## API documentation

- **Swagger UI**: `GET /api-docs` on your running server (e.g. `http://localhost:5000/api-docs`) - interactive, generated from `docs/openapi.yaml`.
- **Postman**: import `postman/GearUp.postman_collection.json`. Set the `baseUrl` collection variable (defaults to `http://localhost:5000/api`), then run any request under **Auth → Login (...)** first - the access/refresh tokens are captured into collection variables automatically via a test script, and every other request inherits them through collection-level bearer auth. Requests that create a resource (gear, orders, categories) likewise auto-capture the resulting id.

## Payments (SSLCommerz)

This uses SSLCommerz because Stripe does not onboard Bangladeshi merchants directly, and SSLCommerz's sandbox is genuinely free and fast to set up - no real business verification required:

1. Register at <https://developer.sslcommerz.com/registration/> (instant approval for a sandbox store).
2. Copy the `store_id` and `store_passwd` they give you into `.env`.
3. Set `APP_BASE_URL` to a **publicly reachable** URL, since SSLCommerz's gateway calls your `success_url`/`fail_url`/`cancel_url`/`ipn_url` directly:
   - In production (Render/Vercel), this is just your deployed URL.
   - Testing locally, expose your server with a tunnel (e.g. `ngrok http 5000`) and put that URL in `APP_BASE_URL` temporarily.

**Flow**: `POST /api/payments/create` (order must be `CONFIRMED`) returns a `paymentUrl` - open it in a real browser and pay with any SSLCommerz sandbox test card/mobile banking option shown on their gateway page. SSLCommerz then calls back to this API, which **independently re-verifies the transaction with SSLCommerz's own validation API** before marking anything paid (never trusts the callback payload alone) - see `payment.service.ts`. There's also `POST /api/payments/confirm` for manually re-checking a transaction's status by id, which is convenient when testing without a real browser redirect.

No fake/simulated payment path exists anywhere in this codebase - every payment, including in the seed data's records, represents what a real completed SSLCommerz transaction looks like.

## Deployment

### Render (recommended - simplest for a long-running Express server)

Manual setup:
1. New → Web Service → connect your repo.
2. Build command: `npm install && npm run build`. Start command: `npm start`.
3. Add all variables from `.env.example` in the Environment tab (set `APP_BASE_URL` to the Render URL Render gives you **after** the first deploy, then redeploy).
4. Health check path: `/health`.

Or use the included `render.yaml` Blueprint (New → Blueprint, point at this repo) for a one-pass setup with secrets prompted interactively.

After the first deploy, run migrations and seed against the production database once (from your local machine, pointed at the production `DIRECT_URL`, or via Render's shell):
```bash
npx prisma migrate deploy
npm run prisma:seed   # optional - only if you want the demo dataset in production too
```

### Vercel (serverless alternative)

`api/index.ts` re-exports the same Express app used by `server.ts`, and `vercel.json` rewrites every path to it - this is the standard pattern for running an Express app as a Vercel serverless function. Steps:
1. Import the repo in Vercel.
2. Add the same environment variables as above.
3. Make sure `DATABASE_URL` points at a **pooled** connection (Neon/Supabase's pooler endpoint) - serverless functions can spin up many concurrent instances, and `DATABASE_POOL_MAX` is deliberately kept low per-instance to avoid exhausting the database's total connection limit.
4. Deploy. Vercel builds `api/index.ts` independently of the `npm run build` script (its own zero-config Node/TypeScript builder handles that file directly).

Either way, remember to update `APP_BASE_URL` to the final deployed URL so SSLCommerz's callbacks reach the right place.

### Docker (alternative)

A multi-stage `Dockerfile` is included (Render also accepts Docker-based web services as an alternative to its native Node buildpack). Build and run locally with:

```bash
docker build -t gearup-backend .
docker run -p 5000:5000 --env-file .env gearup-backend
```

The image runs `npm run build` at build time and starts from the compiled `dist/server.js` - migrations still need to be run separately (`npx prisma migrate deploy`) against whatever `DIRECT_URL` the container's environment points at, since the image itself doesn't run migrations on start.

## Design decisions & known simplifications

A few deliberate calls worth flagging explicitly rather than leaving implicit:

- **One provider per order.** If a customer wants gear from two different providers, that's two separate orders. This keeps the single `status` state machine on `RentalOrder` coherent (one provider is unambiguously responsible for confirm/pickup/return) instead of needing per-line-item sub-statuses.
- **Inventory is a counter, not a date-calendar.** `quantityAvailable` is decremented when an order is placed and restored on cancellation/return. It does not check availability against specific date ranges - a full date-range availability calendar was out of scope for the assignment's timeline.
- **Inventory reservation is race-safe.** Decrementing `quantityAvailable` uses a conditional `updateMany` (`WHERE quantityAvailable >= requested`) inside a transaction, checking the affected row count - not a read-then-write, which would be vulnerable to two concurrent requests both reading "1 available" and both succeeding.
- **All monetary amounts are computed server-side**, never trusted from the client - `rental.service.ts` recomputes subtotal/deposit/total from the current `GearItem.pricePerDay` at order-creation time (with a per-line snapshot stored on `RentalOrderItem` so later price changes don't retroactively alter historical orders).
- **Soft deletes** for categories and gear items (`isActive` flag) instead of hard deletes, so existing order history always has something to reference.
- **Refresh token rotation**: each refresh token can be used exactly once; reuse of an already-rotated token is rejected. Changing your password revokes all other active sessions.
- **Currency is BDT throughout**, matching the target market and the payment gateway.

## Known dependency advisories

`npm audit` will show 3 moderate-severity findings from `@prisma/dev`'s optional dependency chain (used only by the `prisma dev` convenience command for spinning up a local Postgres in Docker, which this project's scripts never invoke). A previously-present high-severity `form-data` advisory pulled in transitively by `sslcommerz-lts` is already resolved via an `overrides` entry in `package.json` forcing a patched version.
