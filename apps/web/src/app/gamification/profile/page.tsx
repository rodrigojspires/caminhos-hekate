'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { PointsDisplay } from '@/components/gamification/dashboard/PointsDisplay';
import { LevelProgress } from '@/components/gamification/dashboard/LevelProgress';
import { BadgeCollection } from '@/components/gamification/achievements/BadgeCollection';
import { StreakCounter } from '@/components/gamification/streaks/StreakCounter';
import { StreakCalendar } from '@/components/gamification/streaks/StreakCalendar';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Trophy, 
  Star, 
  Award, 
  Target, 
  Calendar, 
  TrendingUp, 
  Clock, 
  BookOpen,
  Users,
  Zap,
  Crown,
  Medal
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

function ProfileLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function UserProfileHeader({ userId }: { userId: string }) {
  const [userProfile, setUserProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/gamification/profile?userId=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user profile');
        }
        const data = await response.json();
        setUserProfile(data.profile);
      } catch (error) {
        console.error('Error fetching user profile:', error);
        setUserProfile(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  if (loading) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="animate-pulse">
            <div className="flex items-center space-x-4 mb-6">
              <div className="w-20 h-20 bg-gray-200 rounded-full"></div>
              <div className="space-y-2">
                <div className="h-6 bg-gray-200 rounded w-32"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userProfile) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <p className="text-center text-gray-500">Erro ao carregar perfil do usuário</p>
        </CardContent>
      </Card>
    );
  }

  const profile = userProfile || {
    name: 'Usuário',
    avatar: null,
    level: 1,
    title: 'Iniciante',
    joinDate: new Date(),
    totalPoints: 0,
    currentStreak: 0,
    longestStreak: 0,
    achievements: 0,
    coursesCompleted: 0,
    rank: 0,
    totalUsers: 0
  };

  const membershipDays = Math.floor((Date.now() - profile.joinDate.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
          <Avatar className="h-24 w-24">
            <AvatarImage src={profile.avatar || undefined} />
            <AvatarFallback className="text-2xl">
              {(String(profile.name) || '')
                .split(' ')
                .map((n: string) => n[0])
                .join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2">{profile.name}</h1>
            <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-4">
              <Badge variant="secondary" className="flex items-center space-x-1">
                <Crown className="h-3 w-3" />
                <span>{profile.title}</span>
              </Badge>
              <Badge variant="outline" className="flex items-center space-x-1">
                <Trophy className="h-3 w-3" />
                <span>#{profile.rank} de {profile.totalUsers.toLocaleString()}</span>
              </Badge>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div className="text-center">
                <p className="font-semibold text-lg">{profile.totalPoints.toLocaleString()}</p>
                <p className="text-muted-foreground">Pontos Totais</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{profile.level}</p>
                <p className="text-muted-foreground">Nível</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{profile.achievements}</p>
                <p className="text-muted-foreground">Conquistas</p>
              </div>
              <div className="text-center">
                <p className="font-semibold text-lg">{membershipDays}</p>
                <p className="text-muted-foreground">Dias na Plataforma</p>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function StatsOverview({ userId }: { userId: string }) {
  const [stats, setStats] = useState({
    weeklyPoints: 0,
    weeklyGoal: 500,
    studyTime: 0,
    coursesInProgress: 0,
    communityPosts: 0,
    helpfulVotes: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch(`/api/gamification/profile/stats?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Error fetching user stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  const displayStats = loading ? {
    weeklyPoints: 0,
    weeklyGoal: 500,
    studyTime: 0,
    coursesInProgress: 0,
    communityPosts: 0,
    helpfulVotes: 0
  } : stats;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center space-x-2">
              <Target className="h-4 w-4 text-blue-500" />
              <span className="text-sm font-medium">Meta Semanal</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {displayStats.weeklyPoints}/{displayStats.weeklyGoal}
            </span>
          </div>
          <Progress value={(displayStats.weeklyPoints / displayStats.weeklyGoal) * 100} className="mb-2" />
          <p className="text-xs text-muted-foreground">
            {displayStats.weeklyGoal - displayStats.weeklyPoints} pontos restantes
          </p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Tempo de Estudo</span>
          </div>
          <p className="text-2xl font-bold">{displayStats.studyTime}h</p>
          <p className="text-xs text-muted-foreground">Esta semana</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <BookOpen className="h-4 w-4 text-purple-500" />
            <span className="text-sm font-medium">Cursos Ativos</span>
          </div>
          <p className="text-2xl font-bold">{displayStats.coursesInProgress}</p>
          <p className="text-xs text-muted-foreground">Em andamento</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <Users className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Participação</span>
          </div>
          <p className="text-2xl font-bold">{displayStats.communityPosts}</p>
          <p className="text-xs text-muted-foreground">Posts na comunidade</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2 mb-2">
            <TrendingUp className="h-4 w-4 text-red-500" />
            <span className="text-sm font-medium">Votos Úteis</span>
          </div>
          <p className="text-2xl font-bold">{displayStats.helpfulVotes}</p>
          <p className="text-xs text-muted-foreground">Recebidos</p>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <StreakCounter 
            streak={{
              id: 'profile-streak',
              userId: userId,
              streakType: 'daily',
              currentStreak: 7,
              longestStreak: 21,
              lastActivity: new Date().toISOString(),
              isActive: true
            }}
            variant="compact"
          />
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressCharts({ userId }: { userId: string }) {
  const [pointsHistory, setPointsHistory] = useState<Array<{date: string, points: number}>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPointsHistory = async () => {
      try {
        const response = await fetch(`/api/gamification/profile/points-history?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setPointsHistory(data);
        }
      } catch (error) {
        console.error('Error fetching points history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPointsHistory();
  }, [userId]);

  const mockPointsHistory = [
    { date: '2024-01-01', points: 2100 },
    { date: '2024-01-08', points: 2250 },
    { date: '2024-01-15', points: 2400 },
    { date: '2024-01-22', points: 2580 },
    { date: '2024-01-29', points: 2750 },
    { date: '2024-02-05', points: 2850 }
  ];

  const weeklyActivity = [
    { day: 'Seg', points: 45 },
    { day: 'Ter', points: 80 },
    { day: 'Qua', points: 65 },
    { day: 'Qui', points: 90 },
    { day: 'Sex', points: 75 },
    { day: 'Sáb', points: 40 },
    { day: 'Dom', points: 25 }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5" />
            <span>Progresso de Pontos</span>
          </CardTitle>
          <CardDescription>Evolução dos seus pontos nas últimas semanas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Carregando histórico...</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={pointsHistory.length > 0 ? pointsHistory : mockPointsHistory}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="date" 
                tickFormatter={(value) => new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
              />
              <YAxis />
              <Tooltip 
                labelFormatter={(value) => new Date(value).toLocaleDateString('pt-BR')}
                formatter={(value) => [`${value} pontos`, 'Pontos']}
              />
              <Line 
                type="monotone" 
                dataKey="points" 
                stroke="#8884d8" 
                strokeWidth={2}
                dot={{ fill: '#8884d8' }}
              />
            </LineChart>
          </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Atividade Semanal</span>
          </CardTitle>
          <CardDescription>Pontos ganhos por dia nesta semana</CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyActivity}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="day" />
              <YAxis />
              <Tooltip formatter={(value) => [`${value} pontos`, 'Pontos']} />
              <Bar dataKey="points" fill="#82ca9d" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

function RecentAchievements({ userId }: { userId: string }) {
  const [recentAchievements, setRecentAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentAchievements = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/gamification/achievements/recent?userId=${userId}&limit=5`);
        if (!response.ok) {
          throw new Error('Failed to fetch recent achievements');
        }
        const data = await response.json();
        setRecentAchievements(data.achievements || []);
      } catch (error) {
        console.error('Error fetching recent achievements:', error);
        setRecentAchievements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentAchievements();
  }, [userId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5" />
            <span>Conquistas Recentes</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-500';
      case 'rare': return 'text-blue-500';
      case 'epic': return 'text-purple-500';
      case 'legendary': return 'text-yellow-500';
      case 'mythic': return 'text-pink-500';
      default: return 'text-gray-500';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Medal className="h-5 w-5" />
          <span>Conquistas Recentes</span>
        </CardTitle>
        <CardDescription>Suas últimas conquistas desbloqueadas</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentAchievements.map((achievement) => (
            <div key={achievement.id} className="flex items-center space-x-4 p-3 border rounded-lg">
              <div className={`p-2 rounded-full bg-muted ${getRarityColor(achievement.rarity)}`}>
                <Trophy className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h4 className="font-semibold">{achievement.name}</h4>
                <p className="text-sm text-muted-foreground">{achievement.description}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Desbloqueada em {achievement.unlockedAt.toLocaleDateString('pt-BR')}
                </p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className={getRarityColor(achievement.rarity)}>
                  {achievement.rarity}
                </Badge>
                <p className="text-sm font-semibold mt-1">+{achievement.points} pts</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <ProfileLoadingSkeleton />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Suspense fallback={<ProfileLoadingSkeleton />}>
        <UserProfileHeader userId={session.user.id} />
        <StatsOverview userId={session.user.id} />
        
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList>
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="progress">Progresso</TabsTrigger>
            <TabsTrigger value="achievements">Conquistas</TabsTrigger>
            <TabsTrigger value="streaks">Sequências</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <ProgressCharts userId={session.user.id} />
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RecentAchievements userId={session.user.id} />
              <Card>
                <CardHeader>
                  <CardTitle>Nível Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <LevelProgress />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="progress" className="space-y-6">
            <ProgressCharts userId={session.user.id} />
            <Card>
              <CardHeader>
                <CardTitle>Estatísticas Detalhadas</CardTitle>
              </CardHeader>
              <CardContent>
                <PointsDisplay 
                  showTransactions={true}
                />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="achievements" className="space-y-6">
            <BadgeCollection showFilters={true} />
          </TabsContent>
          
          <TabsContent value="streaks" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Sequência Atual</CardTitle>
                </CardHeader>
                <CardContent>
                  <StreakCounter 
                    streak={{ 
                      id: 'profile-streak',
                      userId: session.user.id,
                      streakType: 'daily',
                      currentStreak: 7,
                      longestStreak: 21,
                      lastActivity: new Date().toISOString(),
                      isActive: true
                    }}
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>Calendário de Atividades</CardTitle>
                </CardHeader>
                <CardContent>
                  <StreakCalendar 
                    streak={{ 
                      id: 'profile-streak',
                      userId: session.user.id,
                      streakType: 'daily',
                      currentStreak: 7,
                      longestStreak: 21,
                      lastActivity: new Date().toISOString(),
                      isActive: true
                    }}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </Suspense>
    </div>
  );
}