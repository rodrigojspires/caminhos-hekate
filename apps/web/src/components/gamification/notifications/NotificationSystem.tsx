'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import { AchievementNotification } from './AchievementNotification';
import { LevelUpNotification } from './LevelUpNotification';
import { NotificationToastContent } from './NotificationToast';
import { Achievement } from '@/types/gamification';
import { toast } from 'sonner';

interface NotificationQueueItem {
  id: string;
  type: 'achievement' | 'levelup' | 'streak' | 'points' | 'custom';
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: number;
  duration?: number;
  autoClose?: boolean;
}

export interface NotificationSystemProps {
  maxConcurrent?: number;
  defaultDuration?: number;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center' | 'bottom-center';
  enableSound?: boolean;
  enableVibration?: boolean;
  className?: string;
}

interface NotificationSystemContextType {
  showAchievementNotification: (achievement: Achievement, options?: Partial<NotificationQueueItem>) => void;
  showLevelUpNotification: (data: {
    previousLevel: number;
    newLevel: number;
    totalXP: number;
    xpForNextLevel: number;
    xpGained?: number;
    unlockedFeatures?: string[];
    rewards?: any;
  }, options?: Partial<NotificationQueueItem>) => void;
  showStreakNotification: (data: {
    type: 'started' | 'continued' | 'milestone' | 'lost';
    currentStreak: number;
    milestone?: number;
    points?: number;
  }, options?: Partial<NotificationQueueItem>) => void;
  showPointsNotification: (data: {
    points: number;
    reason: string;
    total?: number;
  }, options?: Partial<NotificationQueueItem>) => void;
  showCustomNotification: (data: {
    title: string;
    description: string;
    icon?: React.ReactNode;
    action?: () => void;
  }, options?: Partial<NotificationQueueItem>) => void;
  clearAllNotifications: () => void;
}

const NotificationSystemContext = React.createContext<NotificationSystemContextType | null>(null);

export function useNotificationSystem() {
  const context = React.useContext(NotificationSystemContext);
  if (!context) {
    throw new Error('useNotificationSystem must be used within a NotificationSystemProvider');
  }
  return context;
}

const PRIORITY_ORDER = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1
};

const SOUND_EFFECTS = {
  achievement: '/sounds/achievement.mp3',
  levelup: '/sounds/levelup.mp3',
  streak: '/sounds/streak.mp3',
  points: '/sounds/points.mp3'
};

export function NotificationSystem({
  maxConcurrent = 3,
  defaultDuration = 5000,
  position = 'top-right',
  enableSound = true,
  enableVibration = true,
  className
}: NotificationSystemProps) {
  const [queue, setQueue] = useState<NotificationQueueItem[]>([]);
  const [activeNotifications, setActiveNotifications] = useState<NotificationQueueItem[]>([]);
  const [soundEnabled, setSoundEnabled] = useState(enableSound);

  const playSound = useCallback((soundUrl: string) => {
    try {
      const audio = new Audio(soundUrl);
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      });
    } catch (error) {
      // Ignore audio errors
    }
  }, []);
  
  // Process queue and show notifications
  useEffect(() => {
    if (activeNotifications.length < maxConcurrent && queue.length > 0) {
      // Sort queue by priority and timestamp
      const sortedQueue = [...queue].sort((a, b) => {
        const priorityDiff = PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.timestamp - b.timestamp;
      });
      
      const nextNotification = sortedQueue[0];
      
      setQueue(prev => prev.filter(item => item.id !== nextNotification.id));
      setActiveNotifications(prev => [...prev, nextNotification]);
      
      // Play sound effect
      if (soundEnabled && nextNotification.type in SOUND_EFFECTS) {
        playSound(SOUND_EFFECTS[nextNotification.type as keyof typeof SOUND_EFFECTS]);
      }
      
      // Vibration feedback
      if (enableVibration && 'vibrate' in navigator) {
        const pattern = getVibrationPattern(nextNotification.priority);
        navigator.vibrate(pattern);
      }
    }
  }, [queue, activeNotifications, maxConcurrent, soundEnabled, enableVibration, playSound]);
  
  const getVibrationPattern = (priority: NotificationQueueItem['priority']): number[] => {
    switch (priority) {
      case 'critical':
        return [200, 100, 200, 100, 200];
      case 'high':
        return [150, 100, 150];
      case 'medium':
        return [100, 50, 100];
      case 'low':
      default:
        return [50];
    }
  };
  
  const addToQueue = useCallback((notification: Omit<NotificationQueueItem, 'id' | 'timestamp'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const queueItem: NotificationQueueItem = {
      ...notification,
      id,
      timestamp: Date.now(),
      duration: notification.duration ?? defaultDuration,
      autoClose: notification.autoClose ?? true
    };
    
    setQueue(prev => [...prev, queueItem]);
    return id;
  }, [defaultDuration]);
  
  const removeNotification = useCallback((id: string) => {
    setActiveNotifications(prev => prev.filter(item => item.id !== id));
  }, []);
  
  const clearAllNotifications = useCallback(() => {
    setQueue([]);
    setActiveNotifications([]);
  }, []);
  
  const showAchievementNotification = useCallback((achievement: Achievement, options: Partial<NotificationQueueItem> = {}) => {
    return addToQueue({
      type: 'achievement',
      data: achievement,
      priority: 'high',
      duration: 8000,
      ...options
    });
  }, [addToQueue]);
  
  const showLevelUpNotification = useCallback((data: any, options: Partial<NotificationQueueItem> = {}) => {
    return addToQueue({
      type: 'levelup',
      data,
      priority: 'critical',
      duration: 10000,
      ...options
    });
  }, [addToQueue]);
  
  const showStreakNotification = useCallback((data: any, options: Partial<NotificationQueueItem> = {}) => {
    const priority = data.type === 'milestone' ? 'high' : 'medium';
    return addToQueue({
      type: 'streak',
      data,
      priority,
      duration: 6000,
      ...options
    });
  }, [addToQueue]);
  
  const showPointsNotification = useCallback((data: any, options: Partial<NotificationQueueItem> = {}) => {
    return addToQueue({
      type: 'points',
      data,
      priority: 'low',
      duration: 4000,
      ...options
    });
  }, [addToQueue]);
  
  const showCustomNotification = useCallback((data: any, options: Partial<NotificationQueueItem> = {}) => {
    return addToQueue({
      type: 'custom',
      data,
      priority: 'medium',
      ...options
    });
  }, [addToQueue]);
  
  const getPositionStyles = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      case 'top-right':
        return 'top-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'bottom-center':
        return 'bottom-4 left-1/2 transform -translate-x-1/2';
      case 'bottom-right':
        return 'bottom-4 right-4';
      default:
        return 'top-4 right-4';
    }
  };
  
  const renderNotification = (notification: NotificationQueueItem) => {
    const commonProps = {
      key: notification.id,
      isVisible: true,
      onClose: () => removeNotification(notification.id),
      autoClose: notification.autoClose,
      duration: notification.duration,
      variant: 'toast' as const
    };
    
    switch (notification.type) {
      case 'achievement':
        return (
          <AchievementNotification
            {...commonProps}
            achievement={notification.data}
          />
        );
        
      case 'levelup':
        return (
          <LevelUpNotification
            {...commonProps}
            {...notification.data}
          />
        );
        
      case 'streak':
      case 'points':
      case 'custom':
        // Use toast for simpler notifications
        toast.custom(
          (t) => (
            <NotificationToastContent
              data={{
                type: notification.type === 'levelup' ? 'level_up' : notification.type,
                title: notification.data.title || getDefaultTitle(notification.type),
                description: notification.data.description || notification.data.reason,
                ...notification.data
              }}
              onDismiss={() => toast.dismiss(t)}
            />
          ),
          {
            duration: notification.duration,
            id: notification.id
          }
        );
        return null;
        
      default:
        return null;
    }
  };
  
  const getDefaultTitle = (type: string) => {
    switch (type) {
      case 'streak':
        return 'Sequência Atualizada';
      case 'points':
        return 'Pontos Ganhos';
      case 'custom':
        return 'Notificação';
      default:
        return 'Notificação';
    }
  };
  
  const contextValue: NotificationSystemContextType = {
    showAchievementNotification,
    showLevelUpNotification,
    showStreakNotification,
    showPointsNotification,
    showCustomNotification,
    clearAllNotifications
  };
  
  return (
    <NotificationSystemContext.Provider value={contextValue}>
      {/* Notification Container */}
      <div className={`fixed z-50 pointer-events-none ${getPositionStyles()} ${className || ''}`}>
        <div className="space-y-4 pointer-events-auto">
          <AnimatePresence mode="popLayout">
            {activeNotifications.map(renderNotification)}
          </AnimatePresence>
        </div>
      </div>
      
      {/* Sound Toggle (Optional) */}
      {enableSound && (
        <button
          onClick={() => setSoundEnabled(!soundEnabled)}
          className="fixed bottom-4 left-4 z-40 p-2 bg-background border rounded-full shadow-lg hover:shadow-xl transition-shadow"
          title={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
        >
          {soundEnabled ? '🔊' : '🔇'}
        </button>
      )}
    </NotificationSystemContext.Provider>
  );
}

export function NotificationSystemProvider({ children, ...props }: NotificationSystemProps & { children: React.ReactNode }) {
  return (
    <>
      {children}
      <NotificationSystem {...props} />
    </>
  );
}

export default NotificationSystem;
