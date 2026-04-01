-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'MODERATOR', 'ADMIN');

-- CreateEnum
CREATE TYPE "WaterBodyType" AS ENUM ('LAKE', 'POND', 'BEACH', 'RIVER', 'CANAL', 'WETLAND', 'RESERVOIR', 'ESTUARY', 'OTHER');

-- CreateEnum
CREATE TYPE "PollutionCategory" AS ENUM ('PLASTIC', 'SOLID_WASTE', 'SEWAGE', 'CHEMICAL', 'OIL_OR_FUEL', 'CONSTRUCTION_DEBRIS', 'FOAM', 'DEAD_FISH', 'INVASIVE_WEEDS', 'MULTIPLE', 'OTHER');

-- CreateEnum
CREATE TYPE "SeverityLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('NEW', 'UNDER_REVIEW', 'VERIFIED', 'ACTION_PLANNED', 'CLEANUP_SCHEDULED', 'RESOLVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('GENERAL', 'CLEANUP_CALL', 'UPDATE', 'ALERT');

-- CreateEnum
CREATE TYPE "PostStatus" AS ENUM ('PUBLISHED', 'ARCHIVED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('NGO', 'GOVERNMENT', 'COMMUNITY_GROUP', 'ACADEMIC', 'CSR', 'VOLUNTEER_NETWORK');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "CleanupEventStatus" AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ParticipationStatus" AS ENUM ('GOING', 'CHECKED_IN', 'COMPLETED', 'NO_SHOW', 'CANCELLED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('REPORT_STATUS', 'REPORT_AI_READY', 'CLEANUP_REMINDER', 'CLEANUP_UPDATE', 'DIGEST', 'SYSTEM');

-- CreateEnum
CREATE TYPE "AiAnalysisStatus" AS ENUM ('PENDING', 'COMPLETED', 'FAILED', 'NEEDS_REVIEW');

-- CreateEnum
CREATE TYPE "ModerationTargetType" AS ENUM ('REPORT', 'POST', 'COMMENT', 'CLEANUP_EVENT', 'ORGANIZATION');

-- CreateEnum
CREATE TYPE "ModerationStatus" AS ENUM ('OPEN', 'REVIEWED', 'DISMISSED', 'ACTIONED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "handle" TEXT NOT NULL,
    "displayName" TEXT,
    "bio" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "preferredRadiusKm" INTEGER NOT NULL DEFAULT 10,
    "onboardingComplete" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "label" TEXT,
    "address" TEXT,
    "locality" TEXT,
    "district" TEXT,
    "state" TEXT,
    "country" TEXT,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterBody" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "WaterBodyType" NOT NULL,
    "description" TEXT,
    "watershed" TEXT,
    "city" TEXT,
    "state" TEXT,
    "country" TEXT,
    "locationId" TEXT,
    "isDevelopmentSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WaterBody_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Report" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "waterBodyId" TEXT,
    "locationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "waterBodyName" TEXT NOT NULL,
    "category" "PollutionCategory" NOT NULL,
    "userSeverity" "SeverityLevel" NOT NULL,
    "status" "ReportStatus" NOT NULL DEFAULT 'NEW',
    "observedAt" TIMESTAMP(3) NOT NULL,
    "aiRequestedAt" TIMESTAMP(3),
    "aiCompletedAt" TIMESTAMP(3),
    "isDevelopmentSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Report_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportImage" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "publicUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "caption" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportAIAnalysis" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "status" "AiAnalysisStatus" NOT NULL DEFAULT 'PENDING',
    "modelName" TEXT NOT NULL,
    "summary" TEXT,
    "classification" "PollutionCategory",
    "severityEstimate" "SeverityLevel",
    "wasteTypes" JSONB,
    "possibleDuplicateIds" JSONB,
    "duplicateReasoning" TEXT,
    "actionRecommendation" TEXT,
    "explanation" JSONB,
    "moderationSuggestion" JSONB,
    "rawResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportAIAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Post" (
    "id" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "waterBodyId" TEXT,
    "locationId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "type" "PostType" NOT NULL,
    "status" "PostStatus" NOT NULL DEFAULT 'PUBLISHED',
    "scheduledFor" TIMESTAMP(3),
    "isDevelopmentSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Post_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comment" (
    "id" TEXT NOT NULL,
    "postId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Comment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "description" TEXT,
    "areaServed" TEXT NOT NULL,
    "verification" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "contactName" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "website" TEXT,
    "locationId" TEXT,
    "waterBodyId" TEXT,
    "tags" JSONB,
    "isDevelopmentSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CleanupEvent" (
    "id" TEXT NOT NULL,
    "organizerId" TEXT NOT NULL,
    "waterBodyId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3),
    "maxParticipants" INTEGER,
    "status" "CleanupEventStatus" NOT NULL DEFAULT 'PLANNED',
    "postId" TEXT,
    "isDevelopmentSeed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CleanupEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Participant" (
    "id" TEXT NOT NULL,
    "cleanupEventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "ParticipationStatus" NOT NULL DEFAULT 'GOING',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "linkUrl" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StatusHistory" (
    "id" TEXT NOT NULL,
    "reportId" TEXT,
    "cleanupEventId" TEXT,
    "fromStatus" TEXT,
    "toStatus" TEXT NOT NULL,
    "note" TEXT,
    "changedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StatusHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModerationRecord" (
    "id" TEXT NOT NULL,
    "targetType" "ModerationTargetType" NOT NULL,
    "status" "ModerationStatus" NOT NULL DEFAULT 'OPEN',
    "reason" TEXT NOT NULL,
    "detail" TEXT,
    "reportId" TEXT,
    "postId" TEXT,
    "commentId" TEXT,
    "cleanupEventId" TEXT,
    "organizationId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ModerationRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "oauth_token_secret" TEXT,
    "oauth_token" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_userId_key" ON "Profile"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Profile_handle_key" ON "Profile"("handle");

-- CreateIndex
CREATE INDEX "Location_latitude_longitude_idx" ON "Location"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Location_state_locality_idx" ON "Location"("state", "locality");

-- CreateIndex
CREATE UNIQUE INDEX "WaterBody_slug_key" ON "WaterBody"("slug");

-- CreateIndex
CREATE INDEX "WaterBody_type_state_idx" ON "WaterBody"("type", "state");

-- CreateIndex
CREATE INDEX "WaterBody_city_state_idx" ON "WaterBody"("city", "state");

-- CreateIndex
CREATE INDEX "Report_category_userSeverity_status_idx" ON "Report"("category", "userSeverity", "status");

-- CreateIndex
CREATE INDEX "Report_waterBodyId_observedAt_idx" ON "Report"("waterBodyId", "observedAt");

-- CreateIndex
CREATE INDEX "Report_locationId_observedAt_idx" ON "Report"("locationId", "observedAt");

-- CreateIndex
CREATE INDEX "Report_createdAt_idx" ON "Report"("createdAt");

-- CreateIndex
CREATE INDEX "ReportImage_reportId_idx" ON "ReportImage"("reportId");

-- CreateIndex
CREATE INDEX "ReportAIAnalysis_reportId_createdAt_idx" ON "ReportAIAnalysis"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "ReportAIAnalysis_status_createdAt_idx" ON "ReportAIAnalysis"("status", "createdAt");

-- CreateIndex
CREATE INDEX "Post_type_createdAt_idx" ON "Post"("type", "createdAt");

-- CreateIndex
CREATE INDEX "Post_waterBodyId_createdAt_idx" ON "Post"("waterBodyId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");

-- CreateIndex
CREATE INDEX "Comment_authorId_createdAt_idx" ON "Comment"("authorId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- CreateIndex
CREATE INDEX "Organization_type_verification_idx" ON "Organization"("type", "verification");

-- CreateIndex
CREATE INDEX "Organization_areaServed_idx" ON "Organization"("areaServed");

-- CreateIndex
CREATE UNIQUE INDEX "CleanupEvent_postId_key" ON "CleanupEvent"("postId");

-- CreateIndex
CREATE INDEX "CleanupEvent_waterBodyId_scheduledAt_idx" ON "CleanupEvent"("waterBodyId", "scheduledAt");

-- CreateIndex
CREATE INDEX "CleanupEvent_status_scheduledAt_idx" ON "CleanupEvent"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "Participant_userId_status_idx" ON "Participant"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Participant_cleanupEventId_userId_key" ON "Participant"("cleanupEventId", "userId");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "StatusHistory_reportId_createdAt_idx" ON "StatusHistory"("reportId", "createdAt");

-- CreateIndex
CREATE INDEX "StatusHistory_cleanupEventId_createdAt_idx" ON "StatusHistory"("cleanupEventId", "createdAt");

-- CreateIndex
CREATE INDEX "ModerationRecord_targetType_status_createdAt_idx" ON "ModerationRecord"("targetType", "status", "createdAt");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- AddForeignKey
ALTER TABLE "Profile" ADD CONSTRAINT "Profile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterBody" ADD CONSTRAINT "WaterBody_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_waterBodyId_fkey" FOREIGN KEY ("waterBodyId") REFERENCES "WaterBody"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Report" ADD CONSTRAINT "Report_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportImage" ADD CONSTRAINT "ReportImage_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportAIAnalysis" ADD CONSTRAINT "ReportAIAnalysis_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_waterBodyId_fkey" FOREIGN KEY ("waterBodyId") REFERENCES "WaterBody"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_waterBodyId_fkey" FOREIGN KEY ("waterBodyId") REFERENCES "WaterBody"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanupEvent" ADD CONSTRAINT "CleanupEvent_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanupEvent" ADD CONSTRAINT "CleanupEvent_waterBodyId_fkey" FOREIGN KEY ("waterBodyId") REFERENCES "WaterBody"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanupEvent" ADD CONSTRAINT "CleanupEvent_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CleanupEvent" ADD CONSTRAINT "CleanupEvent_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_cleanupEventId_fkey" FOREIGN KEY ("cleanupEventId") REFERENCES "CleanupEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Participant" ADD CONSTRAINT "Participant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_cleanupEventId_fkey" FOREIGN KEY ("cleanupEventId") REFERENCES "CleanupEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StatusHistory" ADD CONSTRAINT "StatusHistory_changedById_fkey" FOREIGN KEY ("changedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationRecord" ADD CONSTRAINT "ModerationRecord_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "Report"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationRecord" ADD CONSTRAINT "ModerationRecord_postId_fkey" FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationRecord" ADD CONSTRAINT "ModerationRecord_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "Comment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationRecord" ADD CONSTRAINT "ModerationRecord_cleanupEventId_fkey" FOREIGN KEY ("cleanupEventId") REFERENCES "CleanupEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationRecord" ADD CONSTRAINT "ModerationRecord_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModerationRecord" ADD CONSTRAINT "ModerationRecord_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
