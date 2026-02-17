-- Add therapist-controlled visibility flag for players in dashboard
ALTER TABLE "MahaLilahRoom"
ADD COLUMN "isVisibleToPlayers" BOOLEAN NOT NULL DEFAULT false;
