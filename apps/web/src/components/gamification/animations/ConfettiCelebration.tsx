'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface ConfettiPiece {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  size: number;
  shape: 'rectangle' | 'circle' | 'triangle' | 'star';
  opacity: number;
  life: number;
  maxLife: number;
}

export interface ConfettiCelebrationProps {
  isActive: boolean;
  intensity?: 'low' | 'medium' | 'high' | 'extreme';
  duration?: number;
  colors?: string[];
  shapes?: ConfettiPiece['shape'][];
  gravity?: number;
  wind?: number;
  spread?: number;
  origin?: { x: number; y: number };
  className?: string;
  style?: React.CSSProperties;
  onComplete?: () => void;
  autoTrigger?: boolean;
  continuous?: boolean;
}

const INTENSITY_CONFIG = {
  low: { count: 30, velocity: 6, size: { min: 3, max: 8 } },
  medium: { count: 60, velocity: 8, size: { min: 4, max: 10 } },
  high: { count: 100, velocity: 10, size: { min: 5, max: 12 } },
  extreme: { count: 150, velocity: 12, size: { min: 6, max: 15 } }
};

const DEFAULT_COLORS = [
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#FFD93D', // Gold
  '#6BCF7F', // Light Green
  '#4D96FF', // Light Blue
  '#9B59B6', // Purple
  '#E74C3C', // Bright Red
  '#F39C12', // Orange
  '#1ABC9C', // Turquoise
  '#3498DB', // Sky Blue
  '#E67E22'  // Carrot
];

const DEFAULT_SHAPES: ConfettiPiece['shape'][] = ['rectangle', 'circle', 'triangle', 'star'];

export function ConfettiCelebration({
  isActive,
  intensity = 'medium',
  duration = 4000,
  colors = DEFAULT_COLORS,
  shapes = DEFAULT_SHAPES,
  gravity = 0.8,
  wind = 0.1,
  spread = 60,
  origin = { x: 0.5, y: 0.1 },
  className,
  style,
  onComplete,
  autoTrigger = true,
  continuous = false
}: ConfettiCelebrationProps) {
  const [confetti, setConfetti] = useState<ConfettiPiece[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  const lastEmissionRef = useRef<number>(0);
  
  const config = INTENSITY_CONFIG[intensity];
  
  const createConfettiPiece = (index: number, containerWidth: number, containerHeight: number): ConfettiPiece => {
    const startX = containerWidth * origin.x;
    const startY = containerHeight * origin.y;
    
    // Create spread angle
    const spreadAngle = (spread * Math.PI) / 180;
    const angle = -Math.PI / 2 + (Math.random() - 0.5) * spreadAngle;
    
    // Random velocity with some variation
    const velocity = config.velocity * (0.7 + Math.random() * 0.6);
    
    return {
      id: Date.now() + index,
      x: startX + (Math.random() - 0.5) * 20,
      y: startY,
      vx: Math.cos(angle) * velocity + (Math.random() - 0.5) * 2,
      vy: Math.sin(angle) * velocity,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 15,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: config.size.min + Math.random() * (config.size.max - config.size.min),
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      opacity: 1,
      life: 0,
      maxLife: duration + Math.random() * 1000
    };
  };
  
  const updateConfetti = (deltaTime: number, currentTime: number) => {
    setConfetti(prevConfetti => {
      let updatedConfetti = prevConfetti.map(piece => {
        const newPiece = { ...piece };
        
        // Update position
        newPiece.x += newPiece.vx * deltaTime;
        newPiece.y += newPiece.vy * deltaTime;
        
        // Apply gravity
        newPiece.vy += gravity * deltaTime;
        
        // Apply wind resistance and drift
        newPiece.vx += (Math.random() - 0.5) * wind * deltaTime;
        newPiece.vx *= 0.999; // Air resistance
        
        // Update rotation
        newPiece.rotation += newPiece.rotationSpeed * deltaTime;
        
        // Update life and opacity
        newPiece.life += deltaTime;
        const lifeRatio = newPiece.life / newPiece.maxLife;
        
        // Fade out in the last 30% of life
        if (lifeRatio > 0.7) {
          newPiece.opacity = Math.max(0, (1 - lifeRatio) / 0.3);
        }
        
        return newPiece;
      }).filter(piece => {
        // Remove pieces that are off-screen or have expired
        const container = containerRef.current;
        if (!container) return piece.life < piece.maxLife;
        
        const rect = container.getBoundingClientRect();
        return (
          piece.life < piece.maxLife &&
          piece.x > -50 &&
          piece.x < rect.width + 50 &&
          piece.y < rect.height + 100
        );
      });
      
      // Add new confetti for continuous mode
      if (continuous && isAnimating && containerRef.current) {
        const timeSinceLastEmission = currentTime - lastEmissionRef.current;
        if (timeSinceLastEmission > 200) { // Emit every 200ms
          const rect = containerRef.current.getBoundingClientRect();
          const newPieces = Array.from({ length: Math.floor(config.count / 10) }, (_, i) => 
            createConfettiPiece(i, rect.width, rect.height)
          );
          updatedConfetti = [...updatedConfetti, ...newPieces];
          lastEmissionRef.current = currentTime;
        }
      }
      
      // Check if animation should end
      if (updatedConfetti.length === 0 && isAnimating && !continuous) {
        setIsAnimating(false);
        onComplete?.();
      }
      
      return updatedConfetti;
    });
  };
  
  const animate = (currentTime: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = currentTime;
    }
    
    const deltaTime = (currentTime - startTimeRef.current) / 16.67; // Normalize to 60fps
    startTimeRef.current = currentTime;
    
    updateConfetti(deltaTime, currentTime);
    
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }
  };
  
  const startCelebration = () => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newConfetti = Array.from({ length: config.count }, (_, i) => 
      createConfettiPiece(i, rect.width, rect.height)
    );
    
    setConfetti(prev => [...prev, ...newConfetti]);
    
    if (!isAnimating) {
      setIsAnimating(true);
      startTimeRef.current = undefined;
      lastEmissionRef.current = performance.now();
      animationRef.current = requestAnimationFrame(animate);
    }
  };
  
  const stopCelebration = () => {
    setIsAnimating(false);
    if (!continuous) {
      setConfetti([]);
    }
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };
  
  // Handle auto trigger
  useEffect(() => {
    if (autoTrigger && isActive) {
      startCelebration();
    } else if (!isActive) {
      stopCelebration();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, autoTrigger]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  const renderConfettiPiece = (piece: ConfettiPiece) => {
    const shapeElement = (() => {
      const baseStyle = {
        width: piece.size,
        height: piece.size,
        backgroundColor: piece.color
      };
      
      switch (piece.shape) {
        case 'circle':
          return (
            <div 
              className="rounded-full"
              style={baseStyle}
            />
          );
        case 'rectangle':
          return (
            <div 
              className="rounded-sm"
              style={{
                ...baseStyle,
                width: piece.size * 1.5,
                height: piece.size * 0.8
              }}
            />
          );
        case 'triangle':
          return (
            <div 
              style={{
                width: 0,
                height: 0,
                borderLeft: `${piece.size / 2}px solid transparent`,
                borderRight: `${piece.size / 2}px solid transparent`,
                borderBottom: `${piece.size}px solid ${piece.color}`
              }}
            />
          );
        case 'star':
          return (
            <svg 
              width={piece.size} 
              height={piece.size} 
              viewBox="0 0 24 24"
              style={{ color: piece.color }}
            >
              <path 
                d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" 
                fill="currentColor"
              />
            </svg>
          );
        default:
          return (
            <div 
              className="rounded-sm"
              style={baseStyle}
            />
          );
      }
    })();
    
    return (
      <motion.div
        key={piece.id}
        className="absolute pointer-events-none"
        style={{
          left: piece.x - piece.size / 2,
          top: piece.y - piece.size / 2,
          opacity: piece.opacity,
          transform: `rotate(${piece.rotation}deg)`,
          zIndex: 1000
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ duration: 0.2 }}
      >
        {shapeElement}
      </motion.div>
    );
  };
  
  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-hidden', className)}
      style={style}
    >
      {/* Confetti Container */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
          {confetti.map(renderConfettiPiece)}
        </AnimatePresence>
      </div>
    </div>
  );
}

// Preset celebration functions
export const celebrateAchievement = () => {
  return {
    intensity: 'high' as const,
    duration: 5000,
    colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
    shapes: ['star', 'circle'] as ConfettiPiece['shape'][]
  };
};

export const celebrateLevelUp = () => {
  return {
    intensity: 'extreme' as const,
    duration: 6000,
    colors: ['#FFD700', '#FFA500', '#FF4500', '#32CD32', '#1E90FF'],
    shapes: ['star', 'triangle', 'circle'] as ConfettiPiece['shape'][],
    continuous: true
  };
};

export const celebrateStreak = () => {
  return {
    intensity: 'medium' as const,
    duration: 3000,
    colors: ['#FF6B6B', '#4ECDC4', '#FFEAA7'],
    shapes: ['rectangle', 'circle'] as ConfettiPiece['shape'][]
  };
};

export default ConfettiCelebration;