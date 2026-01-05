"use client"

import ProfileForm from '@/components/dashboard/profile/ProfileForm'
import ProfileStats from '@/components/dashboard/profile/ProfileStats'
import ProfileActivity from '@/components/dashboard/profile/ProfileActivity'
import SubscriptionSettings from '@/components/dashboard/profile/SubscriptionSettings'
import CommunicationPreferences from '@/components/dashboard/profile/CommunicationPreferences'
import Security2FA from '@/components/dashboard/profile/Security2FA'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useDashboardVocabulary } from '@/components/dashboard/DashboardVocabularyProvider'

// Metadata moved to parent layout or removed for client component compliance

export default function ProfilePage() {
  const { mode, setMode, labels } = useDashboardVocabulary()

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{labels.pages.profileTitle}</h1>
        <p className="text-muted-foreground">
          {labels.pages.profileSubtitle}
        </p>
      </div>

      <Card className="temple-card">
        <CardHeader>
          <CardTitle className="temple-section-title">Vocabulário do Dashboard</CardTitle>
          <CardDescription className="text-[hsl(var(--temple-text-secondary))]">
            Escolha a linguagem exibida nos menus e textos do dashboard.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[hsl(var(--temple-text-primary))]">Linguagem iniciática</p>
              <p className="text-xs text-[hsl(var(--temple-text-secondary))]">Termos ritualísticos e simbólicos.</p>
            </div>
            <Switch
              checked={mode === 'initiatic'}
              onCheckedChange={(checked) => setMode(checked ? 'initiatic' : 'plain')}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-[hsl(var(--temple-text-primary))]">Linguagem simples</p>
              <p className="text-xs text-[hsl(var(--temple-text-secondary))]">Termos diretos e fáceis para iniciantes.</p>
            </div>
            <Switch
              checked={mode === 'plain'}
              onCheckedChange={(checked) => setMode(checked ? 'plain' : 'initiatic')}
            />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Informações Pessoais</TabsTrigger>
          <TabsTrigger value="subscription">Assinatura</TabsTrigger>
          <TabsTrigger value="notifications">Comunicação</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
              <CardDescription>
                Atualize suas informações de perfil e preferências
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ProfileForm 
                profile={{
                  id: '1',
                  name: 'Usuário',
                  email: 'usuario@exemplo.com',
                  phone: '',
                  location: '',
                  birthDate: '',
                  bio: '',
                  avatar: '',
                  interests: [],
                  notifications: {
                    email: true,
                    push: true,
                    marketing: false
                  }
                }}
                onSave={(profile) => console.log('Salvando perfil:', profile)}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Security2FA />
        </TabsContent>

        <TabsContent value="subscription" className="space-y-6">
          <SubscriptionSettings />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <CommunicationPreferences />
        </TabsContent>

        <TabsContent value="stats" className="space-y-6">
          <ProfileStats stats={{
            coursesCompleted: 0,
            totalStudyTime: 0,
            certificatesEarned: 0,
            averageRating: 0,
            currentStreak: 0,
            totalPoints: 0,
            rank: 'Iniciante',
            joinDate: new Date().toISOString()
          }} />
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <ProfileActivity activities={[]} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
