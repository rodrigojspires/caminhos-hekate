-- CreateTable
CREATE TABLE "community_files" (
    "id" TEXT NOT NULL,
    "communityId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "fileUrl" TEXT NOT NULL,
    "fileType" TEXT,
    "fileSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "community_files_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "community_files_communityId_idx" ON "community_files"("communityId");

-- AddForeignKey
ALTER TABLE "community_files" ADD CONSTRAINT "community_files_communityId_fkey" FOREIGN KEY ("communityId") REFERENCES "communities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
