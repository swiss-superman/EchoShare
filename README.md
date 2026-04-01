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
- Supabase Postgres
- Prisma 6.19
- Supabase Storage
- NextAuth.js with Google OAuth
- Leaflet + OpenStreetMap + `leaflet.heat`
- Gemini 2.5 Flash + Gemini embeddings via `@google/genai`

## Tech Stack
<pre>
Fronted:
    1. Vite and React JS.
    2. Typescript.
    3. Tailwind CSS
Backend:
    1. Supabase
Database:
    1. PostgreSQL
User authentication:
    1. Google SSO
</pre>

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


## Environment

Create a local `.env` from `.env.example`.

Required:

- `DATABASE_URL`
- `DIRECT_URL`
- `AUTH_SECRET`
- `AUTH_GOOGLE_ID`
- `AUTH_GOOGLE_SECRET`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `GEMINI_API_KEY`
Optional:

- `SUPABASE_STORAGE_BUCKET`
- `GEMINI_REPORT_MODEL`
- `GEMINI_IMAGE_TRIAGE_MODEL`
- `GEMINI_REVIEW_MODEL`
- `GEMINI_EMBEDDING_MODEL`
- `NOMINATIM_BASE_URL`
- `OVERPASS_API_URL`
- `NOMINATIM_EMAIL`
- `N8N_REPORT_CREATED_WEBHOOK_URL`
- `N8N_HIGH_SEVERITY_WEBHOOK_URL`
- `N8N_WEEKLY_DIGEST_WEBHOOK_URL`
- `N8N_SHARED_SECRET`

### Supabase + Prisma connection mode

For Supabase-hosted Postgres, use transaction pooling for `DATABASE_URL` and the direct socket for `DIRECT_URL`.

```env
DATABASE_URL=postgresql://[DB_USER]:[PASSWORD]@db.[PROJECT_REF].supabase.co:6543/postgres?pgbouncer=true&connection_limit=5&connect_timeout=30&sslmode=require
DIRECT_URL=postgresql://[DB_USER]:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres?connect_timeout=30&sslmode=require
```

This is the runtime split that keeps Prisma stable in Vercel/serverless execution while preserving a direct connection for migrations.

### AI model plan

EchoShare does not need a custom-trained ML model for the hackathon build.

- `gemini-2.5-flash` is the default report-analysis model for multimodal report enrichment.
- `gemini-embedding-001` is used for duplicate-assist embeddings stored in `pgvector`.
- `gemini-2.5-pro` is reserved as the heavier review model for future moderator escalation flows.

All AI outputs remain clearly separated from raw user-submitted evidence.

### Evidence and location trust gates

EchoShare uses two validation layers before a report is accepted:

- Gemini image triage rejects obviously unrelated uploads such as selfies, weapons, memes, screenshots, and non-evidence scenes.
- Free OpenStreetMap services validate that the submitted pin is actually near a mapped water body and can reject clear water-body name mismatches.

This keeps obviously bad evidence out of the report pipeline without requiring a paid maps API.

## Google OAuth note

For local development, the app can fall back to a `client_secret_*.json` file in the project root when `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` are not set.

Do not commit local `.env` files or Google OAuth client secret JSON files to a public repository.

You still need the exact Auth.js callback URI registered in Google Cloud:

`http://localhost:8080/api/auth/callback/google`

The existing origin `http://localhost:8080` alone is not enough.

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
- Supabase storage-backed report uploads
- Typed Prisma queries
- Report CRUD flow
- Map rendering
- Community feed and cleanup events
- Stakeholder directory
- Dashboard metrics
- Gemini enrichment service
- n8n integration endpoints

Demo-scoped:

- Development seed data in `prisma/seed.ts`
- Seed organizations and water bodies clearly labeled as development seed data

## Docs

- Architecture: [docs/architecture.md](./docs/architecture.md)
- AI and automation: [docs/ai-automation.md](./docs/ai-automation.md)
- n8n integration: [docs/n8n-integration.md](./docs/n8n-integration.md)


-----------

# Project Checklist
- [x] Requirement Analysis.
- [x] Basic Workflow and Webpage design requirement analysis.
- [x] Mid hackathon presentation.
- [x] Login page configuration.
- [x] User authentication & email verification
- [x] Frontend responsive & accessible
- [x] Reporting & photo storage working
- [ ] Secrets management configured (env vars / vault)
- [ ] Static assets CDN configuration.
- [ ] Documentation

------------


