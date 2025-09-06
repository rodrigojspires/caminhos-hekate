'use client'

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, Award, Star, Zap, Crown, Sparkles } from 'lucide-react'
import { NotificationType, BadgeRarity, AchievementRarity } from '@prisma/client'
import { cn } from '@/lib/utils'

export interface AchievementNotificationData {
  id: string
  type: NotificationType
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

  useEffect(() => {
    if (autoClose) {
      const timer = setTimeout(() => {
        handleClose()
      }, duration)

      const progressTimer = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100))
          return newProgress <= 0 ? 0 : newProgress
        })
      }, 100)

      return () => {
        clearTimeout(timer)
        clearInterval(progressTimer)
      }
    }
  }, [autoClose, duration, onClose])

  useEffect(() => {
    // Tocar som da notificação
    if (typeConf?.sound) {
      const audio = new Audio(typeConf.sound)
      audio.volume = 0.3
      audio.play().catch(() => {
        // Ignorar erro se não conseguir tocar o som
      })
    }
  }, [typeConf?.sound])

  function handleClose() {
    setIsVisible(false)
    setTimeout(onClose, 300)
  }

  const particles = Array.from({ length: config.particles }, (_, i) => (
    <Particle key={i} delay={i * 0.1} rarity={rarity} />
  ))

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: -50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -50 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed top-4 right-4 z-50 max-w-sm w-full"
        >
          <div className="relative overflow-hidden">
            {/* Particles */}
            <div className="absolute inset-0 pointer-events-none">
              {particles}
            </div>

            {/* Main notification */}
            <div className={cn(
              "relative rounded-lg border-2 shadow-lg backdrop-blur-sm",
              config.bgColor,
              config.borderColor
            )}>
              {/* Glow effect for rare items */}
              {['EPIC', 'LEGENDARY', 'MYTHIC'].includes(rarity) && (
                <div className={cn(
                  "absolute inset-0 rounded-lg blur-sm opacity-30",
                  `bg-gradient-to-r ${config.color}`
                )} />
              )}

              {/* Progress bar */}
              {autoClose && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-gray-200 rounded-t-lg overflow-hidden">
                  <motion.div
                    className={`h-full bg-gradient-to-r ${config.color}`}
                    initial={{ width: '100%' }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.1 }}
                  />
                </div>
              )}

              <div className="relative p-4">
                {/* Header */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <motion.div
                      initial={{ rotate: 0, scale: 1 }}
                      animate={{ 
                        rotate: [0, 10, -10, 0],
                        scale: [1, 1.1, 1]
                      }}
                      transition={{ 
                        duration: 0.6,
                        repeat: 2,
                        repeatType: 'reverse'
                      }}
                      className={cn(
                        "p-2 rounded-full bg-gradient-to-r",
                        config.color
                      )}
                    >
                      <IconComponent className="w-5 h-5 text-white" />
                    </motion.div>
                    
                    <div>
                      <h3 className={cn(
                        "font-bold text-sm",
                        config.textColor
                      )}>
                        {notification.title}
                      </h3>
                      
                      {notification.data?.rarity && (
                        <span className={cn(
                          "text-xs font-medium px-2 py-1 rounded-full",
                          config.bgColor,
                          config.textColor
                        )}>
                          {notification.data.rarity}
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Content */}
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    {notification.message}
                  </p>

                  {/* Additional info */}
                  <div className="flex items-center justify-between text-xs text-gray-500">
                    <div className="flex items-center space-x-4">
                      {notification.data?.points && (
                        <span className="flex items-center space-x-1">
                          <Star className="w-3 h-3" />
                          <span>+{notification.data.points} pts</span>
                        </span>
                      )}
                      
                      {notification.data?.level && (
                        <span className="flex items-center space-x-1">
                          <Zap className="w-3 h-3" />
                          <span>Nível {notification.data.level}</span>
                        </span>
                      )}
                      
                      {notification.data?.days && (
                        <span className="flex items-center space-x-1">
                          <span>{notification.data.days} dias</span>
                        </span>
                      )}
                    </div>
                    
                    <span>
                      {new Date(notification.createdAt).toLocaleTimeString('pt-BR', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default AchievementNotification