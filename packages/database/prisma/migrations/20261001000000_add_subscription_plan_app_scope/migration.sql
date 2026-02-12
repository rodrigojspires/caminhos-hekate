-- CreateEnum
CREATE TYPE "SubscriptionAppScope" AS ENUM ('CAMINHOS', 'MAHALILAH', 'SHARED');

-- AlterTable
ALTER TABLE "SubscriptionPlan"
ADD COLUMN "appScope" "SubscriptionAppScope" NOT NULL DEFAULT 'CAMINHOS';

-- DropIndex
DROP INDEX IF EXISTS "SubscriptionPlan_tier_key";

-- CreateIndex
CREATE INDEX "SubscriptionPlan_appScope_isActive_idx" ON "SubscriptionPlan"("appScope", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_tier_appScope_key" ON "SubscriptionPlan"("tier", "appScope");
