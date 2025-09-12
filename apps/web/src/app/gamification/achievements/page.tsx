'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { AchievementCard } from '@/components/gamification/AchievementCard';
import { BadgeCollection } from '@/components/gamification/achievements/BadgeCollection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, Star, Award, Target, Zap, Crown } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';



function AchievementsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-16 w-16 rounded-full mx-auto mb-4" />
              <Skeleton className="h-3 w-full mb-2" />
              <Skeleton className="h-2 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function AchievementsStats({ userId }: { userId: string }) {
  const [stats, setStats] = useState({
    totalAchievements: 0,
    unlockedAchievements: 0,
    totalPoints: 0,
    rareAchievements: 0,
    completionRate: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/gamification/achievements/stats?userId=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch achievement stats');
        }
        const data = await response.json();
        setStats(data.stats || {
          totalAchievements: 0,
          unlockedAchievements: 0,
          totalPoints: 0,
          rareAchievements: 0,
          completionRate: 0
        });
      } catch (error) {
        console.error('Error fetching achievement stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {[...Array(5)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4">
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-6 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <div>
              <p className="text-sm font-medium">Total</p>
              <p className="text-2xl font-bold">{stats.unlockedAchievements}/{stats.totalAchievements}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-sm font-medium">Pontos</p>
              <p className="text-2xl font-bold">{stats.totalPoints.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Crown className="h-5 w-5 text-purple-500" />
            <div>
              <p className="text-sm font-medium">Raras</p>
              <p className="text-2xl font-bold">{stats.rareAchievements}</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center space-x-2">
            <Target className="h-5 w-5 text-green-500" />
            <div>
              <p className="text-sm font-medium">Progresso</p>
              <p className="text-2xl font-bold">{stats.completionRate}%</p>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Conclusão Geral</p>
            <Progress value={stats.completionRate} className="h-2" />
            <p className="text-xs text-muted-foreground">{stats.unlockedAchievements} de {stats.totalAchievements}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function AchievementsList({ userId, category }: { userId: string; category: string }) {
  const [achievements, setAchievements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAchievements = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/gamification/achievements?userId=${userId}&category=${category}`);
        if (!response.ok) {
          throw new Error('Failed to fetch achievements');
        }
        const data = await response.json();
        setAchievements(data.achievements || []);
      } catch (error) {
        console.error('Error fetching achievements:', error);
        setAchievements([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAchievements();
  }, [userId, category]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        <span className="ml-2 text-gray-600">Carregando conquistas...</span>
      </div>
    );
  }

  const filteredAchievements = achievements;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {filteredAchievements.map((achievement) => (
        <AchievementCard
          key={achievement.id}
          achievement={achievement}
        />
      ))}
    </div>
  );
}

export default function AchievementsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
  }, [status, router]);

  if (status === 'loading') {
    return (
      <div className="container mx-auto px-4 py-8">
        <AchievementsLoadingSkeleton />
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Conquistas</h1>
        <p className="text-muted-foreground">
          Visualize todas as suas conquistas, medalhas e progresso de objetivos.
        </p>
      </div>

      <Suspense fallback={<AchievementsLoadingSkeleton />}>
        <AchievementsStats userId={session.user.id} />
        
        <Tabs defaultValue="all" className="space-y-6">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="all">Todas</TabsTrigger>
            <TabsTrigger value="learning">Aprendizado</TabsTrigger>
            <TabsTrigger value="streak">Sequências</TabsTrigger>
            <TabsTrigger value="community">Comunidade</TabsTrigger>
            <TabsTrigger value="speed">Velocidade</TabsTrigger>
            <TabsTrigger value="special">Especiais</TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="space-y-6">
            <AchievementsList userId={session.user.id} category="all" />
          </TabsContent>
          
          <TabsContent value="learning" className="space-y-6">
            <AchievementsList userId={session.user.id} category="learning" />
          </TabsContent>
          
          <TabsContent value="streak" className="space-y-6">
            <AchievementsList userId={session.user.id} category="streak" />
          </TabsContent>
          
          <TabsContent value="community" className="space-y-6">
            <AchievementsList userId={session.user.id} category="community" />
          </TabsContent>
          
          <TabsContent value="speed" className="space-y-6">
            <AchievementsList userId={session.user.id} category="speed" />
          </TabsContent>
          
          <TabsContent value="special" className="space-y-6">
            <AchievementsList userId={session.user.id} category="special" />
          </TabsContent>
        </Tabs>
      </Suspense>
    </div>
  );
}