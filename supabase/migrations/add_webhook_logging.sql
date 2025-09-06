-- Create enum for webhook log status
CREATE TYPE "WebhookLogStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED', 'RETRY');

-- Create webhook_logs table
CREATE TABLE "webhook_logs" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "WebhookLogStatus" NOT NULL DEFAULT 'PENDING',
    "error" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "webhook_logs_pkey" PRIMARY KEY ("id")
);

-- Create indexes for better performance
CREATE INDEX "webhook_logs_provider_idx" ON "webhook_logs"("provider");
CREATE INDEX "webhook_logs_status_idx" ON "webhook_logs"("status");
CREATE INDEX "webhook_logs_createdAt_idx" ON "webhook_logs"("createdAt");
CREATE INDEX "webhook_logs_eventType_idx" ON "webhook_logs"("eventType");

-- Create unique constraint for provider + eventId to prevent duplicates
CREATE UNIQUE INDEX "webhook_logs_provider_eventId_key" ON "webhook_logs"("provider", "eventId");

-- Create function to update updatedAt automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updatedAt
CREATE TRIGGER update_webhook_logs_updated_at
    BEFORE UPDATE ON "webhook_logs"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions to authenticated users (for admin access)
GRANT SELECT, INSERT, UPDATE ON "webhook_logs" TO authenticated;
GRANT USAGE ON TYPE "WebhookLogStatus" TO authenticated;