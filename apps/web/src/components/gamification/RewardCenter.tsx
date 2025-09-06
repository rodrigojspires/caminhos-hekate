'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Gift, 
  Star, 
  Award, 
  Crown, 
  Zap, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Sparkles,
  TrendingUp,
  Calendar
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Reward {
  id: string
  type: 'POINTS' | 'BADGE' | 'DISCOUNT' | 'PREMIUM_ACCESS' | 'EXCLUSIVE_CONTENT'
  value: number
  description: string
  claimed: boolean
  claimedAt?: string
  expiresAt?: string
  achievementId?: string
  metadata?: Record<string, any>
}

interface RewardStats {
  totalRewards: number
  claimedRewards: number
  pendingRewards: number
  expiredRewards: number
  totalPointsEarned: number
  totalBadgesEarned: number
}

const rewardTypeConfig = {
  POINTS: {
    icon: Star,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    label: 'Pontos'
  },
  BADGE: {
    icon: Award,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    label: 'Badge'
  },
  DISCOUNT: {
    icon: Gift,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    label: 'Desconto'
  },
  PREMIUM_ACCESS: {
    icon: Crown,
    color: 'text-purple-500',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    label: 'Acesso Premium'
  },
  EXCLUSIVE_CONTENT: {
    icon: Sparkles,
    color: 'text-pink-500',
    bgColor: 'bg-pink-50',
    borderColor: 'border-pink-200',
    label: 'Conteúdo Exclusivo'
  }
}

const RewardCard: React.FC<{
  reward: Reward
  onClaim: (id: string) => void
  claiming: boolean
}> = ({ reward, onClaim, claiming }) => {
  const config = rewardTypeConfig[reward.type]
  const IconComponent = config.icon
  
  const isExpired = reward.expiresAt && new Date(reward.expiresAt) < new Date()
  const daysUntilExpiry = reward.expiresAt 
    ? Math.ceil((new Date(reward.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ scale: 1.02 }}
      className={cn(
        "relative overflow-hidden rounded-lg border-2 transition-all duration-200",
        reward.claimed ? "bg-gray-50 border-gray-200" : config.bgColor,
        reward.claimed ? "" : config.borderColor,
        isExpired ? "opacity-50" : ""
      )}
    >
      {/* Glow effect for unclaimed rewards */}
      {!reward.claimed && !isExpired && (
        <div className={cn(
          "absolute inset-0 blur-sm opacity-20",
          config.bgColor
        )} />
      )}

      <div className="relative p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-3">
            <div className={cn(
              "p-2 rounded-full",
              reward.claimed ? "bg-gray-200" : config.bgColor
            )}>
              <IconComponent className={cn(
                "w-5 h-5",
                reward.claimed ? "text-gray-500" : config.color
              )} />
            </div>
            
            <div>
              <h3 className={cn(
                "font-semibold text-sm",
                reward.claimed ? "text-gray-600" : "text-gray-900"
              )}>
                {config.label}
              </h3>
              
              <div className="flex items-center space-x-2 mt-1">
                {reward.type === 'POINTS' && (
                  <span className={cn(
                    "text-lg font-bold",
                    reward.claimed ? "text-gray-500" : config.color
                  )}>
                    +{reward.value}
                  </span>
                )}
                
                {reward.type === 'DISCOUNT' && (
                  <span className={cn(
                    "text-lg font-bold",
                    reward.claimed ? "text-gray-500" : config.color
                  )}>
                    {reward.value}% OFF
                  </span>
                )}
              </div>
            </div>
          </div>

          {reward.claimed ? (
            <Badge variant="outline" className="text-green-600 border-green-200">
              <CheckCircle className="w-3 h-3 mr-1" />
              Reivindicado
            </Badge>
          ) : isExpired ? (
            <Badge variant="outline" className="text-red-600 border-red-200">
              <AlertCircle className="w-3 h-3 mr-1" />
              Expirado
            </Badge>
          ) : (
            <Badge variant="outline" className={cn(
              "border-current",
              config.color
            )}>
              Disponível
            </Badge>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3">
          {reward.description}
        </p>

        {/* Expiration info */}
        {daysUntilExpiry !== null && daysUntilExpiry > 0 && !reward.claimed && (
          <div className="flex items-center space-x-1 text-xs text-orange-600 mb-3">
            <Clock className="w-3 h-3" />
            <span>
              {daysUntilExpiry === 1 
                ? 'Expira amanhã' 
                : `Expira em ${daysUntilExpiry} dias`
              }
            </span>
          </div>
        )}

        {/* Claimed info */}
        {reward.claimed && reward.claimedAt && (
          <div className="text-xs text-gray-500 mb-3">
            Reivindicado em {new Date(reward.claimedAt).toLocaleDateString('pt-BR')}
          </div>
        )}

        {/* Action button */}
        {!reward.claimed && !isExpired && (
          <Button
            onClick={() => onClaim(reward.id)}
            disabled={claiming}
            className={cn(
              "w-full",
              config.color.replace('text-', 'bg-').replace('-500', '-500'),
              "hover:" + config.color.replace('text-', 'bg-').replace('-500', '-600')
            )}
            size="sm"
          >
            {claiming ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                <span>Reivindicando...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Gift className="w-4 h-4" />
                <span>Reivindicar</span>
              </div>
            )}
          </Button>
        )}
      </div>
    </motion.div>
  )
}

const StatsCard: React.FC<{
  title: string
  value: number
  icon: React.ElementType
  color: string
  subtitle?: string
}> = ({ title, value, icon: Icon, color, subtitle }) => {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-600">{title}</p>
            <p className="text-2xl font-bold text-gray-900">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
          </div>
          <div className={cn("p-3 rounded-full bg-opacity-10", color)}>
            <Icon className={cn("w-5 h-5", color)} />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const RewardCenter: React.FC = () => {
  const [pendingRewards, setPendingRewards] = useState<Reward[]>([])
  const [rewardHistory, setRewardHistory] = useState<Reward[]>([])
  const [stats, setStats] = useState<RewardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [claiming, setClaiming] = useState<string | null>(null)

  useEffect(() => {
    loadRewards()
  }, [])

  const loadRewards = async () => {
    try {
      setLoading(true)
      
      const [pendingRes, historyRes, statsRes] = await Promise.all([
        fetch('/api/gamification/rewards?type=pending'),
        fetch('/api/gamification/rewards?type=history&limit=20'),
        fetch('/api/gamification/rewards?type=stats')
      ])

      if (pendingRes.ok) {
        const pending = await pendingRes.json()
        setPendingRewards(pending)
      }

      if (historyRes.ok) {
        const history = await historyRes.json()
        setRewardHistory(history)
      }

      if (statsRes.ok) {
        const statsData = await statsRes.json()
        setStats(statsData)
      }
    } catch (error) {
      console.error('Erro ao carregar recompensas:', error)
      toast.error('Erro ao carregar recompensas')
    } finally {
      setLoading(false)
    }
  }

  const handleClaimReward = async (rewardId: string) => {
    try {
      setClaiming(rewardId)
      
      const response = await fetch(`/api/gamification/rewards/${rewardId}/claim`, {
        method: 'POST'
      })

      if (response.ok) {
        toast.success('Recompensa reivindicada com sucesso!')
        await loadRewards() // Recarregar dados
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao reivindicar recompensa')
      }
    } catch (error) {
      console.error('Erro ao reivindicar recompensa:', error)
      toast.error('Erro ao reivindicar recompensa')
    } finally {
      setClaiming(null)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatsCard
            title="Total de Recompensas"
            value={stats.totalRewards}
            icon={Gift}
            color="text-blue-500"
          />
          
          <StatsCard
            title="Reivindicadas"
            value={stats.claimedRewards}
            icon={CheckCircle}
            color="text-green-500"
          />
          
          <StatsCard
            title="Pendentes"
            value={stats.pendingRewards}
            icon={Clock}
            color="text-orange-500"
          />
          
          <StatsCard
            title="Pontos Ganhos"
            value={stats.totalPointsEarned}
            icon={Star}
            color="text-yellow-500"
          />
        </div>
      )}

      {/* Main Content */}
      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pending">
            Pendentes ({pendingRewards.length})
          </TabsTrigger>
          <TabsTrigger value="history">
            Histórico ({rewardHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Gift className="w-5 h-5" />
                <span>Recompensas Disponíveis</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingRewards.length === 0 ? (
                <div className="text-center py-8">
                  <Gift className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma recompensa pendente</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Continue conquistando achievements para ganhar recompensas!
                  </p>
                </div>
              ) : (
                <div className="grid gap-4">
                  <AnimatePresence>
                    {pendingRewards.map((reward) => (
                      <RewardCard
                        key={reward.id}
                        reward={reward}
                        onClaim={handleClaimReward}
                        claiming={claiming === reward.id}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Calendar className="w-5 h-5" />
                <span>Histórico de Recompensas</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {rewardHistory.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">Nenhuma recompensa reivindicada ainda</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {rewardHistory.map((reward) => (
                    <div
                      key={reward.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-gray-50"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 rounded-full bg-gray-200">
                          {React.createElement(rewardTypeConfig[reward.type].icon, {
                            className: "w-4 h-4 text-gray-600"
                          })}
                        </div>
                        
                        <div>
                          <p className="font-medium text-sm">
                            {rewardTypeConfig[reward.type].label}
                          </p>
                          <p className="text-xs text-gray-500">
                            {reward.description}
                          </p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          {reward.type === 'POINTS' && `+${reward.value}`}
                          {reward.type === 'DISCOUNT' && `${reward.value}% OFF`}
                        </p>
                        <p className="text-xs text-gray-500">
                          {reward.claimedAt && new Date(reward.claimedAt).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default RewardCenter