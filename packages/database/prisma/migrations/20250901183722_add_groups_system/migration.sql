-- CreateEnum
CREATE TYPE "GroupType" AS ENUM ('STUDY', 'PROFESSIONAL', 'HOBBY', 'COMMUNITY', 'PROJECT', 'PRIVATE');

-- CreateEnum
CREATE TYPE "GroupVisibility" AS ENUM ('PUBLIC', 'PRIVATE', 'UNLISTED');

-- CreateEnum
CREATE TYPE "GroupMemberRole" AS ENUM ('OWNER', 'ADMIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "GroupMemberStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'BANNED', 'LEFT');

-- CreateEnum
CREATE TYPE "GroupMessageType" AS ENUM ('TEXT', 'IMAGE', 'FILE', 'AUDIO', 'VIDEO', 'SYSTEM');

-- CreateEnum
CREATE TYPE "GroupEventType" AS ENUM ('MEETING', 'WORKSHOP', 'STUDY_SESSION', 'SOCIAL', 'PRESENTATION', 'DISCUSSION', 'OTHER');

-- CreateEnum
CREATE TYPE "GroupEventStatus" AS ENUM ('SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELED', 'POSTPONED');

-- CreateEnum
CREATE TYPE "GroupEventAttendeeStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'MAYBE', 'ATTENDED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "GroupInvitationStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'CANCELED');

-- CreateEnum
CREATE TYPE "GroupResourceType" AS ENUM ('FILE', 'LINK', 'IMAGE', 'VIDEO', 'DOCUMENT', 'PRESENTATION', 'SPREADSHEET', 'OTHER');

-- CreateTable
CREATE TABLE "groups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "GroupType" NOT NULL DEFAULT 'PRIVATE',
    "visibility" "GroupVisibility" NOT NULL DEFAULT 'PRIVATE',
    "maxMembers" INTEGER DEFAULT 50,
    "requiresApproval" BOOLEAN NOT NULL DEFAULT true,
    "tags" TEXT[],
    "avatar" TEXT,
    "banner" TEXT,
    "rules" TEXT,
    "metadata" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "GroupMemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leftAt" TIMESTAMP(3),
    "invitedBy" TEXT,
    "permissions" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_messages" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "type" "GroupMessageType" NOT NULL DEFAULT 'TEXT',
    "attachments" JSONB,
    "replyToId" TEXT,
    "mentions" TEXT[],
    "reactions" JSONB,
    "isEdited" BOOLEAN NOT NULL DEFAULT false,
    "editedAt" TIMESTAMP(3),
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "pinnedBy" TEXT,
    "pinnedAt" TIMESTAMP(3),
    "deletedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_events" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "GroupEventType" NOT NULL DEFAULT 'MEETING',
    "status" "GroupEventStatus" NOT NULL DEFAULT 'SCHEDULED',
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "location" TEXT,
    "virtualLink" TEXT,
    "maxAttendees" INTEGER,
    "requiresRSVP" BOOLEAN NOT NULL DEFAULT false,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "recurrenceRule" JSONB,
    "reminders" JSONB,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "canceledAt" TIMESTAMP(3),

    CONSTRAINT "group_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_event_attendees" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" "GroupEventAttendeeStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "attendedAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_event_attendees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_invitations" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "inviterId" TEXT NOT NULL,
    "inviteeId" TEXT,
    "email" TEXT,
    "token" TEXT NOT NULL,
    "role" "GroupMemberRole" NOT NULL DEFAULT 'MEMBER',
    "status" "GroupInvitationStatus" NOT NULL DEFAULT 'PENDING',
    "message" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "rejectedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_resources" (
    "id" TEXT NOT NULL,
    "groupId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "type" "GroupResourceType" NOT NULL DEFAULT 'FILE',
    "url" TEXT NOT NULL,
    "fileName" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedBy" TEXT NOT NULL,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "group_resources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "groups_type_idx" ON "groups"("type");

-- CreateIndex
CREATE INDEX "groups_visibility_idx" ON "groups"("visibility");

-- CreateIndex
CREATE INDEX "groups_createdBy_idx" ON "groups"("createdBy");

-- CreateIndex
CREATE INDEX "groups_createdAt_idx" ON "groups"("createdAt");

-- CreateIndex
CREATE INDEX "groups_tags_idx" ON "groups"("tags");

-- CreateIndex
CREATE INDEX "group_members_groupId_idx" ON "group_members"("groupId");

-- CreateIndex
CREATE INDEX "group_members_userId_idx" ON "group_members"("userId");

-- CreateIndex
CREATE INDEX "group_members_role_idx" ON "group_members"("role");

-- CreateIndex
CREATE INDEX "group_members_status_idx" ON "group_members"("status");

-- CreateIndex
CREATE INDEX "group_members_joinedAt_idx" ON "group_members"("joinedAt");

-- CreateIndex
CREATE UNIQUE INDEX "group_members_groupId_userId_key" ON "group_members"("groupId", "userId");

-- CreateIndex
CREATE INDEX "group_messages_groupId_idx" ON "group_messages"("groupId");

-- CreateIndex
CREATE INDEX "group_messages_authorId_idx" ON "group_messages"("authorId");

-- CreateIndex
CREATE INDEX "group_messages_type_idx" ON "group_messages"("type");

-- CreateIndex
CREATE INDEX "group_messages_createdAt_idx" ON "group_messages"("createdAt");

-- CreateIndex
CREATE INDEX "group_messages_isPinned_idx" ON "group_messages"("isPinned");

-- CreateIndex
CREATE INDEX "group_messages_replyToId_idx" ON "group_messages"("replyToId");

-- CreateIndex
CREATE INDEX "group_events_groupId_idx" ON "group_events"("groupId");

-- CreateIndex
CREATE INDEX "group_events_type_idx" ON "group_events"("type");

-- CreateIndex
CREATE INDEX "group_events_status_idx" ON "group_events"("status");

-- CreateIndex
CREATE INDEX "group_events_startDate_idx" ON "group_events"("startDate");

-- CreateIndex
CREATE INDEX "group_events_endDate_idx" ON "group_events"("endDate");

-- CreateIndex
CREATE INDEX "group_events_createdBy_idx" ON "group_events"("createdBy");

-- CreateIndex
CREATE INDEX "group_event_attendees_eventId_idx" ON "group_event_attendees"("eventId");

-- CreateIndex
CREATE INDEX "group_event_attendees_userId_idx" ON "group_event_attendees"("userId");

-- CreateIndex
CREATE INDEX "group_event_attendees_status_idx" ON "group_event_attendees"("status");

-- CreateIndex
CREATE UNIQUE INDEX "group_event_attendees_eventId_userId_key" ON "group_event_attendees"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "group_invitations_token_key" ON "group_invitations"("token");

-- CreateIndex
CREATE INDEX "group_invitations_groupId_idx" ON "group_invitations"("groupId");

-- CreateIndex
CREATE INDEX "group_invitations_inviterId_idx" ON "group_invitations"("inviterId");

-- CreateIndex
CREATE INDEX "group_invitations_inviteeId_idx" ON "group_invitations"("inviteeId");

-- CreateIndex
CREATE INDEX "group_invitations_email_idx" ON "group_invitations"("email");

-- CreateIndex
CREATE INDEX "group_invitations_token_idx" ON "group_invitations"("token");

-- CreateIndex
CREATE INDEX "group_invitations_status_idx" ON "group_invitations"("status");

-- CreateIndex
CREATE INDEX "group_invitations_expiresAt_idx" ON "group_invitations"("expiresAt");

-- CreateIndex
CREATE INDEX "group_resources_groupId_idx" ON "group_resources"("groupId");

-- CreateIndex
CREATE INDEX "group_resources_type_idx" ON "group_resources"("type");

-- CreateIndex
CREATE INDEX "group_resources_uploadedBy_idx" ON "group_resources"("uploadedBy");

-- CreateIndex
CREATE INDEX "group_resources_isPublic_idx" ON "group_resources"("isPublic");

-- CreateIndex
CREATE INDEX "group_resources_createdAt_idx" ON "group_resources"("createdAt");

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_invitedBy_fkey" FOREIGN KEY ("invitedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "group_messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_messages" ADD CONSTRAINT "group_messages_pinnedBy_fkey" FOREIGN KEY ("pinnedBy") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_events" ADD CONSTRAINT "group_events_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_event_attendees" ADD CONSTRAINT "group_event_attendees_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "group_events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_event_attendees" ADD CONSTRAINT "group_event_attendees_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_inviterId_fkey" FOREIGN KEY ("inviterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_invitations" ADD CONSTRAINT "group_invitations_inviteeId_fkey" FOREIGN KEY ("inviteeId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_resources" ADD CONSTRAINT "group_resources_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_resources" ADD CONSTRAINT "group_resources_uploadedBy_fkey" FOREIGN KEY ("uploadedBy") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
