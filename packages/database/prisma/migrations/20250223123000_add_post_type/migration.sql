-- CreateEnum
CREATE TYPE "PostType" AS ENUM ('CONTENT', 'THREAD');

-- AlterTable
ALTER TABLE "Post" ADD COLUMN "type" "PostType" NOT NULL DEFAULT 'CONTENT';
