'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Bell, Plus, Trash2, Clock, Mail, Smartphone, MessageSquare, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

// Define local types matching the API used by this component
type ReminderType = 'email' | 'push' | 'sms'
type ReminderStatus = 'PENDING' | 'SENT' | 'FAILED' | 'CANCELED'

interface EventReminder {
  id: string
  type: ReminderType
  minutesBefore: number
  message: string
  status: ReminderStatus
  triggerTime: Date
  sentAt?: Date
  createdAt: Date
}

interface EventRemindersProps {
  eventId: string
  eventTitle: string
  eventStartDate: Date
  className?: string
}

const REMINDER_TYPES = [
  { value: 'email', label: 'Email', icon: Mail },
  { value: 'push', label: 'Notificação Push', icon: Smartphone },
  { value: 'sms', label: 'SMS', icon: MessageSquare }
] as const

const PRESET_TIMES = [
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '1 dia antes' },
  { value: 2880, label: '2 dias antes' },
  { value: 10080, label: '1 semana antes' }
]

const STATUS_CONFIG: Record<ReminderStatus, { label: string; color: string }> = {
  PENDING: { label: 'Agendado', color: 'bg-blue-100 text-blue-800' },
  SENT: { label: 'Enviado', color: 'bg-green-100 text-green-800' },
  FAILED: { label: 'Falhou', color: 'bg-red-100 text-red-800' },
  CANCELED: { label: 'Cancelado', color: 'bg-gray-100 text-gray-800' }
}

export function EventReminders({ eventId, eventTitle, eventStartDate, className }: EventRemindersProps) {
  const [reminders, setReminders] = useState<EventReminder[]>([])
  const [loading, setLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  
  // Estado do formulário
  const [formData, setFormData] = useState({
    type: 'email' as ReminderType,
    minutesBefore: 60,
    customMinutes: '',
    message: ''
  })

  // Carregar lembretes
  const fetchReminders = useCallback(async () => {
     try {
       setLoading(true)
       const response = await fetch(`/api/events/${eventId}/reminders`)
       
       if (!response.ok) {
         throw new Error('Falha ao carregar lembretes')
       }
       
       const data = await response.json()
       const list = (data.reminders ?? data) as any[]
       setReminders(list.map((reminder: any) => {
         const trigger = new Date(reminder.triggerTime)
         const diffMinutes = Math.max(0, Math.round((new Date(eventStartDate).getTime() - trigger.getTime()) / 60000))
         const mappedType = (String(reminder.type || '')).toLowerCase() as ReminderType
         return {
           id: reminder.id,
           type: mappedType,
           minutesBefore: diffMinutes,
           message: reminder.metadata?.message ?? '',
           status: reminder.status as ReminderStatus,
           triggerTime: trigger,
           sentAt: reminder.sentAt ? new Date(reminder.sentAt) : undefined,
           createdAt: new Date(reminder.createdAt)
         } as EventReminder
       }))
     } catch (error) {
       console.error('Erro ao carregar lembretes:', error)
       toast.error('Erro ao carregar lembretes')
     } finally {
       setLoading(false)
     }
  }, [eventId, eventStartDate])

  // Criar lembrete
  const createReminder = async () => {
    try {
      setLoading(true)
      
      const minutesBefore = formData.customMinutes 
        ? parseInt(formData.customMinutes) 
        : formData.minutesBefore
      
      if (isNaN(minutesBefore) || minutesBefore < 0) {
        toast.error('Tempo inválido')
        return
      }
      
      const triggerTime = new Date(new Date(eventStartDate).getTime() - minutesBefore * 60000).toISOString()
      const typeEnum = (formData.type || 'email').toUpperCase()
      const payload: any = {
        type: typeEnum,
        triggerTime
      }
      if (formData.message?.trim()) {
        payload.metadata = { message: formData.message.trim() }
      }

      const response = await fetch(`/api/events/${eventId}/reminders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao criar lembrete')
      }
      
      toast.success('Lembrete criado com sucesso!')
      setShowCreateModal(false)
      setFormData({
        type: 'email',
        minutesBefore: 60,
        customMinutes: '',
        message: ''
      })
      await fetchReminders()
    } catch (error) {
      console.error('Erro ao criar lembrete:', error)
      toast.error(error instanceof Error ? error.message : 'Erro ao criar lembrete')
    } finally {
      setLoading(false)
    }
  }

  // Excluir lembrete
  const deleteReminder = async (reminderId: string) => {
    try {
      setLoading(true)
      
      const response = await fetch(`/api/events/${eventId}/reminders?reminderId=${reminderId}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) {
        throw new Error('Falha ao excluir lembrete')
      }
      
      toast.success('Lembrete excluído com sucesso!')
      await fetchReminders()
    } catch (error) {
      console.error('Erro ao excluir lembrete:', error)
      toast.error('Erro ao excluir lembrete')
    } finally {
      setLoading(false)
    }
  }

  // Formatar tempo
  const formatTime = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minuto${minutes !== 1 ? 's' : ''}`
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60)
      return `${hours} hora${hours !== 1 ? 's' : ''}`
    } else {
      const days = Math.floor(minutes / 1440)
      return `${days} dia${days !== 1 ? 's' : ''}`
    }
  }

  // Formatar data
  const formatDate = (date: Date): string => {
    return new Intl.DateTimeFormat('pt-BR', {
      dateStyle: 'short',
      timeStyle: 'short'
    }).format(date)
  }

  useEffect(() => {
    fetchReminders()
  }, [fetchReminders])

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Lembretes
          </CardTitle>
          
          <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2">
                <Plus className="h-4 w-4" />
                Adicionar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Lembrete</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Tipo</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(v) => setFormData((f) => ({ ...f, type: v as ReminderType }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        {REMINDER_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tempo antes do evento</Label>
                    <Select
                      value={String(formData.minutesBefore)}
                      onValueChange={(v) => setFormData((f) => ({ ...f, minutesBefore: Number(v) }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tempo" />
                      </SelectTrigger>
                      <SelectContent>
                        {PRESET_TIMES.map((t) => (
                          <SelectItem key={t.value} value={String(t.value)}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <div className="mt-2">
                      <Label className="text-xs">Ou personalize (minutos)</Label>
                      <Input
                        type="number"
                        value={formData.customMinutes}
                        onChange={(e) => setFormData((f) => ({ ...f, customMinutes: e.target.value }))}
                        placeholder="Ex: 45"
                        min={0}
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label>Mensagem (opcional)</Label>
                  <Textarea
                    value={formData.message}
                    onChange={(e) => setFormData((f) => ({ ...f, message: e.target.value }))}
                    placeholder={`Lembrete: ${eventTitle} começa em breve!`}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button 
                    onClick={createReminder}
                    disabled={loading}
                    className="flex-1"
                  >
                    Criar Lembrete
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setShowCreateModal(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      
      <CardContent>
        {loading && reminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando lembretes...
          </div>
        ) : reminders.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum lembrete configurado</p>
            <p className="text-sm">Adicione lembretes para não perder este evento!</p>
          </div>
        ) : (
          <ScrollArea className="max-h-96">
            <div className="space-y-3">
              {reminders.map((reminder, index) => {
                const typeConfig = REMINDER_TYPES.find(t => t.value === reminder.type)
                const statusConfig = STATUS_CONFIG[reminder.status]
                const Icon = typeConfig?.icon || Bell
                
                return (
                  <div key={reminder.id}>
                    <div className="flex items-start justify-between p-3 bg-muted/50 rounded-lg">
                      <div className="flex items-start gap-3 flex-1">
                        <Icon className="h-4 w-4 mt-1 text-muted-foreground" />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">
                              {typeConfig?.label}
                            </span>
                            <Badge className={statusConfig.color}>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(reminder.minutesBefore)} antes
                          </div>
                          
                          <p className="text-xs text-muted-foreground">
                            {reminder.status === 'PENDING' 
                              ? `Agendado para ${formatDate(reminder.triggerTime)}`
                              : reminder.status === 'SENT' && reminder.sentAt
                              ? `Enviado em ${formatDate(reminder.sentAt)}`
                              : reminder.status === 'CANCELED'
                              ? 'Cancelado'
                              : 'Falha no envio'}
                          </p>
                            
                          {reminder.message && (
                            <p className="text-xs mt-2 p-2 bg-background rounded border">
                              {reminder.message}
                            </p>
                          )}
                        </div>
                        
                        {reminder.status === 'PENDING' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteReminder(reminder.id)}
                            disabled={loading}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                    {index < reminders.length - 1 && <Separator className="my-2" />}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
        
        {new Date() > eventStartDate && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Este evento já passou. Novos lembretes não serão enviados.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}