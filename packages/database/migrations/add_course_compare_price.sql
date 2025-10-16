-- Add comparePrice column to Course table if it does not exist
ALTER TABLE "Course"
ADD COLUMN IF NOT EXISTS "comparePrice" DECIMAL(10,2);
