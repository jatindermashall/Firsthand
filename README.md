# Firsthand

Recommendations only from people who've actually been there. Every review is tied to a verified visit; recommenders earn a share of the business's commission when their review leads to a completed booking; profiles are ranked by a Trust Score built from whether visitors say the advice matched reality.

Live (pilot preview): https://firsthand.decyb.com

## What's in this repo

| Path | What |
|---|---|
| `apps/api` | Fastify 5 + TypeScript API, MySQL 8.4 via Drizzle ORM. Migrations in `apps/api/drizzle`, run automatically on start. |
| `apps/web` | Next.js 16 (App Router) + Tailwind CSS 4 website. Talks to the API through a same-origin `/api/*` proxy. |
| `deploy/compose.vps.yaml` | Production stack for the Hostinger VPS, built from `main`. |
| `deploy/firsthand.caddy` | Site block for the shared Caddy proxy on the VPS. |
| `docker-compose.yml` | Run the whole stack from a checkout. |
| `docs/` | Scope of this build, deployment runbook. |

## Run locally

```bash
docker compose up --build          # http://localhost:3000, admin key: change-me-local-admin-key
```
or without Docker (needs MySQL/MariaDB with a `firsthand` database):
```bash
pnpm install
DATABASE_URL=mysql://firsthand:firsthand@127.0.0.1:3306/firsthand ADMIN_ACCESS_KEY=dev-admin-key-123456 pnpm dev:api
API_INTERNAL_URL=http://127.0.0.1:4000 pnpm dev:web
```
Sample data (businesses, people, bookings, ratings) loads into an empty database. Without `SMTP_URL`, sign-in codes are shown on screen (pilot preview).

Sample accounts: `simran@demo.firsthand.local` (Top Guide recommender), `neha@demo.firsthand.local` (Saffron Lane Salon owner), `visitor1@demo.firsthand.local`.

## Deploying

All changes go through GitHub: merge to `main`, then redeploy the `firsthand` project in Hostinger Docker Manager (it rebuilds from `main`). Never edit code on the server. See `docs/DEPLOY.md`.

## Key rules built into the code

- Recommender share is a percentage of platform commission, never of the booking price (`RECOMMENDER_SHARE_BPS`, default 35%).
- Money is integer paise. Commissions only move forward (estimated → pending settlement → payable → paid, or reversed) and every move is written to `ledger_entries`.
- Self-referrals and receipt-only posts never earn. Bookings must be confirmed by the business with the visitor's 6-digit code, on the day.
- Trust Score uses accuracy after visits, helpful votes, proof level and responsiveness — never review sentiment, followers or commission. Weights and tier thresholds: `apps/api/src/lib/trust.ts`.
- Search ranking never uses commission. A share of visibility is protected for new profiles.
- Admin access needs `ADMIN_ACCESS_KEY` (per session, 12 hours, logged) — never a sign-in code.
