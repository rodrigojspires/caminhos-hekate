import { Metadata } from 'next'
import { getServerSession } from 'next-auth/next'
import { redirect } from 'next/navigation'
import { authOptions } from '@/lib/auth'
import { GamificationIntegration } from '@/components/gamification/GamificationIntegration'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Gamepad2, Trophy, Star, Zap, Users, Gift, Target, Award } from 'lucide-react'

export const metadata: Metadata = {
  title: 'Demonstração de Gamificação | Caminhos de Hekate',
  description: 'Demonstração completa do sistema de gamificação com conquistas, medalhas, pontos e notificações em tempo real.'
}

export default async function GamificationDemoPage() {
  const session = await getServerSession(authOptions)
  
  if (!session?.user?.id) {
    redirect('/auth/login')
  }

  const features = [
    {
      icon: <Star className="h-6 w-6 text-yellow-500" />,
      title: 'Sistema de Pontos',
      description: 'Ganhe pontos por atividades e suba de nível',
      details: ['Pontos por atividades', 'Sistema de níveis', 'Progresso visual']
    },
    {
      icon: <Trophy className="h-6 w-6 text-blue-500" />,
      title: 'Conquistas',
      description: 'Desbloqueie conquistas baseadas em suas atividades',
      details: ['Conquistas automáticas', 'Diferentes raridades', 'Notificações em tempo real']
    },
    {
      icon: <Award className="h-6 w-6 text-purple-500" />,
      title: 'Sistema de Medalhas',
      description: 'Colecione medalhas especiais por marcos importantes',
      details: ['Medalhas por categoria', 'Sistema de raridade', 'Coleção visual']
    },
    {
      icon: <Zap className="h-6 w-6 text-orange-500" />,
      title: 'Sequências (Streaks)',
      description: 'Mantenha atividades consistentes para bônus extras',
      details: ['Sequências de login', 'Bônus por consistência', 'Marcos de sequência']
    },
    {
      icon: <Gift className="h-6 w-6 text-green-500" />,
      title: 'Sistema de Recompensas',
      description: 'Receba recompensas especiais por conquistas',
      details: ['Recompensas automáticas', 'Pontos extras', 'Itens especiais']
    },
    {
      icon: <Users className="h-6 w-6 text-indigo-500" />,
      title: 'Integração com Grupos',
      description: 'Conquistas especiais por participação em grupos',
      details: ['Conquistas de grupo', 'Atividades colaborativas', 'Ranking de grupos']
    },
    {
      icon: <Target className="h-6 w-6 text-red-500" />,
      title: 'Notificações em Tempo Real',
      description: 'Receba feedback imediato por suas conquistas',
      details: ['Notificações push', 'Animações visuais', 'Sons de conquista']
    },
    {
      icon: <Gamepad2 className="h-6 w-6 text-pink-500" />,
      title: 'Dashboard Interativo',
      description: 'Visualize todo seu progresso em um painel completo',
      details: ['Estatísticas detalhadas', 'Gráficos de progresso', 'Histórico de atividades']
    }
  ]

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <Gamepad2 className="h-8 w-8 text-primary" />
          <h1 className="text-4xl font-bold">Demonstração de Gamificação</h1>
        </div>
        <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
          Explore nosso sistema completo de gamificação com conquistas, medalhas, 
          pontos e notificações em tempo real. Teste todas as funcionalidades 
          com atividades simuladas.
        </p>
        <div className="flex items-center justify-center gap-2">
          <Badge variant="secondary">Sistema Completo</Badge>
          <Badge variant="secondary">Tempo Real</Badge>
          <Badge variant="secondary">Interativo</Badge>
        </div>
      </div>

      {/* Features Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Funcionalidades do Sistema
          </CardTitle>
          <CardDescription>
            Conheça todas as funcionalidades disponíveis no sistema de gamificação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div key={index} className="space-y-3">
                <div className="flex items-center gap-3">
                  {feature.icon}
                  <h3 className="font-semibold">{feature.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground">
                  {feature.description}
                </p>
                <ul className="space-y-1">
                  {feature.details.map((detail, detailIndex) => (
                    <li key={detailIndex} className="text-xs text-muted-foreground flex items-center gap-2">
                      <div className="w-1 h-1 bg-primary rounded-full" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700">
            <Target className="h-5 w-5" />
            Como Usar a Demonstração
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">1</div>
                <h4 className="font-medium">Explore o Dashboard</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Navegue pelas abas para ver suas conquistas, sequências e estatísticas atuais.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">2</div>
                <h4 className="font-medium">Teste Atividades</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Use a aba &quot;Demonstração&quot; para simular atividades e ver o sistema em ação.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">3</div>
                <h4 className="font-medium">Observe as Notificações</h4>
              </div>
              <p className="text-sm text-muted-foreground">
                Veja as notificações em tempo real aparecerem quando você conquistar algo novo.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Gamification Component */}
      <GamificationIntegration 
        userId={session.user.id} 
        showNotifications={true}
        compactMode={false}
      />

      {/* Additional Info */}
      <Card>
        <CardHeader>
          <CardTitle>Sobre o Sistema de Gamificação</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Recursos Técnicos
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  Engine de conquistas automáticas
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  Sistema de notificações em tempo real
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  Rastreamento automático de atividades
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  Sistema de recompensas inteligente
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  Integração com grupos privados
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Benefícios para Usuários
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  Maior engajamento e motivação
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  Feedback visual imediato
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  Progresso claro e mensurável
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  Competição saudável
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1 h-1 bg-primary rounded-full" />
                  Recompensas por consistência
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}