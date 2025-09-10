'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Trophy, 
  Award, 
  Crown, 
  Star, 
  Sparkles,
  X,
  ExternalLink,
  Share2,
  Download
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Achievement, AchievementRarity } from '@/types/gamification';
import { motion, AnimatePresence } from 'framer-motion';

export interface AchievementNotificationProps {
  achievement: Achievement;
  isVisible: boolean;
  onClose: () => void;
  onViewDetails?: () => void;
  onShare?: () => void;
  autoClose?: boolean;
  duration?: number;
  className?: string;
  variant?: 'toast' | 'modal' | 'inline';
}

const RARITY_CONFIG: Record<AchievementRarity, {
  icon: any;
  color: string;
  bgColor: string;
  borderColor: string;
  gradientFrom: string;
  gradientTo: string;
  label: string;
  particles: string;
}> = {
  COMMON: {
    icon: Award,
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    gradientFrom: 'from-gray-100',
    gradientTo: 'to-gray-200',
    label: 'Comum',
    particles: '✨'
  },
  UNCOMMON: {
    icon: Sparkles,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-300',
    gradientFrom: 'from-green-100',
    gradientTo: 'to-green-200',
    label: 'Incomum',
    particles: '💫'
  },
  RARE: {
    icon: Trophy,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    gradientFrom: 'from-blue-100',
    gradientTo: 'to-blue-200',
    label: 'Raro',
    particles: '💫'
  },
  EPIC: {
    icon: Star,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-300',
    gradientFrom: 'from-purple-100',
    gradientTo: 'to-purple-200',
    label: 'Épico',
    particles: '⭐'
  },
  LEGENDARY: {
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    gradientFrom: 'from-yellow-100',
    gradientTo: 'to-yellow-200',
    label: 'Lendário',
    particles: '👑'
  }
};

const ACHIEVEMENT_MESSAGES: Record<AchievementRarity, string[]> = {
  COMMON: [
    "Ótimo trabalho! 👏",
    "Parabéns pela conquista! 🎉",
    "Você está no caminho certo! ✨"
  ],
  UNCOMMON: [
    "Muito bom! Continue assim! 💪",
    "Conquista incomum alcançada! 🌟",
    "Você está evoluindo! 🚀"
  ],
  RARE: [
    "Impressionante! 🌟",
    "Conquista rara desbloqueada! 💎",
    "Você está se destacando! 🚀"
  ],
  EPIC: [
    "Épico! Que conquista incrível! ⚡",
    "Você alcançou algo extraordinário! 🏆",
    "Conquista épica desbloqueada! 🎯"
  ],
  LEGENDARY: [
    "LENDÁRIO! Conquista histórica! 👑",
    "Você entrou para a história! 🏛️",
    "Conquista lendária desbloqueada! ⚔️"
  ]
};

export function AchievementNotification({
  achievement,
  isVisible,
  onClose,
  onViewDetails,
  onShare,
  autoClose = true,
  duration = 6000,
  className,
  variant = 'toast'
}: AchievementNotificationProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  
  const config = RARITY_CONFIG[achievement.rarity];
  const Icon = config.icon;
  const messages = ACHIEVEMENT_MESSAGES[achievement.rarity];
  const randomMessage = messages[Math.floor(Math.random() * messages.length)];
  
  // Auto close effect
  useEffect(() => {
    if (isVisible && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoClose, duration, onClose]);
  
  // Particle animation effect
  useEffect(() => {
    if (isVisible && achievement.rarity === 'LEGENDARY') {
      const newParticles = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2
      }));
      setParticles(newParticles);
      setIsAnimating(true);
      
      const timer = setTimeout(() => setIsAnimating(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, achievement.rarity]);
  
  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      // Default share behavior
      if (navigator.share) {
        navigator.share({
          title: `Conquista Desbloqueada: ${achievement.name}`,
          text: `Acabei de desbloquear a conquista "${achievement.name}" - ${achievement.description}`,
          url: window.location.href
        });
      } else {
        // Fallback to clipboard
        navigator.clipboard.writeText(
          `Acabei de desbloquear a conquista "${achievement.name}" - ${achievement.description}`
        );
      }
    }
  };
  
  const getVariantStyles = () => {
    switch (variant) {
      case 'modal':
        return 'fixed inset-0 z-50 flex items-center justify-center bg-black/50';
      case 'inline':
        return 'relative';
      case 'toast':
      default:
        return 'fixed top-4 right-4 z-50';
    }
  };
  
  const getCardStyles = () => {
    switch (variant) {
      case 'modal':
        return 'w-full max-w-md mx-4';
      case 'inline':
        return 'w-full';
      case 'toast':
      default:
        return 'w-96';
    }
  };
  
  return (
    <AnimatePresence>
      {isVisible && (
        <div className={cn(getVariantStyles(), className)}>
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: variant === 'toast' ? -50 : 0 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: variant === 'toast' ? -50 : 0 }}
            transition={{ type: 'spring', duration: 0.5 }}
            className={getCardStyles()}
          >
            <Card className={cn(
              'relative overflow-hidden border-2 shadow-xl',
              config.borderColor
            )}>
              {/* Background Gradient */}
              <div className={cn(
                'absolute inset-0 bg-gradient-to-br opacity-20',
                config.gradientFrom,
                config.gradientTo
              )} />
              
              {/* Particles Animation */}
              {isAnimating && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {particles.map((particle) => (
                    <motion.div
                      key={particle.id}
                      initial={{ 
                        opacity: 0, 
                        scale: 0,
                        x: `${particle.x}%`,
                        y: `${particle.y}%`
                      }}
                      animate={{ 
                        opacity: [0, 1, 0], 
                        scale: [0, 1.5, 0],
                        y: [`${particle.y}%`, `${particle.y - 20}%`]
                      }}
                      transition={{ 
                        duration: 2,
                        delay: particle.delay,
                        ease: 'easeOut'
                      }}
                      className="absolute text-2xl"
                    >
                      {config.particles}
                    </motion.div>
                  ))}
                </div>
              )}
              
              <CardContent className="relative p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ rotate: 0 }}
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, delay: 0.2 }}
                      className={cn(
                        'p-3 rounded-full',
                        config.bgColor
                      )}
                    >
                      <Icon className={cn('h-8 w-8', config.color)} />
                    </motion.div>
                    
                    <div>
                      <Badge 
                        variant="secondary" 
                        className={cn('mb-1', config.bgColor, config.color)}
                      >
                        {config.label}
                      </Badge>
                      <h3 className="text-lg font-bold text-foreground">
                        Conquista Desbloqueada!
                      </h3>
                    </div>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    onClick={onClose}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                
                {/* Achievement Details */}
                <div className="space-y-3">
                  <div>
                    <h4 className="font-semibold text-foreground text-lg">
                      {achievement.name}
                    </h4>
                    <p className="text-sm text-muted-foreground mt-1">
                      {achievement.description}
                    </p>
                  </div>
                  
                  {/* Motivational Message */}
                  <div className={cn(
                    'p-3 rounded-lg text-center font-medium',
                    config.bgColor,
                    config.color
                  )}>
                    {randomMessage}
                  </div>
                  
                  {/* Points */}
                  {achievement.points > 0 && (
                    <div className="flex items-center justify-center gap-2 text-sm">
                      <Trophy className="h-4 w-4 text-yellow-600" />
                      <span className="font-medium">+{achievement.points} pontos</span>
                    </div>
                  )}
                </div>
                
                {/* Actions */}
                <div className="flex gap-2 mt-6">
                  {onViewDetails && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={onViewDetails}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  )}
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                  >
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartilhar
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default AchievementNotification;