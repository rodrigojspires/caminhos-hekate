'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Users,
  Search,
  MoreVertical,
  UserPlus,
  UserMinus,
  Shield,
  ShieldCheck,
  Crown,
  Mail,
  Ban,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react'
import { toast } from 'sonner'

type MemberRole = 'OWNER' | 'ADMIN' | 'MODERATOR' | 'MEMBER'
type MemberStatus = 'ACTIVE' | 'INACTIVE' | 'BANNED'

interface Member {
  id: string
  userId: string
  role: MemberRole
  status: MemberStatus
  joinedAt: string
  user: {
    id: string
    name: string
    email: string
    image?: string
  }
}

interface PendingInvite {
  id: string
  email: string
  role: MemberRole
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED'
  createdAt: string
  expiresAt: string
}

interface GroupMembersListProps {
  groupId: string
  currentUserRole: MemberRole
  currentUserId: string
}

export function GroupMembersList({ groupId, currentUserRole, currentUserId }: GroupMembersListProps) {
  const [members, setMembers] = useState<Member[]>([])
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<MemberRole>('MEMBER')
  const [isInviting, setIsInviting] = useState(false)

  const canManageMembers = ['OWNER', 'ADMIN'].includes(currentUserRole)
  const canModerateMembers = ['OWNER', 'ADMIN', 'MODERATOR'].includes(currentUserRole)

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members`)
      if (!response.ok) throw new Error('Erro ao carregar membros')
      
      const data = await response.json()
      setMembers(data.members || [])
    } catch (error) {
      console.error('Erro ao carregar membros:', error)
      toast.error('Erro ao carregar membros')
    } finally {
      setIsLoading(false)
    }
  }, [groupId])

  const fetchPendingInvites = useCallback(async () => {
    if (!canManageMembers) return
    
    try {
      const response = await fetch(`/api/groups/${groupId}/invites`)
      if (!response.ok) throw new Error('Erro ao carregar convites')
      
      const data = await response.json()
      setPendingInvites(data.invites || [])
    } catch (error) {
      console.error('Erro ao carregar convites:', error)
    }
  }, [groupId, canManageMembers])

  useEffect(() => {
    fetchMembers()
    fetchPendingInvites()
  }, [fetchMembers, fetchPendingInvites])

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error('Email é obrigatório')
      return
    }

    try {
      setIsInviting(true)
      const response = await fetch(`/api/groups/${groupId}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail.trim(),
          role: inviteRole,
          type: 'EMAIL'
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao enviar convite')
      }

      toast.success('Convite enviado com sucesso!')
      setInviteEmail('')
      setInviteRole('MEMBER')
      setShowInviteDialog(false)
      fetchPendingInvites()
    } catch (error: any) {
      console.error('Erro ao enviar convite:', error)
      toast.error(error.message || 'Erro ao enviar convite')
    } finally {
      setIsInviting(false)
    }
  }

  const handleUpdateMemberRole = async (memberId: string, newRole: MemberRole) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao atualizar função')
      }

      toast.success('Função atualizada com sucesso!')
      fetchMembers()
    } catch (error: any) {
      console.error('Erro ao atualizar função:', error)
      toast.error(error.message || 'Erro ao atualizar função')
    }
  }

  const handleUpdateMemberStatus = async (memberId: string, newStatus: MemberStatus) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao atualizar status')
      }

      const statusText = newStatus === 'BANNED' ? 'banido' : 
                        newStatus === 'INACTIVE' ? 'desativado' : 'ativado'
      toast.success(`Membro ${statusText} com sucesso!`)
      fetchMembers()
    } catch (error: any) {
      console.error('Erro ao atualizar status:', error)
      toast.error(error.message || 'Erro ao atualizar status')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/members/${memberId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao remover membro')
      }

      toast.success('Membro removido com sucesso!')
      fetchMembers()
    } catch (error: any) {
      console.error('Erro ao remover membro:', error)
      toast.error(error.message || 'Erro ao remover membro')
    }
  }

  const handleCancelInvite = async (inviteId: string) => {
    try {
      const response = await fetch(`/api/groups/${groupId}/invites/${inviteId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao cancelar convite')
      }

      toast.success('Convite cancelado!')
      fetchPendingInvites()
    } catch (error: any) {
      console.error('Erro ao cancelar convite:', error)
      toast.error(error.message || 'Erro ao cancelar convite')
    }
  }

  const getRoleIcon = (role: MemberRole) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="w-4 h-4" />
      case 'ADMIN':
        return <ShieldCheck className="w-4 h-4" />
      case 'MODERATOR':
        return <Shield className="w-4 h-4" />
      default:
        return null
    }
  }

  const getRoleBadgeColor = (role: MemberRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-yellow-100 text-yellow-800'
      case 'ADMIN':
        return 'bg-red-100 text-red-800'
      case 'MODERATOR':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusBadgeColor = (status: MemberStatus) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800'
      case 'INACTIVE':
        return 'bg-gray-100 text-gray-800'
      case 'BANNED':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const filteredMembers = members.filter(member => {
    const matchesSearch = member.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.user.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || member.role === roleFilter
    const matchesStatus = statusFilter === 'all' || member.status === statusFilter
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const canModifyMember = (member: Member) => {
    if (member.userId === currentUserId) return false
    if (member.role === 'OWNER') return false
    if (currentUserRole === 'OWNER') return true
    if (currentUserRole === 'ADMIN' && member.role !== 'ADMIN') return true
    return false
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Carregando membros...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Buscar membros..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-64"
            />
            <Search className="w-4 h-4 text-gray-400" />
          </div>
          
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="OWNER">Dono</SelectItem>
              <SelectItem value="ADMIN">Admin</SelectItem>
              <SelectItem value="MODERATOR">Moderador</SelectItem>
              <SelectItem value="MEMBER">Membro</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="ACTIVE">Ativo</SelectItem>
              <SelectItem value="INACTIVE">Inativo</SelectItem>
              <SelectItem value="BANNED">Banido</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {canManageMembers && (
          <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Convidar Membro
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Convidar Novo Membro</DialogTitle>
                <DialogDescription>
                  Envie um convite por email para adicionar um novo membro ao grupo.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Função</label>
                  <Select value={inviteRole} onValueChange={(value: MemberRole) => setInviteRole(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MEMBER">Membro</SelectItem>
                      <SelectItem value="MODERATOR">Moderador</SelectItem>
                      {currentUserRole === 'OWNER' && (
                        <SelectItem value="ADMIN">Admin</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleInviteMember} disabled={isInviting}>
                  <Mail className="w-4 h-4 mr-2" />
                  {isInviting ? 'Enviando...' : 'Enviar Convite'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Pending Invites */}
      {canManageMembers && pendingInvites.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Convites Pendentes ({pendingInvites.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pendingInvites.map((invite) => (
                <div key={invite.id} className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-yellow-200 rounded-full flex items-center justify-center">
                      <Mail className="w-5 h-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="font-medium">{invite.email}</p>
                      <div className="flex items-center space-x-2 text-sm text-gray-600">
                        <Badge className={getRoleBadgeColor(invite.role)}>
                          {invite.role}
                        </Badge>
                        <span>•</span>
                        <span>Expira em {new Date(invite.expiresAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancelInvite(invite.id)}
                  >
                    <XCircle className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Members List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Membros ({filteredMembers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center space-x-3">
                  <Avatar>
                    <AvatarImage src={member.user.image} alt={member.user.name || 'Membro do grupo'} />
                    <AvatarFallback>
                      {member.user.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center space-x-2">
                      <p className="font-medium">{member.user.name}</p>
                      {member.userId === currentUserId && (
                        <Badge variant="outline">Você</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{member.user.email}</p>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge className={getRoleBadgeColor(member.role)}>
                        <span className="flex items-center space-x-1">
                          {getRoleIcon(member.role)}
                          <span>{member.role}</span>
                        </span>
                      </Badge>
                      <Badge className={getStatusBadgeColor(member.status)}>
                        {member.status}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        Entrou em {new Date(member.joinedAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                
                {canModifyMember(member) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {/* Role Management */}
                      {canManageMembers && (
                        <>
                          <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, 'MEMBER')}>
                            Tornar Membro
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, 'MODERATOR')}>
                            Tornar Moderador
                          </DropdownMenuItem>
                          {currentUserRole === 'OWNER' && (
                            <DropdownMenuItem onClick={() => handleUpdateMemberRole(member.id, 'ADMIN')}>
                              Tornar Admin
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                        </>
                      )}
                      
                      {/* Status Management */}
                      {canModerateMembers && (
                        <>
                          {member.status === 'ACTIVE' && (
                            <DropdownMenuItem onClick={() => handleUpdateMemberStatus(member.id, 'INACTIVE')}>
                              Desativar
                            </DropdownMenuItem>
                          )}
                          {member.status === 'INACTIVE' && (
                            <DropdownMenuItem onClick={() => handleUpdateMemberStatus(member.id, 'ACTIVE')}>
                              Ativar
                            </DropdownMenuItem>
                          )}
                          {member.status !== 'BANNED' && (
                            <DropdownMenuItem 
                              onClick={() => handleUpdateMemberStatus(member.id, 'BANNED')}
                              className="text-red-600"
                            >
                              <Ban className="w-4 h-4 mr-2" />
                              Banir
                            </DropdownMenuItem>
                          )}
                          {member.status === 'BANNED' && (
                            <DropdownMenuItem onClick={() => handleUpdateMemberStatus(member.id, 'ACTIVE')}>
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Desbanir
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                        </>
                      )}
                      
                      {/* Remove Member */}
                      {canManageMembers && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600">
                              <UserMinus className="w-4 h-4 mr-2" />
                              Remover do Grupo
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover Membro</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover {member.user.name} do grupo?
                                Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => handleRemoveMember(member.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            ))}
            
            {filteredMembers.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Nenhum membro encontrado com os filtros aplicados.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}