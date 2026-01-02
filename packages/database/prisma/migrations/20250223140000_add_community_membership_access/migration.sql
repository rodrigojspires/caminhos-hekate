-- Add paid access window for community memberships
ALTER TABLE "community_memberships"
ADD COLUMN "paidUntil" TIMESTAMP(3),
ADD COLUMN "cancelledAt" TIMESTAMP(3);
