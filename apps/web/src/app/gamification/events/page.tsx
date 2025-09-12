'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Suspense, useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Trophy, 
  Users, 
  Target, 
  Gift, 
  Star, 
  Zap, 
  Award, 
  Crown,
  Timer,
  CheckCircle,
  PlayCircle,
  Lock
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

function EventsLoadingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full mb-4" />
              <Skeleton className="h-8 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ActiveEvents({ userId }: { userId: string }) {
  const [activeEvents, setActiveEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchActiveEvents = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/gamification/events?status=active&userId=${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch active events');
        }
        const data = await response.json();
        setActiveEvents(data.events || []);
      } catch (error) {
        console.error('Error fetching active events:', error);
        setActiveEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchActiveEvents();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-full mb-4"></div>
                <div className="flex justify-between items-center">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!activeEvents.length) {
    return (
      <div className="text-center py-12">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum evento ativo</h3>
        <p className="text-muted-foreground">
          Não há eventos de gamificação ativos no momento. Volte em breve!
        </p>
      </div>
    );
  }

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'monthly_challenge': return 'bg-blue-500';
      case 'competition': return 'bg-red-500';
      case 'special_event': return 'bg-purple-500';
      case 'daily_challenge': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><PlayCircle className="h-3 w-3 mr-1" />Ativo</Badge>;
      case 'ending_soon':
        return <Badge variant="destructive"><Timer className="h-3 w-3 mr-1" />Terminando</Badge>;
      case 'completed':
        return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Concluído</Badge>;
      case 'upcoming':
        return <Badge variant="outline"><Lock className="h-3 w-3 mr-1" />Em Breve</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatTimeRemaining = (endDate: Date) => {
    const now = new Date();
    const diff = endDate.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    
    if (days > 0) {
      return `${days}d ${hours}h restantes`;
    }
    return `${hours}h restantes`;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {activeEvents.map((event) => (
        <Card key={event.id} className="relative overflow-hidden">
          <div className={`absolute top-0 left-0 w-full h-1 ${getEventTypeColor(event.type)}`} />
          
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between mb-2">
              {getStatusBadge(event.status)}
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-1" />
                {event.participants.toLocaleString()}
              </div>
            </div>
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <CardDescription className="text-sm">{event.description}</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {event.target && (
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <span>Progresso</span>
                  <span>{event.progress}/{event.target}</span>
                </div>
                <Progress value={(event.progress / event.target) * 100} className="h-2" />
              </div>
            )}
            
            {event.userRank && (
              <div className="flex items-center justify-between p-2 bg-muted rounded">
                <span className="text-sm font-medium">Sua Posição</span>
                <Badge variant="outline" className="flex items-center space-x-1">
                  <Crown className="h-3 w-3" />
                  <span>#{event.userRank}</span>
                </Badge>
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center">
                <Gift className="h-4 w-4 mr-1" />
                Recompensas
              </h4>
              <div className="space-y-1">
                {event.rewards.map((reward: any, index: number) => (
                  <div key={index} className="flex items-center text-xs text-muted-foreground">
                    {reward.type === 'badge' && <Award className="h-3 w-3 mr-1" />}
                    {reward.type === 'points' && <Star className="h-3 w-3 mr-1" />}
                    {reward.type === 'title' && <Crown className="h-3 w-3 mr-1" />}
                    {reward.type === 'premium' && <Zap className="h-3 w-3 mr-1" />}
                    {reward.type === 'multiplier' && <Target className="h-3 w-3 mr-1" />}
                    <span>
                      {reward.type === 'badge' && `Badge: ${reward.name}`}
                      {reward.type === 'points' && `${reward.amount} pontos`}
                      {reward.type === 'title' && `Título: ${reward.name}`}
                      {reward.type === 'premium' && `Premium: ${reward.duration}`}
                      {reward.type === 'multiplier' && `Multiplicador: ${reward.value}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                {formatTimeRemaining(event.endDate)}
              </div>
              <Button size="sm" variant="outline">
                Ver Detalhes
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function UpcomingEvents({ userId }: { userId: string }) {
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        const response = await fetch(`/api/gamification/events/upcoming?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setUpcomingEvents(data);
        }
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUpcomingEvents();
  }, [userId]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!upcomingEvents.length) {
    return (
      <div className="text-center py-8">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum evento próximo</h3>
        <p className="text-muted-foreground">
          Não há eventos programados no momento.
        </p>
      </div>
    );
  }

  const mockUpcomingEvents = [
    {
      id: '4',
      title: 'Desafio de Março',
      description: 'Novo desafio mensal com foco em cursos avançados',
      type: 'monthly_challenge',
      startDate: new Date('2024-03-01'),
      endDate: new Date('2024-03-31'),
      estimatedParticipants: 1500,
      rewards: [
        { type: 'badge', name: 'Explorador Avançado', rarity: 'epic' },
        { type: 'points', amount: 750 }
      ],
      status: 'upcoming'
    },
    {
      id: '5',
      title: 'Torneio de Conhecimento',
      description: 'Competição de quiz com perguntas sobre todos os cursos',
      type: 'competition',
      startDate: new Date('2024-02-20'),
      endDate: new Date('2024-02-27'),
      estimatedParticipants: 800,
      rewards: [
        { type: 'badge', name: 'Mestre do Conhecimento', rarity: 'legendary' },
        { type: 'points', amount: 1500 },
        { type: 'premium', duration: '3 meses' }
      ],
      status: 'upcoming'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(upcomingEvents.length > 0 ? upcomingEvents : mockUpcomingEvents).map((event) => (
        <Card key={event.id} className="opacity-75">
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <Badge variant="outline">
                <Lock className="h-3 w-3 mr-1" />
                Em Breve
              </Badge>
              <div className="flex items-center text-sm text-muted-foreground">
                <Users className="h-4 w-4 mr-1" />
                ~{event.estimatedParticipants.toLocaleString()}
              </div>
            </div>
            <CardTitle className="text-lg">{event.title}</CardTitle>
            <CardDescription>{event.description}</CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <h4 className="text-sm font-semibold flex items-center">
                <Gift className="h-4 w-4 mr-1" />
                Recompensas Previstas
              </h4>
              <div className="space-y-1">
                {event.rewards.map((reward: any, index: number) => (
                  <div key={index} className="flex items-center text-xs text-muted-foreground">
                    {reward.type === 'badge' && <Award className="h-3 w-3 mr-1" />}
                    {reward.type === 'points' && <Star className="h-3 w-3 mr-1" />}
                    {reward.type === 'premium' && <Zap className="h-3 w-3 mr-1" />}
                    <span>
                      {reward.type === 'badge' && `Badge: ${reward.name}`}
                      {reward.type === 'points' && `${reward.amount} pontos`}
                      {reward.type === 'premium' && `Premium: ${reward.duration}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="text-xs text-muted-foreground flex items-center">
                <Calendar className="h-3 w-3 mr-1" />
                Inicia em {event.startDate.toLocaleDateString('pt-BR')}
              </div>
              <Button size="sm" variant="outline" disabled>
                Aguardar
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CompletedEvents({ userId }: { userId: string }) {
  const [completedEvents, setCompletedEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCompletedEvents = async () => {
      try {
        const response = await fetch(`/api/gamification/events/completed?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          setCompletedEvents(data);
        }
      } catch (error) {
        console.error('Error fetching completed events:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCompletedEvents();
  }, [userId]);

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(2)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-6 w-48 mb-2" />
              <Skeleton className="h-4 w-full mb-4" />
              <Skeleton className="h-16 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!completedEvents.length) {
    return (
      <div className="text-center py-8">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-semibold mb-2">Nenhum evento concluído</h3>
        <p className="text-muted-foreground">
          Você ainda não concluiu nenhum evento.
        </p>
      </div>
    );
  }

  const mockCompletedEvents = [
    {
      id: '6',
      title: 'Desafio de Janeiro',
      description: 'Complete 15 lições no primeiro mês do ano',
      type: 'monthly_challenge',
      completedAt: new Date('2024-01-31'),
      userProgress: 18,
      target: 15,
      userRank: 23,
      totalParticipants: 1156,
      rewardsEarned: [
        { type: 'badge', name: 'Novo Começo', earned: true },
        { type: 'points', amount: 400, earned: true },
        { type: 'title', name: 'Pioneiro de Janeiro', earned: true }
      ],
      status: 'completed'
    },
    {
      id: '7',
      title: 'Evento de Natal',
      description: 'Celebre o Natal estudando e ganhe recompensas especiais',
      type: 'special_event',
      completedAt: new Date('2023-12-25'),
      userProgress: 5,
      target: 5,
      userRank: 8,
      totalParticipants: 2341,
      rewardsEarned: [
        { type: 'badge', name: 'Espírito Natalino', earned: true },
        { type: 'points', amount: 500, earned: true },
        { type: 'multiplier', value: '2x por 1 semana', earned: true }
      ],
      status: 'completed'
    }
  ];

  return (
    <div className="space-y-4">
      {(completedEvents.length > 0 ? completedEvents : mockCompletedEvents).map((event) => (
        <Card key={event.id}>
          <CardContent className="p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold">{event.title}</h3>
                  <Badge variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Concluído
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{event.description}</p>
                <p className="text-xs text-muted-foreground">
                  Concluído em {event.completedAt.toLocaleDateString('pt-BR')}
                </p>
              </div>
              
              <div className="text-right">
                <div className="flex items-center space-x-2 mb-2">
                  <Badge variant="outline" className="flex items-center space-x-1">
                    <Crown className="h-3 w-3" />
                    <span>#{event.userRank} de {event.totalParticipants}</span>
                  </Badge>
                </div>
                <p className="text-sm font-semibold">
                  {event.userProgress}/{event.target} concluído
                </p>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center">
                  <Trophy className="h-4 w-4 mr-1" />
                  Recompensas Obtidas
                </h4>
                <div className="space-y-1">
                  {event.rewardsEarned.map((reward, index) => (
                    <div key={index} className="flex items-center text-xs">
                      {reward.earned ? (
                        <CheckCircle className="h-3 w-3 mr-2 text-green-500" />
                      ) : (
                        <div className="h-3 w-3 mr-2 rounded-full border border-muted-foreground" />
                      )}
                      <span className={reward.earned ? 'text-foreground' : 'text-muted-foreground'}>
                        {reward.type === 'badge' && `Badge: ${reward.name}`}
                        {reward.type === 'points' && `${reward.amount} pontos`}
                        {reward.type === 'title' && `Título: ${reward.name}`}
                        {reward.type === 'multiplier' && `Multiplicador: ${reward.value}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-500 mb-1">
                    {Math.round((event.userProgress / event.target) * 100)}%
                  </div>
                  <p className="text-xs text-muted-foreground">Taxa de Conclusão</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function EventLeaderboard({ eventId }: { eventId: string }) {
  // Fallback data for completed events
  const leaderboard = [
    { rank: 1, user: { name: 'Ana Silva', avatar: null }, score: 45, streak: 15 },
    { rank: 2, user: { name: 'Carlos Santos', avatar: null }, score: 42, streak: 12 },
    { rank: 3, user: { name: 'Maria Oliveira', avatar: null }, score: 38, streak: 10 },
    { rank: 4, user: { name: 'João Pereira', avatar: null }, score: 35, streak: 8 },
    { rank: 5, user: { name: 'Lucia Costa', avatar: null }, score: 33, streak: 7 }
  ];

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1: return <Crown className="h-5 w-5 text-yellow-500" />;
      case 2: return <Award className="h-5 w-5 text-gray-400" />;
      case 3: return <Award className="h-5 w-5 text-amber-600" />;
      default: return <span className="text-sm font-bold">#{rank}</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Trophy className="h-5 w-5" />
          <span>Ranking do Evento</span>
        </CardTitle>
        <CardDescription>Top 5 participantes da competição atual</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {leaderboard.map((entry) => (
            <div key={entry.rank} className="flex items-center space-x-4 p-3 border rounded-lg">
              <div className="flex items-center justify-center w-8">
                {getRankIcon(entry.rank)}
              </div>
              
              <Avatar className="h-8 w-8">
                <AvatarImage src={entry.user.avatar || undefined} />
                <AvatarFallback className="text-xs">
                  {entry.user.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1">
                <p className="font-medium text-sm">{entry.user.name}</p>
                <p className="text-xs text-muted-foreground">
                  Sequência: {entry.streak} dias
                </p>
              </div>
              
              <div className="text-right">
                <p className="font-bold">{entry.score}</p>
                <p className="text-xs text-muted-foreground">pontos</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default function EventsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'loading') return; // Still loading
    if (!session) {
      router.push('/auth/login');
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return <EventsLoadingSkeleton />;
  }

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Eventos de Gamificação</h1>
        <p className="text-muted-foreground">
          Participe de eventos especiais, competições e desafios para ganhar recompensas exclusivas.
        </p>
      </div>
      
      <Suspense fallback={<EventsLoadingSkeleton />}>
        <Tabs defaultValue="active" className="space-y-6">
          <TabsList>
            <TabsTrigger value="active">Eventos Ativos</TabsTrigger>
            <TabsTrigger value="upcoming">Próximos</TabsTrigger>
            <TabsTrigger value="completed">Concluídos</TabsTrigger>
            <TabsTrigger value="leaderboard">Rankings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="active" className="space-y-6">
            <ActiveEvents userId={session.user.id} />
          </TabsContent>
          
          <TabsContent value="upcoming" className="space-y-6">
            <UpcomingEvents userId={session.user.id} />
          </TabsContent>
          
          <TabsContent value="completed" className="space-y-6">
            <CompletedEvents userId={session.user.id} />
          </TabsContent>
          
          <TabsContent value="leaderboard" className="space-y-6">
            <EventLeaderboard eventId="current" />
          </TabsContent>
        </Tabs>
      </Suspense>
    </div>
  );
}