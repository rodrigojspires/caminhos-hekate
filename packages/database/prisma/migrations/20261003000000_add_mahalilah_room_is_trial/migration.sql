ALTER TABLE "MahaLilahRoom"
ADD COLUMN "isTrial" BOOLEAN NOT NULL DEFAULT false;

UPDATE "MahaLilahRoom"
SET "isTrial" = true
WHERE "planType" = 'SINGLE_SESSION'
  AND "orderId" IS NULL
  AND "subscriptionId" IS NULL
  AND "maxParticipants" = 1
  AND "therapistPlays" = true
  AND (
    "consentTextVersion" IS NULL
    OR "consentTextVersion" NOT LIKE '%::admin%'
  );
