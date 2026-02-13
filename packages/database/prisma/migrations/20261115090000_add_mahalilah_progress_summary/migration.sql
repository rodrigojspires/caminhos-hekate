ALTER TABLE "MahaLilahPlan"
ADD COLUMN "progressSummaryEveryMoves" INTEGER NOT NULL DEFAULT 15;

ALTER TABLE "MahaLilahAiReport"
ADD COLUMN "windowStartMoveIndex" INTEGER,
ADD COLUMN "windowEndMoveIndex" INTEGER;

ALTER TYPE "MahaLilahAiReportKind" ADD VALUE IF NOT EXISTS 'PROGRESS';

CREATE INDEX "MahaLilahAiReport_roomId_participantId_kind_windowEndMoveIndex_idx"
ON "MahaLilahAiReport"("roomId", "participantId", "kind", "windowEndMoveIndex");
