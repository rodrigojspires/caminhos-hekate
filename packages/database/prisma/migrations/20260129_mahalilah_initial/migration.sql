-- Create enums
CREATE TYPE "MahaLilahRoomStatus" AS ENUM ('ACTIVE', 'CLOSED', 'COMPLETED');
CREATE TYPE "MahaLilahPlanType" AS ENUM ('SINGLE_SESSION', 'SUBSCRIPTION', 'SUBSCRIPTION_LIMITED');
CREATE TYPE "MahaLilahInviteRole" AS ENUM ('PLAYER');
CREATE TYPE "MahaLilahParticipantRole" AS ENUM ('THERAPIST', 'PLAYER');
CREATE TYPE "MahaLilahAiReportKind" AS ENUM ('FINAL');

-- Create tables
CREATE TABLE "MahaLilahRoom" (
  "id" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "status" "MahaLilahRoomStatus" NOT NULL DEFAULT 'ACTIVE',
  "maxParticipants" INTEGER NOT NULL,
  "planType" "MahaLilahPlanType" NOT NULL DEFAULT 'SINGLE_SESSION',
  "orderId" TEXT,
  "subscriptionId" TEXT,
  "consentTextVersion" TEXT,

  CONSTRAINT "MahaLilahRoom_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MahaLilahInvite" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "role" "MahaLilahInviteRole" NOT NULL DEFAULT 'PLAYER',
  "token" TEXT NOT NULL,
  "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "acceptedAt" TIMESTAMP(3),
  "invitedByUserId" TEXT NOT NULL,

  CONSTRAINT "MahaLilahInvite_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MahaLilahParticipant" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "role" "MahaLilahParticipantRole" NOT NULL,
  "userId" TEXT NOT NULL,
  "displayName" TEXT,
  "inviteId" TEXT,
  "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "consentAcceptedAt" TIMESTAMP(3),

  CONSTRAINT "MahaLilahParticipant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MahaLilahGameState" (
  "roomId" TEXT NOT NULL,
  "currentTurnIndex" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MahaLilahGameState_pkey" PRIMARY KEY ("roomId")
);

CREATE TABLE "MahaLilahPlayerState" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "position" INTEGER NOT NULL,
  "hasStarted" BOOLEAN NOT NULL DEFAULT false,
  "hasCompleted" BOOLEAN NOT NULL DEFAULT false,
  "rollCountTotal" INTEGER NOT NULL DEFAULT 0,
  "rollCountUntilStart" INTEGER NOT NULL DEFAULT 0,

  CONSTRAINT "MahaLilahPlayerState_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MahaLilahMove" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "turnNumber" INTEGER NOT NULL,
  "participantId" TEXT NOT NULL,
  "diceValue" INTEGER NOT NULL,
  "fromPos" INTEGER NOT NULL,
  "toPos" INTEGER NOT NULL,
  "appliedJumpFrom" INTEGER,
  "appliedJumpTo" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MahaLilahMove_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MahaLilahTherapyEntry" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "moveId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "emotion" TEXT,
  "intensity" INTEGER,
  "insight" TEXT,
  "body" TEXT,
  "microAction" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MahaLilahTherapyEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MahaLilahCardDraw" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "moveId" TEXT,
  "drawnByParticipantId" TEXT NOT NULL,
  "cards" INTEGER[] NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MahaLilahCardDraw_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MahaLilahAiUsage" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "participantId" TEXT NOT NULL,
  "tipsUsed" INTEGER NOT NULL DEFAULT 0,
  "tipsLimit" INTEGER NOT NULL DEFAULT 0,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MahaLilahAiUsage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MahaLilahAiReport" (
  "id" TEXT NOT NULL,
  "roomId" TEXT NOT NULL,
  "participantId" TEXT,
  "kind" "MahaLilahAiReportKind" NOT NULL DEFAULT 'FINAL',
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "MahaLilahAiReport_pkey" PRIMARY KEY ("id")
);

-- Indexes and uniques
CREATE UNIQUE INDEX "MahaLilahRoom_code_key" ON "MahaLilahRoom"("code");
CREATE INDEX "MahaLilahRoom_createdByUserId_idx" ON "MahaLilahRoom"("createdByUserId");
CREATE INDEX "MahaLilahRoom_status_idx" ON "MahaLilahRoom"("status");
CREATE INDEX "MahaLilahRoom_createdAt_idx" ON "MahaLilahRoom"("createdAt");

CREATE UNIQUE INDEX "MahaLilahInvite_token_key" ON "MahaLilahInvite"("token");
CREATE UNIQUE INDEX "MahaLilahInvite_roomId_email_key" ON "MahaLilahInvite"("roomId", "email");
CREATE INDEX "MahaLilahInvite_roomId_idx" ON "MahaLilahInvite"("roomId");
CREATE INDEX "MahaLilahInvite_email_idx" ON "MahaLilahInvite"("email");

CREATE UNIQUE INDEX "MahaLilahParticipant_roomId_userId_key" ON "MahaLilahParticipant"("roomId", "userId");
CREATE UNIQUE INDEX "MahaLilahParticipant_inviteId_key" ON "MahaLilahParticipant"("inviteId");
CREATE INDEX "MahaLilahParticipant_role_idx" ON "MahaLilahParticipant"("role");
CREATE INDEX "MahaLilahParticipant_roomId_idx" ON "MahaLilahParticipant"("roomId");

CREATE UNIQUE INDEX "MahaLilahGameState_roomId_key" ON "MahaLilahGameState"("roomId");

CREATE UNIQUE INDEX "MahaLilahPlayerState_roomId_participantId_key" ON "MahaLilahPlayerState"("roomId", "participantId");
CREATE UNIQUE INDEX "MahaLilahPlayerState_participantId_key" ON "MahaLilahPlayerState"("participantId");
CREATE INDEX "MahaLilahPlayerState_roomId_idx" ON "MahaLilahPlayerState"("roomId");

CREATE INDEX "MahaLilahMove_roomId_idx" ON "MahaLilahMove"("roomId");
CREATE INDEX "MahaLilahMove_participantId_idx" ON "MahaLilahMove"("participantId");
CREATE INDEX "MahaLilahMove_createdAt_idx" ON "MahaLilahMove"("createdAt");

CREATE INDEX "MahaLilahTherapyEntry_roomId_idx" ON "MahaLilahTherapyEntry"("roomId");
CREATE INDEX "MahaLilahTherapyEntry_participantId_idx" ON "MahaLilahTherapyEntry"("participantId");
CREATE INDEX "MahaLilahTherapyEntry_createdAt_idx" ON "MahaLilahTherapyEntry"("createdAt");

CREATE INDEX "MahaLilahCardDraw_roomId_idx" ON "MahaLilahCardDraw"("roomId");
CREATE INDEX "MahaLilahCardDraw_drawnByParticipantId_idx" ON "MahaLilahCardDraw"("drawnByParticipantId");
CREATE INDEX "MahaLilahCardDraw_createdAt_idx" ON "MahaLilahCardDraw"("createdAt");

CREATE UNIQUE INDEX "MahaLilahAiUsage_roomId_participantId_key" ON "MahaLilahAiUsage"("roomId", "participantId");
CREATE INDEX "MahaLilahAiUsage_roomId_idx" ON "MahaLilahAiUsage"("roomId");

CREATE INDEX "MahaLilahAiReport_roomId_idx" ON "MahaLilahAiReport"("roomId");
CREATE INDEX "MahaLilahAiReport_participantId_idx" ON "MahaLilahAiReport"("participantId");
CREATE INDEX "MahaLilahAiReport_createdAt_idx" ON "MahaLilahAiReport"("createdAt");

-- Foreign keys
ALTER TABLE "MahaLilahRoom" ADD CONSTRAINT "MahaLilahRoom_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MahaLilahRoom" ADD CONSTRAINT "MahaLilahRoom_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MahaLilahRoom" ADD CONSTRAINT "MahaLilahRoom_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MahaLilahInvite" ADD CONSTRAINT "MahaLilahInvite_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MahaLilahRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MahaLilahInvite" ADD CONSTRAINT "MahaLilahInvite_invitedByUserId_fkey" FOREIGN KEY ("invitedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MahaLilahParticipant" ADD CONSTRAINT "MahaLilahParticipant_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MahaLilahRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MahaLilahParticipant" ADD CONSTRAINT "MahaLilahParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MahaLilahParticipant" ADD CONSTRAINT "MahaLilahParticipant_inviteId_fkey" FOREIGN KEY ("inviteId") REFERENCES "MahaLilahInvite"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MahaLilahGameState" ADD CONSTRAINT "MahaLilahGameState_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MahaLilahRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MahaLilahPlayerState" ADD CONSTRAINT "MahaLilahPlayerState_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MahaLilahRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MahaLilahPlayerState" ADD CONSTRAINT "MahaLilahPlayerState_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MahaLilahParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MahaLilahMove" ADD CONSTRAINT "MahaLilahMove_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MahaLilahRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MahaLilahMove" ADD CONSTRAINT "MahaLilahMove_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MahaLilahParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MahaLilahTherapyEntry" ADD CONSTRAINT "MahaLilahTherapyEntry_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MahaLilahRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MahaLilahTherapyEntry" ADD CONSTRAINT "MahaLilahTherapyEntry_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "MahaLilahMove"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MahaLilahTherapyEntry" ADD CONSTRAINT "MahaLilahTherapyEntry_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MahaLilahParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MahaLilahCardDraw" ADD CONSTRAINT "MahaLilahCardDraw_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MahaLilahRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MahaLilahCardDraw" ADD CONSTRAINT "MahaLilahCardDraw_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "MahaLilahMove"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MahaLilahCardDraw" ADD CONSTRAINT "MahaLilahCardDraw_drawnByParticipantId_fkey" FOREIGN KEY ("drawnByParticipantId") REFERENCES "MahaLilahParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MahaLilahAiUsage" ADD CONSTRAINT "MahaLilahAiUsage_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MahaLilahRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MahaLilahAiUsage" ADD CONSTRAINT "MahaLilahAiUsage_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MahaLilahParticipant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MahaLilahAiReport" ADD CONSTRAINT "MahaLilahAiReport_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "MahaLilahRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MahaLilahAiReport" ADD CONSTRAINT "MahaLilahAiReport_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "MahaLilahParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
