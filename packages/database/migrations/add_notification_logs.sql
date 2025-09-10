-- Add notification logs tables

-- Email logs table
CREATE TABLE "email_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'notification',
    "status" "email_status" NOT NULL DEFAULT 'PENDING',
    "sent_by" TEXT NOT NULL,
    "event_id" TEXT,
    "resend_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "email_logs_pkey" PRIMARY KEY ("id")
);

-- Push subscriptions table
CREATE TABLE "push_subscriptions" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- Push notification logs table
CREATE TABLE "push_notification_logs" (
    "id" TEXT NOT NULL,
    "endpoint" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "status" "notification_status" NOT NULL DEFAULT 'PENDING',
    "sent_by" TEXT NOT NULL,
    "data" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "push_notification_logs_pkey" PRIMARY KEY ("id")
);

-- SMS logs table
CREATE TABLE "sms_logs" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "status" "notification_status" NOT NULL DEFAULT 'PENDING',
    "sent_by" TEXT NOT NULL,
    "twilio_sid" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_logs_pkey" PRIMARY KEY ("id")
);

-- Create enums
CREATE TYPE "email_status" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED');
CREATE TYPE "notification_status" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'FAILED');

-- Create indexes
CREATE INDEX "email_logs_sent_by_idx" ON "email_logs"("sent_by");
CREATE INDEX "email_logs_event_id_idx" ON "email_logs"("event_id");
CREATE INDEX "email_logs_status_idx" ON "email_logs"("status");
CREATE INDEX "email_logs_type_idx" ON "email_logs"("type");

CREATE UNIQUE INDEX "push_subscriptions_user_id_endpoint_key" ON "push_subscriptions"("user_id", "endpoint");
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

CREATE INDEX "push_notification_logs_sent_by_idx" ON "push_notification_logs"("sent_by");
CREATE INDEX "push_notification_logs_status_idx" ON "push_notification_logs"("status");

CREATE INDEX "sms_logs_sent_by_idx" ON "sms_logs"("sent_by");
CREATE INDEX "sms_logs_status_idx" ON "sms_logs"("status");

-- Add foreign key constraints
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "email_logs" ADD CONSTRAINT "email_logs_event_id_fkey" FOREIGN KEY ("event_id") REFERENCES "Event"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "push_notification_logs" ADD CONSTRAINT "push_notification_logs_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "sms_logs" ADD CONSTRAINT "sms_logs_sent_by_fkey" FOREIGN KEY ("sent_by") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;