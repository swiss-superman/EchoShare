DO $$
BEGIN
    CREATE TYPE "IntelligenceSourceType" AS ENUM ('OFFICIAL_SITE', 'NEWS_QUERY', 'SOCIAL_QUERY');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "IntelligenceSignalType" AS ENUM ('OFFICIAL_UPDATE', 'NEWS_MENTION', 'SOCIAL_MENTION');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    CREATE TYPE "IntelligenceSignalStatus" AS ENUM ('ACTIVE', 'REVIEWED', 'ARCHIVED');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "IntelligenceSource" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "IntelligenceSourceType" NOT NULL,
    "description" TEXT,
    "sourceUrl" TEXT,
    "query" TEXT,
    "focusLabel" TEXT,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntelligenceSource_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "IntelligenceSignal" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "signalType" "IntelligenceSignalType" NOT NULL,
    "status" "IntelligenceSignalStatus" NOT NULL DEFAULT 'ACTIVE',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "publisher" TEXT NOT NULL,
    "sourceDomain" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "discoveredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "locationHint" TEXT,
    "waterBodyHint" TEXT,
    "imageUrl" TEXT,
    "priorityScore" INTEGER NOT NULL DEFAULT 0,
    "tags" JSONB,
    "rawPayload" JSONB,
    "contentMarkdown" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntelligenceSignal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "IntelligenceSource_slug_key" ON "IntelligenceSource"("slug");
CREATE UNIQUE INDEX IF NOT EXISTS "IntelligenceSignal_sourceUrl_key" ON "IntelligenceSignal"("sourceUrl");
CREATE INDEX IF NOT EXISTS "IntelligenceSource_type_isEnabled_idx" ON "IntelligenceSource"("type", "isEnabled");
CREATE INDEX IF NOT EXISTS "IntelligenceSignal_signalType_publishedAt_idx" ON "IntelligenceSignal"("signalType", "publishedAt");
CREATE INDEX IF NOT EXISTS "IntelligenceSignal_priorityScore_publishedAt_idx" ON "IntelligenceSignal"("priorityScore", "publishedAt");
CREATE INDEX IF NOT EXISTS "IntelligenceSignal_status_discoveredAt_idx" ON "IntelligenceSignal"("status", "discoveredAt");
CREATE INDEX IF NOT EXISTS "IntelligenceSignal_publisher_idx" ON "IntelligenceSignal"("publisher");

DO $$
BEGIN
    ALTER TABLE "IntelligenceSignal"
        ADD CONSTRAINT "IntelligenceSignal_sourceId_fkey"
        FOREIGN KEY ("sourceId")
        REFERENCES "IntelligenceSource"("id")
        ON DELETE CASCADE
        ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;
