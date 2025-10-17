-- Convert course access model to allow multiple options
ALTER TABLE "Course"
  ADD COLUMN "accessModels" "CourseAccessModel"[] NOT NULL DEFAULT ARRAY[]::"CourseAccessModel"[];

UPDATE "Course"
SET "accessModels" = ARRAY["accessModel"];

ALTER TABLE "Course"
  DROP COLUMN "accessModel";
