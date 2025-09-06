'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { 
  Plus, 
  Send, 
  Pause, 
  Play, 
  Square, 
  MoreHorizontal, 
  Edit, 
  Trash2, 
  Eye, 
  Calendar,
  Users,
  Mail,
  TrendingUp,
  Clock
} from 'lucide-react'
import type { EmailCampaign, EmailCampaignStatus, EmailTemplate } from '@/lib/email'

interface EmailCampaignManagerProps {
  campaigns: EmailCampaign[]
  templates: EmailTemplate[]
  totalCount: number
  currentPage: number
  pageSize: number
  isLoading?: boolean
  onPageChange?: (page: number) => void
  onCreate?: (campaign: Partial<EmailCampaign>) => void
  onEdit?: (campaign: EmailCampaign) => void
  onDelete?: (campaignId: string) => void
  onStart?: (campaignId: string) => void
  onPause?: (campaignId: string) => void
  onStop?: (campaignId: string) => void
  onPreview?: (campaign: EmailCampaign) => void
}

interface CampaignForm {
  name: string
  description: string
  templateId: string
  fromEmail: string
  fromName: string
  subject: string
  scheduledFor?: string
  tags: string[]
  segmentFilters: Record<string, any>
  variables: Record<string, any>
}

export function EmailCampaignManager({
  campaigns,
  templates,
  totalCount,
  currentPage,
  pageSize,
  isLoading = false,
  onPageChange,
  onCreate,
  onEdit,
  onDelete,
  onStart,
  onPause,
  onStop,
  onPreview
}: EmailCampaignManagerProps) {
  const [activeTab, setActiveTab] = useState('list')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [deleteCampaignId, setDeleteCampaignId] = useState<string | null>(null)
  const [formData, setFormData] = useState<CampaignForm>({
    name: '',
    description: '',
    templateId: '',
    fromEmail: '',
    fromName: '',
    subject: '',
    scheduledFor: '',
    tags: [],
    segmentFilters: {},
    variables: {}
  })

  const handleInputChange = (field: keyof CampaignForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = () => {
    if (!formData.name.trim()) {
      toast.error('Nome da campanha é obrigatório')
      return
    }

    if (!formData.templateId) {
      toast.error('Template é obrigatório')
      return
    }

    if (!formData.fromEmail.trim()) {
      toast.error('Email remetente é obrigatório')
      return
    }

    onCreate?.({
      ...formData,
      scheduledFor: formData.scheduledFor ? new Date(formData.scheduledFor) : undefined
    })
    
    setShowCreateForm(false)
    setFormData({
      name: '',
      description: '',
      templateId: '',
      fromEmail: '',
      fromName: '',
      subject: '',
      scheduledFor: '',
      tags: [],
      segmentFilters: {},
      variables: {}
    })
  }

  const handleDelete = (campaignId: string) => {
    onDelete?.(campaignId)
    setDeleteCampaignId(null)
    toast.success('Campanha deletada com sucesso')
  }

  const getStatusBadge = (status: EmailCampaignStatus | string) => {
    const variants = {
      DRAFT: 'secondary',
      SCHEDULED: 'outline',
      SENDING: 'default',
      SENT: 'default',
      PAUSED: 'secondary',
      CANCELLED: 'destructive',
      COMPLETED: 'default'
    } as const

    const labels = {
      DRAFT: 'Rascunho',
      SCHEDULED: 'Agendada',
      SENDING: 'Enviando',
      SENT: 'Enviada',
      PAUSED: 'Pausada',
      CANCELLED: 'Cancelada',
      COMPLETED: 'Concluída'
    }

    return (
      <Badge variant={variants[status as EmailCampaignStatus]}>
        {labels[status as EmailCampaignStatus]}
      </Badge>
    )
  }

  const getProgressPercentage = (campaign: EmailCampaign) => {
    if (campaign.totalRecipients === 0) return 0
    return Math.round((campaign.sentCount / campaign.totalRecipients) * 100)
  }

  const canStart = (status: EmailCampaignStatus | string) => ['DRAFT', 'SCHEDULED', 'PAUSED'].includes(status as string)
  const canPause = (status: EmailCampaignStatus | string) => (status as string) === 'SENDING'
  const canStop = (status: EmailCampaignStatus | string) => ['SENDING', 'PAUSED', 'SCHEDULED'].includes(status as string)

  const totalPages = Math.ceil(totalCount / pageSize)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campanhas de Email</h2>
          <p className="text-muted-foreground">
            Gerencie suas campanhas de email marketing
          </p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="list">Lista de Campanhas</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Lista de Campanhas */}
        <TabsContent value="list" className="space-y-6">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Progresso</TableHead>
                    <TableHead>Agendado para</TableHead>
                    <TableHead>Criado em</TableHead>
                    <TableHead className="w-[100px]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Carregando campanhas...
                      </TableCell>
                    </TableRow>
                  ) : campaigns.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Nenhuma campanha encontrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    campaigns.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{campaign.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {campaign.description}
                            </div>
                            {campaign.tags && campaign.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {campaign.tags.slice(0, 2).map((tag: string) => (
                                  <Badge key={tag} variant="outline" className="text-xs">
                                    {tag}
                                  </Badge>
                                ))}
                                {campaign.tags.length > 2 && (
                                  <Badge variant="outline" className="text-xs">
                                    +{campaign.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {campaign.template?.name || 'Template não encontrado'}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(campaign.status)}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-sm">
                              <span>{campaign.sentCount} / {campaign.totalRecipients}</span>
                              <span>{getProgressPercentage(campaign)}%</span>
                            </div>
                            <Progress value={getProgressPercentage(campaign)} className="h-2" />
                          </div>
                        </TableCell>
                        <TableCell>
                          {campaign.scheduledFor ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {new Date(campaign.scheduledFor).toLocaleString('pt-BR')}
                            </div>
                          ) : (
                            <span className="text-muted-foreground text-sm">Não agendada</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {new Date(campaign.createdAt).toLocaleDateString('pt-BR')}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => onPreview?.(campaign)}>
                                <Eye className="h-4 w-4 mr-2" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => onEdit?.(campaign)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              {canStart(campaign.status) && (
                                <DropdownMenuItem onClick={() => onStart?.(campaign.id)}>
                                  <Play className="h-4 w-4 mr-2" />
                                  Iniciar
                                </DropdownMenuItem>
                              )}
                              {canPause(campaign.status) && (
                                <DropdownMenuItem onClick={() => onPause?.(campaign.id)}>
                                  <Pause className="h-4 w-4 mr-2" />
                                  Pausar
                                </DropdownMenuItem>
                              )}
                              {canStop(campaign.status) && (
                          <DropdownMenuItem onClick={() => onStop?.(campaign.id)}>
                            <Square className="h-4 w-4 mr-2" />
                            Parar
                          </DropdownMenuItem>
                        )}
                              <DropdownMenuItem 
                                onClick={() => setDeleteCampaignId(campaign.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Deletar
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Mostrando {((currentPage - 1) * pageSize) + 1} a {Math.min(currentPage * pageSize, totalCount)} de {totalCount} campanhas
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Anterior
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => onPageChange?.(page)}
                      >
                        {page}
                      </Button>
                    )
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onPageChange?.(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Próximo
                </Button>
              </div>
            </div>
          )}
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Campanhas</CardTitle>
                <Mail className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{campaigns.length}</div>
                <p className="text-xs text-muted-foreground">
                  Campanhas criadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Campanhas Ativas</CardTitle>
                <Send className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.filter(c => c.status === 'SENDING').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Em execução
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Envios</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.reduce((acc, c) => acc + c.sentCount, 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  Emails enviados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Sucesso</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {campaigns.length > 0 ? 
                    Math.round((campaigns.filter(c => c.status === 'SENT').length / campaigns.length) * 100) 
                    : 0
                  }%
                </div>
                <p className="text-xs text-muted-foreground">
                  Campanhas concluídas
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle>Nova Campanha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome da Campanha</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="Nome da campanha"
                  />
                </div>
                
                <div>
                  <Label>Template</Label>
                  <Select
                    value={formData.templateId}
                    onValueChange={(value) => handleInputChange('templateId', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Descrição da campanha"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="fromEmail">Email Remetente</Label>
                  <Input
                    id="fromEmail"
                    type="email"
                    value={formData.fromEmail}
                    onChange={(e) => handleInputChange('fromEmail', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                
                <div>
                  <Label htmlFor="fromName">Nome Remetente</Label>
                  <Input
                    id="fromName"
                    value={formData.fromName}
                    onChange={(e) => handleInputChange('fromName', e.target.value)}
                    placeholder="Nome do remetente"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Assunto</Label>
                <Input
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleInputChange('subject', e.target.value)}
                  placeholder="Assunto do email"
                />
              </div>

              <div>
                <Label htmlFor="scheduledFor">Agendar para (Opcional)</Label>
                <Input
                  id="scheduledFor"
                  type="datetime-local"
                  value={formData.scheduledFor}
                  onChange={(e) => handleInputChange('scheduledFor', e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  Criar Campanha
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteCampaignId} onOpenChange={() => setDeleteCampaignId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta campanha? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteCampaignId && handleDelete(deleteCampaignId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}