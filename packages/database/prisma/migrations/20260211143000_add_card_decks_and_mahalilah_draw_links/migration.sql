-- Create reusable deck tables for Maha Lilah and Caminhos de Hekate
CREATE TABLE "CardDeck" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "imageDirectory" TEXT NOT NULL,
  "imageExtension" TEXT NOT NULL DEFAULT 'jpg',
  "useInMahaLilah" BOOLEAN NOT NULL DEFAULT false,
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CardDeck_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CardDeckCard" (
  "id" TEXT NOT NULL,
  "deckId" TEXT NOT NULL,
  "cardNumber" INTEGER NOT NULL,
  "description" TEXT NOT NULL,
  "keywords" TEXT NOT NULL,
  "observation" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "CardDeckCard_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "CardDeck_name_key" ON "CardDeck"("name");
CREATE INDEX "CardDeck_useInMahaLilah_idx" ON "CardDeck"("useInMahaLilah");
CREATE INDEX "CardDeck_createdByUserId_idx" ON "CardDeck"("createdByUserId");
CREATE UNIQUE INDEX "CardDeckCard_deckId_cardNumber_key" ON "CardDeckCard"("deckId", "cardNumber");
CREATE INDEX "CardDeckCard_deckId_idx" ON "CardDeckCard"("deckId");
CREATE INDEX "CardDeckCard_cardNumber_idx" ON "CardDeckCard"("cardNumber");

ALTER TABLE "CardDeck"
  ADD CONSTRAINT "CardDeck_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CardDeckCard"
  ADD CONSTRAINT "CardDeckCard_deckId_fkey"
  FOREIGN KEY ("deckId") REFERENCES "CardDeck"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Extend Maha Lilah card draws to reference canonical card records
ALTER TABLE "MahaLilahCardDraw"
  ADD COLUMN "deckId" TEXT,
  ADD COLUMN "cardId" TEXT;

CREATE INDEX "MahaLilahCardDraw_moveId_idx" ON "MahaLilahCardDraw"("moveId");
CREATE INDEX "MahaLilahCardDraw_deckId_idx" ON "MahaLilahCardDraw"("deckId");
CREATE INDEX "MahaLilahCardDraw_cardId_idx" ON "MahaLilahCardDraw"("cardId");

ALTER TABLE "MahaLilahCardDraw"
  ADD CONSTRAINT "MahaLilahCardDraw_deckId_fkey"
  FOREIGN KEY ("deckId") REFERENCES "CardDeck"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MahaLilahCardDraw"
  ADD CONSTRAINT "MahaLilahCardDraw_cardId_fkey"
  FOREIGN KEY ("cardId") REFERENCES "CardDeckCard"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
