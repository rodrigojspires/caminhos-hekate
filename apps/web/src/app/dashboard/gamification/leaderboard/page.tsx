'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Award, 
  Flame, 
  Crown, 
  Medal, 
  Star,
  TrendingUp,
  Users,
  Calendar,
  Target,
  Zap
} from 'lucide-react';
import { useGamificationStore } from '@/stores/gamificationStore';
import { LeaderboardCategory, LeaderboardPeriod } from '@/types/gamification';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const CATEGORY_CONFIG = {
  general: {
    label: 'Geral',
    icon: Trophy,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    description: 'Ranking baseado no total de pontos acumulados'
  },
  learning: {
    label: 'Aprendizado',
    icon: Award,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    description: 'Ranking baseado em conquistas de aprendizado'
  },
  engagement: {
    label: 'Engajamento',
    icon: Flame,
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    description: 'Ranking baseado em insígnias de engajamento'
  },
  social: {
    label: 'Social',
    icon: Users,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    description: 'Ranking baseado em insígnias sociais'
  }
};

const PERIOD_CONFIG = {
  daily: { label: 'Hoje', icon: Calendar, description: 'Ranking do dia atual' },
  weekly: { label: 'Semana', icon: Calendar, description: 'Ranking da semana atual' },
  monthly: { label: 'Mês', icon: Calendar, description: 'Ranking do mês atual' },
  all: { label: 'Todos os Tempos', icon: TrendingUp, description: 'Ranking histórico completo' }
};

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
        <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
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
      return 'bg-gradient-to-r from-gray-300 to-gray-500 text-white';
    case 3:
      return 'bg-gradient-to-r from-amber-400 to-amber-600 text-white';
    default:
      return 'bg-muted text-muted-foreground';
  }
}

export default function LeaderboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<LeaderboardCategory>('general');
  const [selectedPeriod, setSelectedPeriod] = useState<LeaderboardPeriod>('weekly');
  
  const { 
    leaderboard, 
    leaderboardPosition,
    userStats,
    isLoadingLeaderboard,
    fetchLeaderboard 
  } = useGamificationStore();

  React.useEffect(() => {
    fetchLeaderboard(selectedPeriod, selectedCategory);
  }, [selectedCategory, selectedPeriod, fetchLeaderboard]);

  const categoryConfig = CATEGORY_CONFIG[selectedCategory];
  const periodConfig = PERIOD_CONFIG[selectedPeriod];
  const CategoryIcon = categoryConfig.icon;
  const PeriodIcon = periodConfig.icon;
  
  const currentUserPosition = leaderboardPosition?.[selectedCategory] || null;
  const currentUserEntry = leaderboard?.find(entry => entry.userId === 'current-user'); // This should come from auth context

  if (isLoadingLeaderboard) {
    return (
      <div className="container mx-auto py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Ranking</h1>
            <p className="text-muted-foreground">
              Veja como você se compara com outros usuários
            </p>
          </div>
        </div>
        
        <div className="space-y-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Ranking</h1>
          <p className="text-muted-foreground">
            Veja como você se compara com outros usuários
          </p>
        </div>
        
        {currentUserPosition && (
          <Badge variant="outline" className="flex items-center gap-2 px-4 py-2">
            <TrendingUp className="h-4 w-4" />
            Sua posição: #{currentUserPosition}
          </Badge>
        )}
      </div>
      
      {/* Current User Stats */}
      {userStats && (
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Suas Estatísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{userStats.totalPoints.toLocaleString('pt-BR')}</p>
                <p className="text-sm text-muted-foreground">Pontos</p>
              </div>
              
              <div className="text-center">
                <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{userStats.achievementsCount}</p>
                <p className="text-sm text-muted-foreground">Conquistas</p>
              </div>
              
              <div className="text-center">
                <Flame className="h-8 w-8 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">{userStats.currentStreak}</p>
                <p className="text-sm text-muted-foreground">Sequência Atual</p>
              </div>
              
              <div className="text-center">
                <Star className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold">Nível {userStats.currentLevel}</p>
                <p className="text-sm text-muted-foreground">Nível</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
      
      {/* Category and Period Filters */}
      <div className="flex flex-col md:flex-row gap-4">
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {Object.entries(CATEGORY_CONFIG).map(([category, config]) => {
                const Icon = config.icon;
                const isSelected = selectedCategory === category;
                
                return (
                  <Button
                    key={category}
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => setSelectedCategory(category as LeaderboardCategory)}
                    className={cn(
                      'flex flex-col items-center gap-2 h-auto py-4',
                      isSelected && config.bgColor
                    )}
                  >
                    <Icon className={cn('h-6 w-6', isSelected ? 'text-white' : config.color)} />
                    <div className="text-center">
                      <p className="font-medium">{config.label}</p>
                      <p className="text-xs opacity-80">{config.description}</p>
                    </div>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
        
        <Card className="flex-1">
          <CardHeader>
            <CardTitle className="text-lg">Período</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {Object.entries(PERIOD_CONFIG).map(([period, config]) => {
                const Icon = config.icon;
                const isSelected = selectedPeriod === period;
                
                return (
                  <Button
                    key={period}
                    variant={isSelected ? 'default' : 'outline'}
                    onClick={() => setSelectedPeriod(period as LeaderboardPeriod)}
                    className="flex flex-col items-center gap-1 h-auto py-3"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-xs">{config.label}</span>
                  </Button>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Current Selection Info */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className={cn('p-3 rounded-full', categoryConfig.bgColor)}>
              <CategoryIcon className={cn('h-6 w-6', categoryConfig.color)} />
            </div>
            <div>
              <h3 className="font-semibold">
                Ranking de {categoryConfig.label} - {periodConfig.label}
              </h3>
              <p className="text-sm text-muted-foreground">
                {categoryConfig.description} • {periodConfig.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Classificação
          </CardTitle>
        </CardHeader>
        <CardContent>
          {leaderboard && leaderboard.length > 0 ? (
            <div className="space-y-2">
              {leaderboard.map((entry, index) => {
                const position = index + 1;
                const isCurrentUser = entry.userId === 'current-user'; // This should come from auth context
                
                return (
                  <div
                    key={entry.id}
                    className={cn(
                      'flex items-center gap-4 p-4 rounded-lg border transition-all duration-200',
                      isCurrentUser 
                        ? 'bg-primary/10 border-primary/30 shadow-md' 
                        : 'bg-card hover:bg-accent/50',
                      position <= 3 && !isCurrentUser ? categoryConfig.bgColor : ''
                    )}
                  >
                    {/* Rank */}
                    <div className="flex items-center justify-center w-12">
                      {getRankIcon(position)}
                    </div>
                    
                    {/* Position Badge for Top 3 */}
                    {position <= 3 && (
                      <Badge className={cn('text-xs font-bold', getRankBadgeColor(position))}>
                        #{position}
                      </Badge>
                    )}
                    
                    {/* Avatar */}
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={entry.userAvatar || ''} />
                      <AvatarFallback className="text-sm font-bold">
                        {entry.userName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    
                    {/* User Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          'font-semibold truncate',
                          isCurrentUser ? 'text-primary' : 'text-foreground'
                        )}>
                          {entry.userName || 'Usuário'}
                          {isCurrentUser && (
                            <span className="text-sm text-muted-foreground ml-2">(Você)</span>
                          )}
                        </p>
                        
                        {position > 3 && (
                          <Badge variant="outline" className="text-xs">
                            #{position}
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-1">
                        <CategoryIcon className={cn('h-4 w-4', categoryConfig.color)} />
                        <p className="text-sm text-muted-foreground">
                          {selectedCategory === 'general' && `${entry.points.toLocaleString('pt-BR')} pontos`}
                          {selectedCategory === 'learning' && `${entry.points.toLocaleString('pt-BR')} conquistas`}
                          {selectedCategory === 'engagement' && `${entry.points.toLocaleString('pt-BR')} insígnias`}
                          {selectedCategory === 'social' && `${entry.points.toLocaleString('pt-BR')} insígnias`}
                        </p>
                      </div>
                    </div>
                    
                    {/* Score */}
                    <div className="text-right">
                      <p className={cn(
                        'text-xl font-bold',
                        position === 1 ? 'text-yellow-600' :
                        position === 2 ? 'text-gray-600' :
                        position === 3 ? 'text-amber-600' :
                        isCurrentUser ? 'text-primary' :
                        'text-muted-foreground'
                      )}>
                        {entry.points.toLocaleString('pt-BR')}
                      </p>
                      {entry.calculatedAt && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(entry.calculatedAt), 'dd/MM/yy', { locale: ptBR })}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <p className="text-lg font-medium text-muted-foreground mb-2">
                Nenhum dado de ranking disponível
              </p>
              <p className="text-sm text-muted-foreground">
                Seja o primeiro a aparecer no ranking de {categoryConfig.label.toLowerCase()}!
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Tips Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Dicas para Subir no Ranking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Ganhe Pontos</h4>
              <p className="text-sm text-muted-foreground">
                Complete cursos, participe de atividades e desbloqueie conquistas
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Award className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Desbloqueie Conquistas</h4>
              <p className="text-sm text-muted-foreground">
                Explore diferentes áreas e complete desafios especiais
              </p>
            </div>
            
            <div className="text-center p-4 bg-muted/50 rounded-lg">
              <Flame className="h-8 w-8 text-orange-600 mx-auto mb-2" />
              <h4 className="font-medium mb-1">Mantenha a Sequência</h4>
              <p className="text-sm text-muted-foreground">
                Acesse a plataforma diariamente para manter sua sequência ativa
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}