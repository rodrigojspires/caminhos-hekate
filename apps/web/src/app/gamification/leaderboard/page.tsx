'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { Leaderboard } from '@/components/gamification/Leaderboard';
// Remover import incorreto de RankingFilters
// import { RankingFilters } from '@/components/gamification/leaderboard/RankingFilters';
// Remover import não utilizado de UserRankCard
// import { UserRankCard } from '@/components/gamification/leaderboard/UserRankCard';
// Remover Tabs imports não utilizados
// import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Trophy, Star, Crown, Medal, Award, TrendingUp } from 'lucide-react';

function LeaderboardLoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(10)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-4">
            <div className="flex items-center space-x-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UserCurrentRank({ userId }: { userId: string }) {
  const [userRank, setUserRank] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRank = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/gamification/leaderboard/user/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user rank');
        }
        const data = await response.json();
        setUserRank(data);
      } catch (error) {
        console.error('Error fetching user rank:', error);
        setUserRank(null);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRank();
  }, [userId]);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            <span>Sua Posição Atual</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="text-center">
                <Skeleton className="h-8 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!userRank) return null;



  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5 text-yellow-500" />
          <span>Sua Posição Atual</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-primary">#{userRank.position}</p>
            <p className="text-sm text-muted-foreground">Posição Global</p>
            {userRank.change && (
              <Badge variant={userRank.change.startsWith('+') ? 'default' : 'destructive'} className="mt-1">
                <TrendingUp className="h-3 w-3 mr-1" />
                {userRank.change}
              </Badge>
            )}
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{userRank.points.toLocaleString()}</p>
            <p className="text-sm text-muted-foreground">Pontos Totais</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{userRank.level}</p>
            <p className="text-sm text-muted-foreground">Nível</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold">{userRank.streak}</p>
            <p className="text-sm text-muted-foreground">Sequência Atual</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TopPerformers() {
  const [topUsers, setTopUsers] = useState<TopUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTopPerformers = async () => {
      try {
        const response = await fetch('/api/gamification/leaderboard/top-performers');
        if (response.ok) {
          const data = await response.json();
          setTopUsers(data);
        }
      } catch (error) {
        console.error('Error fetching top performers:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchTopPerformers();
  }, []);

  if (loading) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span>Top 3 Performers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="text-center p-4 border rounded-lg">
                <Skeleton className="h-6 w-6 mx-auto mb-3" />
                <Skeleton className="h-16 w-16 rounded-full mx-auto mb-3" />
                <Skeleton className="h-4 w-24 mx-auto mb-1" />
                <Skeleton className="h-3 w-16 mx-auto mb-2" />
                <Skeleton className="h-4 w-20 mx-auto" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!topUsers.length) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Star className="h-5 w-5 text-yellow-500" />
            <span>Top 3 Performers</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            Nenhum dado de performance disponível no momento.
          </p>
        </CardContent>
      </Card>
    );
  }

  const getRankIcon = (position: number) => {
    switch (position) {
      case 1:
        return <Crown className="h-6 w-6 text-yellow-500" />;
      case 2:
        return <Medal className="h-6 w-6 text-gray-400" />;
      case 3:
        return <Award className="h-6 w-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold">#{position}</span>;
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Star className="h-5 w-5 text-yellow-500" />
          <span>Top 3 Performers</span>
        </CardTitle>
        <CardDescription>
          Os usuários com melhor desempenho neste mês
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {topUsers.map((user) => (
            <div key={user.id} className="text-center p-4 border rounded-lg">
              <div className="flex justify-center mb-3">
                {getRankIcon(user.position)}
              </div>
              <Avatar className="h-16 w-16 mx-auto mb-3">
                <AvatarImage src={user.avatar || undefined} />
                <AvatarFallback>
                  {user.name.split(' ').map((n: string) => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <h3 className="font-semibold mb-1">{user.name}</h3>
              <p className="text-sm text-muted-foreground mb-2">Nível {user.level}</p>
              <p className="text-lg font-bold text-primary">{user.points.toLocaleString()} pts</p>
              <Badge variant="outline" className="mt-2">
                {user.badge}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function LeaderboardContent({ period, category }: { period: string; category: string }) {
  const { data: session } = useSession();
  return (
    <Leaderboard userId={session?.user?.id || ''} />
  );
}

// Define o tipo para os top performers
interface TopUser {
  id: string;
  position: number;
  avatar?: string | null;
  name: string;
  level: number;
  points: number;
  badge: string;
}

export default function LeaderboardPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  if (status === 'loading') {
    return <LeaderboardLoadingSkeleton />;
  }

  if (!session) {
    return null;
  }

  const userId = typeof session?.user?.id === 'string' ? session.user.id : '';

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ranking</h1>
        <p className="text-muted-foreground">
          Veja sua posição no ranking global e compete com outros usuários da plataforma.
        </p>
      </div>

      <Suspense fallback={<LeaderboardLoadingSkeleton />}>
        <UserCurrentRank userId={userId} />
        <TopPerformers />
        <Leaderboard userId={userId} />
      </Suspense>
    </div>
  );
}