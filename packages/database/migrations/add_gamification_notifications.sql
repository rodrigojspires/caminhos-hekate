-- Migration: Add Gamification Notifications and Badges System
-- Created: $(date)

-- Create notification enums
CREATE TYPE "NotificationType" AS ENUM (
  'ACHIEVEMENT_UNLOCKED',
  'LEVEL_UP',
  'POINTS_EARNED',
  'STREAK_MILESTONE',
  'BADGE_EARNED',
  'LEADERBOARD_POSITION',
  'DAILY_CHALLENGE',
  'WEEKLY_SUMMARY',
  'GROUP_ACHIEVEMENT',
  'SPECIAL_EVENT'
);

CREATE TYPE "NotificationPriority" AS ENUM (
  'LOW',
  'MEDIUM',
  'HIGH',
  'URGENT'
);

CREATE TYPE "BadgeRarity" AS ENUM (
  'COMMON',
  'UNCOMMON',
  'RARE',
  'EPIC',
  'LEGENDARY',
  'MYTHIC'
);

CREATE TYPE "RewardType" AS ENUM (
  'EXTRA_POINTS',
  'PREMIUM_DAYS',
  'SPECIAL_BADGE',
  'COURSE_ACCESS',
  'DISCOUNT_COUPON',
  'EXCLUSIVE_CONTENT'
);

-- Create gamification_notifications table
CREATE TABLE "gamification_notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "data" JSONB,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "isPush" BOOLEAN NOT NULL DEFAULT false,
    "pushSentAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gamification_notifications_pkey" PRIMARY KEY ("id")
);

-- Create badges table
CREATE TABLE "badges" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#3B82F6',
    "rarity" "BadgeRarity" NOT NULL DEFAULT 'COMMON',
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "criteria" JSONB NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "badges_pkey" PRIMARY KEY ("id")
);

-- Create user_badges table
CREATE TABLE "user_badges" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "badgeId" TEXT NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metadata" JSONB,

    CONSTRAINT "user_badges_pkey" PRIMARY KEY ("id")
);

-- Create achievement_rewards table
CREATE TABLE "achievement_rewards" (
    "id" TEXT NOT NULL,
    "achievementId" TEXT NOT NULL,
    "rewardType" "RewardType" NOT NULL,
    "rewardValue" INTEGER NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "achievement_rewards_pkey" PRIMARY KEY ("id")
);

-- Create notification_templates table
CREATE TABLE "notification_templates" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "emailSubject" TEXT,
    "emailBody" TEXT,
    "pushTitle" TEXT,
    "pushBody" TEXT,
    "variables" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_templates_pkey" PRIMARY KEY ("id")
);

-- Create unique constraints
ALTER TABLE "badges" ADD CONSTRAINT "badges_name_key" UNIQUE ("name");
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_badgeId_key" UNIQUE ("userId", "badgeId");
ALTER TABLE "notification_templates" ADD CONSTRAINT "notification_templates_type_key" UNIQUE ("type");

-- Create indexes for gamification_notifications
CREATE INDEX "gamification_notifications_userId_idx" ON "gamification_notifications"("userId");
CREATE INDEX "gamification_notifications_type_idx" ON "gamification_notifications"("type");
CREATE INDEX "gamification_notifications_isRead_idx" ON "gamification_notifications"("isRead");
CREATE INDEX "gamification_notifications_isPush_idx" ON "gamification_notifications"("isPush");
CREATE INDEX "gamification_notifications_priority_idx" ON "gamification_notifications"("priority");
CREATE INDEX "gamification_notifications_createdAt_idx" ON "gamification_notifications"("createdAt");

-- Create indexes for badges
CREATE INDEX "badges_rarity_idx" ON "badges"("rarity");
CREATE INDEX "badges_category_idx" ON "badges"("category");
CREATE INDEX "badges_isActive_idx" ON "badges"("isActive");

-- Create indexes for user_badges
CREATE INDEX "user_badges_userId_idx" ON "user_badges"("userId");
CREATE INDEX "user_badges_badgeId_idx" ON "user_badges"("badgeId");
CREATE INDEX "user_badges_earnedAt_idx" ON "user_badges"("earnedAt");

-- Create indexes for achievement_rewards
CREATE INDEX "achievement_rewards_achievementId_idx" ON "achievement_rewards"("achievementId");
CREATE INDEX "achievement_rewards_rewardType_idx" ON "achievement_rewards"("rewardType");
CREATE INDEX "achievement_rewards_isActive_idx" ON "achievement_rewards"("isActive");

-- Create indexes for notification_templates
CREATE INDEX "notification_templates_isActive_idx" ON "notification_templates"("isActive");

-- Add foreign key constraints
ALTER TABLE "gamification_notifications" ADD CONSTRAINT "gamification_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "user_badges" ADD CONSTRAINT "user_badges_badgeId_fkey" FOREIGN KEY ("badgeId") REFERENCES "badges"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "achievement_rewards" ADD CONSTRAINT "achievement_rewards_achievementId_fkey" FOREIGN KEY ("achievementId") REFERENCES "achievements"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Create trigger for updating updatedAt timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_gamification_notifications_updated_at BEFORE UPDATE ON "gamification_notifications" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_badges_updated_at BEFORE UPDATE ON "badges" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_achievement_rewards_updated_at BEFORE UPDATE ON "achievement_rewards" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notification_templates_updated_at BEFORE UPDATE ON "notification_templates" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert default notification templates
INSERT INTO "notification_templates" ("id", "type", "title", "message", "emailSubject", "emailBody", "pushTitle", "pushBody", "variables") VALUES
('nt_achievement_unlocked', 'ACHIEVEMENT_UNLOCKED', 'Conquista Desbloqueada!', 'Parabéns! Você desbloqueou a conquista "{achievementName}"', 'Nova Conquista Desbloqueada - {achievementName}', 'Parabéns! Você acabou de desbloquear uma nova conquista: {achievementName}. Continue assim!', 'Conquista Desbloqueada!', 'Você desbloqueou: {achievementName}', ARRAY['achievementName', 'achievementDescription', 'points']),
('nt_level_up', 'LEVEL_UP', 'Subiu de Nível!', 'Incrível! Você alcançou o nível {level}', 'Parabéns pelo Novo Nível!', 'Você subiu para o nível {level}! Continue sua jornada de aprendizado.', 'Nível {level}!', 'Parabéns pelo novo nível!', ARRAY['level', 'previousLevel', 'totalPoints']),
('nt_points_earned', 'POINTS_EARNED', 'Pontos Ganhos!', 'Você ganhou {points} pontos!', NULL, NULL, '+{points} pontos', 'Continue assim!', ARRAY['points', 'reason', 'totalPoints']),
('nt_streak_milestone', 'STREAK_MILESTONE', 'Marco de Sequência!', 'Impressionante! Você manteve sua sequência por {days} dias consecutivos!', 'Marco de Sequência Alcançado!', 'Parabéns por manter sua sequência de {streakType} por {days} dias consecutivos!', 'Sequência de {days} dias!', 'Continue mantendo o ritmo!', ARRAY['days', 'streakType', 'longestStreak']),
('nt_badge_earned', 'BADGE_EARNED', 'Badge Conquistado!', 'Você conquistou o badge "{badgeName}"!', 'Novo Badge Conquistado!', 'Parabéns! Você conquistou o badge {badgeName}. {badgeDescription}', 'Badge Conquistado!', '{badgeName}', ARRAY['badgeName', 'badgeDescription', 'rarity']);

-- Insert default badges
INSERT INTO "badges" ("id", "name", "description", "icon", "color", "rarity", "category", "criteria") VALUES
('badge_first_achievement', 'Primeiro Passo', 'Desbloqueou sua primeira conquista', '🏆', '#FFD700', 'COMMON', 'milestone', '{"type": "achievement_count", "value": 1}'),
('badge_streak_7', 'Dedicado', 'Manteve sequência por 7 dias', '🔥', '#FF6B35', 'UNCOMMON', 'streak', '{"type": "streak_days", "value": 7}'),
('badge_streak_30', 'Persistente', 'Manteve sequência por 30 dias', '⚡', '#FF4500', 'RARE', 'streak', '{"type": "streak_days", "value": 30}'),
('badge_points_1000', 'Milhar', 'Acumulou 1000 pontos', '💎', '#4169E1', 'RARE', 'points', '{"type": "total_points", "value": 1000}'),
('badge_early_adopter', 'Pioneiro', 'Um dos primeiros usuários da plataforma', '🚀', '#9932CC', 'LEGENDARY', 'special', '{"type": "registration_date", "before": "2024-12-31"}');