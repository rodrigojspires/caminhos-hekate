-- AlterTable
ALTER TABLE "community_memberships" ADD COLUMN "lastChatReadAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "community_messages" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "community_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_messages_communityId_idx" ON "community_messages"("communityId");

-- CreateIndex
CREATE INDEX "community_messages_authorId_idx" ON "community_messages"("authorId");

-- CreateIndex
CREATE INDEX "community_messages_createdAt_idx" ON "community_messages"("createdAt");

-- AddForeignKey
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_messages" ADD CONSTRAINT "community_messages_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
