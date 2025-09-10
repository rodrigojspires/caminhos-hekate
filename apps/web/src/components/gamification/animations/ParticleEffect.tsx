'use client';

import React, { useEffect, useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  opacity: number;
  life: number;
  maxLife: number;
  shape: 'circle' | 'star' | 'diamond' | 'heart' | 'sparkle';
  rotation: number;
  rotationSpeed: number;
}

export interface ParticleEffectProps {
  isActive: boolean;
  particleCount?: number;
  duration?: number;
  colors?: string[];
  shapes?: Particle['shape'][];
  gravity?: number;
  wind?: number;
  spread?: number;
  velocity?: number;
  size?: { min: number; max: number };
  className?: string;
  style?: React.CSSProperties;
  onComplete?: () => void;
  trigger?: 'click' | 'hover' | 'auto';
  children?: React.ReactNode;
}

const DEFAULT_COLORS = [
  '#FFD700', // Gold
  '#FF6B6B', // Red
  '#4ECDC4', // Teal
  '#45B7D1', // Blue
  '#96CEB4', // Green
  '#FFEAA7', // Yellow
  '#DDA0DD', // Plum
  '#98D8C8', // Mint
  '#F7DC6F', // Light Gold
  '#BB8FCE'  // Light Purple
];

const DEFAULT_SHAPES: Particle['shape'][] = ['circle', 'star', 'diamond', 'sparkle'];

const SHAPE_PATHS = {
  circle: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z',
  star: 'M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z',
  diamond: 'M12 2L2 12l10 10 10-10L12 2z',
  heart: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
  sparkle: 'M12 2l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6l2-6z'
};

export function ParticleEffect({
  isActive,
  particleCount = 50,
  duration = 3000,
  colors = DEFAULT_COLORS,
  shapes = DEFAULT_SHAPES,
  gravity = 0.5,
  wind = 0,
  spread = 45,
  velocity = 8,
  size = { min: 4, max: 12 },
  className,
  style,
  onComplete,
  trigger = 'auto',
  children
}: ParticleEffectProps) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isAnimating, setIsAnimating] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>();
  
  const createParticle = (index: number, containerWidth: number, containerHeight: number): Particle => {
    const angle = (Math.PI * 2 * index) / particleCount + (Math.random() - 0.5) * (spread * Math.PI / 180);
    const speed = velocity * (0.5 + Math.random() * 0.5);
    const particleSize = size.min + Math.random() * (size.max - size.min);
    
    return {
      id: index,
      x: containerWidth / 2,
      y: containerHeight / 2,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      size: particleSize,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
      life: 0,
      maxLife: duration + Math.random() * 1000,
      shape: shapes[Math.floor(Math.random() * shapes.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10
    };
  };
  
  const updateParticles = (deltaTime: number) => {
    setParticles(prevParticles => {
      const updatedParticles = prevParticles.map(particle => {
        const newParticle = { ...particle };
        
        // Update position
        newParticle.x += newParticle.vx * deltaTime;
        newParticle.y += newParticle.vy * deltaTime;
        
        // Apply gravity
        newParticle.vy += gravity * deltaTime;
        
        // Apply wind
        newParticle.vx += wind * deltaTime;
        
        // Update rotation
        newParticle.rotation += newParticle.rotationSpeed * deltaTime;
        
        // Update life and opacity
        newParticle.life += deltaTime;
        const lifeRatio = newParticle.life / newParticle.maxLife;
        newParticle.opacity = Math.max(0, 1 - lifeRatio);
        
        // Fade out in the last 20% of life
        if (lifeRatio > 0.8) {
          newParticle.opacity *= (1 - lifeRatio) / 0.2;
        }
        
        return newParticle;
      }).filter(particle => particle.life < particle.maxLife);
      
      // Check if animation should end
      if (updatedParticles.length === 0 && isAnimating) {
        setIsAnimating(false);
        onComplete?.();
      }
      
      return updatedParticles;
    });
  };
  
  const animate = (currentTime: number) => {
    if (!startTimeRef.current) {
      startTimeRef.current = currentTime;
    }
    
    const deltaTime = (currentTime - startTimeRef.current) / 16.67; // Normalize to 60fps
    startTimeRef.current = currentTime;
    
    updateParticles(deltaTime);
    
    if (isAnimating) {
      animationRef.current = requestAnimationFrame(animate);
    }
  };
  
  const startAnimation = () => {
    if (!containerRef.current || isAnimating) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const newParticles = Array.from({ length: particleCount }, (_, i) => 
      createParticle(i, rect.width, rect.height)
    );
    
    setParticles(newParticles);
    setIsAnimating(true);
    startTimeRef.current = undefined;
    animationRef.current = requestAnimationFrame(animate);
  };
  
  const stopAnimation = () => {
    setIsAnimating(false);
    setParticles([]);
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
  };
  
  // Handle auto trigger
  useEffect(() => {
    if (trigger === 'auto' && isActive) {
      startAnimation();
    } else if (!isActive) {
      stopAnimation();
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, trigger]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);
  
  const handleInteraction = () => {
    if (trigger === 'click' || trigger === 'hover') {
      startAnimation();
    }
  };
  
  const renderParticle = (particle: Particle) => {
    const shapeElement = (() => {
      switch (particle.shape) {
        case 'circle':
          return (
            <div 
              className="rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color
              }}
            />
          );
        case 'star':
        case 'diamond':
        case 'heart':
        case 'sparkle':
          return (
            <svg 
              width={particle.size} 
              height={particle.size} 
              viewBox="0 0 24 24"
              style={{ color: particle.color }}
            >
              <path 
                d={SHAPE_PATHS[particle.shape]} 
                fill="currentColor"
              />
            </svg>
          );
        default:
          return (
            <div 
              className="rounded-full"
              style={{
                width: particle.size,
                height: particle.size,
                backgroundColor: particle.color
              }}
            />
          );
      }
    })();
    
    return (
      <motion.div
        key={particle.id}
        className="absolute pointer-events-none"
        style={{
          left: particle.x - particle.size / 2,
          top: particle.y - particle.size / 2,
          opacity: particle.opacity,
          transform: `rotate(${particle.rotation}deg)`
        }}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0 }}
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
      onClick={trigger === 'click' ? handleInteraction : undefined}
      onMouseEnter={trigger === 'hover' ? handleInteraction : undefined}
    >
      {children}
      
      {/* Particle Container */}
      <div className="absolute inset-0 pointer-events-none">
        <AnimatePresence>
          {particles.map(renderParticle)}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default ParticleEffect;