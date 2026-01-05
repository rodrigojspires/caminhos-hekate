-- CreateEnum
CREATE TYPE "GamificationGoalType" AS ENUM ('COURSE', 'COMMUNITY', 'PRODUCT');

-- CreateEnum
CREATE TYPE "GamificationGoalMetric" AS ENUM ('LESSONS_COMPLETED', 'COMMUNITY_MESSAGES', 'PRODUCT_PURCHASES');

-- CreateEnum
CREATE TYPE "GamificationGoalRewardMode" AS ENUM ('POINTS', 'BADGE', 'BOTH');

-- CreateTable
CREATE TABLE "gamification_goals" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "goal_type" "GamificationGoalType" NOT NULL,
    "metric" "GamificationGoalMetric" NOT NULL,
    "target_value" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "reward_mode" "GamificationGoalRewardMode" NOT NULL DEFAULT 'BOTH',
    "points" INTEGER NOT NULL DEFAULT 0,
    "achievement_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_goals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "gamification_goal_progress" (
    "id" TEXT NOT NULL,
    "goal_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "current_value" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMP(3),
    "last_evaluated_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_goal_progress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gamification_goals_goalType_idx" ON "gamification_goals"("goal_type");
CREATE INDEX "gamification_goals_metric_idx" ON "gamification_goals"("metric");
CREATE INDEX "gamification_goals_isActive_idx" ON "gamification_goals"("is_active");
CREATE INDEX "gamification_goals_startDate_endDate_idx" ON "gamification_goals"("start_date", "end_date");

-- CreateIndex
CREATE UNIQUE INDEX "gamification_goal_progress_goalId_userId_key" ON "gamification_goal_progress"("goal_id", "user_id");
CREATE INDEX "gamification_goal_progress_userId_idx" ON "gamification_goal_progress"("user_id");
CREATE INDEX "gamification_goal_progress_goalId_idx" ON "gamification_goal_progress"("goal_id");

-- AddForeignKey
ALTER TABLE "gamification_goals" ADD CONSTRAINT "gamification_goals_achievement_id_fkey"
  FOREIGN KEY ("achievement_id") REFERENCES "achievements"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_goal_progress" ADD CONSTRAINT "gamification_goal_progress_goal_id_fkey"
  FOREIGN KEY ("goal_id") REFERENCES "gamification_goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "gamification_goal_progress" ADD CONSTRAINT "gamification_goal_progress_user_id_fkey"
  FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
