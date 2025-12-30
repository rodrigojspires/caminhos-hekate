-- CreateEnum
CREATE TYPE "CommunityAccessModel" AS ENUM ('FREE', 'ONE_TIME', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "CommunityMemberRole" AS ENUM ('MEMBER', 'MODERATOR', 'OWNER');

-- CreateTable
CREATE TABLE "communities" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "accessModels" "CommunityAccessModel"[] NOT NULL DEFAULT ARRAY[]::"CommunityAccessModel"[],
    "tier" "SubscriptionTier" NOT NULL DEFAULT 'FREE',
    "price" DECIMAL(10,2),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_memberships" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "role" "CommunityMemberRole" NOT NULL DEFAULT 'MEMBER',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "communities_slug_key" ON "communities"("slug");

-- CreateIndex
CREATE INDEX "communities_isActive_idx" ON "communities"("isActive");

-- CreateIndex
CREATE INDEX "communities_tier_idx" ON "communities"("tier");

-- CreateIndex
CREATE UNIQUE INDEX "community_memberships_communityId_userId_key" ON "community_memberships"("communityId", "userId");

-- CreateIndex
CREATE INDEX "community_memberships_communityId_idx" ON "community_memberships"("communityId");

-- CreateIndex
CREATE INDEX "community_memberships_userId_idx" ON "community_memberships"("userId");

-- CreateIndex
CREATE INDEX "community_memberships_status_idx" ON "community_memberships"("status");

-- AlterTable
ALTER TABLE "Topic" ADD COLUMN "communityId" TEXT;

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "communityId" TEXT;

-- AlterTable
ALTER TABLE "groups" ADD COLUMN "communityId" TEXT;

-- CreateIndex
CREATE INDEX "Topic_communityId_idx" ON "Topic"("communityId");

-- CreateIndex
CREATE INDEX "Post_communityId_idx" ON "Post"("communityId");

-- CreateIndex
CREATE INDEX "groups_communityId_idx" ON "groups"("communityId");

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_memberships" ADD CONSTRAINT "community_memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Post" ADD CONSTRAINT "Post_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "groups" ADD CONSTRAINT "groups_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE SET NULL ON UPDATE CASCADE;
