'use client'

import React, { useState } from 'react'
import { Calendar, Clock, MapPin, Video, Users, Tag, Plus, X, CreditCard } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { EventType, CreateEventRequest, RecurrenceRule, EventAccessType, EventMode } from '@/types/events'
import { useEventsStore } from '@/stores/eventsStore'
import { toast } from 'sonner'
import { SubscriptionTier } from '@hekate/database'

interface CreateEventModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  defaultDate?: Date
  onEventCreated?: (event: any) => void
}

const EVENT_TYPE_OPTIONS = [
  { value: EventType.WEBINAR, label: 'Ritual', description: 'Encontro espiritual guiado' },
  { value: EventType.WORKSHOP, label: 'Workshop', description: 'Sessão prática e interativa' },
  { value: EventType.COURSE, label: 'Curso', description: 'Programa educacional estruturado' },
  { value: EventType.MEETING, label: 'Terapia', description: 'Sessão terapêutica em grupo ou individual' }
]

const RECURRENCE_OPTIONS = [
  { value: 'none', label: 'Não repetir' },
  { value: 'daily', label: 'Diariamente' },
  { value: 'weekly', label: 'Semanalmente' },
  { value: 'monthly', label: 'Mensalmente' },
  { value: 'yearly', label: 'Anualmente' },
  { value: 'lunar_full', label: 'Lua cheia' },
  { value: 'lunar_new', label: 'Lua nova' }
]

type RecurrenceUIType = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'lunar_full' | 'lunar_new'

interface CreateEventFormData {
  title: string
  description?: string
  type: EventType | ''
  startDate: string
  endDate: string
  location?: string
  virtualLink?: string
  maxAttendees?: number
  isPublic: boolean
  requiresApproval: boolean
  tags: string[]
  accessType: EventAccessType
  accessPaid: boolean
  accessTier: boolean
  price?: number
  freeTiers: SubscriptionTier[]
  mode: EventMode
  recurrence?: {
    type: RecurrenceUIType
    interval?: number
    endDate?: string
    count?: number
  }
}

export function CreateEventModal({ open, onOpenChange, defaultDate, onEventCreated }: CreateEventModalProps) {
  const [isCreating, setIsCreating] = useState(false)
  const { createEvent } = useEventsStore()
  
  // Form state
  const [formData, setFormData] = useState<CreateEventFormData>(() => {
    const now = new Date()
    const startDate = defaultDate || new Date(now.getTime() + 60 * 60 * 1000) // 1 hour from now
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000) // 1 hour duration
    
    return {
      title: '',
      description: '',
      type: EventType.WEBINAR,
      startDate: startDate.toISOString().slice(0, 16),
      endDate: endDate.toISOString().slice(0, 16),
      location: '',
      virtualLink: '',
      maxAttendees: undefined,
      isPublic: true,
      requiresApproval: false,
      accessType: EventAccessType.FREE,
      accessPaid: false,
      accessTier: false,
      price: undefined,
      freeTiers: [],
      mode: EventMode.ONLINE,
      tags: [],
      recurrence: {
        type: 'none',
        interval: 1,
        endDate: undefined,
        count: undefined
      }
    }
  })
  
  const [currentTag, setCurrentTag] = useState('')
  const [showRecurrence, setShowRecurrence] = useState(false)

  const handleInputChange = (field: keyof CreateEventFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleRecurrenceChange = (field: keyof NonNullable<CreateEventFormData['recurrence']>, value: any) => {
    setFormData((prev) => ({
      ...prev,
      recurrence: {
        ...(prev.recurrence || { type: 'none' }),
        [field]: value
      }
    }))
  }

  const addTag = () => {
    if (currentTag.trim() && !formData.tags?.includes(currentTag.trim())) {
      setFormData((prev) => ({
        ...prev,
        tags: [...(prev.tags || []), currentTag.trim()]
      }))
      setCurrentTag('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData((prev) => ({
      ...prev,
      tags: prev.tags?.filter((tag: string) => tag !== tagToRemove) || []
    }))
  }

  const toggleTier = (tier: SubscriptionTier) => {
    setFormData((prev) => {
      const exists = prev.freeTiers.includes(tier)
      return {
        ...prev,
        freeTiers: exists
          ? prev.freeTiers.filter((t) => t !== tier)
          : [...prev.freeTiers, tier]
      }
    })
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTag()
    }
  }

  const validateForm = (): string | null => {
    if (!formData.title?.trim()) {
      return 'Título é obrigatório'
    }
    
    if (!formData.startDate) {
      return 'Data de início é obrigatória'
    }
    
    if (!formData.endDate) {
      return 'Data de fim é obrigatória'
    }
    
    const startDate = new Date(formData.startDate)
    const endDate = new Date(formData.endDate)
    
    if (startDate >= endDate) {
      return 'Data de fim deve ser posterior à data de início'
    }
    
    if (startDate < new Date()) {
      return 'Data de início deve ser no futuro'
    }
    
    if (formData.maxAttendees && formData.maxAttendees < 1) {
      return 'Número máximo de participantes deve ser maior que 0'
    }

    if (formData.accessPaid && (!formData.price || formData.price <= 0)) {
      return 'Defina um preço para eventos pagos'
    }

    if (formData.accessTier && formData.freeTiers.length === 0) {
      return 'Selecione ao menos um tier com acesso incluído'
    }

    if (formData.mode === EventMode.IN_PERSON && !formData.location?.trim()) {
      return 'Informe o local para eventos presenciais'
    }

    if (formData.mode === EventMode.ONLINE && !formData.virtualLink?.trim()) {
      return 'Informe o link para eventos online'
    }

    if (formData.mode === EventMode.HYBRID && (!formData.location?.trim() || !formData.virtualLink?.trim())) {
      return 'Eventos híbridos precisam de local e link'
    }
    
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const validationError = validateForm()
    if (validationError) {
      toast.error(validationError)
      return
    }
    
    setIsCreating(true)
    
    try {
      let recurrenceRule: RecurrenceRule | undefined
      if (showRecurrence && formData.recurrence && formData.recurrence.type !== 'none') {
        const freqMap: Record<Exclude<RecurrenceUIType, 'none'>, RecurrenceRule['freq']> = {
          daily: 'DAILY',
          weekly: 'WEEKLY',
          monthly: 'MONTHLY',
          yearly: 'YEARLY',
          lunar_full: 'LUNAR',
          lunar_new: 'LUNAR'
        }
        recurrenceRule = {
          freq: freqMap[formData.recurrence.type as Exclude<RecurrenceUIType, 'none'>],
          interval: formData.recurrence.interval || 1,
          count: formData.recurrence.count,
          until: formData.recurrence.endDate ? new Date(formData.recurrence.endDate) : undefined,
          lunarPhase: formData.recurrence.type === 'lunar_full' ? 'FULL' : formData.recurrence.type === 'lunar_new' ? 'NEW' : undefined
        }
      }

      const resolvedAccessType = formData.accessPaid
        ? EventAccessType.PAID
        : formData.accessTier
          ? EventAccessType.TIER
          : EventAccessType.FREE

      const eventData: CreateEventRequest = {
        title: formData.title!,
        description: formData.description || '',
        type: formData.type as EventType,
        startDate: formData.startDate!,
        endDate: formData.endDate!,
        location: formData.location || undefined,
        virtualLink: formData.virtualLink || undefined,
        maxAttendees: formData.maxAttendees || undefined,
        isPublic: formData.isPublic!,
        requiresApproval: formData.requiresApproval!,
        tags: formData.tags || [],
        accessType: resolvedAccessType,
        price: formData.accessPaid ? formData.price : undefined,
        freeTiers: formData.accessTier ? formData.freeTiers : [],
        mode: formData.mode,
        recurrence: recurrenceRule
      }
      
      await createEvent(eventData)
      toast.success('Evento criado com sucesso!')
      
      // Call the callback if provided
      if (onEventCreated) {
        onEventCreated(eventData)
      }
      
      onOpenChange(false)
      
      // Reset form
      setFormData(() => {
        const now = new Date()
        const startDate = new Date(now.getTime() + 60 * 60 * 1000)
        const endDate = new Date(startDate.getTime() + 60 * 60 * 1000)
        return {
          title: '',
          description: '',
          type: EventType.WEBINAR,
          startDate: startDate.toISOString().slice(0, 16),
          endDate: endDate.toISOString().slice(0, 16),
          location: '',
          virtualLink: '',
          maxAttendees: undefined,
          isPublic: true,
          requiresApproval: false,
          tags: [],
          accessType: EventAccessType.FREE,
          accessPaid: false,
          accessTier: false,
          price: undefined,
          freeTiers: [],
          mode: EventMode.ONLINE,
          recurrence: {
            type: 'none',
            interval: 1,
            endDate: undefined,
            count: undefined
          }
        }
      })
      setShowRecurrence(false)
      
    } catch (error) {
      toast.error('Erro ao criar evento')
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Criar Novo Evento</span>
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informações básicas */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Título *</Label>
                <Input
                  id="title"
                  value={formData.title || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('title', e.target.value)}
                  placeholder="Digite o título do evento"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="description">Descrição</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => handleInputChange('description', e.target.value)}
                  placeholder="Descreva o evento..."
                  rows={3}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="type">Tipo de Evento *</Label>
                <Select
                  value={formData.type as string}
                  onValueChange={(value: string) => handleInputChange('type', value as EventType)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPE_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">
                            {option.description}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Separator />

            {/* Data e hora */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Clock className="h-4 w-4" />
                <span>Data e Horário</span>
              </h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Data de Início *</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={formData.startDate || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('startDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="endDate">Data de Fim *</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={formData.endDate || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('endDate', e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Local */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>Local</span>
              </h3>
              
              <div>
                <Label>Formato</Label>
                <Select
                  value={formData.mode}
                  onValueChange={(value) => handleInputChange('mode', value as EventMode)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Selecione o formato" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={EventMode.ONLINE}>Online</SelectItem>
                    <SelectItem value={EventMode.IN_PERSON}>Presencial</SelectItem>
                    <SelectItem value={EventMode.HYBRID}>Híbrido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="location">Local Físico</Label>
                  <Input
                    id="location"
                    value={formData.location || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('location', e.target.value)}
                    placeholder="Endereço do evento (opcional)"
                    className="mt-1"
                  />
                </div>
                
                <div>
                  <Label htmlFor="virtualLink">Link Virtual</Label>
                  <div className="flex items-center space-x-2 mt-1">
                    <Video className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="virtualLink"
                      value={formData.virtualLink || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('virtualLink', e.target.value)}
                      placeholder="https://meet.google.com/..."
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Acesso e preço */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <CreditCard className="h-4 w-4" />
                <span>Acesso e Preço</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Acesso</Label>
                  <div className="mt-2 space-y-2">
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={formData.accessPaid}
                        onChange={(e) => handleInputChange('accessPaid', e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      Pago (checkout)
                    </label>
                    <label className="flex items-center gap-2 text-sm text-muted-foreground">
                      <input
                        type="checkbox"
                        checked={formData.accessTier}
                        onChange={(e) => handleInputChange('accessTier', e.target.checked)}
                        className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                      />
                      Incluído em tiers
                    </label>
                    {!formData.accessPaid && !formData.accessTier && (
                      <p className="text-xs text-muted-foreground">Sem seleção: evento gratuito.</p>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Preço (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    disabled={!formData.accessPaid}
                    value={formData.price ?? ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      handleInputChange('price', e.target.value ? parseFloat(e.target.value) : undefined)
                    }
                    placeholder="0,00"
                    className="mt-1"
                  />
                </div>
              </div>

              {formData.accessTier && (
                <div className="space-y-2">
                  <Label>Tiers com acesso incluído</Label>
                  <div className="flex flex-wrap gap-2">
                    {[SubscriptionTier.INICIADO, SubscriptionTier.ADEPTO, SubscriptionTier.SACERDOCIO].map((tier) => {
                      const isActive = formData.freeTiers.includes(tier)
                      return (
                        <Button
                          key={tier}
                          type="button"
                          variant={isActive ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => toggleTier(tier)}
                        >
                          {tier}
                        </Button>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            <Separator />

            {/* Participantes */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Users className="h-4 w-4" />
                <span>Participantes</span>
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="maxAttendees">Número Máximo de Participantes</Label>
                  <Input
                    id="maxAttendees"
                    type="number"
                    min="1"
                    value={formData.maxAttendees || ''}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleInputChange('maxAttendees', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Deixe vazio para ilimitado"
                    className="mt-1"
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="isPublic">Evento Público</Label>
                    <p className="text-sm text-muted-foreground">
                      Qualquer pessoa pode ver e se inscrever
                    </p>
                  </div>
                  <Switch
                    id="isPublic"
                    checked={formData.isPublic}
                    onCheckedChange={(checked: boolean) => handleInputChange('isPublic', checked)}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="requiresApproval">Requer Aprovação</Label>
                    <p className="text-sm text-muted-foreground">
                      Inscrições precisam ser aprovadas
                    </p>
                  </div>
                  <Switch
                    id="requiresApproval"
                    checked={formData.requiresApproval}
                    onCheckedChange={(checked: boolean) => handleInputChange('requiresApproval', checked)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Tags */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center space-x-2">
                <Tag className="h-4 w-4" />
                <span>Tags</span>
              </h3>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Input
                    value={currentTag}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCurrentTag(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Digite uma tag e pressione Enter"
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={addTag}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                
                {formData.tags && formData.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => removeTag(tag)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <Separator />

            {/* Recorrência */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Evento Recorrente</h3>
                <Switch
                  checked={showRecurrence}
                  onCheckedChange={setShowRecurrence}
                />
              </div>
              
              {showRecurrence && (
                <div className="space-y-4 pl-4 border-l-2 border-muted">
                  <div>
                    <Label htmlFor="recurrenceType">Repetir</Label>
                    <Select
                      value={formData.recurrence?.type || 'none'}
                      onValueChange={(value: RecurrenceUIType) => handleRecurrenceChange('type', value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {RECURRENCE_OPTIONS.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {formData.recurrence?.type !== 'none' && (
                    <>
                      <div>
                        <Label htmlFor="interval">Intervalo</Label>
                        <Input
                          id="interval"
                          type="number"
                          min="1"
                          value={formData.recurrence?.interval || 1}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRecurrenceChange('interval', parseInt(e.target.value))}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="recurrenceEndDate">Terminar em (opcional)</Label>
                        <Input
                          id="recurrenceEndDate"
                          type="date"
                          value={formData.recurrence?.endDate || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRecurrenceChange('endDate', e.target.value)}
                          className="mt-1"
                        />
                      </div>
                      
                      <div>
                        <Label htmlFor="count">Número de ocorrências (opcional)</Label>
                        <Input
                          id="count"
                          type="number"
                          min="1"
                          value={formData.recurrence?.count || ''}
                          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleRecurrenceChange('count', e.target.value ? parseInt(e.target.value) : undefined)}
                          className="mt-1"
                        />
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </form>
        </ScrollArea>

        <DialogFooter>
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit}
            disabled={isCreating}
          >
            {isCreating ? 'Criando...' : 'Criar Evento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
