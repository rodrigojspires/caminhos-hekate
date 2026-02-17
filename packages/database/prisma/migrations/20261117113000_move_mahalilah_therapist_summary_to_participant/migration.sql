ALTER TABLE "MahaLilahParticipant"
ADD COLUMN "therapistSummary" TEXT;

UPDATE "MahaLilahParticipant" participant
SET "therapistSummary" = room."therapistSummary"
FROM "MahaLilahRoom" room
WHERE participant."roomId" = room."id"
  AND room."therapistSummary" IS NOT NULL;

ALTER TABLE "MahaLilahRoom"
DROP COLUMN "therapistSummary";
