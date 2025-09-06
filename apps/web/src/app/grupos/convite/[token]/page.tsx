'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { Users, Calendar, Shield, AlertCircle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import Image from 'next/image'

interface InviteData {
  invite: {
    id: string
    role: string
    email?: string
    expiresAt?: string
    createdAt: string
    createdBy: {
      id: string
      name: string
      image?: string
    }
  }
  group: {
    id: string
    name: string
    description?: string
    imageUrl?: string
    isPrivate: boolean
    maxMembers?: number
    _count: {
      members: number
    }
  }
  isValid: boolean
}

export default function GroupInvitePage() {
  const params = useParams()
  const token = params?.token as string
  const router = useRouter()
  const { data: session, status } = useSession()
  const [inviteData, setInviteData] = useState<InviteData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isJoining, setIsJoining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasJoined, setHasJoined] = useState(false)

  const fetchInviteData = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/groups/invites/${token}`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao carregar convite')
      }

      setInviteData(data.data)
    } catch (error: any) {
      console.error('Erro ao carregar convite:', error)
      setError(error.message || 'Erro ao carregar convite')
    } finally {
      setIsLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (token) {
      fetchInviteData()
    }
  }, [token, fetchInviteData])

  const handleJoinGroup = async () => {
    if (!session?.user) {
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`)
      return
    }

    try {
      setIsJoining(true)
      
      const response = await fetch(`/api/groups/invites/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao entrar no grupo')
      }

      setHasJoined(true)
      toast.success(data.message || 'Você entrou no grupo com sucesso!')
      
      // Redirecionar para o grupo após 2 segundos
      setTimeout(() => {
        router.push(`/dashboard/grupos/${inviteData?.group.id}`)
      }, 2000)
    } catch (error: any) {
      console.error('Erro ao entrar no grupo:', error)
      toast.error(error.message || 'Erro ao entrar no grupo')
    } finally {
      setIsJoining(false)
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'OWNER': return 'Proprietário'
      case 'ADMIN': return 'Administrador'
      case 'MODERATOR': return 'Moderador'
      case 'MEMBER': return 'Membro'
      default: return role
    }
  }

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'OWNER': return 'default'
      case 'ADMIN': return 'destructive'
      case 'MODERATOR': return 'secondary'
      case 'MEMBER': return 'outline'
      default: return 'outline'
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600">Carregando convite...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <CardTitle className="text-red-600">Convite Inválido</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">{error}</p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/dashboard/grupos">Ver Meus Grupos</Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/dashboard">Voltar ao Dashboard</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (hasJoined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle className="text-green-600">Bem-vindo ao Grupo!</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-gray-600">
              Você entrou no grupo <strong>{inviteData?.group.name}</strong> com sucesso!
            </p>
            <p className="text-sm text-gray-500">
              Redirecionando para o grupo...
            </p>
            <LoadingSpinner />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!inviteData) {
    return null
  }

  const { invite, group } = inviteData
  const isExpired = invite.expiresAt && new Date(invite.expiresAt) <= new Date()

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-2xl mx-auto px-4">
        <Card className="overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                <Users className="w-8 h-8" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold">
                  Convite para o Grupo
                </CardTitle>
                <p className="text-blue-100">
                  Você foi convidado para participar de um grupo privado
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Group Info */}
            <div className="flex items-start space-x-4">
              {group.imageUrl ? (
                <Image
                  src={group.imageUrl}
                  alt={group.name}
                  width={64}
                  height={64}
                  className="rounded-lg object-cover"
                />
              ) : (
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center">
                  <Users className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">
                  {group.name}
                </h3>
                {group.description && (
                  <p className="text-gray-600 mt-1">{group.description}</p>
                )}
                <div className="flex items-center space-x-4 mt-2">
                  <div className="flex items-center text-sm text-gray-500">
                    <Users className="w-4 h-4 mr-1" />
                    {group._count.members} {group._count.members === 1 ? 'membro' : 'membros'}
                    {group.maxMembers && ` / ${group.maxMembers}`}
                  </div>
                  {group.isPrivate && (
                    <Badge variant="secondary" className="text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Privado
                    </Badge>
                  )}
                </div>
              </div>
            </div>

            {/* Invite Details */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <h4 className="font-medium text-gray-900">Detalhes do Convite</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                <div>
                  <span className="text-gray-500">Papel no grupo:</span>
                  <Badge 
                    variant={getRoleBadgeVariant(invite.role)} 
                    className="ml-2"
                  >
                    {getRoleLabel(invite.role)}
                  </Badge>
                </div>
                <div>
                  <span className="text-gray-500">Convidado por:</span>
                  <span className="ml-2 font-medium">{invite.createdBy.name}</span>
                </div>
                {invite.expiresAt && (
                  <div>
                    <span className="text-gray-500">Expira em:</span>
                    <span className={`ml-2 ${isExpired ? 'text-red-600' : 'text-gray-900'}`}>
                      {new Date(invite.expiresAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Criado em:</span>
                  <span className="ml-2">
                    {new Date(invite.createdAt).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-4">
              {status === 'loading' ? (
                <div className="text-center py-4">
                  <LoadingSpinner />
                  <p className="text-sm text-gray-500 mt-2">Verificando autenticação...</p>
                </div>
              ) : !session?.user ? (
                <div className="text-center space-y-4">
                  <p className="text-gray-600">
                    Você precisa estar logado para aceitar este convite
                  </p>
                  <Button asChild className="w-full">
                    <Link href={`/auth/signin?callbackUrl=${encodeURIComponent(window.location.href)}`}>
                      Fazer Login
                    </Link>
                  </Button>
                </div>
              ) : isExpired ? (
                <div className="text-center space-y-4">
                  <p className="text-red-600">Este convite expirou</p>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/dashboard/grupos">Ver Grupos Disponíveis</Link>
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  <Button 
                    onClick={handleJoinGroup}
                    disabled={isJoining}
                    className="w-full"
                    size="lg"
                  >
                    {isJoining ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Entrando no Grupo...
                      </>
                    ) : (
                      `Entrar no Grupo como ${getRoleLabel(invite.role)}`
                    )}
                  </Button>
                  <Button variant="outline" asChild className="w-full">
                    <Link href="/dashboard/grupos">Ver Meus Grupos</Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}