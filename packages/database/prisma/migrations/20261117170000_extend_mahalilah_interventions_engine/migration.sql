-- CreateEnum
CREATE TYPE "MahaLilahInterventionVisibility" AS ENUM ('THERAPIST_ONLY', 'ROOM');

-- CreateEnum
CREATE TYPE "MahaLilahInterventionScopeType" AS ENUM ('GLOBAL', 'PLAN', 'ROOM');

-- CreateEnum
CREATE TYPE "MahaLilahInterventionAiPolicy" AS ENUM ('NONE', 'OPTIONAL', 'REQUIRED');

-- CreateEnum
CREATE TYPE "MahaLilahInterventionFeedbackAction" AS ENUM ('HELPFUL', 'NOT_HELPFUL', 'APPLIED', 'DISMISSED');

-- AlterEnum
ALTER TYPE "MahaLilahInterventionStatus" ADD VALUE IF NOT EXISTS 'SNOOZED';

-- AlterTable
ALTER TABLE "MahaLilahInterventionConfig"
ADD COLUMN "aiPolicy" "MahaLilahInterventionAiPolicy" NOT NULL DEFAULT 'NONE',
ADD COLUMN "scopeType" "MahaLilahInterventionScopeType" NOT NULL DEFAULT 'GLOBAL',
ADD COLUMN "scopeId" TEXT NOT NULL DEFAULT '__global__',
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "MahaLilahGameState"
ADD COLUMN "turnStartedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable
ALTER TABLE "MahaLilahIntervention"
ADD COLUMN "visibleTo" "MahaLilahInterventionVisibility" NOT NULL DEFAULT 'ROOM',
ADD COLUMN "snoozedUntil" TIMESTAMP(3);

-- DropIndex
DROP INDEX IF EXISTS "MahaLilahInterventionConfig_triggerId_key";

-- CreateIndex
CREATE INDEX "MahaLilahInterventionConfig_triggerId_idx"
ON "MahaLilahInterventionConfig"("triggerId");

-- CreateIndex
CREATE INDEX "MahaLilahInterventionConfig_enabled_scope_idx"
ON "MahaLilahInterventionConfig"("enabled", "scopeType", "scopeId");

-- CreateIndex
CREATE UNIQUE INDEX "MahaLilahInterventionConfig_trigger_scope_key"
ON "MahaLilahInterventionConfig"("triggerId", "scopeType", "scopeId");

-- CreateIndex
CREATE INDEX "MahaLilahIntervention_roomId_participantId_triggerId_status_idx"
ON "MahaLilahIntervention"("roomId", "participantId", "triggerId", "status");

-- CreateIndex
CREATE INDEX "MahaLilahIntervention_snoozedUntil_idx"
ON "MahaLilahIntervention"("snoozedUntil");

-- CreateTable
CREATE TABLE "MahaLilahInterventionFeedback" (
  "id" TEXT NOT NULL,
  "interventionId" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "participantId" TEXT,
  "triggerId" TEXT NOT NULL,
  "userId" TEXT,
  "action" "MahaLilahInterventionFeedbackAction" NOT NULL,
  "note" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MahaLilahInterventionFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MahaLilahInterventionFeedback_interventionId_createdAt_idx"
ON "MahaLilahInterventionFeedback"("interventionId", "createdAt");

-- CreateIndex
CREATE INDEX "MahaLilahInterventionFeedback_roomId_participantId_triggerId_createdAt_idx"
ON "MahaLilahInterventionFeedback"("roomId", "participantId", "triggerId", "createdAt");

-- CreateIndex
CREATE INDEX "MahaLilahInterventionFeedback_userId_createdAt_idx"
ON "MahaLilahInterventionFeedback"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "MahaLilahInterventionFeedback"
ADD CONSTRAINT "MahaLilahInterventionFeedback_interventionId_fkey"
FOREIGN KEY ("interventionId") REFERENCES "MahaLilahIntervention"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaLilahInterventionFeedback"
ADD CONSTRAINT "MahaLilahInterventionFeedback_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "MahaLilahRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaLilahInterventionFeedback"
ADD CONSTRAINT "MahaLilahInterventionFeedback_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "MahaLilahParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaLilahInterventionFeedback"
ADD CONSTRAINT "MahaLilahInterventionFeedback_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
