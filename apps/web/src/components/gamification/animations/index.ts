// Animation Components
export { ParticleEffect } from './ParticleEffect';
export { ConfettiCelebration, celebrateAchievement, celebrateLevelUp, celebrateStreak } from './ConfettiCelebration';
export { BadgeUnlockAnimation, createBadgeUnlockProps } from './BadgeUnlockAnimation';

// Re-export types
export { type ParticleEffectProps } from './ParticleEffect';
export { type ConfettiCelebrationProps } from './ConfettiCelebration';
export { type BadgeUnlockAnimationProps } from './BadgeUnlockAnimation';

// Default exports
export { default as ParticleEffectComponent } from './ParticleEffect';
export { default as ConfettiCelebrationComponent } from './ConfettiCelebration';
export { default as BadgeUnlockAnimationComponent } from './BadgeUnlockAnimation';

// Animation utilities and presets
export const ANIMATION_PRESETS = {
  // Particle presets
  particles: {
    celebration: {
      count: 50,
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1'],
      shapes: ['circle', 'star'] as const,
      gravity: 0.5,
      wind: 0.2
    },
    achievement: {
      count: 30,
      colors: ['#FFD700', '#FFA500'],
      shapes: ['star'] as const,
      gravity: 0.3,
      wind: 0.1
    },
    levelUp: {
      count: 80,
      colors: ['#32CD32', '#1E90FF', '#FFD700'],
      shapes: ['circle', 'triangle', 'star'] as const,
      gravity: 0.6,
      wind: 0.3
    }
  },
  
  // Confetti presets
  confetti: {
    achievement: {
      intensity: 'high' as const,
      duration: 5000,
      colors: ['#FFD700', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'],
      shapes: ['star', 'circle'] as const
    },
    levelUp: {
      intensity: 'extreme' as const,
      duration: 6000,
      colors: ['#FFD700', '#FFA500', '#FF4500', '#32CD32', '#1E90FF'],
      shapes: ['star', 'triangle', 'circle'] as const,
      continuous: true
    },
    streak: {
      intensity: 'medium' as const,
      duration: 3000,
      colors: ['#FF6B6B', '#4ECDC4', '#FFEAA7'],
      shapes: ['rectangle', 'circle'] as const
    }
  },
  
  // Badge unlock presets
  badgeUnlock: {
    common: {
      hideDelay: 3000,
      showConfetti: false
    },
    rare: {
      hideDelay: 4000,
      showConfetti: true
    },
    epic: {
      hideDelay: 5000,
      showConfetti: true
    },
    legendary: {
      hideDelay: 6000,
      showConfetti: true
    },
    mythic: {
      hideDelay: 8000,
      showConfetti: true
    }
  }
};

// Animation timing constants
export const ANIMATION_TIMINGS = {
  FAST: 200,
  NORMAL: 300,
  SLOW: 500,
  VERY_SLOW: 800,
  CELEBRATION: 2000,
  LONG_CELEBRATION: 5000
};

// Animation easing presets
export const ANIMATION_EASINGS = {
  BOUNCE: 'spring(1, 80, 10, 0)',
  SMOOTH: 'ease-out',
  ELASTIC: 'spring(1, 100, 15, 0)',
  SHARP: 'ease-in-out'
}