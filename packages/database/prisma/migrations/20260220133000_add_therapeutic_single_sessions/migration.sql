-- Therapeutic single sessions (outside therapeutic process)
CREATE TABLE IF NOT EXISTS "TherapeuticSingleSession" (
  "id" TEXT NOT NULL,
  "patientUserId" TEXT NOT NULL,
  "therapyId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "therapistUserId" TEXT,
  "sessionDate" TIMESTAMP(3) NOT NULL,
  "mode" "TherapeuticSessionMode",
  "status" "TherapeuticSessionStatus" NOT NULL DEFAULT 'COMPLETED',
  "comments" TEXT,
  "sessionData" TEXT,
  "therapyNameSnapshot" TEXT NOT NULL,
  "therapyValueSnapshot" NUMERIC(10,2) NOT NULL,
  "valuePerSessionSnapshot" BOOLEAN NOT NULL,
  "singleSessionValueSnapshot" NUMERIC(10,2),
  "chargedAmount" NUMERIC(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TherapeuticSingleSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TherapeuticSingleSession_patientUserId_sessionDate_idx"
  ON "TherapeuticSingleSession"("patientUserId", "sessionDate");
CREATE INDEX IF NOT EXISTS "TherapeuticSingleSession_therapyId_idx"
  ON "TherapeuticSingleSession"("therapyId");
CREATE INDEX IF NOT EXISTS "TherapeuticSingleSession_createdByUserId_idx"
  ON "TherapeuticSingleSession"("createdByUserId");
CREATE INDEX IF NOT EXISTS "TherapeuticSingleSession_therapistUserId_idx"
  ON "TherapeuticSingleSession"("therapistUserId");
CREATE INDEX IF NOT EXISTS "TherapeuticSingleSession_status_idx"
  ON "TherapeuticSingleSession"("status");

DO $$ BEGIN
  ALTER TABLE "TherapeuticSingleSession"
  ADD CONSTRAINT "TherapeuticSingleSession_patientUserId_fkey"
  FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TherapeuticSingleSession"
  ADD CONSTRAINT "TherapeuticSingleSession_therapyId_fkey"
  FOREIGN KEY ("therapyId") REFERENCES "Therapy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TherapeuticSingleSession"
  ADD CONSTRAINT "TherapeuticSingleSession_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TherapeuticSingleSession"
  ADD CONSTRAINT "TherapeuticSingleSession_therapistUserId_fkey"
  FOREIGN KEY ("therapistUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
