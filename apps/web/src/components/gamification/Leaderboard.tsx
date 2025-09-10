'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown,
  Star,
  Flame,
  Users,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeaderboardEntry as LeaderboardEntryRow } from './leaderboard/LeaderboardEntry';
import { RankingFilters } from './leaderboard/RankingFilters';
import { UserRankCard } from './leaderboard/UserRankCard';
import { useGamificationStore } from '@/stores/gamificationStore';
import { LeaderboardCategory, LeaderboardPeriod } from '@/types/gamification';

const CATEGORY_CONFIG = {
  general: { label: 'Geral', icon: Trophy },
  learning: { label: 'Aprendizado', icon: Star },
  engagement: { label: 'Engajamento', icon: Flame },
  social: { label: 'Social', icon: Users }
};

// Legacy interfaces (não utilizadas). Mantidas para referência.
interface LegacyLeaderboardEntry {
  rank: number
  userId: string
  name: string
  email: string
  image?: string
  score: number
  level: number
  achievements: number
  badges: number
}

interface LegacyLeaderboardData {
  leaderboard: LegacyLeaderboardEntry[]
  userRank: number | null
  totalUsers: number
  category: string
  period: string
  page: number
  limit: number
  totalPages: number
}

interface LeaderboardProps {
  userId?: string
}

export function Leaderboard({ userId }: LeaderboardProps) {
  const {
    leaderboard,
    isLoadingLeaderboard,
    fetchLeaderboard,
  } = useGamificationStore()
  
  const [category, setCategory] = useState<LeaderboardCategory>('general')
  const [period, setPeriod] = useState<LeaderboardPeriod>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [minLevel, setMinLevel] = useState<number | undefined>()
  const [maxLevel, setMaxLevel] = useState<number | undefined>()
  const [showOnlyFriends, setShowOnlyFriends] = useState(false)

  useEffect(() => {
    fetchLeaderboard(period, category)
  }, [category, period, fetchLeaderboard])

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />
      default:
        return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
    }
  }

  const getRankBadgeColor = (rank: number) => {
    if (rank <= 3) return 'bg-gradient-to-r from-yellow-400 to-yellow-600'
    if (rank <= 10) return 'bg-gradient-to-r from-purple-400 to-purple-600'
    if (rank <= 50) return 'bg-gradient-to-r from-blue-400 to-blue-600'
    return 'bg-gradient-to-r from-gray-400 to-gray-600'
  }

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'POINTS':
        return <Star className="h-4 w-4" />
      case 'ACHIEVEMENTS':
        return <Trophy className="h-4 w-4" />
      case 'BADGES':
        return <Medal className="h-4 w-4" />
      default:
        return <TrendingUp className="h-4 w-4" />
    }
  }

  const getCategoryLabel = (cat: string) => {
    switch (cat) {
      case 'POINTS':
        return 'Pontos'
      case 'ACHIEVEMENTS':
        return 'Conquistas'
      case 'BADGES':
        return 'Medalhas'
      default:
        return cat
    }
  }

  const getPeriodLabel = (per: string) => {
    switch (per) {
      case 'DAILY':
        return 'Hoje'
      case 'WEEKLY':
        return 'Esta Semana'
      case 'MONTHLY':
        return 'Este Mês'
      case 'ALL_TIME':
        return 'Todos os Tempos'
      default:
        return per
    }
  }

  const formatScore = (score: number, cat: string) => {
    if (cat === 'POINTS') {
      return score.toLocaleString()
    }
    return score.toString()
  }

  const handleFiltersReset = () => {
    setSearchQuery('')
    setMinLevel(undefined)
    setMaxLevel(undefined)
    setShowOnlyFriends(false)
  }

  if (isLoadingLeaderboard) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(10)].map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="w-8 h-8 rounded-full" />
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-3 w-1/2" />
                  </div>
                  <Skeleton className="h-6 w-16" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {(() => {
        if (!userId || !leaderboard || leaderboard.length === 0) return null;
        const currentUser = leaderboard.find((e) => e.userId === userId);
        if (!currentUser) return null;
        const nextRankUser = leaderboard.find((e) => e.rank === currentUser.rank - 1);
        const prevRankUser = leaderboard.find((e) => e.rank === currentUser.rank + 1);
        const pointsToNext = nextRankUser ? Math.max(0, nextRankUser.points - currentUser.points) : undefined;
        return (
          <UserRankCard
            userRank={currentUser}
            category={category}
            totalUsers={leaderboard.length}
            previousRank={undefined}
            nextRankUser={nextRankUser}
            prevRankUser={prevRankUser}
            pointsToNext={pointsToNext}
            onViewProfile={(uid) => console.log('View profile:', uid)}
            onViewFullLeaderboard={() => console.log('View full leaderboard')}
          />
        );
      })()}
      {/* Filters */}
      <RankingFilters
        selectedCategory={category}
        selectedPeriod={period}
        searchQuery={searchQuery}
        minLevel={minLevel}
        maxLevel={maxLevel}
        showOnlyFriends={showOnlyFriends}
        onCategoryChange={setCategory}
        onPeriodChange={setPeriod}
        onSearchChange={setSearchQuery}
        onLevelRangeChange={(min, max) => {
          setMinLevel(min)
          setMaxLevel(max)
        }}
        onFriendsToggle={setShowOnlyFriends}
        onReset={handleFiltersReset}
        compact={false}
      />
      
      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Ranking - {CATEGORY_CONFIG[category]?.label || 'Geral'}
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry) => (
                <LeaderboardEntryRow
                  key={entry.id}
                  entry={entry}
                  position={entry.rank}
                  category={category}
                  isCurrentUser={entry.userId === userId}
                  showActions={true}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum dado disponível para este período</p>
            </div>
          )}
          {/* Pagination removed: backend returns a single page; adjust when API supports pagination */}
        </CardContent>
      </Card>
    </div>
  )
}