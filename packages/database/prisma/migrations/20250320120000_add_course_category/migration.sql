-- Add optional category reference to courses
ALTER TABLE "Course"
ADD COLUMN "categoryId" TEXT;

ALTER TABLE "Course"
ADD CONSTRAINT "Course_categoryId_fkey"
FOREIGN KEY ("categoryId") REFERENCES "Category"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
