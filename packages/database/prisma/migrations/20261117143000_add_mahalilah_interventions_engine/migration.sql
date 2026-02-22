-- CreateEnum
CREATE TYPE "MahaLilahInterventionSeverity" AS ENUM ('INFO', 'ATTENTION', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MahaLilahInterventionSource" AS ENUM ('RULE', 'AI', 'HYBRID');

-- CreateEnum
CREATE TYPE "MahaLilahInterventionStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'DISMISSED');

-- AlterTable
ALTER TABLE "MahaLilahPlan"
ADD COLUMN "interventionLimitPerParticipant" INTEGER NOT NULL DEFAULT 8;

-- CreateTable
CREATE TABLE "MahaLilahInterventionConfig" (
  "id" TEXT NOT NULL,
  "triggerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "useAi" BOOLEAN NOT NULL DEFAULT false,
  "sensitive" BOOLEAN NOT NULL DEFAULT false,
  "requireTherapistApproval" BOOLEAN NOT NULL DEFAULT false,
  "autoApproveWhenTherapistSolo" BOOLEAN NOT NULL DEFAULT true,
  "severity" "MahaLilahInterventionSeverity" NOT NULL DEFAULT 'INFO',
  "cooldownMoves" INTEGER NOT NULL DEFAULT 2,
  "cooldownMinutes" INTEGER NOT NULL DEFAULT 10,
  "thresholds" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MahaLilahInterventionConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MahaLilahInterventionPrompt" (
  "id" TEXT NOT NULL,
  "configId" TEXT NOT NULL,
  "locale" TEXT NOT NULL DEFAULT 'pt-BR',
  "name" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "systemPrompt" TEXT,
  "userPromptTemplate" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MahaLilahInterventionPrompt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MahaLilahIntervention" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "moveId" TEXT,
  "configId" TEXT,
  "promptId" TEXT,
  "triggerId" TEXT NOT NULL,
  "severity" "MahaLilahInterventionSeverity" NOT NULL DEFAULT 'INFO',
  "generatedBy" "MahaLilahInterventionSource" NOT NULL DEFAULT 'RULE',
  "usesAi" BOOLEAN NOT NULL DEFAULT false,
  "requiresApproval" BOOLEAN NOT NULL DEFAULT false,
  "status" "MahaLilahInterventionStatus" NOT NULL DEFAULT 'APPROVED',
  "turnNumber" INTEGER,
  "title" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "reflectionQuestion" TEXT,
  "microAction" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "approvedAt" TIMESTAMP(3),
  "approvedByUserId" TEXT,
  "dismissedAt" TIMESTAMP(3),
  "dismissedByUserId" TEXT,

  CONSTRAINT "MahaLilahIntervention_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MahaLilahInterventionConfig_triggerId_key"
ON "MahaLilahInterventionConfig"("triggerId");

-- CreateIndex
CREATE INDEX "MahaLilahInterventionConfig_enabled_idx"
ON "MahaLilahInterventionConfig"("enabled");

-- CreateIndex
CREATE INDEX "MahaLilahInterventionPrompt_configId_isActive_idx"
ON "MahaLilahInterventionPrompt"("configId", "isActive");

-- CreateIndex
CREATE INDEX "MahaLilahIntervention_roomId_participantId_createdAt_idx"
ON "MahaLilahIntervention"("roomId", "participantId", "createdAt");

-- CreateIndex
CREATE INDEX "MahaLilahIntervention_roomId_triggerId_createdAt_idx"
ON "MahaLilahIntervention"("roomId", "triggerId", "createdAt");

-- CreateIndex
CREATE INDEX "MahaLilahIntervention_roomId_status_createdAt_idx"
ON "MahaLilahIntervention"("roomId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MahaLilahIntervention_participantId_status_createdAt_idx"
ON "MahaLilahIntervention"("participantId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "MahaLilahIntervention_moveId_idx"
ON "MahaLilahIntervention"("moveId");

-- AddForeignKey
ALTER TABLE "MahaLilahInterventionPrompt"
ADD CONSTRAINT "MahaLilahInterventionPrompt_configId_fkey"
FOREIGN KEY ("configId") REFERENCES "MahaLilahInterventionConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaLilahIntervention"
ADD CONSTRAINT "MahaLilahIntervention_roomId_fkey"
FOREIGN KEY ("roomId") REFERENCES "MahaLilahRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaLilahIntervention"
ADD CONSTRAINT "MahaLilahIntervention_participantId_fkey"
FOREIGN KEY ("participantId") REFERENCES "MahaLilahParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaLilahIntervention"
ADD CONSTRAINT "MahaLilahIntervention_moveId_fkey"
FOREIGN KEY ("moveId") REFERENCES "MahaLilahMove"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaLilahIntervention"
ADD CONSTRAINT "MahaLilahIntervention_configId_fkey"
FOREIGN KEY ("configId") REFERENCES "MahaLilahInterventionConfig"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaLilahIntervention"
ADD CONSTRAINT "MahaLilahIntervention_promptId_fkey"
FOREIGN KEY ("promptId") REFERENCES "MahaLilahInterventionPrompt"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaLilahIntervention"
ADD CONSTRAINT "MahaLilahIntervention_approvedByUserId_fkey"
FOREIGN KEY ("approvedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaLilahIntervention"
ADD CONSTRAINT "MahaLilahIntervention_dismissedByUserId_fkey"
FOREIGN KEY ("dismissedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
