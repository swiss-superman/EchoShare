# EchoShare Architecture

## Product shape

EchoShare is a coded web application first and an automation-enhanced system second.

- Main app: Next.js App Router on Node with React 19 and Tailwind CSS 4
- Auth: Google OAuth via `next-auth` and Prisma adapter
- Source of truth: PostgreSQL through Prisma ORM
- Maps: Leaflet + OpenStreetMap tiles + `leaflet.heat`
- AI: Gemini 2.5 Flash + Gemini embeddings via `@google/genai`
- Automation: n8n only for background alerts, digests, and optional queued enrichment

## Architecture decisions

1. Next.js App Router
   Server components handle data loading and page framing. Client components are used only where interactivity is required: maps, location picking, file previews, and auth CTA buttons.

2. PostgreSQL with Prisma
   Prisma gives typed data access and migration support while staying fast enough for a 24-hour MVP. Prisma 6.19.x was chosen over Prisma 7 to avoid the new adapter/config migration overhead during hackathon execution.

3. Raw citizen evidence separated from AI output
   `Report` and `ReportImage` store user truth.
   `ReportAIAnalysis` stores AI-assisted interpretation, duplicate hints, and action recommendations.

4. Duplicate assistance uses pgvector, not prompt guessing alone
   Report text embeddings are stored in PostgreSQL with `pgvector`, then filtered by geo/time before Gemini performs the final duplicate reasoning step.

5. Maps stay fully free
   The map stack uses OpenStreetMap raster tiles and Leaflet in the browser. Heatmap rendering is calculated client-side from persisted report coordinates and severity.

6. n8n stays at the edge
   The app works without n8n.
   n8n only augments the platform through outbound webhooks, retries, digests, and secure internal routes.

## Folder structure

```text
src/
  app/
    api/
      auth/[...nextauth]/route.ts
      internal/
        ai/reports/[id]/route.ts
        n8n/high-severity/route.ts
        n8n/weekly-digest/route.ts
    auth/signin/page.tsx
    community/page.tsx
    dashboard/page.tsx
    directory/page.tsx
    map/page.tsx
    reports/
      page.tsx
      new/page.tsx
      [id]/page.tsx
  components/
    layout/
    maps/
    reports/
    ui/
  lib/
    ai/
    automation/
    data/
    auth.ts
    env.ts
    prisma.ts
    session.ts
    upload.ts
    validators.ts
prisma/
  schema.prisma
  seed.ts
docs/
  architecture.md
  n8n-integration.md
```

## Data model summary

- `User`, `Account`, `Session`, `Profile`
- `Location`
- `WaterBody`
- `Report`
- `ReportImage`
- `ReportAIAnalysis`
- `Post`
- `Comment`
- `Organization`
- `CleanupEvent`
- `Participant`
- `Notification`
- `StatusHistory`
- `ModerationRecord`

## Real vs demo

Real implementation:

- Google web auth flow
- PostgreSQL schema and typed ORM
- Report creation, list, detail, and map pages
- Community feed, cleanup event creation, directory, dashboard
- Gemini enrichment service and stored AI metadata
- n8n-ready webhook + secure internal API integration points

Demo-scoped choices:

- Local filesystem image storage under `public/uploads/reports`
- Development seed data in `prisma/seed.ts`
- Seed organizations and water bodies clearly labeled as development seed data
