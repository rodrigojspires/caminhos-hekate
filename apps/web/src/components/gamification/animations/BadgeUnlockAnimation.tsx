'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Star, Award, Crown, Zap, Target, Flame, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BadgeUnlockAnimationProps {
  isVisible: boolean;
  badge: {
    id: string;
    name: string;
    description: string;
    icon?: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
    category: string;
    points: number;
  };
  onComplete?: () => void;
  onSkip?: () => void;
  autoHide?: boolean;
  hideDelay?: number;
  showConfetti?: boolean;
  className?: string;
}

const RARITY_CONFIG = {
  common: {
    color: 'from-gray-400 to-gray-600',
    glow: 'shadow-gray-400/50',
    border: 'border-gray-400',
    text: 'text-gray-100',
    particles: '#9CA3AF'
  },
  rare: {
    color: 'from-blue-400 to-blue-600',
    glow: 'shadow-blue-400/50',
    border: 'border-blue-400',
    text: 'text-blue-100',
    particles: '#60A5FA'
  },
  epic: {
    color: 'from-purple-400 to-purple-600',
    glow: 'shadow-purple-400/50',
    border: 'border-purple-400',
    text: 'text-purple-100',
    particles: '#A78BFA'
  },
  legendary: {
    color: 'from-yellow-400 to-orange-500',
    glow: 'shadow-yellow-400/50',
    border: 'border-yellow-400',
    text: 'text-yellow-100',
    particles: '#FBBF24'
  },
  mythic: {
    color: 'from-pink-400 via-purple-500 to-indigo-600',
    glow: 'shadow-pink-400/50',
    border: 'border-pink-400',
    text: 'text-pink-100',
    particles: '#F472B6'
  }
};

const CATEGORY_ICONS = {
  achievement: Trophy,
  milestone: Star,
  special: Award,
  elite: Crown,
  power: Zap,
  precision: Target,
  streak: Flame,
  defense: Shield
};

interface FloatingParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
}

export function BadgeUnlockAnimation({
  isVisible,
  badge,
  onComplete,
  onSkip,
  autoHide = true,
  hideDelay = 5000,
  showConfetti = true,
  className
}: BadgeUnlockAnimationProps) {
  const [animationPhase, setAnimationPhase] = useState<'enter' | 'reveal' | 'celebrate' | 'exit'>('enter');
  const [particles, setParticles] = useState<FloatingParticle[]>([]);
  const [showSkipButton, setShowSkipButton] = useState(false);
  
  const rarityConfig = RARITY_CONFIG[badge.rarity];
  const IconComponent = CATEGORY_ICONS[badge.category as keyof typeof CATEGORY_ICONS] || Trophy;
  
  // Create floating particles
  const createParticles = () => {
    const newParticles: FloatingParticle[] = [];
    const particleCount = badge.rarity === 'mythic' ? 20 : badge.rarity === 'legendary' ? 15 : 10;
    
    for (let i = 0; i < particleCount; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 400,
        y: Math.random() * 400,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        size: Math.random() * 4 + 2,
        opacity: Math.random() * 0.8 + 0.2,
        life: 0,
        maxLife: 3000 + Math.random() * 2000
      });
    }
    
    setParticles(newParticles);
  };
  
  // Animation sequence
  useEffect(() => {
    if (!isVisible) return;
    
    const sequence = async () => {
      // Phase 1: Enter
      setAnimationPhase('enter');
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Phase 2: Reveal
      setAnimationPhase('reveal');
      createParticles();
      await new Promise(resolve => setTimeout(resolve, 1200));
      
      // Phase 3: Celebrate
      setAnimationPhase('celebrate');
      setShowSkipButton(true);
      
      if (autoHide) {
        await new Promise(resolve => setTimeout(resolve, hideDelay));
        setAnimationPhase('exit');
        await new Promise(resolve => setTimeout(resolve, 500));
        onComplete?.();
      }
    };
    
    sequence();
  }, [isVisible, autoHide, hideDelay, onComplete]);
  
  // Update particles
  useEffect(() => {
    if (particles.length === 0) return;
    
    const interval = setInterval(() => {
      setParticles(prev => 
        prev.map(particle => ({
          ...particle,
          x: particle.x + particle.vx,
          y: particle.y + particle.vy,
          life: particle.life + 16,
          opacity: Math.max(0, particle.opacity - 0.005)
        })).filter(particle => particle.life < particle.maxLife && particle.opacity > 0)
      );
    }, 16);
    
    return () => clearInterval(interval);
  }, [particles.length]);
  
  const handleSkip = () => {
    setAnimationPhase('exit');
    setTimeout(() => {
      onSkip?.();
      onComplete?.();
    }, 300);
  };
  
  if (!isVisible) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        className={cn(
          'fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm',
          className
        )}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Background particles */}
        <div className="absolute inset-0 overflow-hidden">
          {particles.map(particle => (
            <motion.div
              key={particle.id}
              className="absolute w-1 h-1 rounded-full"
              style={{
                left: particle.x,
                top: particle.y,
                backgroundColor: rarityConfig.particles,
                opacity: particle.opacity
              }}
              animate={{
                scale: [1, 1.5, 1],
                opacity: [particle.opacity, particle.opacity * 0.5, particle.opacity]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            />
          ))}
        </div>
        
        {/* Main animation container */}
        <motion.div
          className="relative flex flex-col items-center text-center max-w-md mx-4"
          initial={{ scale: 0, rotateY: -180 }}
          animate={{
            scale: animationPhase === 'enter' ? 0.8 : 1,
            rotateY: animationPhase === 'enter' ? -90 : 0
          }}
          exit={{ scale: 0, rotateY: 180 }}
          transition={{ 
            duration: 0.8, 
            type: 'spring', 
            stiffness: 100,
            damping: 15
          }}
        >
          {/* Badge container */}
          <motion.div
            className={cn(
              'relative mb-6 p-8 rounded-full bg-gradient-to-br',
              rarityConfig.color,
              rarityConfig.border,
              'border-4 shadow-2xl',
              rarityConfig.glow
            )}
            animate={{
              boxShadow: animationPhase === 'celebrate' 
                ? [`0 0 0 0 ${rarityConfig.particles}40`, `0 0 0 20px ${rarityConfig.particles}00`]
                : undefined,
              scale: animationPhase === 'celebrate' ? [1, 1.1, 1] : 1
            }}
            transition={{
              boxShadow: {
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeOut'
              },
              scale: {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut'
              }
            }}
          >
            {/* Rotating ring */}
            <motion.div
              className={cn(
                'absolute inset-0 rounded-full border-2 border-dashed',
                rarityConfig.border
              )}
              animate={{ rotate: 360 }}
              transition={{
                duration: 8,
                repeat: Infinity,
                ease: 'linear'
              }}
            />
            
            {/* Badge icon */}
            <motion.div
              className="relative z-10"
              initial={{ scale: 0, rotate: -180 }}
              animate={{ 
                scale: animationPhase === 'reveal' ? 1 : 0.8,
                rotate: animationPhase === 'reveal' ? 0 : -90
              }}
              transition={{ 
                delay: 0.3,
                duration: 0.6,
                type: 'spring',
                stiffness: 200
              }}
            >
              <IconComponent 
                className={cn('w-16 h-16', rarityConfig.text)}
                strokeWidth={1.5}
              />
            </motion.div>
            
            {/* Sparkle effects */}
            {animationPhase === 'celebrate' && (
              <>
                {[...Array(6)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 bg-white rounded-full"
                    style={{
                      top: '50%',
                      left: '50%',
                      transformOrigin: '0 0'
                    }}
                    animate={{
                      x: [0, Math.cos(i * 60 * Math.PI / 180) * 60],
                      y: [0, Math.sin(i * 60 * Math.PI / 180) * 60],
                      opacity: [1, 0],
                      scale: [0, 1, 0]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      delay: i * 0.1,
                      ease: 'easeOut'
                    }}
                  />
                ))}
              </>
            )}
          </motion.div>
          
          {/* Badge info */}
          <motion.div
            className="text-white space-y-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ 
              opacity: animationPhase === 'reveal' ? 1 : 0,
              y: animationPhase === 'reveal' ? 0 : 20
            }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            {/* Achievement unlocked text */}
            <motion.div
              className="text-sm font-medium text-yellow-400 uppercase tracking-wider"
              animate={{
                scale: animationPhase === 'celebrate' ? [1, 1.05, 1] : 1
              }}
              transition={{
                duration: 1.5,
                repeat: Infinity,
                ease: 'easeInOut'
              }}
            >
              Conquista Desbloqueada!
            </motion.div>
            
            {/* Badge name */}
            <h2 className="text-2xl font-bold text-white mb-2">
              {badge.name}
            </h2>
            
            {/* Badge description */}
            <p className="text-gray-300 text-sm mb-4 max-w-xs">
              {badge.description}
            </p>
            
            {/* Badge details */}
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className={cn('px-3 py-1 rounded-full border', rarityConfig.border, rarityConfig.text)}>
                {badge.rarity.charAt(0).toUpperCase() + badge.rarity.slice(1)}
              </div>
              <div className="text-yellow-400 font-semibold">
                +{badge.points} pontos
              </div>
            </div>
          </motion.div>
          
          {/* Skip button */}
          <AnimatePresence>
            {showSkipButton && (
              <motion.button
                onClick={handleSkip}
                className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            )}
          </AnimatePresence>
        </motion.div>
        
        {/* Continue prompt */}
        <motion.div
          className="absolute bottom-8 text-white/60 text-sm"
          initial={{ opacity: 0 }}
          animate={{ 
            opacity: animationPhase === 'celebrate' ? 1 : 0
          }}
          transition={{ delay: 1 }}
        >
          <motion.div
            animate={{ y: [0, -5, 0] }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
          >
            Clique em qualquer lugar para continuar
          </motion.div>
        </motion.div>
        
        {/* Click to dismiss */}
        <motion.div
          className="absolute inset-0 cursor-pointer"
          onClick={handleSkip}
          initial={{ pointerEvents: 'none' }}
          animate={{ 
            pointerEvents: animationPhase === 'celebrate' ? 'auto' : 'none'
          }}
        />
      </motion.div>
    </AnimatePresence>
  );
}

// Preset animation configurations
export const createBadgeUnlockProps = (badge: BadgeUnlockAnimationProps['badge']) => {
  const baseProps = {
    badge,
    autoHide: true,
    showConfetti: true
  };
  
  switch (badge.rarity) {
    case 'mythic':
      return {
        ...baseProps,
        hideDelay: 8000
      };
    case 'legendary':
      return {
        ...baseProps,
        hideDelay: 6000
      };
    case 'epic':
      return {
        ...baseProps,
        hideDelay: 5000
      };
    default:
      return {
        ...baseProps,
        hideDelay: 4000
      };
  }
};

export default BadgeUnlockAnimation;