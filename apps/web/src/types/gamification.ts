// Tipos para o Sistema de Gamificação

export type AchievementRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic'
export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'all'
export type LeaderboardCategory = 'general' | 'learning' | 'engagement' | 'social'
export type ActionType = 'course_completed' | 'video_watched' | 'exercise_completed' | 'comment_posted' | 'daily_activity' | 'streak_milestone' | 'achievement_unlocked'

// Categoria de Conquistas
export interface AchievementCategory {
  id: string
  name: string
  description: string
  color: string
  sortOrder: number
  createdAt: string
}

// Critérios de Conquista
export interface AchievementCriteria {
  type: 'course_completion' | 'consecutive_days' | 'total_points' | 'video_hours' | 'comments_count' | 'custom'
  target: number
  metadata?: Record<string, any>
}

// Conquista
export interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  rarity: AchievementRarity
  categoryId: string
  category?: AchievementCategory
  criteria: AchievementCriteria
  pointsReward: number
  isActive: boolean
  createdAt: string
}

// Conquista do Usuário
export interface UserAchievement {
  id: string
  userId: string
  achievementId: string
  achievement?: Achievement
  unlockedAt: string
  metadata?: Record<string, any>
}

// Progresso de Conquista
export interface AchievementProgress {
  achievementId: string
  achievement: Achievement
  currentValue: number
  targetValue: number
  progress: number // 0-100
  isCompleted: boolean
}

// Pontos do Usuário
export interface UserPoints {
  id: string
  userId: string
  totalPoints: number
  currentLevel: number
  todayPoints: number
  pointsToNextLevel: number
  lastActivity: string
  createdAt: string
  updatedAt: string
}

// Streak do Usuário
export interface UserStreak {
  id: string
  userId: string
  currentStreak: number
  longestStreak: number
  lastActivityDate: string
  createdAt: string
  updatedAt: string
}

// Transação de Pontos
export interface PointTransaction {
  id: string
  userId: string
  actionType: ActionType
  pointsEarned: number
  metadata?: Record<string, any>
  createdAt: string
}

// Entrada do Ranking
export interface LeaderboardEntry {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  category: LeaderboardCategory
  period: LeaderboardPeriod
  points: number
  rank: number
  level: number
  calculatedAt: string
}

// Estatísticas do Usuário
export interface UserStats {
  totalPoints: number
  currentLevel: number
  achievementsCount: number
  currentStreak: number
  longestStreak: number
  rank: number
  coursesCompleted: number
  videosWatched: number
  commentsPosted: number
}

// Notificação de Gamificação
export interface GamificationNotification {
  id: string
  type:
    | 'achievement_unlocked'
    | 'level_up'
    | 'streak_milestone'
    | 'rank_change'
    | 'badge_earned'
    | 'points_earned'
  title: string
  message: string
  data?: Record<string, any>
  isRead: boolean
  createdAt: string
}

// Evento de Gamificação
export interface GamificationEvent {
  id: string
  name: string
  description: string
  type: 'competition' | 'challenge' | 'special_event'
  startDate: string
  endDate: string
  rewards: {
    points: number
    achievements?: string[]
    badges?: string[]
  }
  isActive: boolean
  participants?: number
}

// Configuração de Nível
export interface LevelConfig {
  level: number
  pointsRequired: number
  title: string
  benefits: string[]
  badgeIcon?: string
}

// Resposta da API de Pontos
export interface PointsResponse {
  totalPoints: number
  currentLevel: number
  pointsToNextLevel: number
  todayPoints: number
  levelConfig: LevelConfig
}

// Resposta da API de Conquistas
export interface AchievementsResponse {
  achievements: Achievement[]
  userAchievements: UserAchievement[]
  progress: AchievementProgress[]
  categories: AchievementCategory[]
}

// Resposta da API de Ranking
export interface LeaderboardResponse {
  entries: LeaderboardEntry[]
  userRank?: LeaderboardEntry
  totalParticipants: number
  category: LeaderboardCategory
  period: LeaderboardPeriod
}

// Resposta da API de Streaks
export interface StreakResponse {
  currentStreak: number
  longestStreak: number
  lastActivityDate: string
  streakHistory: {
    date: string
    hasActivity: boolean
  }[]
}

// Request para adicionar pontos
export interface AddPointsRequest {
  action: ActionType
  points?: number
  metadata?: Record<string, any>
}

// Request para verificar conquistas
export interface CheckAchievementsRequest {
  userId: string
  action: ActionType
  metadata?: Record<string, any>
}

// Resposta de conquistas desbloqueadas
export interface UnlockedAchievementsResponse {
  unlockedAchievements: Achievement[]
  pointsEarned: number
  newLevel?: number
}

// Filtros do Ranking
export interface LeaderboardFilters {
  category: LeaderboardCategory
  period: LeaderboardPeriod
  limit?: number
  offset?: number
}

// Filtros de Conquistas
export interface AchievementFilters {
  category?: string
  rarity?: AchievementRarity
  unlocked?: boolean
  search?: string
}

// Estado do Dashboard
export interface DashboardData {
  userPoints: UserPoints
  recentAchievements: UserAchievement[]
  streak: UserStreak
  quickStats: UserStats
  upcomingAchievements: AchievementProgress[]
  rankPosition: LeaderboardEntry
}

// Configuração de Raridade
export interface RarityConfig {
  rarity: AchievementRarity
  color: string
  label: string
  glowColor: string
  borderColor: string
}

// Configuração de Animação
export interface AnimationConfig {
  duration: number
  delay?: number
  easing?: string
  particles?: boolean
  sound?: boolean
}

// Tema de Gamificação
export interface GamificationTheme {
  colors: {
    primary: string
    secondary: string
    accent: string
    success: string
    warning: string
    error: string
  }
  rarityColors: Record<AchievementRarity, RarityConfig>
  animations: {
    achievement: AnimationConfig
    levelUp: AnimationConfig
    points: AnimationConfig
  }
}
