-- CreateEnum
CREATE TYPE "WebhookLogStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRY');

-- CreateTable
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookLogStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "processedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "webhook_logs_provider_idx" ON "webhook_logs"("provider");

-- CreateIndex
CREATE INDEX "webhook_logs_eventType_idx" ON "webhook_logs"("eventType");

-- CreateIndex
CREATE INDEX "webhook_logs_eventId_idx" ON "webhook_logs"("eventId");

-- CreateIndex
CREATE INDEX "webhook_logs_status_idx" ON "webhook_logs"("status");

-- CreateIndex
CREATE INDEX "webhook_logs_processedAt_idx" ON "webhook_logs"("processedAt");

-- CreateIndex
CREATE UNIQUE INDEX "webhook_logs_provider_eventId_key" ON "webhook_logs"("provider", "eventId");