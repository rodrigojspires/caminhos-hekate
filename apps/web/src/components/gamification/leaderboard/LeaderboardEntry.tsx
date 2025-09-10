'use client';

import React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Trophy, 
  Medal, 
  Award, 
  Crown,
  Star,
  TrendingUp,
  Users,
  MessageCircle,
  UserPlus
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { LeaderboardEntry as LeaderboardEntryType } from '@/types/gamification';

interface LeaderboardEntryProps {
  entry: LeaderboardEntryType;
  position: number;
  isCurrentUser?: boolean;
  showActions?: boolean;
  compact?: boolean;
  category?: 'general' | 'learning' | 'engagement' | 'social';
  className?: string;
}

function getRankIcon(position: number) {
  switch (position) {
    case 1:
      return <Crown className="h-6 w-6 text-yellow-500" />;
    case 2:
      return <Medal className="h-6 w-6 text-gray-400" />;
    case 3:
      return <Award className="h-6 w-6 text-amber-600" />;
    default:
      return (
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-bold text-muted-foreground">
          {position}
        </div>
      );
  }
}

function getRankBadgeColor(position: number) {
  switch (position) {
    case 1:
      return 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white';
    case 2:
      return 'bg-gradient-to-r from-gray-400 to-gray-600 text-white';
    case 3:
      return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
    default:
      if (position <= 10) return 'bg-gradient-to-r from-purple-400 to-purple-600 text-white';
      if (position <= 50) return 'bg-gradient-to-r from-blue-400 to-blue-600 text-white';
      return 'bg-muted text-muted-foreground';
  }
}

function getCategoryIcon(category: string) {
  switch (category) {
    case 'learning':
      return <Star className="h-4 w-4 text-purple-600" />;
    case 'engagement':
      return <TrendingUp className="h-4 w-4 text-orange-600" />;
    case 'social':
      return <Users className="h-4 w-4 text-blue-600" />;
    default:
      return <Trophy className="h-4 w-4 text-yellow-600" />;
  }
}

function formatScore(score: number, category?: string) {
  const formattedScore = score.toLocaleString('pt-BR');
  
  switch (category) {
    case 'learning':
      return `${formattedScore} XP`;
    case 'engagement':
      return `${formattedScore} pts`;
    case 'social':
      return `${formattedScore} pts`;
    default:
      return `${formattedScore} pontos`;
  }
}

export function LeaderboardEntry({
  entry,
  position,
  isCurrentUser = false,
  showActions = false,
  compact = false,
  category = 'general',
  className
}: LeaderboardEntryProps) {
  const isTopThree = position <= 3;
  const isTopTen = position <= 10;
  
  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 rounded-lg border transition-all duration-200',
        isCurrentUser 
          ? 'bg-primary/10 border-primary/30 shadow-md' 
          : 'bg-card hover:bg-accent/50 hover:shadow-sm',
        isTopThree && 'ring-2 ring-yellow-200/50',
        className
      )}
    >
      {/* Rank */}
      <div className="flex items-center justify-center w-10">
        {getRankIcon(position)}
      </div>
      
      {/* Avatar */}
      <div className="relative">
        <Avatar className={cn(
          compact ? 'h-10 w-10' : 'h-12 w-12',
          isTopThree && 'ring-2 ring-yellow-300/50'
        )}>
          <AvatarImage src={entry.userAvatar || ''} alt={entry.userName || 'Usuário'} />
          <AvatarFallback className={cn(
            'font-semibold',
            isTopThree ? 'bg-yellow-100 text-yellow-800' : 'bg-muted'
          )}>
            {entry.userName?.charAt(0)?.toUpperCase() || 'U'}
          </AvatarFallback>
        </Avatar>
        
        {/* Rank Badge */}
        {isTopTen && (
          <Badge 
            className={cn(
              'absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs font-bold',
              getRankBadgeColor(position)
            )}
          >
            {position}
          </Badge>
        )}
      </div>
      
      {/* User Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <h4 className={cn(
            'font-semibold truncate',
            isCurrentUser ? 'text-primary' : 'text-foreground',
            isTopThree && 'text-lg'
          )}>
            {entry.userName || 'Usuário Anônimo'}
            {isCurrentUser && (
              <span className="text-xs text-muted-foreground ml-2 font-normal">
                (Você)
              </span>
            )}
          </h4>
          
          {isTopThree && (
            <Badge variant="secondary" className={getRankBadgeColor(position)}>
              #{position}
            </Badge>
          )}
        </div>
        
        {!compact && (
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {getCategoryIcon(category)}
              <span>Nível {entry.level || 1}</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Trophy className="h-3 w-3" />
              <span>{entry.achievementCount || 0} conquistas</span>
            </div>
            
            <div className="flex items-center gap-1">
              <Medal className="h-3 w-3" />
              <span>{entry.badgeCount || 0} medalhas</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Score */}
      <div className="text-right">
        <div className={cn(
          'font-bold text-lg',
          position === 1 ? 'text-yellow-600' :
          position === 2 ? 'text-gray-600' :
          position === 3 ? 'text-amber-600' :
          'text-foreground'
        )}>
          {formatScore(entry.points || 0, category)}
        </div>
        
        {!compact && entry.pointsChange !== undefined && (
          <div className={cn(
            'text-xs flex items-center gap-1 justify-end mt-1',
            entry.pointsChange > 0 ? 'text-green-600' :
            entry.pointsChange < 0 ? 'text-red-600' :
            'text-muted-foreground'
          )}>
            <TrendingUp className={cn(
              'h-3 w-3',
              entry.pointsChange < 0 && 'rotate-180'
            )} />
            {entry.pointsChange > 0 ? '+' : ''}{entry.pointsChange}
          </div>
        )}
      </div>
      
      {/* Actions */}
      {showActions && !isCurrentUser && (
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <MessageCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
            <UserPlus className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default LeaderboardEntry;