-- Orders and installments for therapeutic single sessions
CREATE TABLE IF NOT EXISTS "TherapeuticSingleSessionOrder" (
  "id" TEXT NOT NULL,
  "singleSessionId" TEXT NOT NULL,
  "status" "TherapeuticOrderStatus" NOT NULL DEFAULT 'OPEN',
  "paymentMethod" "TherapeuticPaymentMethod" NOT NULL,
  "dueDateMode" "TherapeuticDueDateMode" NOT NULL,
  "installmentsCount" INTEGER NOT NULL,
  "firstDueDate" TIMESTAMP(3),
  "totalAmount" NUMERIC(10,2) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "TherapeuticSingleSessionOrder_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TherapeuticSingleSessionOrder_singleSessionId_key"
  ON "TherapeuticSingleSessionOrder"("singleSessionId");
CREATE INDEX IF NOT EXISTS "TherapeuticSingleSessionOrder_status_idx"
  ON "TherapeuticSingleSessionOrder"("status");
CREATE INDEX IF NOT EXISTS "TherapeuticSingleSessionOrder_createdAt_idx"
  ON "TherapeuticSingleSessionOrder"("createdAt");

DO $$ BEGIN
  ALTER TABLE "TherapeuticSingleSessionOrder"
  ADD CONSTRAINT "TherapeuticSingleSessionOrder_singleSessionId_fkey"
  FOREIGN KEY ("singleSessionId") REFERENCES "TherapeuticSingleSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS "TherapeuticSingleSessionInstallment" (
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

  CONSTRAINT "TherapeuticSingleSessionInstallment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "TherapeuticSingleSessionInstallment_orderId_installmentNumber_key"
  ON "TherapeuticSingleSessionInstallment"("orderId", "installmentNumber");
CREATE INDEX IF NOT EXISTS "TherapeuticSingleSessionInstallment_status_dueDate_idx"
  ON "TherapeuticSingleSessionInstallment"("status", "dueDate");
CREATE INDEX IF NOT EXISTS "TherapeuticSingleSessionInstallment_orderId_idx"
  ON "TherapeuticSingleSessionInstallment"("orderId");

DO $$ BEGIN
  ALTER TABLE "TherapeuticSingleSessionInstallment"
  ADD CONSTRAINT "TherapeuticSingleSessionInstallment_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "TherapeuticSingleSessionOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
