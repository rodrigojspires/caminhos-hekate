-- Add recurrence instance id to support per-occurrence registrations
ALTER TABLE "event_registrations" ADD COLUMN "recurrenceInstanceId" TEXT;

-- Backfill existing rows to use the base event id
UPDATE "event_registrations"
SET "recurrenceInstanceId" = "eventId"
WHERE "recurrenceInstanceId" IS NULL;

-- Enforce NOT NULL after backfill
ALTER TABLE "event_registrations" ALTER COLUMN "recurrenceInstanceId" SET NOT NULL;

-- Drop old unique indexes
DROP INDEX IF EXISTS "event_registrations_eventId_userId_key";
DROP INDEX IF EXISTS "event_registrations_eventId_guestEmail_key";

-- Add new unique indexes per occurrence
CREATE UNIQUE INDEX "event_registrations_eventId_userId_recurrenceInstanceId_key"
ON "event_registrations"("eventId", "userId", "recurrenceInstanceId");

CREATE UNIQUE INDEX "event_registrations_eventId_guestEmail_recurrenceInstanceId_key"
ON "event_registrations"("eventId", "guestEmail", "recurrenceInstanceId");

-- Index for faster lookup by occurrence
CREATE INDEX "event_registrations_recurrenceInstanceId_idx"
ON "event_registrations"("recurrenceInstanceId");
