# EchoShare

EchoShare is a community-driven sustainability web app for reporting pollution near water bodies and turning those reports into visible local action.

This repository started from the hackathon concept of tackling pollution, biodiversity loss, and resource overuse in marine and freshwater ecosystems. The current codebase implements that idea as a full-stack Next.js MVP with Google auth, PostgreSQL, map-based reporting, community coordination, stakeholder discovery, AI-assisted enrichment, and n8n integration points.

## Problem framing

People regularly see litter, discharge, and waste buildup near lakes, rivers, canals, ponds, beaches, and wetlands, but the reporting path is fragmented and local coordination is weak.

EchoShare is designed to help communities:

- post geo-tagged pollution evidence
- visualize hotspots on a free interactive map
- coordinate cleanup activity
- discover NGOs and public stakeholders
- keep AI outputs separate from raw user evidence

## What the app includes

- Geo-tagged pollution reporting with photo uploads
- Free interactive map with markers and hotspot rendering
- Google login for contributors
- Community posts and cleanup coordination
- Stakeholder directory
- Gemini-powered AI enrichment stored separately from user evidence
- n8n integration points for alerts and digests without moving core product logic into automation

## Stack

- Next.js 16 App Router
- React 19
- Tailwind CSS 4
- PostgreSQL
- Prisma 6.19
- NextAuth.js with Google OAuth
- Leaflet + OpenStreetMap + `leaflet.heat`
- Gemini 2.5 Flash via `@google/genai`

## Environment

Create a local `.env` from `.env.example`.

Required:

- `DATABASE_URL`
- `AUTH_SECRET`
- `GEMINI_API_KEY`

Optional:

- `N8N_HIGH_SEVERITY_WEBHOOK_URL`
- `N8N_WEEKLY_DIGEST_WEBHOOK_URL`
- `N8N_SHARED_SECRET`

## Google OAuth note

For local development, the app can fall back to a `client_secret_*.json` file in the project root when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are not set.

Do not commit local `.env` files or Google OAuth client secret JSON files to a public repository.

You still need the exact Auth.js callback URI registered in Google Cloud:

`http://localhost:8080/api/auth/callback/google`

The existing origin `http://localhost:8080` alone is not enough.

## Local setup

```bash
npm install
npm run prisma:generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

The app runs on:

`http://localhost:8080`

## Verification commands

```bash
npm run typecheck
npm run lint
npm run build
```

## Data model highlights

- `Report` stores citizen-submitted evidence metadata
- `ReportImage` stores uploaded image references
- `ReportAIAnalysis` stores AI-assisted summary, classification, duplicate hints, and recommendations
- `CleanupEvent` and `Participant` manage turnout
- `Organization` keeps a verification-ready stakeholder directory
- `StatusHistory` and `ModerationRecord` support future admin workflows

## Real vs demo

Real:

- Auth flow
- Route structure and protected pages
- PostgreSQL schema
- Typed Prisma queries
- Report CRUD flow
- Map rendering
- Community feed and cleanup events
- Stakeholder directory
- Dashboard metrics
- Gemini enrichment service
- n8n integration endpoints

Demo-scoped:

- Local filesystem image storage under `public/uploads/reports`
- Development seed data in `prisma/seed.ts`
- Seed organizations and water bodies clearly labeled as development seed data

## Docs

- Architecture: [docs/architecture.md](./docs/architecture.md)
- n8n integration: [docs/n8n-integration.md](./docs/n8n-integration.md)
