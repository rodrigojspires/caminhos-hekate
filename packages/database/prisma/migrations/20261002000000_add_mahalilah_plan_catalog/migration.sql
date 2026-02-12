-- CreateEnum
CREATE TYPE "MahaLilahBillingType" AS ENUM ('ONE_TIME', 'RECURRING');

-- CreateEnum
CREATE TYPE "MahaLilahSingleSessionPricingMode" AS ENUM ('UNIT_PER_PARTICIPANT', 'FIXED_TOTAL');

-- CreateTable
CREATE TABLE "MahaLilahPlan" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "planType" "MahaLilahPlanType" NOT NULL,
  "billingType" "MahaLilahBillingType" NOT NULL,
  "subscriptionPlanId" TEXT,
  "maxParticipants" INTEGER NOT NULL,
  "roomsPerMonth" INTEGER,
  "tipsPerPlayer" INTEGER NOT NULL DEFAULT 0,
  "summaryLimit" INTEGER NOT NULL DEFAULT 0,
  "durationDays" INTEGER NOT NULL DEFAULT 30,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MahaLilahPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MahaLilahSingleSessionPriceTier" (
  "id" TEXT NOT NULL,
  "planId" TEXT NOT NULL,
  "participantsFrom" INTEGER NOT NULL,
  "participantsTo" INTEGER NOT NULL,
  "pricingMode" "MahaLilahSingleSessionPricingMode" NOT NULL,
  "unitPrice" DECIMAL(10,2),
  "fixedPrice" DECIMAL(10,2),
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MahaLilahSingleSessionPriceTier_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MahaLilahPlan_planType_key" ON "MahaLilahPlan"("planType");

-- CreateIndex
CREATE INDEX "MahaLilahPlan_isActive_idx" ON "MahaLilahPlan"("isActive");

-- CreateIndex
CREATE INDEX "MahaLilahPlan_planType_isActive_idx" ON "MahaLilahPlan"("planType", "isActive");

-- CreateIndex
CREATE INDEX "MahaLilahSingleSessionPriceTier_planId_isActive_sortOrder_idx" ON "MahaLilahSingleSessionPriceTier"("planId", "isActive", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "MahaLilahSingleSessionPriceTier_planId_participantsFrom_participantsTo_key" ON "MahaLilahSingleSessionPriceTier"("planId", "participantsFrom", "participantsTo");

-- AddForeignKey
ALTER TABLE "MahaLilahPlan"
ADD CONSTRAINT "MahaLilahPlan_subscriptionPlanId_fkey"
FOREIGN KEY ("subscriptionPlanId") REFERENCES "SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MahaLilahSingleSessionPriceTier"
ADD CONSTRAINT "MahaLilahSingleSessionPriceTier_planId_fkey"
FOREIGN KEY ("planId") REFERENCES "MahaLilahPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
