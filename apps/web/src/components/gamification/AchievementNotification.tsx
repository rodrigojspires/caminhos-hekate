'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, Award, Star, Zap, Crown, Sparkles } from 'lucide-react'
import { BadgeRarity, AchievementRarity } from '@prisma/client'
import { cn } from '@/lib/utils'

export interface AchievementNotificationData {
  id: string
  type: keyof typeof typeConfig
  title: string
  message: string
  data?: {
    achievementName?: string
    achievementDescription?: string
    badgeName?: string
    badgeDescription?: string
    points?: number
    level?: number
    days?: number
    rarity?: BadgeRarity | AchievementRarity
    [key: string]: any
  }
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  createdAt: string
}

interface AchievementNotificationProps {
  notification: AchievementNotificationData
  onClose: () => void
  autoClose?: boolean
  duration?: number
}

const rarityConfig = {
  COMMON: {
    color: 'from-gray-400 to-gray-600',
    textColor: 'text-gray-700',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
    icon: Star,
    particles: 5
  },
  UNCOMMON: {
    color: 'from-green-400 to-green-600',
    textColor: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    icon: Award,
    particles: 8
  },
  RARE: {
    color: 'from-blue-400 to-blue-600',
    textColor: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    icon: Trophy,
    particles: 12
  },
  EPIC: {
    color: 'from-purple-400 to-purple-600',
    textColor: 'text-purple-700',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    icon: Crown,
    particles: 15
  },
  LEGENDARY: {
    color: 'from-yellow-400 to-orange-500',
    textColor: 'text-orange-700',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    icon: Crown,
    particles: 20
  },
  MYTHIC: {
    color: 'from-pink-400 via-purple-500 to-indigo-600',
    textColor: 'text-purple-700',
    bgColor: 'bg-gradient-to-r from-pink-50 to-purple-50',
    borderColor: 'border-purple-300',
    icon: Sparkles,
    particles: 25
  }
}

const typeConfig = {
  ACHIEVEMENT_UNLOCKED: {
    icon: Trophy,
    defaultColor: 'from-yellow-400 to-yellow-600',
    sound: '/sounds/achievement.mp3'
  },
  BADGE_EARNED: {
    icon: Award,
    defaultColor: 'from-blue-400 to-blue-600',
    sound: '/sounds/badge.mp3'
  },
  LEVEL_UP: {
    icon: Zap,
    defaultColor: 'from-green-400 to-green-600',
    sound: '/sounds/levelup.mp3'
  },
  STREAK_MILESTONE: {
    icon: Star,
    defaultColor: 'from-orange-400 to-orange-600',
    sound: '/sounds/streak.mp3'
  },
  POINTS_EARNED: {
    icon: Star,
    defaultColor: 'from-purple-400 to-purple-600',
    sound: '/sounds/points.mp3'
  }
}

const Particle: React.FC<{ delay: number; rarity: string }> = ({ delay, rarity }) => {
  const config = rarityConfig[rarity as keyof typeof rarityConfig] || rarityConfig.COMMON
  
  return (
    <motion.div
      className={`absolute w-1 h-1 bg-gradient-to-r ${config.color} rounded-full`}
      initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
      animate={{
        opacity: [0, 1, 0],
        scale: [0, 1, 0],
        x: Math.random() * 200 - 100,
        y: Math.random() * 200 - 100,
      }}
      transition={{
        duration: 2,
        delay,
        ease: 'easeOut'
      }}
    />
  )
}

export const AchievementNotification: React.FC<AchievementNotificationProps> = ({
  notification,
  onClose,
  autoClose = true,
  duration = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true)
  const [progress, setProgress] = useState(100)

  const rarity = notification.data?.rarity || 'COMMON'
  const config = rarityConfig[rarity as keyof typeof rarityConfig] || rarityConfig.COMMON
  const typeConf = typeConfig[notification.type as keyof typeof typeConfig]
  
  const IconComponent = typeConf?.icon || config.icon

  const handleClose = useCallback(() => {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }, [onClose])

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [autoClose, duration, handleClose])

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null
    if (autoClose) {
      interval = setInterval(() => {
        setProgress((prev) => Math.max(0, prev - 2))
      }, duration / 50)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [autoClose, duration])

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className={cn(
            'relative w-96 rounded-lg shadow-lg overflow-hidden border',
            config.bgColor,
            config.borderColor
          )}
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-purple-500 to-indigo-600 text-white">
            <div className="flex items-center gap-2">
              <IconComponent className="w-5 h-5" />
              <h3 className="text-sm font-semibold">{notification.title}</h3>
            </div>
            <button
              onClick={handleClose}
              className="p-1 hover:bg-white/10 rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-4">
            <p className="text-sm text-gray-700">{notification.message}</p>
            {/* Decorative particles based on rarity */}
            <div className="absolute inset-0 pointer-events-none">
              {Array.from({ length: (rarityConfig[rarity as keyof typeof rarityConfig]?.particles || 5) }).map((_, i) => (
                <Particle key={i} delay={i * 0.1} rarity={rarity as string} />
              ))}
            </div>
          </div>

          {/* Progress bar */}
          {autoClose && (
            <div className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-purple-500 to-indigo-600" style={{ width: `${progress}%` }} />
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AchievementNotification
