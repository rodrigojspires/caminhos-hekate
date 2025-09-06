-- Add calendar-related fields to User table
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarNotificationSettings" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "calendarPrivacySettings" TEXT;

-- Create CalendarProvider enum
CREATE TYPE "CalendarProvider" AS ENUM ('GOOGLE', 'OUTLOOK', 'APPLE');

-- Create SyncStatus enum
CREATE TYPE "SyncStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'SUCCESS', 'ERROR');

-- Create CalendarIntegration table
CREATE TABLE IF NOT EXISTS "CalendarIntegration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "calendarId" TEXT NOT NULL,
    "calendarName" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncDirection" TEXT NOT NULL DEFAULT 'bidirectional',
    "syncFrequency" TEXT NOT NULL DEFAULT 'hourly',
    "conflictResolution" TEXT NOT NULL DEFAULT 'manual',
    "categoriesToSync" TEXT[],
    "syncStatus" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "lastSyncAt" TIMESTAMP(3),
    "syncError" TEXT,
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarIntegration_pkey" PRIMARY KEY ("id")
);

-- Create CalendarSyncEvent table for tracking sync history
CREATE TABLE IF NOT EXISTS "CalendarSyncEvent" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "direction" TEXT NOT NULL,
    "eventId" TEXT,
    "externalEventId" TEXT,
    "status" "SyncStatus" NOT NULL,
    "error" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarSyncEvent_pkey" PRIMARY KEY ("id")
);

-- Create CalendarConflict table for managing sync conflicts
CREATE TABLE IF NOT EXISTS "CalendarConflict" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "eventId" TEXT,
    "externalEventId" TEXT,
    "conflictType" TEXT NOT NULL,
    "localData" JSONB NOT NULL,
    "remoteData" JSONB NOT NULL,
    "resolution" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CalendarConflict_pkey" PRIMARY KEY ("id")
);

-- Add foreign key constraints
ALTER TABLE "CalendarIntegration" ADD CONSTRAINT "CalendarIntegration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CalendarSyncEvent" ADD CONSTRAINT "CalendarSyncEvent_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "CalendarIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CalendarConflict" ADD CONSTRAINT "CalendarConflict_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "CalendarIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CalendarConflict" ADD CONSTRAINT "CalendarConflict_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "CalendarIntegration_userId_idx" ON "CalendarIntegration"("userId");
CREATE INDEX IF NOT EXISTS "CalendarIntegration_provider_idx" ON "CalendarIntegration"("provider");
CREATE INDEX IF NOT EXISTS "CalendarIntegration_syncStatus_idx" ON "CalendarIntegration"("syncStatus");
CREATE INDEX IF NOT EXISTS "CalendarIntegration_lastSyncAt_idx" ON "CalendarIntegration"("lastSyncAt");
CREATE INDEX IF NOT EXISTS "CalendarIntegration_isActive_syncEnabled_idx" ON "CalendarIntegration"("isActive", "syncEnabled");

CREATE INDEX IF NOT EXISTS "CalendarSyncEvent_integrationId_idx" ON "CalendarSyncEvent"("integrationId");
CREATE INDEX IF NOT EXISTS "CalendarSyncEvent_createdAt_idx" ON "CalendarSyncEvent"("createdAt");
CREATE INDEX IF NOT EXISTS "CalendarSyncEvent_status_idx" ON "CalendarSyncEvent"("status");
CREATE INDEX IF NOT EXISTS "CalendarSyncEvent_eventType_idx" ON "CalendarSyncEvent"("eventType");

CREATE INDEX IF NOT EXISTS "CalendarConflict_integrationId_idx" ON "CalendarConflict"("integrationId");
CREATE INDEX IF NOT EXISTS "CalendarConflict_createdAt_idx" ON "CalendarConflict"("createdAt");
CREATE INDEX IF NOT EXISTS "CalendarConflict_resolution_idx" ON "CalendarConflict"("resolution");

-- Create unique constraints
CREATE UNIQUE INDEX IF NOT EXISTS "CalendarIntegration_userId_provider_calendarId_key" ON "CalendarIntegration"("userId", "provider", "calendarId");