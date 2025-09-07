-- CreateEnum
CREATE TYPE "DownloadSource" AS ENUM ('ORDER', 'SUBSCRIPTION', 'MANUAL');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "BadgeRarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC');

-- CreateEnum
CREATE TYPE "RewardType" AS ENUM ('EXTRA_POINTS', 'PREMIUM_DAYS', 'SPECIAL_BADGE', 'COURSE_ACCESS', 'DISCOUNT_COUPON', 'EXCLUSIVE_CONTENT');

-- CreateEnum
CREATE TYPE "SyncDirection" AS ENUM ('IMPORT', 'EXPORT', 'BIDIRECTIONAL');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'SPECIAL_EVENT';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_REMINDER';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CREATED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'EVENT_CONFLICT';
ALTER TYPE "NotificationType" ADD VALUE 'SERIES_COMPLETED';

-- AlterEnum
ALTER TYPE "SubscriptionStatus" ADD VALUE 'PAUSED';

-- AlterTable
ALTER TABLE "Download" ADD COLUMN     "source" "DownloadSource" NOT NULL DEFAULT 'ORDER',
ADD COLUMN     "sourceRefId" TEXT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "calendarNotificationSettings" TEXT,
ADD COLUMN     "calendarPrivacySettings" TEXT;

-- AlterTable
ALTER TABLE "event_registrations" ADD COLUMN     "registeredAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "event_reminders" ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "reminderDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "retryCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "payment_transactions" ADD COLUMN     "externalId" TEXT,
ADD COLUMN     "userId" TEXT;

-- CreateTable
CREATE TABLE "gamification_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isPush" BOOLEAN NOT NULL DEFAULT false,
    "pushSentAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "rarity" "BadgeRarity" NOT NULL DEFAULT 'COMMON',
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "criteria" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "achievement_rewards" (
    "id" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievement_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_rewards" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "rewardId" TEXT NOT NULL,
    "achievementId" TEXT,
    "claimed" BOOLEAN NOT NULL DEFAULT false,
    "claimedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_rewards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "pushTitle" TEXT,
    "pushBody" TEXT,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_integrations" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "CalendarProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "accessToken" TEXT NOT NULL,
    "refreshToken" TEXT,
    "tokenExpiresAt" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "syncEnabled" BOOLEAN NOT NULL DEFAULT true,
    "syncStatus" "SyncStatus" DEFAULT 'PENDING',
    "syncFrequency" TEXT,
    "syncError" TEXT,
    "calendarName" TEXT,
    "lastSyncAt" TIMESTAMP(3),
    "settings" JSONB,
    "externalAccountId" TEXT,
    "externalAccountEmail" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_integrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_sync_events" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "eventId" TEXT,
    "externalId" TEXT NOT NULL,
    "operation" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'PENDING',
    "direction" TEXT NOT NULL,
    "data" JSONB,
    "error" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "scheduledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_sync_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_conflicts" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "eventId" TEXT,
    "externalId" TEXT NOT NULL,
    "conflictType" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "localData" JSONB,
    "externalData" JSONB,
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_conflicts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_sync_notifications" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_sync_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_privacy_settings" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "syncPrivateEvents" BOOLEAN NOT NULL DEFAULT false,
    "syncAllDayEvents" BOOLEAN NOT NULL DEFAULT true,
    "syncRecurringEvents" BOOLEAN NOT NULL DEFAULT true,
    "syncEventTitle" BOOLEAN NOT NULL DEFAULT true,
    "syncEventDescription" BOOLEAN NOT NULL DEFAULT true,
    "syncEventLocation" BOOLEAN NOT NULL DEFAULT true,
    "syncEventAttendees" BOOLEAN NOT NULL DEFAULT false,
    "syncEventAttachments" BOOLEAN NOT NULL DEFAULT false,
    "anonymizeTitle" BOOLEAN NOT NULL DEFAULT false,
    "anonymizeDescription" BOOLEAN NOT NULL DEFAULT false,
    "anonymizeLocation" BOOLEAN NOT NULL DEFAULT false,
    "anonymizeAttendees" BOOLEAN NOT NULL DEFAULT false,
    "timeFilterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "timeFilterStart" TEXT,
    "timeFilterEnd" TEXT,
    "keywordFilterEnabled" BOOLEAN NOT NULL DEFAULT false,
    "includeKeywords" JSONB,
    "excludeKeywords" JSONB,
    "customRules" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_privacy_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "calendar_field_mappings" (
    "id" TEXT NOT NULL,
    "integrationId" TEXT NOT NULL,
    "mappings" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "calendar_field_mappings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "eventId" TEXT,
    "seriesId" TEXT,
    "instanceId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "ReminderType" NOT NULL DEFAULT 'EMAIL',
    "status" "ReminderStatus" NOT NULL DEFAULT 'PENDING',
    "triggerAt" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "failureReason" TEXT,
    "dueDate" TIMESTAMP(3),
    "isCompleted" BOOLEAN NOT NULL DEFAULT false,
    "priority" TEXT DEFAULT 'medium',
    "category" TEXT,
    "tags" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reminders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gamification_notifications_userId_idx" ON "gamification_notifications"("userId");

-- CreateIndex
CREATE INDEX "gamification_notifications_type_idx" ON "gamification_notifications"("type");

-- CreateIndex
CREATE INDEX "gamification_notifications_isRead_idx" ON "gamification_notifications"("isRead");

-- CreateIndex
CREATE INDEX "gamification_notifications_isPush_idx" ON "gamification_notifications"("isPush");

-- CreateIndex
CREATE INDEX "gamification_notifications_priority_idx" ON "gamification_notifications"("priority");

-- CreateIndex
CREATE INDEX "gamification_notifications_createdAt_idx" ON "gamification_notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "badges_name_key" ON "badges"("name");

-- CreateIndex
CREATE INDEX "badges_rarity_idx" ON "badges"("rarity");

-- CreateIndex
CREATE INDEX "badges_category_idx" ON "badges"("category");

-- CreateIndex
CREATE INDEX "badges_isActive_idx" ON "badges"("isActive");

-- CreateIndex
CREATE INDEX "user_badges_userId_idx" ON "user_badges"("userId");

-- CreateIndex
CREATE INDEX "user_badges_badgeId_idx" ON "user_badges"("badgeId");

-- CreateIndex
CREATE INDEX "user_badges_earnedAt_idx" ON "user_badges"("earnedAt");

-- CreateIndex
CREATE UNIQUE INDEX "user_badges_userId_badgeId_key" ON "user_badges"("userId", "badgeId");

-- CreateIndex
CREATE INDEX "achievement_rewards_achievementId_idx" ON "achievement_rewards"("achievementId");

-- CreateIndex
CREATE INDEX "achievement_rewards_rewardType_idx" ON "achievement_rewards"("rewardType");

-- CreateIndex
CREATE INDEX "achievement_rewards_isActive_idx" ON "achievement_rewards"("isActive");

-- CreateIndex
CREATE INDEX "user_rewards_userId_claimed_idx" ON "user_rewards"("userId", "claimed");

-- CreateIndex
CREATE INDEX "user_rewards_rewardId_idx" ON "user_rewards"("rewardId");

-- CreateIndex
CREATE INDEX "user_rewards_achievementId_idx" ON "user_rewards"("achievementId");

-- CreateIndex
CREATE INDEX "notification_templates_isActive_idx" ON "notification_templates"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "notification_templates_type_key" ON "notification_templates"("type");

-- CreateIndex
CREATE INDEX "calendar_integrations_userId_idx" ON "calendar_integrations"("userId");

-- CreateIndex
CREATE INDEX "calendar_integrations_provider_idx" ON "calendar_integrations"("provider");

-- CreateIndex
CREATE INDEX "calendar_integrations_isActive_idx" ON "calendar_integrations"("isActive");

-- CreateIndex
CREATE INDEX "calendar_integrations_lastSyncAt_idx" ON "calendar_integrations"("lastSyncAt");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_integrations_userId_provider_providerAccountId_key" ON "calendar_integrations"("userId", "provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "calendar_sync_events_integrationId_idx" ON "calendar_sync_events"("integrationId");

-- CreateIndex
CREATE INDEX "calendar_sync_events_eventId_idx" ON "calendar_sync_events"("eventId");

-- CreateIndex
CREATE INDEX "calendar_sync_events_externalId_idx" ON "calendar_sync_events"("externalId");

-- CreateIndex
CREATE INDEX "calendar_sync_events_status_idx" ON "calendar_sync_events"("status");

-- CreateIndex
CREATE INDEX "calendar_sync_events_scheduledAt_idx" ON "calendar_sync_events"("scheduledAt");

-- CreateIndex
CREATE INDEX "calendar_sync_events_startedAt_idx" ON "calendar_sync_events"("startedAt");

-- CreateIndex
CREATE INDEX "calendar_conflicts_integrationId_idx" ON "calendar_conflicts"("integrationId");

-- CreateIndex
CREATE INDEX "calendar_conflicts_eventId_idx" ON "calendar_conflicts"("eventId");

-- CreateIndex
CREATE INDEX "calendar_conflicts_conflictType_idx" ON "calendar_conflicts"("conflictType");

-- CreateIndex
CREATE INDEX "calendar_conflicts_resolvedAt_idx" ON "calendar_conflicts"("resolvedAt");

-- CreateIndex
CREATE INDEX "calendar_sync_notifications_integrationId_idx" ON "calendar_sync_notifications"("integrationId");

-- CreateIndex
CREATE INDEX "calendar_sync_notifications_type_idx" ON "calendar_sync_notifications"("type");

-- CreateIndex
CREATE INDEX "calendar_sync_notifications_isRead_idx" ON "calendar_sync_notifications"("isRead");

-- CreateIndex
CREATE INDEX "calendar_sync_notifications_createdAt_idx" ON "calendar_sync_notifications"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_privacy_settings_integrationId_key" ON "calendar_privacy_settings"("integrationId");

-- CreateIndex
CREATE INDEX "calendar_privacy_settings_integrationId_idx" ON "calendar_privacy_settings"("integrationId");

-- CreateIndex
CREATE UNIQUE INDEX "calendar_field_mappings_integrationId_key" ON "calendar_field_mappings"("integrationId");

-- CreateIndex
CREATE INDEX "calendar_field_mappings_integrationId_idx" ON "calendar_field_mappings"("integrationId");

-- CreateIndex
CREATE INDEX "reminders_userId_idx" ON "reminders"("userId");

-- CreateIndex
CREATE INDEX "reminders_eventId_idx" ON "reminders"("eventId");

-- CreateIndex
CREATE INDEX "reminders_status_idx" ON "reminders"("status");

-- CreateIndex
CREATE INDEX "reminders_triggerAt_idx" ON "reminders"("triggerAt");

-- CreateIndex
CREATE INDEX "reminders_dueDate_idx" ON "reminders"("dueDate");

-- CreateIndex
CREATE INDEX "reminders_isCompleted_idx" ON "reminders"("isCompleted");

-- CreateIndex
CREATE INDEX "event_reminders_reminderDate_idx" ON "event_reminders"("reminderDate");

-- AddForeignKey
ALTER TABLE "payment_transactions" ADD CONSTRAINT "payment_transactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_notifications" ADD CONSTRAINT "gamification_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "achievement_rewards" ADD CONSTRAINT "achievement_rewards_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_rewardId_fkey" FOREIGN KEY ("rewardId") REFERENCES "achievement_rewards"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_rewards" ADD CONSTRAINT "user_rewards_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_integrations" ADD CONSTRAINT "calendar_integrations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_sync_events" ADD CONSTRAINT "calendar_sync_events_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "calendar_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_sync_events" ADD CONSTRAINT "calendar_sync_events_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_conflicts" ADD CONSTRAINT "calendar_conflicts_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "calendar_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_conflicts" ADD CONSTRAINT "calendar_conflicts_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_conflicts" ADD CONSTRAINT "calendar_conflicts_resolvedBy_fkey" FOREIGN KEY ("resolvedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_sync_notifications" ADD CONSTRAINT "calendar_sync_notifications_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "calendar_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_privacy_settings" ADD CONSTRAINT "calendar_privacy_settings_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "calendar_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "calendar_field_mappings" ADD CONSTRAINT "calendar_field_mappings_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "calendar_integrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders" ADD CONSTRAINT "reminders_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;
