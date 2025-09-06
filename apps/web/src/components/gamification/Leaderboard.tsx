'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Trophy, Medal, Award, Crown, Star, TrendingUp, Users, Calendar } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface LeaderboardEntry {
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

interface LeaderboardData {
  leaderboard: LeaderboardEntry[]
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
  const [data, setData] = useState<LeaderboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [category, setCategory] = useState('POINTS')
  const [period, setPeriod] = useState('ALL_TIME')
  const [page, setPage] = useState(1)

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/gamification/leaderboard?category=${category}&period=${period}&page=${page}&limit=20`
      )
      
      if (response.ok) {
        const leaderboardData = await response.json()
        setData(leaderboardData)
      }
    } catch (error) {
      console.error('Erro ao carregar leaderboard:', error)
    } finally {
      setLoading(false)
    }
  }, [category, period, page])

  useEffect(() => {
    fetchLeaderboard()
  }, [fetchLeaderboard])

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

  if (loading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50 animate-pulse">
                <div className="w-8 h-8 bg-muted rounded" />
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="w-32 h-4 bg-muted rounded" />
                  <div className="w-24 h-3 bg-muted rounded" />
                </div>
                <div className="w-16 h-6 bg-muted rounded" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Leaderboard
          </CardTitle>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {data?.totalUsers} usuários
            </span>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4">
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="POINTS">
                <div className="flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Pontos
                </div>
              </SelectItem>
              <SelectItem value="ACHIEVEMENTS">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Conquistas
                </div>
              </SelectItem>
              <SelectItem value="BADGES">
                <div className="flex items-center gap-2">
                  <Medal className="h-4 w-4" />
                  Medalhas
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="DAILY">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Hoje
                </div>
              </SelectItem>
              <SelectItem value="WEEKLY">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Esta Semana
                </div>
              </SelectItem>
              <SelectItem value="MONTHLY">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Este Mês
                </div>
              </SelectItem>
              <SelectItem value="ALL_TIME">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Todos os Tempos
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      
      <CardContent>
        {data?.userRank && (
          <div className="mb-6 p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-bold">
                #{data.userRank}
              </div>
              <div>
                <p className="font-medium">Sua Posição</p>
                <p className="text-sm text-muted-foreground">
                  {getCategoryLabel(category)} - {getPeriodLabel(period)}
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="space-y-2">
          {data?.leaderboard.map((entry, index) => {
            const isCurrentUser = entry.userId === userId
            
            return (
              <div
                key={entry.userId}
                className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
                  isCurrentUser
                    ? 'bg-primary/10 border border-primary/20'
                    : 'bg-muted/30 hover:bg-muted/50'
                }`}
              >
                {/* Rank */}
                <div className="flex items-center justify-center w-8 h-8">
                  {getRankIcon(entry.rank)}
                </div>
                
                {/* Avatar */}
                <Avatar className="h-10 w-10">
                  <AvatarImage src={entry.image} alt={entry.name} />
                  <AvatarFallback>
                    {entry.name?.charAt(0)?.toUpperCase() || 'U'}
                  </AvatarFallback>
                </Avatar>
                
                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium truncate">
                      {entry.name || 'Usuário Anônimo'}
                    </p>
                    {isCurrentUser && (
                      <Badge variant="secondary" className="text-xs">
                        Você
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Nível {entry.level}</span>
                    <span>{entry.achievements} conquistas</span>
                    <span>{entry.badges} medalhas</span>
                  </div>
                </div>
                
                {/* Score */}
                <div className="text-right">
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category)}
                    <span className="font-bold text-lg">
                      {formatScore(entry.score, category)}
                    </span>
                  </div>
                  {entry.rank <= 3 && (
                    <Badge 
                      className={`text-xs text-white ${getRankBadgeColor(entry.rank)}`}
                    >
                      Top {entry.rank}
                    </Badge>
                  )}
                </div>
              </div>
            )
          })}
        </div>
        
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Anterior
            </Button>
            
            <span className="text-sm text-muted-foreground">
              Página {page} de {data.totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage(p => Math.min(data.totalPages, p + 1))}
              disabled={page === data.totalPages}
            >
              Próxima
            </Button>
          </div>
        )}
        
        {(!data?.leaderboard || data.leaderboard.length === 0) && (
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhum dado encontrado para este período.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}