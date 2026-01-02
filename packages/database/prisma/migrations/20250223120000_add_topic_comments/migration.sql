-- CreateTable
CREATE TABLE "TopicComment" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TopicComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TopicComment_topicId_idx" ON "TopicComment"("topicId");

-- CreateIndex
CREATE INDEX "TopicComment_authorId_idx" ON "TopicComment"("authorId");

-- AddForeignKey
ALTER TABLE "TopicComment" ADD CONSTRAINT "TopicComment_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicComment" ADD CONSTRAINT "TopicComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TopicComment" ADD CONSTRAINT "TopicComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "TopicComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
