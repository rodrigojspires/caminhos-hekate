import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
  Achievement,
  UserAchievement,
  UserPoints,
  UserStreak,
  LeaderboardEntry,
  PointTransaction,
  UserStats,
  GamificationNotification,
  LeaderboardPeriod,
  LeaderboardCategory,
  AchievementRarity,
} from '@/types/gamification';

interface GamificationState {
  // Estado dos dados
  userPoints: UserPoints | null;
  achievements: Achievement[];
  userAchievements: UserAchievement[];
  userStreak: UserStreak | null;
  leaderboard: LeaderboardEntry[];
  leaderboardPosition: Record<LeaderboardCategory, number> | null;
  recentTransactions: PointTransaction[];
  userStats: UserStats | null;
  notifications: GamificationNotification[];

  // Estados de loading
  isLoadingPoints: boolean;
  isLoadingAchievements: boolean;
  isLoadingStreak: boolean;
  isLoadingLeaderboard: boolean;
  isLoadingStats: boolean;

  // Estados de erro
  pointsError: string | null;
  achievementsError: string | null;
  streakError: string | null;
  leaderboardError: string | null;
  statsError: string | null;

  // Filtros e configurações
  leaderboardPeriod: LeaderboardPeriod;
  leaderboardCategory: LeaderboardCategory;
  achievementFilter: {
    category?: string;
    rarity?: AchievementRarity;
    unlocked?: boolean;
  };

  // Ações para pontos
  fetchUserPoints: () => Promise<void>;
  addPoints: (points: number, reason: string, description?: string) => Promise<void>;

  // Ações para conquistas
  fetchAchievements: (filters?: {
    category?: string;
    rarity?: AchievementRarity;
    unlocked?: boolean;
  }) => Promise<void>;
  unlockAchievement: (achievementId: string, progress?: number) => Promise<void>;

  // Ações para streaks
  fetchUserStreak: () => Promise<void>;
  updateStreak: (activityType: string, metadata?: Record<string, any>) => Promise<void>;

  // Ações para leaderboard
  fetchLeaderboard: (period?: LeaderboardPeriod, category?: LeaderboardCategory) => Promise<void>;
  setLeaderboardFilters: (period: LeaderboardPeriod, category: LeaderboardCategory) => void;

  // Ações para estatísticas
  fetchUserStats: () => Promise<void>;

  // Ações para notificações
  addNotification: (notification: Omit<GamificationNotification, 'id' | 'createdAt'>) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;

  // Ações de reset
  resetStore: () => void;
}

const initialState = {
  userPoints: null,
  achievements: [],
  userAchievements: [],
  userStreak: null,
  leaderboard: [],
  leaderboardPosition: null,
  recentTransactions: [],
  userStats: null,
  notifications: [],

  isLoadingPoints: false,
  isLoadingAchievements: false,
  isLoadingStreak: false,
  isLoadingLeaderboard: false,
  isLoadingStats: false,

  pointsError: null,
  achievementsError: null,
  streakError: null,
  leaderboardError: null,
  statsError: null,

  leaderboardPeriod: 'all' as LeaderboardPeriod,
  leaderboardCategory: 'general' as LeaderboardCategory,
  achievementFilter: {},
};

export const useGamificationStore = create<GamificationState>()(devtools(
  (set, get) => ({
    ...initialState,

    // Ações para pontos
    fetchUserPoints: async () => {
      set({ isLoadingPoints: true, pointsError: null });
      try {
        const response = await fetch('/api/gamification/points?includeTransactions=true');
        if (!response.ok) {
          throw new Error('Failed to fetch user points');
        }
        const data = await response.json();
        set({
          userPoints: data.userPoints,
          recentTransactions: data.transactions || [],
          isLoadingPoints: false,
        });
      } catch (error) {
        set({
          pointsError: error instanceof Error ? error.message : 'Unknown error',
          isLoadingPoints: false,
        });
      }
    },

    addPoints: async (points: number, reason: string, description?: string) => {
      try {
        const response = await fetch('/api/gamification/points', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ points, reason, description }),
        });
        if (!response.ok) {
          throw new Error('Failed to add points');
        }
        const data = await response.json();
        set({
          userPoints: data.userPoints,
          recentTransactions: [data.transaction, ...get().recentTransactions].slice(0, 50),
        });

        // Adicionar notificação
        get().addNotification({
          type: 'achievement_unlocked',
          title: 'Pontos Ganhos!',
          message: `Você ganhou ${points} pontos por ${reason}`,
          isRead: false,
          data: {
            points,
            reason
          }
        });
      } catch (error) {
        set({
          pointsError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    // Ações para conquistas
    fetchAchievements: async (filters = {}) => {
      set({ isLoadingAchievements: true, achievementsError: null, achievementFilter: filters });
      try {
        const params = new URLSearchParams();
        if (filters.category) params.append('category', filters.category);
        if (filters.rarity) params.append('rarity', filters.rarity);
        if (filters.unlocked !== undefined) params.append('unlocked', filters.unlocked.toString());

        const response = await fetch(`/api/gamification/achievements?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch achievements');
        }
        const data = await response.json();
        set({
          achievements: data.achievements,
          isLoadingAchievements: false,
        });
      } catch (error) {
        set({
          achievementsError: error instanceof Error ? error.message : 'Unknown error',
          isLoadingAchievements: false,
        });
      }
    },

    unlockAchievement: async (achievementId: string, progress = 100) => {
      try {
        const response = await fetch('/api/gamification/achievements/unlock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ achievementId, progress }),
        });
        if (!response.ok) {
          throw new Error('Failed to unlock achievement');
        }
        const data = await response.json();

        // Atualizar conquistas - não modificamos o objeto Achievement diretamente
        // A informação de desbloqueio fica em userAchievements
        set({ achievements: get().achievements });

        // Adicionar notificação se foi desbloqueada
        if (data.isNewUnlock && progress >= 100) {
          get().addNotification({
            type: 'achievement_unlocked',
            title: 'Conquista Desbloqueada!',
            message: `Você desbloqueou: ${data.userAchievement.achievement.title}`,
            isRead: false,
            data: { achievement: data.userAchievement.achievement },
          });
        }

        // Atualizar pontos se foram adicionados
        if (data.points > 0) {
          await get().fetchUserPoints();
        }
      } catch (error) {
        set({
          achievementsError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    // Ações para streaks
    fetchUserStreak: async () => {
      set({ isLoadingStreak: true, streakError: null });
      try {
        const response = await fetch('/api/gamification/streaks');
        if (!response.ok) {
          throw new Error('Failed to fetch user streak');
        }
        const data = await response.json();
        set({
          userStreak: data.userStreak,
          isLoadingStreak: false,
        });
      } catch (error) {
        set({
          streakError: error instanceof Error ? error.message : 'Unknown error',
          isLoadingStreak: false,
        });
      }
    },

    updateStreak: async (activityType: string, metadata = {}) => {
      try {
        const response = await fetch('/api/gamification/streaks', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activityType, metadata }),
        });
        if (!response.ok) {
          throw new Error('Failed to update streak');
        }
        const data = await response.json();
        set({ userStreak: data.userStreak });

        // Adicionar notificação se o streak aumentou
        if (data.streakIncreased) {
          get().addNotification({
            type: 'streak_milestone',
            title: 'Sequência Mantida!',
            message: `Sua sequência atual é de ${data.userStreak.currentStreak} dias`,
            isRead: false,
            data: { streak: data.userStreak.currentStreak },
          });
        }

        // Atualizar pontos se foram adicionados
        if (data.points > 0) {
          await get().fetchUserPoints();
        }
      } catch (error) {
        set({
          streakError: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    },

    // Ações para leaderboard
    fetchLeaderboard: async (period = 'all', category = 'general') => {
      set({ isLoadingLeaderboard: true, leaderboardError: null });
      try {
        // Mapear filtros do frontend para os parâmetros esperados pela API
        const categoryMap: Record<LeaderboardCategory, string> = {
          general: 'POINTS',
          learning: 'ACHIEVEMENTS',
          engagement: 'BADGES',
          social: 'BADGES',
        };
        const periodMap: Record<LeaderboardPeriod, string> = {
          daily: 'DAILY',
          weekly: 'WEEKLY',
          monthly: 'MONTHLY',
          all: 'ALL_TIME',
        };

        const params = new URLSearchParams({
          period: periodMap[period],
          category: categoryMap[category],
          limit: '50',
        });
        const response = await fetch(`/api/gamification/leaderboard?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch leaderboard');
        }
        const data = await response.json();

        // Mapear resposta da API para o tipo LeaderboardEntry utilizado no frontend
        const mapped: LeaderboardEntry[] = (data.leaderboard || []).map((item: any) => ({
          id: `${item.userId}-${data.period}-${data.category}`,
          userId: item.userId,
          userName: item.name || '',
          userAvatar: item.image || undefined,
          category,
          period,
          points: item.score || 0,
          rank: item.rank,
          level: item.level || 1,
          calculatedAt: new Date().toISOString(),
        }));

        const prevPositions = get().leaderboardPosition || {} as Record<LeaderboardCategory, number>;
        const nextPositions: Record<LeaderboardCategory, number> = { ...prevPositions };
        if (typeof data.userRank === 'number') {
          nextPositions[category] = data.userRank;
        }

        set({
          leaderboard: mapped,
          leaderboardPosition: Object.keys(nextPositions).length ? nextPositions : get().leaderboardPosition,
          leaderboardPeriod: period,
          leaderboardCategory: category,
          isLoadingLeaderboard: false,
        });
      } catch (error) {
        set({
          leaderboardError: error instanceof Error ? error.message : 'Unknown error',
          isLoadingLeaderboard: false,
        });
      }
    },

    setLeaderboardFilters: (period: LeaderboardPeriod, category: LeaderboardCategory) => {
      set({ leaderboardPeriod: period, leaderboardCategory: category });
      get().fetchLeaderboard(period, category);
    },

    // Ações para estatísticas
    fetchUserStats: async () => {
      set({ isLoadingStats: true, statsError: null });
      try {
        const response = await fetch('/api/gamification/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch user stats');
        }
        const data = await response.json();
        set({
          userStats: data,
          isLoadingStats: false,
        });
      } catch (error) {
        set({
          statsError: error instanceof Error ? error.message : 'Unknown error',
          isLoadingStats: false,
        });
      }
    },

    // Ações para notificações
    addNotification: (notification) => {
      const newNotification: GamificationNotification = {
        ...notification,
        id: Math.random().toString(36).substr(2, 9),
        createdAt: new Date().toISOString(),
      };
      set({
        notifications: [newNotification, ...get().notifications].slice(0, 10),
      });
    },

    removeNotification: (id: string) => {
      set({
        notifications: get().notifications.filter(n => n.id !== id),
      });
    },

    clearNotifications: () => {
      set({ notifications: [] });
    },

    // Reset store
    resetStore: () => {
      set(initialState);
    },
  }),
  {
    name: 'gamification-store',
  }
));

// Hook para inicializar dados
export const useInitializeGamification = () => {
  const {
    fetchUserPoints,
    fetchAchievements,
    fetchUserStreak,
    fetchUserStats,
  } = useGamificationStore();

  const initialize = async () => {
    await Promise.all([
      fetchUserPoints(),
      fetchAchievements(),
      fetchUserStreak(),
      fetchUserStats(),
    ]);
  };

  return { initialize };
};