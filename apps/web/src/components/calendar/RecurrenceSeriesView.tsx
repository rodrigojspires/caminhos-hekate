'use client'

import React, { useState, useMemo } from 'react'
import { Calendar, ChevronLeft, ChevronRight, Eye, EyeOff, Edit, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { CalendarEvent, RecurrenceRule } from '@/types/events'
import { RecurrenceIndicator, RecurrenceConflictIndicator } from './RecurrenceIndicator'

interface RecurrenceInstance {
  id: string
  date: Date
  event?: CalendarEvent
  isException?: boolean
  isModified?: boolean
  isVisible?: boolean
  conflicts?: string[]
}

interface RecurrenceSeriesViewProps {
  seriesId: string
  masterEvent: CalendarEvent
  recurrenceRule: RecurrenceRule
  instances: RecurrenceInstance[]
  onEditInstance?: (instanceId: string) => void
  onDeleteInstance?: (instanceId: string) => void
  onEditSeries?: () => void
  onDeleteSeries?: () => void
  onToggleInstanceVisibility?: (instanceId: string, visible: boolean) => void
  className?: string
}

export function RecurrenceSeriesView({
  seriesId,
  masterEvent,
  recurrenceRule,
  instances,
  onEditInstance,
  onDeleteInstance,
  onEditSeries,
  onDeleteSeries,
  onToggleInstanceVisibility,
  className
}: RecurrenceSeriesViewProps) {
  const [currentPage, setCurrentPage] = useState(0)
  const [showHiddenInstances, setShowHiddenInstances] = useState(false)
  const instancesPerPage = 10

  const filteredInstances = useMemo(() => {
    return instances.filter(instance => 
      showHiddenInstances || instance.isVisible !== false
    )
  }, [instances, showHiddenInstances])

  const paginatedInstances = useMemo(() => {
    const start = currentPage * instancesPerPage
    return filteredInstances.slice(start, start + instancesPerPage)
  }, [filteredInstances, currentPage, instancesPerPage])

  const totalPages = Math.ceil(filteredInstances.length / instancesPerPage)

  const getRecurrenceDescription = () => {
    const { freq, interval = 1, count, until } = recurrenceRule
    
    let description = ''
    
    switch (freq) {
      case 'DAILY':
        description = interval === 1 ? 'Todos os dias' : `A cada ${interval} dias`
        break
      case 'WEEKLY':
        description = interval === 1 ? 'Toda semana' : `A cada ${interval} semanas`
        break
      case 'MONTHLY':
        description = interval === 1 ? 'Todo mês' : `A cada ${interval} meses`
        break
      case 'YEARLY':
        description = interval === 1 ? 'Todo ano' : `A cada ${interval} anos`
        break
    }
    
    if (count) {
      description += ` (${count} ocorrências)`
    } else if (until) {
      description += ` (até ${until.toLocaleDateString('pt-BR')})`
    } else {
      description += ' (sem fim definido)'
    }
    
    return description
  }

  const getInstanceStatus = (instance: RecurrenceInstance) => {
    if (instance.isException) return 'exception'
    if (instance.isModified) return 'modified'
    if (instance.conflicts && instance.conflicts.length > 0) return 'conflict'
    if (instance.isVisible === false) return 'hidden'
    return 'normal'
  }

  const getInstanceStatusColor = (status: string) => {
    switch (status) {
      case 'exception': return 'bg-red-100 border-red-300 text-red-800'
      case 'modified': return 'bg-blue-100 border-blue-300 text-blue-800'
      case 'conflict': return 'bg-yellow-100 border-yellow-300 text-yellow-800'
      case 'hidden': return 'bg-gray-100 border-gray-300 text-gray-600 opacity-60'
      default: return 'bg-green-100 border-green-300 text-green-800'
    }
  }

  const getInstanceStatusText = (status: string) => {
    switch (status) {
      case 'exception': return 'Exceção'
      case 'modified': return 'Modificado'
      case 'conflict': return 'Conflito'
      case 'hidden': return 'Oculto'
      default: return 'Normal'
    }
  }

  const stats = useMemo(() => {
    const total = instances.length
    const visible = instances.filter(i => i.isVisible !== false).length
    const exceptions = instances.filter(i => i.isException).length
    const modified = instances.filter(i => i.isModified).length
    const conflicts = instances.filter(i => i.conflicts && i.conflicts.length > 0).length
    
    return { total, visible, exceptions, modified, conflicts }
  }, [instances])

  return (
    <div className={cn('space-y-6', className)}>
      {/* Cabeçalho da Série */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {masterEvent.title}
                <RecurrenceIndicator 
                  recurrenceRule={recurrenceRule} 
                  size="md" 
                  showText 
                />
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                {getRecurrenceDescription()}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onEditSeries}
              >
                <Edit className="h-4 w-4 mr-1" />
                Editar Série
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={onDeleteSeries}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Excluir Série
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Estatísticas */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.visible}</div>
              <div className="text-xs text-muted-foreground">Visíveis</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{stats.exceptions}</div>
              <div className="text-xs text-muted-foreground">Exceções</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.modified}</div>
              <div className="text-xs text-muted-foreground">Modificados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.conflicts}</div>
              <div className="text-xs text-muted-foreground">Conflitos</div>
            </div>
          </div>
          
          <Separator />
          
          {/* Controles */}
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowHiddenInstances(!showHiddenInstances)}
              >
                {showHiddenInstances ? (
                  <><EyeOff className="h-4 w-4 mr-1" /> Ocultar Instâncias Ocultas</>
                ) : (
                  <><Eye className="h-4 w-4 mr-1" /> Mostrar Instâncias Ocultas</>
                )}
              </Button>
            </div>
            
            {/* Paginação */}
            {totalPages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                  disabled={currentPage === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {currentPage + 1} de {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                  disabled={currentPage === totalPages - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Lista de Instâncias */}
      <Card>
        <CardHeader>
          <CardTitle>Instâncias da Série</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {paginatedInstances.map((instance, index) => {
                const status = getInstanceStatus(instance)
                
                return (
                  <div
                    key={instance.id}
                    className={cn(
                      'flex items-center justify-between p-3 rounded-lg border',
                      getInstanceStatusColor(status)
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-sm font-medium">
                        {instance.date.toLocaleDateString('pt-BR', {
                          weekday: 'short',
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric'
                        })}
                      </div>
                      
                      <div className="text-sm">
                        {instance.date.toLocaleTimeString('pt-BR', {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      
                      <Badge variant="outline" className="text-xs">
                        {getInstanceStatusText(status)}
                      </Badge>
                      
                      {instance.conflicts && instance.conflicts.length > 0 && (
                        <RecurrenceConflictIndicator
                          conflictType="overlap"
                          conflictCount={instance.conflicts.length}
                        />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onToggleInstanceVisibility?.(instance.id, !instance.isVisible)}
                            >
                              {instance.isVisible === false ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            {instance.isVisible === false ? 'Mostrar instância' : 'Ocultar instância'}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onEditInstance?.(instance.id)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Editar esta instância
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                      
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteInstance?.(instance.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            Excluir esta instância
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  )
}