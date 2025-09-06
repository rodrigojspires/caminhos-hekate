'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
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
  Settings,
  Save,
  Trash2,
  Upload,
  Users,
  Shield,
  Bell,
  Link,
  Archive,
  RotateCcw
} from 'lucide-react'
import { toast } from 'sonner'

interface Group {
  id: string
  name: string
  description: string
  type: 'PUBLIC' | 'PRIVATE'
  status: 'ACTIVE' | 'INACTIVE' | 'ARCHIVED'
  maxMembers: number
  imageUrl?: string
  settings: {
    allowMemberInvites: boolean
    requireApproval: boolean
    allowFileSharing: boolean
    allowEventCreation: boolean
  }
  createdAt: string
  updatedAt: string
  ownerId: string
  _count: {
    members: number
    messages: number
    events: number
  }
}

interface GroupSettingsProps {
  group: Group
  onUpdate: () => void
  canDelete: boolean
}

export function GroupSettings({ group, onUpdate, canDelete }: GroupSettingsProps) {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: group.name,
    description: group.description,
    type: group.type,
    maxMembers: group.maxMembers.toString(),
    allowMemberInvites: group.settings.allowMemberInvites,
    requireApproval: group.settings.requireApproval,
    allowFileSharing: group.settings.allowFileSharing,
    allowEventCreation: group.settings.allowEventCreation
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [isArchiving, setIsArchiving] = useState(false)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [inviteCode, setInviteCode] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      toast.error('Nome do grupo é obrigatório')
      return
    }

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          description: formData.description.trim(),
          type: formData.type,
          maxMembers: parseInt(formData.maxMembers),
          settings: {
            allowMemberInvites: formData.allowMemberInvites,
            requireApproval: formData.requireApproval,
            allowFileSharing: formData.allowFileSharing,
            allowEventCreation: formData.allowEventCreation
          }
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao atualizar grupo')
      }

      toast.success('Grupo atualizado com sucesso!')
      onUpdate()
    } catch (error: any) {
      console.error('Erro ao atualizar grupo:', error)
      toast.error(error.message || 'Erro ao atualizar grupo')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao excluir grupo')
      }

      toast.success('Grupo excluído com sucesso!')
      router.push('/dashboard/grupos')
    } catch (error: any) {
      console.error('Erro ao excluir grupo:', error)
      toast.error(error.message || 'Erro ao excluir grupo')
    } finally {
      setIsDeleting(false)
    }
  }

  const handleArchive = async () => {
    try {
      setIsArchiving(true)
      const newStatus = group.status === 'ARCHIVED' ? 'ACTIVE' : 'ARCHIVED'
      
      const response = await fetch(`/api/groups/${group.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Erro ao arquivar grupo')
      }

      toast.success(newStatus === 'ARCHIVED' ? 'Grupo arquivado!' : 'Grupo reativado!')
      onUpdate()
    } catch (error: any) {
      console.error('Erro ao arquivar grupo:', error)
      toast.error(error.message || 'Erro ao arquivar grupo')
    } finally {
      setIsArchiving(false)
    }
  }

  const generateInviteCode = async () => {
    try {
      const response = await fetch(`/api/groups/${group.id}/invites`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ type: 'LINK', expiresIn: '7d' }),
      })

      if (!response.ok) {
        throw new Error('Erro ao gerar código de convite')
      }

      const data = await response.json()
      setInviteCode(data.code)
      setShowInviteDialog(true)
    } catch (error) {
      console.error('Erro ao gerar código de convite:', error)
      toast.error('Erro ao gerar código de convite')
    }
  }

  const copyInviteLink = () => {
    const link = `${window.location.origin}/dashboard/grupos/convite/${inviteCode}`
    navigator.clipboard.writeText(link)
    toast.success('Link copiado para a área de transferência!')
  }

  return (
    <div className="space-y-6">
      {/* Basic Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="w-5 h-5 mr-2" />
            Configurações Básicas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome do Grupo *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do grupo"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descreva o propósito do grupo"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Tipo</Label>
                <Select value={formData.type} onValueChange={(value: any) => setFormData({ ...formData, type: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PUBLIC">Público</SelectItem>
                    <SelectItem value="PRIVATE">Privado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="maxMembers">Máximo de Membros</Label>
                <Input
                  id="maxMembers"
                  type="number"
                  value={formData.maxMembers}
                  onChange={(e) => setFormData({ ...formData, maxMembers: e.target.value })}
                  min="2"
                  max="1000"
                />
              </div>
            </div>

            <Button type="submit" disabled={isSubmitting}>
              <Save className="w-4 h-4 mr-2" />
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Permissions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Shield className="w-5 h-5 mr-2" />
            Permissões
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Membros podem convidar outros</Label>
              <p className="text-sm text-gray-600">Permite que membros enviem convites</p>
            </div>
            <Switch
              checked={formData.allowMemberInvites}
              onCheckedChange={(checked) => setFormData({ ...formData, allowMemberInvites: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Requer aprovação para entrar</Label>
              <p className="text-sm text-gray-600">Novos membros precisam ser aprovados</p>
            </div>
            <Switch
              checked={formData.requireApproval}
              onCheckedChange={(checked) => setFormData({ ...formData, requireApproval: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Permitir compartilhamento de arquivos</Label>
              <p className="text-sm text-gray-600">Membros podem enviar arquivos no chat</p>
            </div>
            <Switch
              checked={formData.allowFileSharing}
              onCheckedChange={(checked) => setFormData({ ...formData, allowFileSharing: checked })}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <Label>Membros podem criar eventos</Label>
              <p className="text-sm text-gray-600">Permite que membros criem eventos do grupo</p>
            </div>
            <Switch
              checked={formData.allowEventCreation}
              onCheckedChange={(checked) => setFormData({ ...formData, allowEventCreation: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Invite Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="w-5 h-5 mr-2" />
            Gerenciar Convites
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Gere links de convite para adicionar novos membros ao grupo.
            </p>
            <Button onClick={generateInviteCode} variant="outline">
              <Link className="w-4 h-4 mr-2" />
              Gerar Link de Convite
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Group Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Estatísticas do Grupo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{group._count.members}</div>
              <div className="text-sm text-gray-600">Membros</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{group._count.messages}</div>
              <div className="text-sm text-gray-600">Mensagens</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-purple-600">{group._count.events}</div>
              <div className="text-sm text-gray-600">Eventos</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">Zona de Perigo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-red-600">
                {group.status === 'ARCHIVED' ? 'Reativar Grupo' : 'Arquivar Grupo'}
              </Label>
              <p className="text-sm text-gray-600">
                {group.status === 'ARCHIVED' 
                  ? 'Reativar o grupo e permitir atividades novamente'
                  : 'Arquivar o grupo impedirá novas atividades'}
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" disabled={isArchiving}>
                  {group.status === 'ARCHIVED' ? (
                    <RotateCcw className="w-4 h-4 mr-2" />
                  ) : (
                    <Archive className="w-4 h-4 mr-2" />
                  )}
                  {isArchiving ? 'Processando...' : 
                   group.status === 'ARCHIVED' ? 'Reativar' : 'Arquivar'}
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    {group.status === 'ARCHIVED' ? 'Reativar Grupo' : 'Arquivar Grupo'}
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    {group.status === 'ARCHIVED'
                      ? 'Tem certeza que deseja reativar este grupo? Membros poderão voltar a interagir.'
                      : 'Tem certeza que deseja arquivar este grupo? Isso impedirá novas atividades.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleArchive}>
                    {group.status === 'ARCHIVED' ? 'Reativar' : 'Arquivar'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>

          {canDelete && (
            <div className="flex items-center justify-between pt-4 border-t border-red-200">
              <div>
                <Label className="text-red-600">Excluir Grupo</Label>
                <p className="text-sm text-gray-600">
                  Esta ação não pode ser desfeita. Todos os dados serão perdidos.
                </p>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" disabled={isDeleting}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    {isDeleting ? 'Excluindo...' : 'Excluir Grupo'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Excluir Grupo</AlertDialogTitle>
                    <AlertDialogDescription>
                      Tem certeza que deseja excluir este grupo? Esta ação não pode ser desfeita.
                      Todos os membros, mensagens e eventos serão permanentemente removidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                      Excluir Permanentemente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invite Code Dialog */}
      <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link de Convite Gerado</DialogTitle>
            <DialogDescription>
              Compartilhe este link para convidar novos membros. O link expira em 7 dias.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-mono break-all">
                {`${window.location.origin}/dashboard/grupos/convite/${inviteCode}`}
              </p>
            </div>
            <div className="flex space-x-2">
              <Button onClick={copyInviteLink} className="flex-1">
                Copiar Link
              </Button>
              <Button variant="outline" onClick={() => setShowInviteDialog(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}