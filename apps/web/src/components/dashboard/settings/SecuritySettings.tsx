"use client"

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Shield, 
  Key, 
  Smartphone, 
  Monitor, 
  Clock, 
  MapPin, 
  AlertTriangle,
  CheckCircle,
  X,
  Eye,
  EyeOff,
  RefreshCw,
  Tag
} from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface LoginSession {
  id: string
  device: string
  location: string
  ip: string
  lastActive: string
  current: boolean
}

interface LoginHistory {
  id: string
  device: string
  location: string
  ip: string
  timestamp: string
  success: boolean
  action?: string
  userAgent?: string
}

interface SecurityAlert {
  id: string
  type: string
  severity: string // low, medium, high, critical
  title: string
  description: string
  status: 'PENDING' | 'ACKNOWLEDGED' | 'RESOLVED' | 'DISMISSED'
  createdAt: string
  resolvedAt?: string
  acknowledgedAt?: string
  ipAddress?: string
  userAgent?: string
  location?: string
  metadata?: Record<string, any>
}

export default function SecuritySettings() {
  const { data: session, status } = useSession()
  const [loading, setLoading] = useState(false)
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(false)
  const [twoFactorSetup, setTwoFactorSetup] = useState<{
    secret?: string
    qrCode?: string
    backupCodes?: string[]
    manualEntryKey?: string
  } | null>(null)
  const [twoFactorVerificationCode, setTwoFactorVerificationCode] = useState('')
  const [showBackupCodes, setShowBackupCodes] = useState(false)
  const [backupCodesStatus, setBackupCodesStatus] = useState<{
    totalCodes: number
    remainingCodes: number
    usedCodes: number
    backupCodes?: string[]
  } | null>(null)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [activeSessions, setActiveSessions] = useState<LoginSession[]>([])
  const [loginHistory, setLoginHistory] = useState<LoginHistory[]>([])
  const [securityAlerts, setSecurityAlerts] = useState<SecurityAlert[]>([])
  const [sessionsLoading, setSessionsLoading] = useState(true)
  const [historyLoading, setHistoryLoading] = useState(true)
  const [alertsLoading, setAlertsLoading] = useState(true)
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  const [securitySettings, setSecuritySettings] = useState({
    loginNotifications: true,
    suspiciousActivityAlerts: true,
    passwordExpiry: false,
    sessionTimeout: 30,
    allowMultipleSessions: true
  })

  // Carregar sessões ativas
  const loadActiveSessions = useCallback(async () => {
    try {
      setSessionsLoading(true)
      const response = await fetch('/api/auth/sessions')
      if (response.ok) {
        const data = await response.json()
        setActiveSessions(data.sessions || [])
      } else {
        toast.error('Erro ao carregar sessões ativas')
      }
    } catch (error) {
      console.error('Erro ao carregar sessões:', error)
      toast.error('Erro ao carregar sessões ativas')
    } finally {
      setSessionsLoading(false)
    }
  }, [])

  // Carregar histórico de login
  const loadLoginHistory = useCallback(async () => {
    try {
      setHistoryLoading(true)
      const response = await fetch('/api/auth/login-history?limit=10')
      if (response.ok) {
        const data = await response.json()
        setLoginHistory(data.history || [])
      } else {
        toast.error('Erro ao carregar histórico de login')
      }
    } catch (error) {
      console.error('Erro ao carregar histórico:', error)
      toast.error('Erro ao carregar histórico de login')
    } finally {
      setHistoryLoading(false)
    }
  }, [])

  // Carregar alertas de segurança
  const loadSecurityAlerts = useCallback(async () => {
    try {
      setAlertsLoading(true)
      const response = await fetch('/api/auth/security-alerts?limit=10&resolved=false')
      if (response.ok) {
        const data = await response.json()
        setSecurityAlerts(data.alerts || [])
      } else {
        toast.error('Erro ao carregar alertas de segurança')
      }
    } catch (error) {
      console.error('Erro ao carregar alertas:', error)
      toast.error('Erro ao carregar alertas de segurança')
    } finally {
      setAlertsLoading(false)
    }
  }, [])

  // Load 2FA status
  const load2FAStatus = useCallback(async () => {
    if (status !== 'authenticated') return
    
    try {
      const response = await fetch('/api/auth/2fa')
      if (response.ok) {
        const data = await response.json()
        setTwoFactorEnabled(data.enabled)
        
        if (data.enabled) {
          // Load backup codes status
          const backupResponse = await fetch('/api/auth/2fa/backup-codes')
          if (backupResponse.ok) {
            const backupData = await backupResponse.json()
            setBackupCodesStatus(backupData)
          }
        }
      } else if (response.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.')
      }
    } catch (error) {
      console.error('Error loading 2FA status:', error)
      toast.error('Erro ao carregar status do 2FA')
    }
  }, [status])

  // Handle 2FA toggle
  const handleTwoFactorToggle = async (enabled: boolean) => {
    if (enabled && !twoFactorEnabled) {
      // Enable 2FA - start setup process
      await setup2FA()
    } else if (!enabled && twoFactorEnabled) {
      // Disable 2FA
      await disable2FA()
    }
  }

  // Setup 2FA
  const setup2FA = async () => {
    if (status !== 'authenticated') {
      toast.error('Você precisa estar logado para configurar 2FA')
      return
    }
    
    try {
      setLoading(true)
      const response = await fetch('/api/auth/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (response.ok) {
        const data = await response.json()
        setTwoFactorSetup(data)
        toast.success('QR Code gerado! Configure seu app autenticador.')
      } else if (response.status === 401) {
        toast.error('Sessão expirada. Faça login novamente.')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao configurar 2FA')
      }
    } catch (error) {
      console.error('Error setting up 2FA:', error)
      toast.error('Erro ao configurar 2FA')
    } finally {
      setLoading(false)
    }
  }

  // Verify and enable 2FA
  const verify2FA = async () => {
    if (!twoFactorSetup?.secret || !twoFactorVerificationCode) {
      toast.error('Código de verificação é obrigatório')
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/auth/2fa', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: twoFactorVerificationCode,
          secret: twoFactorSetup.secret
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setTwoFactorEnabled(true)
        setTwoFactorSetup(null)
        setTwoFactorVerificationCode('')
        setShowBackupCodes(true)
        await load2FAStatus()
        toast.success('2FA ativado com sucesso!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Código de verificação inválido')
      }
    } catch (error) {
      console.error('Error verifying 2FA:', error)
      toast.error('Erro ao verificar código')
    } finally {
      setLoading(false)
    }
  }

  // Disable 2FA
  const disable2FA = async () => {
    const code = prompt('Digite seu código 2FA ou código de backup para desabilitar:')
    if (!code) return

    try {
      setLoading(true)
      const response = await fetch('/api/auth/2fa', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: code
        })
      })
      
      if (response.ok) {
        setTwoFactorEnabled(false)
        setBackupCodesStatus(null)
        setShowBackupCodes(false)
        toast.success('2FA desabilitado com sucesso!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Código inválido')
      }
    } catch (error) {
      console.error('Error disabling 2FA:', error)
      toast.error('Erro ao desabilitar 2FA')
    } finally {
      setLoading(false)
    }
  }

  // Regenerate backup codes
  const regenerateBackupCodes = async () => {
    const code = prompt('Digite seu código 2FA para regenerar códigos de backup:')
    if (!code) return

    try {
      setLoading(true)
      const response = await fetch('/api/auth/2fa/backup-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: code
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        setTwoFactorSetup({ backupCodes: data.backupCodes })
        setShowBackupCodes(true)
        await load2FAStatus()
        toast.success('Códigos de backup regenerados!')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Código inválido')
      }
    } catch (error) {
      console.error('Error regenerating backup codes:', error)
      toast.error('Erro ao regenerar códigos')
    } finally {
      setLoading(false)
    }
  }



  // Carregar dados ao montar o componente
  useEffect(() => {
    if (status === 'authenticated') {
      loadActiveSessions()
      loadLoginHistory()
      loadSecurityAlerts()
      load2FAStatus()
    }
  }, [status, loadActiveSessions, loadLoginHistory, loadSecurityAlerts, load2FAStatus])

  const handlePasswordChange = async () => {
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error('As senhas não coincidem')
      return
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error('A nova senha deve ter pelo menos 8 caracteres')
      return
    }

    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000))
      toast.success('Senha alterada com sucesso')
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
    } catch (error) {
      toast.error('Erro ao alterar senha')
    } finally {
      setLoading(false)
    }
  }



  const handleTerminateSession = async (sessionId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/auth/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        toast.success('Sessão encerrada com sucesso')
        // Recarregar sessões ativas
        await loadActiveSessions()
        // Recarregar histórico para mostrar o logout remoto
        await loadLoginHistory()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao encerrar sessão')
      }
    } catch (error) {
      console.error('Erro ao encerrar sessão:', error)
      toast.error('Erro ao encerrar sessão')
    } finally {
      setLoading(false)
    }
  }

  // Handle resolve security alert
  const handleResolveAlert = async (alertId: string) => {
    try {
      setLoading(true)
      const response = await fetch(`/api/auth/security-alerts/${alertId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' })
      })
      
      if (response.ok) {
        toast.success('Alerta resolvido com sucesso')
        await loadSecurityAlerts()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao resolver alerta')
      }
    } catch (error) {
      console.error('Erro ao resolver alerta:', error)
      toast.error('Erro ao resolver alerta')
    } finally {
      setLoading(false)
    }
  }

  // Handle security setting change
  const handleSecuritySettingChange = async (setting: string, value: boolean | number) => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/security-settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [setting]: value })
      })
      
      if (response.ok) {
        setSecuritySettings(prev => ({ ...prev, [setting]: value }))
        toast.success('Configuração atualizada com sucesso')
      } else {
        const error = await response.json()
        toast.error(error.error || 'Erro ao atualizar configuração')
      }
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error)
      toast.error('Erro ao atualizar configuração')
    } finally {
      setLoading(false)
    }
  }



  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'bg-red-100 text-red-800 border-red-200'
      case 'HIGH': return 'bg-orange-100 text-orange-800 border-orange-200'
      case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'LOW': return 'bg-blue-100 text-blue-800 border-blue-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR')
  }

  const getDeviceIcon = (device: string) => {
    if (device.includes('iPhone') || device.includes('Android')) {
      return <Smartphone className="h-4 w-4" />
    }
    return <Monitor className="h-4 w-4" />
  }

  // Show loading while session is being loaded
  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center p-8">
        <RefreshCw className="h-6 w-6 animate-spin" />
        <span className="ml-2">Carregando...</span>
      </div>
    )
  }

  // Redirect to login if not authenticated
  if (status === 'unauthenticated') {
    return (
      <div className="text-center p-8">
        <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
        <h3 className="text-lg font-medium mb-2">Acesso Restrito</h3>
        <p className="text-muted-foreground mb-4">
          Você precisa estar logado para acessar as configurações de segurança.
        </p>
        <Button onClick={() => window.location.href = '/auth/signin'}>
          Fazer Login
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Configurações de Segurança</h2>
        <p className="text-muted-foreground">
          Gerencie suas configurações de segurança e privacidade
        </p>
      </div>

      <Tabs defaultValue="password" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="password">Senha</TabsTrigger>
          <TabsTrigger value="two-factor">2FA</TabsTrigger>
          <TabsTrigger value="sessions">Sessões</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="advanced">Avançado</TabsTrigger>
        </TabsList>

        <TabsContent value="password" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Alterar Senha
              </CardTitle>
              <CardDescription>
                Mantenha sua conta segura com uma senha forte
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Senha Atual</Label>
                <div className="relative">
                  <Input
                    id="current-password"
                    type={showCurrentPassword ? 'text' : 'password'}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, currentPassword: e.target.value }))}
                    placeholder="Digite sua senha atual"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  >
                    {showCurrentPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Digite sua nova senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirmar Nova Senha</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Confirme sua nova senha"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="pt-4">
                <Button 
                  onClick={handlePasswordChange} 
                  disabled={loading || !passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                  className="w-full"
                >
                  {loading ? (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Key className="mr-2 h-4 w-4" />
                  )}
                  Alterar Senha
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="two-factor" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Autenticação de Dois Fatores
              </CardTitle>
              <CardDescription>
                Adicione uma camada extra de segurança à sua conta
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">Status da 2FA</div>
                  <div className="text-sm text-muted-foreground">
                    {twoFactorEnabled ? 'Ativada' : 'Desativada'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {twoFactorEnabled ? (
                    <Badge variant="default" className="bg-green-100 text-green-800">
                      <CheckCircle className="mr-1 h-3 w-3" />
                      Ativa
                    </Badge>
                  ) : (
                    <Badge variant="secondary">
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      Inativa
                    </Badge>
                  )}
                  <Switch
                    checked={twoFactorEnabled}
                    onCheckedChange={handleTwoFactorToggle}
                    disabled={loading}
                  />
                </div>
              </div>

              {/* Configuração inicial do 2FA */}
              {!twoFactorEnabled && twoFactorSetup && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="text-sm font-medium">Configurar Autenticação de Dois Fatores</div>
                    
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                          1. Escaneie o QR Code com seu app autenticador
                        </div>
                        <div className="flex justify-center p-4 bg-white border rounded-lg">
                          {twoFactorSetup.qrCode && (
                            <Image 
                              src={twoFactorSetup.qrCode} 
                              alt="QR Code para 2FA" 
                              width={192}
                              height={192}
                              className="w-48 h-48"
                            />
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground text-center">
                          Ou use o código manual: <code className="bg-muted px-1 rounded">{twoFactorSetup.secret}</code>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <div className="text-sm text-muted-foreground">
                          2. Digite o código de 6 dígitos do seu app
                        </div>
                        <div className="space-y-3">
                          <Input
                            placeholder="000000"
                            value={twoFactorVerificationCode}
                            onChange={(e) => setTwoFactorVerificationCode(e.target.value)}
                            maxLength={6}
                            className="text-center text-lg tracking-widest"
                          />
                          <Button 
                            onClick={verify2FA}
                            disabled={loading || twoFactorVerificationCode.length !== 6}
                            className="w-full"
                          >
                            {loading ? (
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <CheckCircle className="h-4 w-4 mr-2" />
                            )}
                            Verificar e Ativar 2FA
                          </Button>
                        </div>
                        
                        {twoFactorSetup.backupCodes && (
                          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="text-sm font-medium text-yellow-800 mb-2">
                              ⚠️ Códigos de Backup
                            </div>
                            <div className="text-xs text-yellow-700 mb-3">
                              Guarde estes códigos em local seguro. Você pode usá-los para acessar sua conta se perder o acesso ao app autenticador.
                            </div>
                            <div className="grid grid-cols-2 gap-1 font-mono text-xs">
                              {twoFactorSetup.backupCodes.map((code, index) => (
                                <div key={index} className="bg-white p-1 rounded border">
                                  {code}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Interface quando 2FA está ativo */}
              {twoFactorEnabled && (
                <>
                  <Separator />
                  <div className="space-y-4">
                    <div className="text-sm font-medium">Métodos de Autenticação</div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <Smartphone className="h-4 w-4" />
                          <div>
                            <div className="font-medium">App Autenticador</div>
                            <div className="text-sm text-muted-foreground">Google Authenticator, Authy</div>
                          </div>
                        </div>
                        <Badge variant="default">Configurado</Badge>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-medium">Códigos de Backup</div>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setShowBackupCodes(!showBackupCodes)}
                        >
                          {showBackupCodes ? 'Ocultar' : 'Mostrar'} Códigos
                        </Button>
                      </div>
                      
                      {backupCodesStatus && (
                        <div className="text-sm text-muted-foreground">
                          {backupCodesStatus.remainingCodes} de {backupCodesStatus.totalCodes} códigos restantes
                        </div>
                      )}
                      
                      {showBackupCodes && (
                        <div className="space-y-3">
                          <div className="p-4 bg-muted rounded-lg">
                            <div className="text-sm text-muted-foreground mb-2">
                              Use estes códigos se você perder o acesso ao seu app autenticador:
                            </div>
                            <div className="grid grid-cols-2 gap-2 font-mono text-sm">
                              {backupCodesStatus?.backupCodes && backupCodesStatus.backupCodes.length > 0 ? (
                                backupCodesStatus.backupCodes.map((code, index) => (
                                  <div key={index} className="bg-white p-2 rounded border text-center">
                                    {code}
                                  </div>
                                ))
                              ) : (
                                <div className="col-span-2 text-center py-4 text-muted-foreground">
                                  Nenhum código de backup disponível
                                </div>
                              )}
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            onClick={regenerateBackupCodes}
                            disabled={loading}
                          >
                            {loading ? (
                              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <RefreshCw className="h-4 w-4 mr-2" />
                            )}
                            Gerar Novos Códigos
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                Sessões Ativas
              </CardTitle>
              <CardDescription>
                Gerencie onde você está conectado
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>Carregando sessões...</span>
                </div>
              ) : activeSessions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhuma sessão ativa encontrada
                </div>
              ) : (
                <div className="space-y-4">
                  {activeSessions.map((session) => (
                    <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(session.device)}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {session.device}
                            {session.current && (
                              <Badge variant="default" className="text-xs">
                                Atual
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {session.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(session.lastActive)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            IP: {session.ip}
                          </div>
                        </div>
                      </div>
                      {!session.current && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTerminateSession(session.id)}
                          disabled={loading}
                        >
                          <X className="h-4 w-4 mr-1" />
                          Encerrar
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Histórico de Login
              </CardTitle>
              <CardDescription>
                Últimas tentativas de acesso à sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>Carregando histórico...</span>
                </div>
              ) : loginHistory.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum histórico de login encontrado
                </div>
              ) : (
                <div className="space-y-3">
                  {loginHistory.map((login) => (
                    <div key={login.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getDeviceIcon(login.device)}
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {login.device}
                            {login.action && login.action !== 'LOGIN' && (
                              <Badge variant="outline" className="text-xs">
                                {login.action === 'LOGOUT_REMOTE' ? 'Logout Remoto' : login.action}
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-4">
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {login.location}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(login.timestamp)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            IP: {login.ip}
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant={login.success ? "default" : "destructive"}
                        className={login.success ? "bg-green-100 text-green-800" : ""}
                      >
                        {login.success ? (
                          <CheckCircle className="mr-1 h-3 w-3" />
                        ) : (
                          <X className="mr-1 h-3 w-3" />
                        )}
                        {login.success ? 'Sucesso' : 'Falhou'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Alertas de Segurança
              </CardTitle>
              <CardDescription>
                Monitore atividades suspeitas e alertas de segurança
              </CardDescription>
            </CardHeader>
            <CardContent>
              {alertsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                  <span>Carregando alertas...</span>
                </div>
              ) : securityAlerts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhum alerta de segurança encontrado</p>
                  <p className="text-sm mt-2">Sua conta está segura!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {securityAlerts.map((alert) => (
                    <div key={alert.id} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3 flex-1">
                          <div className={`p-2 rounded-full ${
                            alert.severity === 'critical' ? 'bg-red-100 text-red-600' :
                            alert.severity === 'high' ? 'bg-orange-100 text-orange-600' :
                            alert.severity === 'medium' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            <AlertTriangle className="h-4 w-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-medium">{alert.title}</h4>
                              <Badge className={getSeverityColor(alert.severity)}>
                                {alert.severity === 'critical' ? 'Crítico' :
                                 alert.severity === 'high' ? 'Alto' :
                                 alert.severity === 'medium' ? 'Médio' : 'Baixo'}
                              </Badge>
                              {alert.status === 'RESOLVED' && (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Resolvido
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              {alert.description}
                            </p>
                            <div className="flex items-center gap-4 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDate(alert.createdAt)}
                              </span>
                              <span className="flex items-center gap-1">
                                <Tag className="h-3 w-3" />
                                {alert.type}
                              </span>
                              {alert.ipAddress && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {alert.ipAddress}
                                </span>
                              )}
                            </div>
                            {alert.resolvedAt && (
                              <div className="mt-2 text-xs text-muted-foreground">
                                Resolvido em {formatDate(alert.resolvedAt)}
                              </div>
                            )}
                          </div>
                        </div>
                        {alert.status !== 'RESOLVED' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResolveAlert(alert.id)}
                            disabled={loading}
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Resolver
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="advanced" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Configurações Avançadas
              </CardTitle>
              <CardDescription>
                Configurações adicionais de segurança
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">Notificações de Login</div>
                    <div className="text-sm text-muted-foreground">
                      Receba alertas quando alguém fizer login na sua conta
                    </div>
                  </div>
                  <Switch
                    checked={securitySettings.loginNotifications}
                    onCheckedChange={(checked) => handleSecuritySettingChange('loginNotifications', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">Alertas de Atividade Suspeita</div>
                    <div className="text-sm text-muted-foreground">
                      Seja notificado sobre tentativas de acesso suspeitas
                    </div>
                  </div>
                  <Switch
                    checked={securitySettings.suspiciousActivityAlerts}
                    onCheckedChange={(checked) => handleSecuritySettingChange('suspiciousActivityAlerts', checked)}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">Expiração de Senha</div>
                    <div className="text-sm text-muted-foreground">
                      Forçar alteração de senha periodicamente
                    </div>
                  </div>
                  <Switch
                    checked={securitySettings.passwordExpiry}
                    onCheckedChange={(checked) => handleSecuritySettingChange('passwordExpiry', checked)}
                  />
                </div>

                <Separator />

                <div className="space-y-3">
                  <div className="space-y-1">
                    <div className="font-medium">Timeout de Sessão</div>
                    <div className="text-sm text-muted-foreground">
                      Tempo limite de inatividade (em minutos)
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <Input
                      type="number"
                      min="5"
                      max="480"
                      value={securitySettings.sessionTimeout}
                      onChange={(e) => handleSecuritySettingChange('sessionTimeout', parseInt(e.target.value))}
                      className="w-24"
                    />
                    <span className="text-sm text-muted-foreground">minutos</span>
                  </div>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="font-medium">Múltiplas Sessões</div>
                    <div className="text-sm text-muted-foreground">
                      Permitir login simultâneo em vários dispositivos
                    </div>
                  </div>
                  <Switch
                    checked={securitySettings.allowMultipleSessions}
                    onCheckedChange={(checked) => handleSecuritySettingChange('allowMultipleSessions', checked)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}