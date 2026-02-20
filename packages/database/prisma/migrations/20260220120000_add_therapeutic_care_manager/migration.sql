-- Add birth date to users
ALTER TABLE "User"
ADD COLUMN IF NOT EXISTS "dateOfBirth" TIMESTAMP(3);

-- Enums for therapeutic manager
DO $$ BEGIN
  CREATE TYPE "TherapeuticProcessStatus" AS ENUM ('IN_ANALYSIS', 'IN_TREATMENT', 'NOT_APPROVED', 'CANCELED', 'FINISHED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TherapeuticSessionStatus" AS ENUM ('PENDING', 'COMPLETED', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TherapeuticSessionMode" AS ENUM ('IN_PERSON', 'DISTANCE', 'ONLINE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TherapeuticPaymentMethod" AS ENUM ('PIX', 'CARD_MERCADO_PAGO', 'NUBANK');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TherapeuticDueDateMode" AS ENUM ('AUTOMATIC_MONTHLY', 'MANUAL');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TherapeuticOrderStatus" AS ENUM ('OPEN', 'PARTIALLY_PAID', 'PAID', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "TherapeuticInstallmentStatus" AS ENUM ('OPEN', 'PAID', 'CANCELED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Therapy catalog
CREATE TABLE IF NOT EXISTS "Therapy" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "value" NUMERIC(10,2) NOT NULL,
  "valuePerSession" BOOLEAN NOT NULL DEFAULT true,
  "defaultSessions" INTEGER NOT NULL DEFAULT 1,
  "singleSessionValue" NUMERIC(10,2),
  "active" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Therapy_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "Therapy_active_idx" ON "Therapy"("active");
CREATE INDEX IF NOT EXISTS "Therapy_name_idx" ON "Therapy"("name");

-- Therapeutic process
CREATE TABLE IF NOT EXISTS "TherapeuticProcess" (
  "id" TEXT NOT NULL,
  "patientUserId" TEXT NOT NULL,
  "createdByUserId" TEXT NOT NULL,
  "status" "TherapeuticProcessStatus" NOT NULL DEFAULT 'IN_ANALYSIS',
  "notes" TEXT,
  "startedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TherapeuticProcess_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TherapeuticProcess_patientUserId_idx" ON "TherapeuticProcess"("patientUserId");
CREATE INDEX IF NOT EXISTS "TherapeuticProcess_createdByUserId_idx" ON "TherapeuticProcess"("createdByUserId");
CREATE INDEX IF NOT EXISTS "TherapeuticProcess_status_idx" ON "TherapeuticProcess"("status");
CREATE INDEX IF NOT EXISTS "TherapeuticProcess_createdAt_idx" ON "TherapeuticProcess"("createdAt");

DO $$ BEGIN
  ALTER TABLE "TherapeuticProcess"
  ADD CONSTRAINT "TherapeuticProcess_patientUserId_fkey"
  FOREIGN KEY ("patientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TherapeuticProcess"
  ADD CONSTRAINT "TherapeuticProcess_createdByUserId_fkey"
  FOREIGN KEY ("createdByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Therapeutic budget items
CREATE TABLE IF NOT EXISTS "TherapeuticBudgetItem" (
  "id" TEXT NOT NULL,
  "processId" TEXT NOT NULL,
  "therapyId" TEXT NOT NULL,
  "quantity" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "discountPercent" NUMERIC(5,2),
  "discountAmount" NUMERIC(10,2),
  "therapyNameSnapshot" TEXT NOT NULL,
  "therapyValueSnapshot" NUMERIC(10,2) NOT NULL,
  "valuePerSessionSnapshot" BOOLEAN NOT NULL,
  "singleSessionValueSnapshot" NUMERIC(10,2),
  "unitValue" NUMERIC(10,2) NOT NULL,
  "grossTotal" NUMERIC(10,2) NOT NULL,
  "discountTotal" NUMERIC(10,2) NOT NULL DEFAULT 0,
  "netTotal" NUMERIC(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TherapeuticBudgetItem_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "TherapeuticBudgetItem_processId_sortOrder_idx" ON "TherapeuticBudgetItem"("processId", "sortOrder");
CREATE INDEX IF NOT EXISTS "TherapeuticBudgetItem_therapyId_idx" ON "TherapeuticBudgetItem"("therapyId");

DO $$ BEGIN
  ALTER TABLE "TherapeuticBudgetItem"
  ADD CONSTRAINT "TherapeuticBudgetItem_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "TherapeuticProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TherapeuticBudgetItem"
  ADD CONSTRAINT "TherapeuticBudgetItem_therapyId_fkey"
  FOREIGN KEY ("therapyId") REFERENCES "Therapy"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Therapeutic sessions
CREATE TABLE IF NOT EXISTS "TherapeuticSession" (
  "id" TEXT NOT NULL,
  "processId" TEXT NOT NULL,
  "budgetItemId" TEXT NOT NULL,
  "sessionNumber" INTEGER NOT NULL,
  "orderIndex" INTEGER NOT NULL,
  "status" "TherapeuticSessionStatus" NOT NULL DEFAULT 'PENDING',
  "therapistUserId" TEXT,
  "sessionDate" TIMESTAMP(3),
  "comments" TEXT,
  "sessionData" TEXT,
  "mode" "TherapeuticSessionMode",
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TherapeuticSession_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TherapeuticSession_processId_budgetItemId_sessionNumber_key"
  ON "TherapeuticSession"("processId", "budgetItemId", "sessionNumber");
CREATE INDEX IF NOT EXISTS "TherapeuticSession_processId_orderIndex_idx" ON "TherapeuticSession"("processId", "orderIndex");
CREATE INDEX IF NOT EXISTS "TherapeuticSession_therapistUserId_idx" ON "TherapeuticSession"("therapistUserId");
CREATE INDEX IF NOT EXISTS "TherapeuticSession_status_idx" ON "TherapeuticSession"("status");

DO $$ BEGIN
  ALTER TABLE "TherapeuticSession"
  ADD CONSTRAINT "TherapeuticSession_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "TherapeuticProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TherapeuticSession"
  ADD CONSTRAINT "TherapeuticSession_budgetItemId_fkey"
  FOREIGN KEY ("budgetItemId") REFERENCES "TherapeuticBudgetItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "TherapeuticSession"
  ADD CONSTRAINT "TherapeuticSession_therapistUserId_fkey"
  FOREIGN KEY ("therapistUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Therapeutic order and installments
CREATE TABLE IF NOT EXISTS "TherapeuticOrder" (
  "id" TEXT NOT NULL,
  "processId" TEXT NOT NULL,
  "status" "TherapeuticOrderStatus" NOT NULL DEFAULT 'OPEN',
  "paymentMethod" "TherapeuticPaymentMethod" NOT NULL,
  "dueDateMode" "TherapeuticDueDateMode" NOT NULL,
  "installmentsCount" INTEGER NOT NULL,
  "firstDueDate" TIMESTAMP(3),
  "totalAmount" NUMERIC(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TherapeuticOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TherapeuticOrder_processId_key" ON "TherapeuticOrder"("processId");
CREATE INDEX IF NOT EXISTS "TherapeuticOrder_status_idx" ON "TherapeuticOrder"("status");
CREATE INDEX IF NOT EXISTS "TherapeuticOrder_createdAt_idx" ON "TherapeuticOrder"("createdAt");

DO $$ BEGIN
  ALTER TABLE "TherapeuticOrder"
  ADD CONSTRAINT "TherapeuticOrder_processId_fkey"
  FOREIGN KEY ("processId") REFERENCES "TherapeuticProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "TherapeuticOrderInstallment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "installmentNumber" INTEGER NOT NULL,
  "amount" NUMERIC(10,2) NOT NULL,
  "dueDate" TIMESTAMP(3) NOT NULL,
  "status" "TherapeuticInstallmentStatus" NOT NULL DEFAULT 'OPEN',
  "paidAt" TIMESTAMP(3),
  "paidAmount" NUMERIC(10,2),
  "paymentNote" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TherapeuticOrderInstallment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TherapeuticOrderInstallment_orderId_installmentNumber_key"
  ON "TherapeuticOrderInstallment"("orderId", "installmentNumber");
CREATE INDEX IF NOT EXISTS "TherapeuticOrderInstallment_status_dueDate_idx"
  ON "TherapeuticOrderInstallment"("status", "dueDate");
CREATE INDEX IF NOT EXISTS "TherapeuticOrderInstallment_orderId_idx" ON "TherapeuticOrderInstallment"("orderId");

DO $$ BEGIN
  ALTER TABLE "TherapeuticOrderInstallment"
  ADD CONSTRAINT "TherapeuticOrderInstallment_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "TherapeuticOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
