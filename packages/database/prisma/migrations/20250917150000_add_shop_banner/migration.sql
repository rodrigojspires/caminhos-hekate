-- CreateTable
CREATE TABLE IF NOT EXISTS "ShopBanner" (
  "id" TEXT PRIMARY KEY,
  "title" TEXT NOT NULL,
  "subtitle" TEXT,
  "imageUrl" TEXT NOT NULL,
  "linkUrl" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "order" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Helper function to keep updatedAt fresh
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger safely
DROP TRIGGER IF EXISTS set_shopbanner_updated_at ON "ShopBanner";
CREATE TRIGGER set_shopbanner_updated_at
BEFORE UPDATE ON "ShopBanner"
FOR EACH ROW
EXECUTE PROCEDURE set_updated_at();
