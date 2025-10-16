-- Add CourseAccessModel enum
DO $$ BEGIN
  CREATE TYPE "CourseAccessModel" AS ENUM ('FREE', 'ONE_TIME', 'SUBSCRIPTION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Add column to Course
ALTER TABLE "Course"
  ADD COLUMN IF NOT EXISTS "accessModel" "CourseAccessModel" NOT NULL DEFAULT 'ONE_TIME';

-- Add videoStorage column to Lesson
ALTER TABLE "Lesson"
  ADD COLUMN IF NOT EXISTS "videoStorage" JSONB;

-- Add order column to Asset
ALTER TABLE "Asset"
  ADD COLUMN IF NOT EXISTS "order" INTEGER DEFAULT 1;
