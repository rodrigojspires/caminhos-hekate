-- Create new enums for event access and mode
CREATE TYPE "EventAccessType" AS ENUM ('FREE', 'PAID', 'TIER');
CREATE TYPE "EventMode" AS ENUM ('ONLINE', 'IN_PERSON', 'HYBRID');

-- Add access/mode columns to events
ALTER TABLE "events"
  ADD COLUMN "access_type" "EventAccessType" NOT NULL DEFAULT 'FREE',
  ADD COLUMN "price" DECIMAL(10,2),
  ADD COLUMN "free_tiers" "SubscriptionTier"[] DEFAULT ARRAY[]::"SubscriptionTier"[],
  ADD COLUMN "mode" "EventMode" NOT NULL DEFAULT 'ONLINE';
