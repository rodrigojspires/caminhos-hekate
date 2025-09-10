'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Star, 
  Crown, 
  Zap,
  Gift,
  X,
  ExternalLink,
  Share2,
  ChevronRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface LevelUpNotificationProps {
  previousLevel: number;
  newLevel: number;
  totalXP: number;
  xpForNextLevel: number;
  xpGained?: number;
  unlockedFeatures?: string[];
  rewards?: {
    points?: number;
    badges?: string[];
    achievements?: string[];
  };
  isVisible: boolean;
  onClose: () => void;
  onViewProfile?: () => void;
  onShare?: () => void;
  autoClose?: boolean;
  duration?: number;
  className?: string;
  variant?: 'toast' | 'modal' | 'inline';
}

const LEVEL_MILESTONES = {
  5: { title: 'Iniciante Dedicado', icon: Star, color: 'text-blue-600', bg: 'bg-blue-100' },
  10: { title: 'Explorador Ativo', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
  25: { title: 'Aventureiro Experiente', icon: Zap, color: 'text-purple-600', bg: 'bg-purple-100' },
  50: { title: 'Mestre dos Caminhos', icon: Crown, color: 'text-yellow-600', bg: 'bg-yellow-100' },
  100: { title: 'Lenda de Hekate', icon: Crown, color: 'text-pink-600', bg: 'bg-pink-100' }
};

const CELEBRATION_MESSAGES = [
  "Parabéns! Você subiu de nível! 🎉",
  "Incrível! Novo nível alcançado! 🌟",
  "Fantástico! Você está evoluindo! 🚀",
  "Excelente progresso! Continue assim! ⭐",
  "Que conquista! Nível superior desbloqueado! 🏆"
];

export function LevelUpNotification({
  previousLevel,
  newLevel,
  totalXP,
  xpForNextLevel,
  xpGained = 0,
  unlockedFeatures = [],
  rewards,
  isVisible,
  onClose,
  onViewProfile,
  onShare,
  autoClose = true,
  duration = 8000,
  className,
  variant = 'toast'
}: LevelUpNotificationProps) {
  const [currentXP, setCurrentXP] = useState(totalXP - xpGained);
  const [showRewards, setShowRewards] = useState(false);
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; delay: number }>>([]);
  
  const milestone = Object.entries(LEVEL_MILESTONES)
    .reverse()
    .find(([level]) => newLevel >= parseInt(level));
  
  const milestoneData = milestone ? LEVEL_MILESTONES[parseInt(milestone[0]) as keyof typeof LEVEL_MILESTONES] : null;
  const MilestoneIcon = milestoneData?.icon || TrendingUp;
  
  const randomMessage = CELEBRATION_MESSAGES[Math.floor(Math.random() * CELEBRATION_MESSAGES.length)];
  const progressPercentage = (totalXP / xpForNextLevel) * 100;
  
  // Auto close effect
  useEffect(() => {
    if (isVisible && autoClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, autoClose, duration, onClose]);
  
  // XP animation effect
  useEffect(() => {
    if (isVisible && xpGained > 0) {
      const timer = setTimeout(() => {
        setCurrentXP(totalXP);
      }, 1000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, totalXP, xpGained]);
  
  // Particle animation effect
  useEffect(() => {
    if (isVisible) {
      const newParticles = Array.from({ length: 12 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        delay: Math.random() * 2
      }));
      setParticles(newParticles);
    }
  }, [isVisible]);
  
  // Show rewards after initial animation
  useEffect(() => {
    if (isVisible && (rewards || unlockedFeatures.length > 0)) {
      const timer = setTimeout(() => {
        setShowRewards(true);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, rewards, unlockedFeatures]);
  
  const handleShare = () => {
    if (onShare) {
      onShare();
    } else {
      const shareText = `Acabei de alcançar o nível ${newLevel} nos Caminhos de Hekate! 🎉`;
      
      if (navigator.share) {
        navigator.share({
          title: `Nível ${newLevel} Alcançado!`,
          text: shareText,
          url: window.location.href
        });
      } else {
        navigator.clipboard.writeText(shareText);
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
        return 'w-full max-w-lg mx-4';
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
            transition={{ type: 'spring', duration: 0.6 }}
            className={getCardStyles()}
          >
            <Card className="relative overflow-hidden border-2 border-yellow-300 shadow-xl bg-gradient-to-br from-yellow-50 to-orange-50">
              {/* Particles Animation */}
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
                      y: [`${particle.y}%`, `${particle.y - 30}%`],
                      rotate: [0, 180, 360]
                    }}
                    transition={{ 
                      duration: 3,
                      delay: particle.delay,
                      ease: 'easeOut'
                    }}
                    className="absolute text-2xl"
                  >
                    ⭐
                  </motion.div>
                ))}
              </div>
              
              <CardContent className="relative p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <motion.div
                      initial={{ scale: 0, rotate: 0 }}
                      animate={{ scale: 1, rotate: 360 }}
                      transition={{ duration: 0.8, delay: 0.2 }}
                      className="p-3 rounded-full bg-yellow-100"
                    >
                      <TrendingUp className="h-8 w-8 text-yellow-600" />
                    </motion.div>
                    
                    <div>
                      <Badge variant="secondary" className="mb-1 bg-yellow-100 text-yellow-700">
                        Nível Superior
                      </Badge>
                      <h3 className="text-lg font-bold text-foreground">
                        Parabéns!
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
                
                {/* Level Progress */}
                <div className="space-y-4">
                  {/* Level Display */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-4 mb-2">
                      <motion.div
                        initial={{ scale: 1 }}
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 0.5, delay: 0.5 }}
                        className="text-3xl font-bold text-muted-foreground"
                      >
                        {previousLevel}
                      </motion.div>
                      
                      <motion.div
                        initial={{ x: -20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.8 }}
                      >
                        <ChevronRight className="h-6 w-6 text-muted-foreground" />
                      </motion.div>
                      
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: [0, 1.2, 1] }}
                        transition={{ duration: 0.6, delay: 1 }}
                        className="text-4xl font-bold text-yellow-600"
                      >
                        {newLevel}
                      </motion.div>
                    </div>
                    
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.2 }}
                      className="text-lg font-semibold text-foreground"
                    >
                      Nível {newLevel} Alcançado!
                    </motion.p>
                  </div>
                  
                  {/* Milestone */}
                  {milestoneData && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.5 }}
                      className={cn(
                        'flex items-center gap-3 p-3 rounded-lg',
                        milestoneData.bg
                      )}
                    >
                      <MilestoneIcon className={cn('h-5 w-5', milestoneData.color)} />
                      <div>
                        <p className="font-medium text-sm">Marco Alcançado</p>
                        <p className={cn('text-sm font-semibold', milestoneData.color)}>
                          {milestoneData.title}
                        </p>
                      </div>
                    </motion.div>
                  )}
                  
                  {/* XP Progress */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Experiência</span>
                      <span className="font-medium">
                        {Math.round(currentXP).toLocaleString()} / {xpForNextLevel.toLocaleString()} XP
                      </span>
                    </div>
                    
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.8, delay: 1.8 }}
                    >
                      <Progress 
                        value={progressPercentage} 
                        className="h-2"
                      />
                    </motion.div>
                    
                    {xpGained > 0 && (
                      <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 2 }}
                        className="text-sm text-center text-green-600 font-medium"
                      >
                        +{xpGained} XP ganhos
                      </motion.p>
                    )}
                  </div>
                  
                  {/* Motivational Message */}
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.2 }}
                    className="text-center p-3 bg-yellow-100 rounded-lg"
                  >
                    <p className="font-medium text-yellow-700">
                      {randomMessage}
                    </p>
                  </motion.div>
                </div>
                
                {/* Rewards Section */}
                <AnimatePresence>
                  {showRewards && (rewards || unlockedFeatures.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.5 }}
                      className="mt-6 space-y-3"
                    >
                      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                        <Gift className="h-4 w-4" />
                        Recompensas Desbloqueadas
                      </div>
                      
                      {/* Points Reward */}
                      {rewards?.points && (
                        <div className="flex items-center gap-2 text-sm">
                          <Star className="h-4 w-4 text-yellow-600" />
                          <span>+{rewards.points} pontos de recompensa</span>
                        </div>
                      )}
                      
                      {/* Unlocked Features */}
                      {unlockedFeatures.length > 0 && (
                        <div className="space-y-1">
                          {unlockedFeatures.map((feature, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Zap className="h-4 w-4 text-blue-600" />
                              <span>{feature}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Achievements */}
                      {rewards?.achievements && rewards.achievements.length > 0 && (
                        <div className="space-y-1">
                          {rewards.achievements.map((achievement, index) => (
                            <div key={index} className="flex items-center gap-2 text-sm">
                              <Crown className="h-4 w-4 text-purple-600" />
                              <span>Conquista: {achievement}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                
                {/* Actions */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 2.5 }}
                  className="flex gap-2 mt-6"
                >
                  {onViewProfile && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={onViewProfile}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Ver Perfil
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
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export default LevelUpNotification;