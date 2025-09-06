"use client"
import AccountSettings from '@/components/dashboard/settings/AccountSettings'
import NotificationSettings from '@/components/dashboard/settings/NotificationSettings'
import PrivacySettings from '@/components/dashboard/settings/PrivacySettings'
import PreferenceSettings from '@/components/dashboard/settings/PreferenceSettings'
import SecuritySettings from '@/components/dashboard/settings/SecuritySettings'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

// Metadata moved to parent layout or removed for client component compliance

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
        <p className="text-muted-foreground">
          Personalize sua experiência e gerencie suas preferências
        </p>
      </div>

      <Tabs defaultValue="account" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="account">Conta</TabsTrigger>
          <TabsTrigger value="notifications">Notificações</TabsTrigger>
          <TabsTrigger value="privacy">Privacidade</TabsTrigger>
          <TabsTrigger value="preferences">Preferências</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="account" className="space-y-6">
          <AccountSettings 
            user={{
              id: '1',
              name: 'Usuário',
              email: 'usuario@exemplo.com',
              avatar: '',
              phone: '',
              birthDate: '',
              gender: 'prefer_not_to_say',
              bio: '',
              location: '',
              website: '',
              twoFactorEnabled: false,
              emailVerified: true,
              phoneVerified: false,
              lastLogin: '2024-01-15T10:30:00Z',
              createdAt: '2023-06-01T08:00:00Z'
            }}
            onUpdateProfile={async () => {}}
            onChangePassword={async () => {}}
            onToggleTwoFactor={async () => {}}
            onDeleteAccount={async () => {}}
          />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          <NotificationSettings 
            preferences={[]}
            onUpdatePreferences={async () => {}}
          />
        </TabsContent>

        <TabsContent value="privacy" className="space-y-6">
          <PrivacySettings 
            privacyOptions={[]}
            dataExports={[]}
            onUpdatePrivacy={async () => {}}
            onRequestDataExport={async () => {}}
            onDownloadData={async () => {}}
            onDeleteAccount={async () => {}}
          />
        </TabsContent>

        <TabsContent value="preferences" className="space-y-6">
          <PreferenceSettings 
            preferences={[]}
            onUpdatePreferences={async () => {}}
          />
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <SecuritySettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}
