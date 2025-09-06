"use client"

import ProfileForm from '@/components/dashboard/profile/ProfileForm'
import ProfileStats from '@/components/dashboard/profile/ProfileStats'
import ProfileActivity from '@/components/dashboard/profile/ProfileActivity'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Metadata moved to parent layout or removed for client component compliance

export default function ProfilePage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Meu Perfil</h1>
        <p className="text-muted-foreground">
          Gerencie suas informações pessoais e preferências
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile">Informações Pessoais</TabsTrigger>
          <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          <TabsTrigger value="activity">Atividade</TabsTrigger>
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
