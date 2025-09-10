'use client'

import React, { useState } from 'react'
import { Trophy, Star, Award, Crown, Zap, Target, Calendar, Users } from 'lucide-react'

interface Achievement {
  id: string
  achievementId: string
  title: string
  description: string
  type: string
  rarity: 'COMMON' | 'UNCOMMON' | 'RARE' | 'EPIC' | 'LEGENDARY'
  points: number
  unlockedAt: string
  metadata?: Record<string, any>
}

interface AchievementBadgeProps {
  achievement: Achievement
  size?: 'sm' | 'md' | 'lg' | 'xl'
  showDetails?: boolean
  animated?: boolean
  className?: string
  onClick?: () => void
}

export default function AchievementBadge({
  achievement,
  size = 'md',
  showDetails = true,
  animated = true,
  className = '',
  onClick
}: AchievementBadgeProps) {
  const [isHovered, setIsHovered] = useState(false)

  // Get rarity colors and styles
  const getRarityStyles = (rarity: string) => {
    switch (rarity) {
      case 'LEGENDARY':
        return {
          bg: 'bg-gradient-to-br from-yellow-400 via-orange-500 to-red-500',
          border: 'border-yellow-400',
          glow: 'shadow-lg shadow-yellow-400/50',
          text: 'text-yellow-100',
          icon: '🌟'
        }
      case 'EPIC':
        return {
          bg: 'bg-gradient-to-br from-purple-500 via-purple-600 to-indigo-600',
          border: 'border-purple-400',
          glow: 'shadow-lg shadow-purple-400/50',
          text: 'text-purple-100',
          icon: '💜'
        }
      case 'RARE':
        return {
          bg: 'bg-gradient-to-br from-blue-500 via-blue-600 to-cyan-600',
          border: 'border-blue-400',
          glow: 'shadow-md shadow-blue-400/50',
          text: 'text-blue-100',
          icon: '💙'
        }
      case 'UNCOMMON':
        return {
          bg: 'bg-gradient-to-br from-green-500 via-green-600 to-emerald-600',
          border: 'border-green-400',
          glow: 'shadow-md shadow-green-400/50',
          text: 'text-green-100',
          icon: '💚'
        }
      case 'COMMON':
      default:
        return {
          bg: 'bg-gradient-to-br from-gray-500 via-gray-600 to-slate-600',
          border: 'border-gray-400',
          glow: 'shadow-md shadow-gray-400/50',
          text: 'text-gray-100',
          icon: '🤍'
        }
    }
  }

  // Get achievement type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'POINTS': return <Trophy className="w-full h-full" />
      case 'LEVEL': return <Crown className="w-full h-full" />
      case 'LESSON': return <Target className="w-full h-full" />
      case 'EVENT': return <Calendar className="w-full h-full" />
      case 'STREAK': return <Zap className="w-full h-full" />
      case 'SOCIAL': return <Users className="w-full h-full" />
      default: return <Award className="w-full h-full" />
    }
  }

  // Get size classes
  const getSizeClasses = (size: string) => {
    switch (size) {
      case 'sm':
        return {
          container: 'w-12 h-12',
          icon: 'w-6 h-6',
          text: 'text-xs',
          tooltip: 'text-xs'
        }
      case 'md':
        return {
          container: 'w-16 h-16',
          icon: 'w-8 h-8',
          text: 'text-sm',
          tooltip: 'text-sm'
        }
      case 'lg':
        return {
          container: 'w-20 h-20',
          icon: 'w-10 h-10',
          text: 'text-base',
          tooltip: 'text-base'
        }
      case 'xl':
        return {
          container: 'w-24 h-24',
          icon: 'w-12 h-12',
          text: 'text-lg',
          tooltip: 'text-lg'
        }
      default:
        return {
          container: 'w-16 h-16',
          icon: 'w-8 h-8',
          text: 'text-sm',
          tooltip: 'text-sm'
        }
    }
  }

  const rarityStyles = getRarityStyles(achievement.rarity)
  const sizeClasses = getSizeClasses(size)

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  return (
    <div className={`relative group ${className}`}>
      {/* Badge */}
      <div
        className={`
          ${sizeClasses.container}
          ${rarityStyles.bg}
          ${rarityStyles.border}
          ${rarityStyles.glow}
          ${animated ? 'transition-all duration-300 hover:scale-110' : ''}
          ${onClick ? 'cursor-pointer' : ''}
          border-2 rounded-full flex items-center justify-center
          relative overflow-hidden
        `}
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent" />
          {achievement.rarity === 'LEGENDARY' && (
            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          )}
        </div>

        {/* Icon */}
        <div className={`${sizeClasses.icon} ${rarityStyles.text} relative z-10`}>
          {getTypeIcon(achievement.type)}
        </div>

        {/* Rarity indicator */}
        <div className="absolute top-0 right-0 text-xs transform translate-x-1 -translate-y-1">
          {rarityStyles.icon}
        </div>

        {/* Shine effect for legendary */}
        {achievement.rarity === 'LEGENDARY' && animated && (
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent transform -skew-x-12 animate-shine" />
        )}
      </div>

      {/* Tooltip/Details */}
      {showDetails && (
        <div className={`
          absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
          bg-gray-900 text-white rounded-lg p-3 min-w-64 z-50
          opacity-0 group-hover:opacity-100 transition-opacity duration-200
          pointer-events-none
        `}>
          {/* Arrow */}
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
          
          {/* Content */}
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className="text-lg">{rarityStyles.icon}</span>
              <h3 className={`font-bold ${sizeClasses.tooltip}`}>
                {achievement.title}
              </h3>
            </div>
            
            <p className={`text-gray-300 mb-2 ${sizeClasses.tooltip}`}>
              {achievement.description}
            </p>
            
            <div className="flex items-center justify-between text-xs text-gray-400">
              <span className={`px-2 py-1 rounded ${rarityStyles.bg} ${rarityStyles.text} font-medium`}>
                {achievement.rarity}
              </span>
              
              <span className="flex items-center gap-1">
                <Trophy className="w-3 h-3" />
                {achievement.points} pts
              </span>
            </div>
            
            <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
              Desbloqueado em {formatDate(achievement.unlockedAt)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Achievement Grid Component
interface AchievementGridProps {
  achievements: Achievement[]
  maxDisplay?: number
  size?: 'sm' | 'md' | 'lg' | 'xl'
  animated?: boolean
  onAchievementClick?: (achievement: Achievement) => void
  className?: string
}

export function AchievementGrid({
  achievements,
  maxDisplay,
  size = 'md',
  animated = true,
  onAchievementClick,
  className = ''
}: AchievementGridProps) {
  const displayAchievements = maxDisplay 
    ? achievements.slice(0, maxDisplay)
    : achievements
  
  const remainingCount = maxDisplay && achievements.length > maxDisplay 
    ? achievements.length - maxDisplay 
    : 0

  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      {displayAchievements.map((achievement) => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          size={size}
          animated={animated}
          onClick={() => onAchievementClick?.(achievement)}
        />
      ))}
      
      {remainingCount > 0 && (
        <div className={`
          ${size === 'sm' ? 'w-12 h-12' : size === 'lg' ? 'w-20 h-20' : size === 'xl' ? 'w-24 h-24' : 'w-16 h-16'}
          bg-gray-200 border-2 border-gray-300 rounded-full
          flex items-center justify-center text-gray-600 font-medium
          ${size === 'sm' ? 'text-xs' : size === 'lg' ? 'text-base' : size === 'xl' ? 'text-lg' : 'text-sm'}
        `}>
          +{remainingCount}
        </div>
      )}
    </div>
  )
}

// Achievement Showcase Component (for new achievements)
interface AchievementShowcaseProps {
  achievement: Achievement
  onClose: () => void
}

export function AchievementShowcase({ achievement, onClose }: AchievementShowcaseProps) {
  const rarityStyles = {
    LEGENDARY: 'from-yellow-400 via-orange-500 to-red-500',
    EPIC: 'from-purple-500 via-purple-600 to-indigo-600',
    RARE: 'from-blue-500 via-blue-600 to-cyan-600',
    UNCOMMON: 'from-green-500 via-green-600 to-emerald-600',
    COMMON: 'from-gray-500 via-gray-600 to-slate-600'
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full text-center animate-bounce-in">
        <div className="mb-6">
          <div className={`
            w-32 h-32 mx-auto rounded-full
            bg-gradient-to-br ${rarityStyles[achievement.rarity]}
            flex items-center justify-center
            shadow-2xl animate-pulse
          `}>
            <Trophy className="w-16 h-16 text-white" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          🎉 Nova Conquista!
        </h2>
        
        <h3 className="text-xl font-semibold text-gray-800 mb-2">
          {achievement.title}
        </h3>
        
        <p className="text-gray-600 mb-4">
          {achievement.description}
        </p>
        
        <div className="flex items-center justify-center gap-4 mb-6">
          <span className={`
            px-3 py-1 rounded-full text-white font-medium
            bg-gradient-to-r ${rarityStyles[achievement.rarity]}
          `}>
            {achievement.rarity}
          </span>
          
          <span className="flex items-center gap-1 text-yellow-600 font-medium">
            <Trophy className="w-4 h-4" />
            +{achievement.points} pontos
          </span>
        </div>
        
        <button
          onClick={onClose}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
        >
          Continuar
        </button>
      </div>
    </div>
  )
}